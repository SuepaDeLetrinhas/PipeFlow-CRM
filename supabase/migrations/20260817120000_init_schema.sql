-- =============================================================================
-- PipeFlow CRM — schema inicial
--
-- Espelha o modelo de dados do CLAUDE.md e os tipos de domínio de
-- `types/index.ts` coluna a coluna: snake_case, `workspace_id` em toda tabela
-- de domínio, ids em uuid. As policies RLS ficam na migration seguinte —
-- aqui só estrutura.
-- =============================================================================

create extension if not exists "pgcrypto" with schema extensions;
-- `unaccent` existe porque a busca de leads é acento-insensível desde o M4
-- ("Sao Paulo" acha "São Paulo"). Sem ela o filtro teria de voltar para o
-- Node e a paginação deixaria de ser feita no banco.
create extension if not exists "unaccent" with schema extensions;
-- `pg_trgm` é o que dá índice a `like '%termo%'`. A busca de leads é por
-- substring no meio da palavra, então btree não ajudaria.
create extension if not exists "pg_trgm" with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
--
-- Os valores são exatamente os das uniões em `types/index.ts`. Divergir aqui
-- quebraria os fixtures no momento em que forem retipados pelo banco.
-- -----------------------------------------------------------------------------

create type public.role as enum ('admin', 'member');

create type public.plan as enum ('free', 'pro');

create type public.lead_status as enum (
  'novo',
  'contatado',
  'qualificado',
  'cliente',
  'perdido'
);

-- Ordem declarada = ordem do funil no PRD. Enum do Postgres ordena pela posição
-- de declaração, então `order by stage` já sai na sequência do board.
create type public.deal_stage as enum (
  'novo_lead',
  'contato_realizado',
  'proposta_enviada',
  'negociacao',
  'fechado_ganho',
  'fechado_perdido'
);

create type public.activity_type as enum ('call', 'email', 'meeting', 'note');

create type public.subscription_status as enum (
  'active',
  'trialing',
  'past_due',
  'canceled'
);

create type public.invite_status as enum (
  'pending',
  'accepted',
  'revoked',
  'expired'
);

-- -----------------------------------------------------------------------------
-- profiles
--
-- Não está entre as 7 tabelas do CLAUDE.md, mas o tipo `User` precisa de
-- `full_name` e `avatar_url`, e `auth.users` não é legível sob RLS pelo
-- cliente. Sem este espelho, todo join de responsável/autor (tabela de leads,
-- card do Kanban, timeline) ficaria sem nome para exibir.
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Espelho legível de auth.users. Populado pelo trigger handle_new_user.';

-- -----------------------------------------------------------------------------
-- workspaces
-- -----------------------------------------------------------------------------

create table public.workspaces (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  plan public.plan not null default 'free',
  created_at timestamptz not null default now()
);

-- `on delete restrict` no owner: apagar a conta do dono não pode levar junto,
-- em silêncio, os dados de um workspace com outros membros dentro. A
-- transferência de propriedade é uma decisão de produto, não um efeito colateral.

create index workspaces_owner_id_idx on public.workspaces (owner_id);

-- -----------------------------------------------------------------------------
-- workspace_members
-- -----------------------------------------------------------------------------

create table public.workspace_members (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.role not null default 'member',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index workspace_members_workspace_id_idx
  on public.workspace_members (workspace_id);

-- O switcher lista "meus workspaces": a busca parte do user_id, não do
-- workspace_id, então o índice do unique acima não serve.
create index workspace_members_user_id_idx
  on public.workspace_members (user_id);

-- -----------------------------------------------------------------------------
-- invites
-- -----------------------------------------------------------------------------

create table public.invites (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role public.role not null default 'member',
  token text not null unique,
  status public.invite_status not null default 'pending',
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

create index invites_workspace_id_idx on public.invites (workspace_id);

-- A rota /invite/[token] busca pelo token; o unique já cobre. Este índice serve
-- à outra ponta: "tenho convite pendente para o meu e-mail?" na aceitação.
create index invites_email_idx on public.invites (lower(email));

-- Um único convite pendente por e-mail e workspace. Reconvidar deve reaproveitar
-- ou revogar o anterior, não empilhar tokens válidos para o mesmo endereço.
create unique index invites_pending_unique
  on public.invites (workspace_id, lower(email))
  where status = 'pending';

-- -----------------------------------------------------------------------------
-- leads
-- -----------------------------------------------------------------------------

create table public.leads (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  email text,
  phone text,
  company text,
  job_title text,
  status public.lead_status not null default 'novo',
  owner_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_workspace_id_created_at_idx
  on public.leads (workspace_id, created_at desc);

-- Filtro por responsável na tabela de leads (M4).
create index leads_workspace_id_owner_id_idx
  on public.leads (workspace_id, owner_id);

-- Busca livre por nome, empresa e e-mail. `unaccent` + `lower` reproduzem no
-- banco o `normalize()` de lib/data/leads.ts; sem o índice a busca vira
-- sequential scan em toda tecla digitada.
--
-- O wrapper existe porque `unaccent()` é STABLE, não IMMUTABLE (depende do
-- dicionário carregado), e o Postgres recusa função não-imutável em expressão
-- de índice. Fixar o dicionário no corpo torna a chamada determinística de
-- fato, que é a condição para a marcação ser honesta.
create or replace function public.pipeflow_normalize(value text)
returns text
language sql
immutable
parallel safe
returns null on null input
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, value));
$$;

create index leads_search_idx on public.leads using gin (
  public.pipeflow_normalize(
    coalesce(name, '') || ' ' || coalesce(company, '') || ' ' || coalesce(email, '')
  ) extensions.gin_trgm_ops
);

-- O telefone é buscado só por dígitos, para que a máscara gravada não importe.
create index leads_phone_digits_idx
  on public.leads (workspace_id, regexp_replace(coalesce(phone, ''), '\D', '', 'g'));

-- -----------------------------------------------------------------------------
-- deals
-- -----------------------------------------------------------------------------

create table public.deals (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  -- numeric, não float: valor em BRL não pode acumular erro de ponto flutuante
  -- na soma por coluna que o cabeçalho do board exibe.
  value numeric(12, 2) not null default 0 check (value >= 0),
  stage public.deal_stage not null default 'novo_lead',
  position integer not null default 0,
  due_date date,
  -- O lead pode ser apagado sem levar o negócio junto: o histórico de valor
  -- continua valendo para o funil. O tipo Deal já declara lead_id anulável.
  lead_id uuid references public.leads (id) on delete set null,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Consulta que monta o board: uma coluna por stage, cards em ordem de position.
create index deals_workspace_id_stage_position_idx
  on public.deals (workspace_id, stage, position);

create index deals_lead_id_idx on public.deals (lead_id);

-- "Meus negócios com prazo próximo", no dashboard.
create index deals_workspace_id_owner_id_due_date_idx
  on public.deals (workspace_id, owner_id, due_date);

-- -----------------------------------------------------------------------------
-- activities
-- -----------------------------------------------------------------------------

create table public.activities (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  type public.activity_type not null,
  description text not null check (char_length(trim(description)) between 1 and 2000),
  -- Quem escreveu some da equipe, mas a atividade permanece na timeline: a
  -- autoria vira nula em vez de apagar o histórico do lead.
  author_id uuid references public.profiles (id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Timeline do lead, da mais recente para a mais antiga.
create index activities_lead_id_occurred_at_idx
  on public.activities (lead_id, occurred_at desc);

create index activities_workspace_id_idx on public.activities (workspace_id);

-- -----------------------------------------------------------------------------
-- subscriptions
-- -----------------------------------------------------------------------------

create table public.subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  -- Uma assinatura por workspace. O unique é o que torna o handler do webhook
  -- idempotente: `on conflict (workspace_id) do update` em vez de duplicar
  -- linha quando o Stripe reentrega o mesmo evento.
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status public.subscription_status not null default 'active',
  plan public.plan not null default 'free',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

-- `search_path = ''` e nomes qualificados: sem isso uma tabela homônima criada
-- num schema sob controle do usuário poderia ser resolvida antes da nossa
-- dentro de uma função `security definer`.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém o perfil em dia quando o e-mail muda no Auth.
create or replace function public.handle_user_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id and email is distinct from new.email;

  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of email on auth.users
  for each row execute function public.handle_user_update();

-- `updated_at` mantido pelo banco: uma Server Action que esqueça de setar a
-- coluna não deixa o registro com data velha.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_touch_updated_at
  before update on public.leads
  for each row execute function public.touch_updated_at();

create trigger deals_touch_updated_at
  before update on public.deals
  for each row execute function public.touch_updated_at();

create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- Todo workspace nasce com uma linha de assinatura no plano Free, para que a
-- tela de billing e a checagem de limite nunca precisem tratar "sem assinatura"
-- como um caso à parte.
create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.subscriptions (workspace_id, plan, status)
  values (new.id, new.plan, 'active')
  on conflict (workspace_id) do nothing;

  -- O criador entra como admin do próprio workspace. Feito aqui, e não na
  -- Server Action, porque a policy de insert de workspace_members exige ser
  -- admin — e no primeiro instante ainda não existe admin algum.
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'admin')
  on conflict (workspace_id, user_id) do nothing;

  return new;
end;
$$;

create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();

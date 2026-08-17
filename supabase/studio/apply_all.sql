-- =============================================================================
-- PipeFlow CRM — script consolidado para o SQL Editor do Supabase Studio
--
-- GERADO por scripts/build-studio-sql.mjs. Nao edite este arquivo: a fonte de
-- verdade sao as migrations em supabase/migrations/. Edite la e rode
-- `npm run db:studio-sql`.
--
-- Como usar:
--   1. Supabase Studio > SQL Editor > New query
--   2. Cole este arquivo inteiro e execute (Run)
--   3. Confira o resultado com supabase/studio/verify_rls.sql
--
-- Reexecutavel: enums, policies e triggers estao protegidos, entao rodar duas
-- vezes nao quebra. As tabelas usam `create table if not exists` implicito via
-- ordem — se ja existirem com outro shape, derrube o schema antes em vez de
-- confiar neste script para migrar dado existente.
--
-- NAO inclui o seed. Dados de desenvolvimento estao em supabase/seed.sql e
-- nao devem ir para um banco com dados reais.
-- =============================================================================

-- ===========================================================================
-- Origem: supabase/migrations/20260817120000_init_schema.sql
-- ===========================================================================

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

do $$
begin
  create type public.role as enum ('admin', 'member');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.plan as enum ('free', 'pro');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.lead_status as enum ('novo',
  'contatado',
  'qualificado',
  'cliente',
  'perdido');
exception
  when duplicate_object then null;
end $$;

-- Ordem declarada = ordem do funil no PRD. Enum do Postgres ordena pela posição
-- de declaração, então `order by stage` já sai na sequência do board.
do $$
begin
  create type public.deal_stage as enum ('novo_lead',
  'contato_realizado',
  'proposta_enviada',
  'negociacao',
  'fechado_ganho',
  'fechado_perdido');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.activity_type as enum ('call', 'email', 'meeting', 'note');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.subscription_status as enum ('active',
  'trialing',
  'past_due',
  'canceled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.invite_status as enum ('pending',
  'accepted',
  'revoked',
  'expired');
exception
  when duplicate_object then null;
end $$;

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

drop trigger if exists on_auth_user_created on auth.users;
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

drop trigger if exists on_auth_user_updated on auth.users;
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

drop trigger if exists leads_touch_updated_at on public.leads;
create trigger leads_touch_updated_at
  before update on public.leads
  for each row execute function public.touch_updated_at();

drop trigger if exists deals_touch_updated_at on public.deals;
create trigger deals_touch_updated_at
  before update on public.deals
  for each row execute function public.touch_updated_at();

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
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

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();


-- ===========================================================================
-- Origem: supabase/migrations/20260817120100_rls_policies.sql
-- ===========================================================================

-- =============================================================================
-- PipeFlow CRM — Row Level Security
--
-- O isolamento entre empresas é garantido aqui, no Postgres, e em lugar nenhum
-- mais (CLAUDE.md). Nenhuma query do app filtra workspace por conta própria
-- para efeito de segurança: se uma policy estiver errada, o filtro no cliente
-- não salva — e se estiverem certas, esquecer o filtro não vaza.
--
-- Modelo: membro lê e escreve os dados de domínio do seu workspace; admin é o
-- único que administra membros, convites e o próprio workspace; billing só é
-- escrito pelo webhook, com a service-role key.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Funções de apoio
--
-- Precisam ser SECURITY DEFINER por um motivo estrutural: uma policy sobre
-- `workspace_members` que consulte `workspace_members` dispara a própria
-- policy de novo, e o Postgres aborta com recursão infinita. Rodando como dona
-- da função, a consulta ignora RLS e a recursão não se forma.
--
-- `stable` permite ao planner avaliar uma vez por query em vez de por linha.
-- -----------------------------------------------------------------------------

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_workspace_admin(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

-- "Esta pessoa divide algum workspace comigo?" — usada pela policy de profiles.
-- Também SECURITY DEFINER: a consulta toca `workspace_members`, que tem RLS
-- própria, e avaliá-la dentro de outra policy encadearia policies sem
-- necessidade (no melhor caso, custo; no pior, recursão).
create or replace function public.shares_workspace_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members as mine
    join public.workspace_members as theirs
      on theirs.workspace_id = mine.workspace_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = target_user_id
  );
$$;

-- Uma função SECURITY DEFINER é executada com os privilégios de quem a criou.
-- Deixá-la executável por `anon` daria a um visitante não autenticado uma
-- sonda para verificar existência de workspaces. Só sessões autenticadas.
revoke execute on function public.is_workspace_member(uuid) from public, anon;
revoke execute on function public.is_workspace_admin(uuid) from public, anon;
revoke execute on function public.shares_workspace_with(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_admin(uuid) to authenticated;
grant execute on function public.shares_workspace_with(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS habilitado em todas as tabelas, sem exceção.
--
-- Habilitar sem criar policy nenhuma nega tudo por padrão — que é a postura
-- desejada: cada acesso abaixo é uma concessão explícita.
-- -----------------------------------------------------------------------------

alter table public.profiles           enable row level security;
alter table public.workspaces         enable row level security;
alter table public.workspace_members  enable row level security;
alter table public.invites            enable row level security;
alter table public.leads              enable row level security;
alter table public.deals              enable row level security;
alter table public.activities         enable row level security;
alter table public.subscriptions      enable row level security;

-- Deliberadamente SEM `force row level security`. `force` aplicaria as policies
-- também à dona das tabelas — que aqui é `postgres`, a mesma identidade por
-- trás da service-role key. O webhook do Stripe (que precisa escrever em
-- subscriptions sem sessão de usuário) e as rotinas admin deixariam de
-- funcionar. `enable` já nega tudo a `anon` e `authenticated`, que são as roles
-- por onde o cliente entra.

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------

-- Um perfil é visível para quem divide workspace com ele — é o que permite
-- exibir nome e avatar do responsável e do autor da atividade. Não é o
-- diretório inteiro de usuários da plataforma.
drop policy if exists "profiles_select_self_or_shared_workspace" on public.profiles;
create policy "profiles_select_self_or_shared_workspace"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or public.shares_workspace_with(id)
  );

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Sem policy de insert nem de delete: quem cria o perfil é o trigger de signup,
-- e apagá-lo é consequência de apagar a conta em auth.users.

-- -----------------------------------------------------------------------------
-- workspaces
-- -----------------------------------------------------------------------------

drop policy if exists "workspaces_select_member" on public.workspaces;
create policy "workspaces_select_member"
  on public.workspaces for select
  to authenticated
  using (public.is_workspace_member(id));

-- Qualquer autenticado cria workspace, desde que como dono de si mesmo. O
-- `with check` impede criar um workspace já apontando para outra pessoa.
drop policy if exists "workspaces_insert_self_owned" on public.workspaces;
create policy "workspaces_insert_self_owned"
  on public.workspaces for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "workspaces_update_admin" on public.workspaces;
create policy "workspaces_update_admin"
  on public.workspaces for update
  to authenticated
  using (public.is_workspace_admin(id))
  with check (public.is_workspace_admin(id));

-- Apagar o workspace derruba leads, negócios e histórico em cascata. Fica só
-- com o dono, não com todo admin.
drop policy if exists "workspaces_delete_owner" on public.workspaces;
create policy "workspaces_delete_owner"
  on public.workspaces for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- workspace_members
-- -----------------------------------------------------------------------------

drop policy if exists "workspace_members_select_member" on public.workspace_members;
create policy "workspace_members_select_member"
  on public.workspace_members for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists "workspace_members_insert_admin" on public.workspace_members;
create policy "workspace_members_insert_admin"
  on public.workspace_members for insert
  to authenticated
  with check (public.is_workspace_admin(workspace_id));

drop policy if exists "workspace_members_update_admin" on public.workspace_members;
create policy "workspace_members_update_admin"
  on public.workspace_members for update
  to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

-- Admin remove quem quiser; membro pode sair sozinho do workspace.
drop policy if exists "workspace_members_delete_admin_or_self" on public.workspace_members;
create policy "workspace_members_delete_admin_or_self"
  on public.workspace_members for delete
  to authenticated
  using (
    public.is_workspace_admin(workspace_id)
    or user_id = (select auth.uid())
  );

-- O dono não pode ser removido nem rebaixado: um workspace sem admin fica
-- impossível de administrar, e a policy acima deixaria o último admin sair.
create or replace function public.protect_workspace_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
begin
  select owner_id into owner
  from public.workspaces
  where id = coalesce(old.workspace_id, new.workspace_id);

  if tg_op = 'DELETE' and old.user_id = owner then
    raise exception 'O dono do workspace nao pode ser removido.'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'UPDATE' and old.user_id = owner and new.role <> 'admin' then
    raise exception 'O dono do workspace precisa continuar admin.'
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists workspace_members_protect_owner on public.workspace_members;
create trigger workspace_members_protect_owner
  before update or delete on public.workspace_members
  for each row execute function public.protect_workspace_owner();

-- -----------------------------------------------------------------------------
-- invites
--
-- A rota /invite/[token] é pública por natureza: quem recebeu o e-mail ainda
-- não é membro e, muitas vezes, nem tem conta. Ler o convite por token, porém,
-- NÃO é feito por policy — abrir select a `anon` transformaria a tabela num
-- meio de enumerar convites. A rota usa a service-role no servidor, valida o
-- token e a expiração, e só então efetiva o vínculo.
-- -----------------------------------------------------------------------------

drop policy if exists "invites_select_admin" on public.invites;
create policy "invites_select_admin"
  on public.invites for select
  to authenticated
  using (public.is_workspace_admin(workspace_id));

drop policy if exists "invites_insert_admin" on public.invites;
create policy "invites_insert_admin"
  on public.invites for insert
  to authenticated
  with check (
    public.is_workspace_admin(workspace_id)
    and invited_by = (select auth.uid())
  );

drop policy if exists "invites_update_admin" on public.invites;
create policy "invites_update_admin"
  on public.invites for update
  to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

drop policy if exists "invites_delete_admin" on public.invites;
create policy "invites_delete_admin"
  on public.invites for delete
  to authenticated
  using (public.is_workspace_admin(workspace_id));

-- -----------------------------------------------------------------------------
-- leads
--
-- Dado de domínio: qualquer membro do workspace lê e escreve. A distinção
-- admin/membro no PRD é sobre administrar a empresa, não sobre quem pode
-- trabalhar os leads — um vendedor precisa editar o lead do colega.
--
-- Nos inserts, `with check` amarra o workspace_id ao que o usuário pertence:
-- sem ele, um membro poderia gravar uma linha carimbada com o id de outra
-- empresa — escrita cruzada, mesmo com a leitura isolada.
-- -----------------------------------------------------------------------------

drop policy if exists "leads_select_member" on public.leads;
create policy "leads_select_member"
  on public.leads for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists "leads_insert_member" on public.leads;
create policy "leads_insert_member"
  on public.leads for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

-- O `using` diz quais linhas podem ser alteradas; o `with check`, como podem
-- ficar depois. Os dois são necessários: só com `using`, um update poderia
-- mover a linha para outro workspace.
drop policy if exists "leads_update_member" on public.leads;
create policy "leads_update_member"
  on public.leads for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

drop policy if exists "leads_delete_member" on public.leads;
create policy "leads_delete_member"
  on public.leads for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- -----------------------------------------------------------------------------
-- deals
-- -----------------------------------------------------------------------------

drop policy if exists "deals_select_member" on public.deals;
create policy "deals_select_member"
  on public.deals for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists "deals_insert_member" on public.deals;
create policy "deals_insert_member"
  on public.deals for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

drop policy if exists "deals_update_member" on public.deals;
create policy "deals_update_member"
  on public.deals for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

drop policy if exists "deals_delete_member" on public.deals;
create policy "deals_delete_member"
  on public.deals for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- Um negócio não pode apontar para lead de outra empresa. A policy de insert
-- valida o workspace_id da linha, mas não o do lead referenciado — este trigger
-- fecha essa brecha, que seria um vazamento por join.
create or replace function public.assert_deal_lead_same_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.lead_id is not null then
    if not exists (
      select 1 from public.leads
      where id = new.lead_id and workspace_id = new.workspace_id
    ) then
      raise exception 'O lead vinculado pertence a outro workspace.'
        using errcode = 'foreign_key_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists deals_assert_lead_workspace on public.deals;
create trigger deals_assert_lead_workspace
  before insert or update of lead_id, workspace_id on public.deals
  for each row execute function public.assert_deal_lead_same_workspace();

-- -----------------------------------------------------------------------------
-- activities
-- -----------------------------------------------------------------------------

drop policy if exists "activities_select_member" on public.activities;
create policy "activities_select_member"
  on public.activities for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- Só o próprio usuário assina a atividade que cria: `author_id` preso a
-- auth.uid() impede registrar uma ligação em nome de outra pessoa.
drop policy if exists "activities_insert_member" on public.activities;
create policy "activities_insert_member"
  on public.activities for insert
  to authenticated
  with check (
    public.is_workspace_member(workspace_id)
    and author_id = (select auth.uid())
  );

-- Timeline é histórico: cada um edita e apaga o que escreveu. Admin pode
-- remover o que for de qualquer um, para moderar.
drop policy if exists "activities_update_author" on public.activities;
create policy "activities_update_author"
  on public.activities for update
  to authenticated
  using (
    public.is_workspace_member(workspace_id)
    and author_id = (select auth.uid())
  )
  with check (
    public.is_workspace_member(workspace_id)
    and author_id = (select auth.uid())
  );

drop policy if exists "activities_delete_author_or_admin" on public.activities;
create policy "activities_delete_author_or_admin"
  on public.activities for delete
  to authenticated
  using (
    public.is_workspace_member(workspace_id)
    and (
      author_id = (select auth.uid())
      or public.is_workspace_admin(workspace_id)
    )
  );

-- Mesma razão do trigger de deals: a atividade não pode referenciar lead de
-- outra empresa.
create or replace function public.assert_activity_lead_same_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.leads
    where id = new.lead_id and workspace_id = new.workspace_id
  ) then
    raise exception 'O lead da atividade pertence a outro workspace.'
      using errcode = 'foreign_key_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists activities_assert_lead_workspace on public.activities;
create trigger activities_assert_lead_workspace
  before insert or update of lead_id, workspace_id on public.activities
  for each row execute function public.assert_activity_lead_same_workspace();

-- -----------------------------------------------------------------------------
-- subscriptions
--
-- Leitura para membros (a tela de billing mostra plano e uso a todos), mas
-- NENHUMA policy de insert/update/delete para `authenticated` — de propósito.
-- Quem escreve aqui é o webhook do Stripe com a service-role key, que ignora
-- RLS. Se houvesse policy de update, um membro poderia se promover a Pro com
-- um único PATCH no PostgREST e passar por cima do pagamento.
-- -----------------------------------------------------------------------------

drop policy if exists "subscriptions_select_member" on public.subscriptions;
create policy "subscriptions_select_member"
  on public.subscriptions for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- -----------------------------------------------------------------------------
-- Grants
--
-- `config.toml` deste projeto não auto-expõe entidades novas às roles da Data
-- API, então o acesso é concedido explicitamente. RLS decide *quais linhas*;
-- o grant decide *se a tabela existe* para a role. Os dois em conjunto.
--
-- `anon` não recebe nada: toda a área logada exige sessão.
-- -----------------------------------------------------------------------------

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.leads      to authenticated;
grant select, insert, update, delete on public.deals      to authenticated;
grant select, insert, update, delete on public.activities to authenticated;
grant select, insert, update, delete on public.invites    to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.workspaces to authenticated;

-- Billing é somente leitura para o cliente. O webhook usa service-role, que
-- não passa por estes grants.
grant select on public.subscriptions to authenticated;

grant select, update on public.profiles to authenticated;

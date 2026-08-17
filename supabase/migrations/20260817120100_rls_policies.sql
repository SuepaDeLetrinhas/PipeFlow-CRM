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
create policy "profiles_select_self_or_shared_workspace"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or public.shares_workspace_with(id)
  );

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

create policy "workspaces_select_member"
  on public.workspaces for select
  to authenticated
  using (public.is_workspace_member(id));

-- Qualquer autenticado cria workspace, desde que como dono de si mesmo. O
-- `with check` impede criar um workspace já apontando para outra pessoa.
create policy "workspaces_insert_self_owned"
  on public.workspaces for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "workspaces_update_admin"
  on public.workspaces for update
  to authenticated
  using (public.is_workspace_admin(id))
  with check (public.is_workspace_admin(id));

-- Apagar o workspace derruba leads, negócios e histórico em cascata. Fica só
-- com o dono, não com todo admin.
create policy "workspaces_delete_owner"
  on public.workspaces for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- workspace_members
-- -----------------------------------------------------------------------------

create policy "workspace_members_select_member"
  on public.workspace_members for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "workspace_members_insert_admin"
  on public.workspace_members for insert
  to authenticated
  with check (public.is_workspace_admin(workspace_id));

create policy "workspace_members_update_admin"
  on public.workspace_members for update
  to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

-- Admin remove quem quiser; membro pode sair sozinho do workspace.
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

create policy "invites_select_admin"
  on public.invites for select
  to authenticated
  using (public.is_workspace_admin(workspace_id));

create policy "invites_insert_admin"
  on public.invites for insert
  to authenticated
  with check (
    public.is_workspace_admin(workspace_id)
    and invited_by = (select auth.uid())
  );

create policy "invites_update_admin"
  on public.invites for update
  to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

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

create policy "leads_select_member"
  on public.leads for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "leads_insert_member"
  on public.leads for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

-- O `using` diz quais linhas podem ser alteradas; o `with check`, como podem
-- ficar depois. Os dois são necessários: só com `using`, um update poderia
-- mover a linha para outro workspace.
create policy "leads_update_member"
  on public.leads for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "leads_delete_member"
  on public.leads for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- -----------------------------------------------------------------------------
-- deals
-- -----------------------------------------------------------------------------

create policy "deals_select_member"
  on public.deals for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "deals_insert_member"
  on public.deals for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "deals_update_member"
  on public.deals for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

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

create trigger deals_assert_lead_workspace
  before insert or update of lead_id, workspace_id on public.deals
  for each row execute function public.assert_deal_lead_same_workspace();

-- -----------------------------------------------------------------------------
-- activities
-- -----------------------------------------------------------------------------

create policy "activities_select_member"
  on public.activities for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- Só o próprio usuário assina a atividade que cria: `author_id` preso a
-- auth.uid() impede registrar uma ligação em nome de outra pessoa.
create policy "activities_insert_member"
  on public.activities for insert
  to authenticated
  with check (
    public.is_workspace_member(workspace_id)
    and author_id = (select auth.uid())
  );

-- Timeline é histórico: cada um edita e apaga o que escreveu. Admin pode
-- remover o que for de qualquer um, para moderar.
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

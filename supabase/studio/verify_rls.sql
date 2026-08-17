-- =============================================================================
-- PipeFlow CRM — verificacao do isolamento por workspace
--
-- Rode DEPOIS de apply_all.sql, no SQL Editor. Cada bloco imprime um veredito;
-- qualquer linha marcada FALHA significa que o isolamento nao esta valendo.
--
-- Este arquivo nao altera schema. As secoes 4 e 5 escrevem e desfazem dentro de
-- uma transacao com rollback, entao nao deixam residuo.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. RLS habilitada em todas as tabelas do schema public
-- -----------------------------------------------------------------------------

select
  c.relname as tabela,
  case when c.relrowsecurity then 'ok' else 'FALHA — RLS desabilitada' end as veredito
from pg_class as c
join pg_namespace as n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relrowsecurity, c.relname;


-- -----------------------------------------------------------------------------
-- 2. Toda tabela com RLS tem pelo menos uma policy
--
-- RLS ligada sem policy nenhuma nega tudo silenciosamente — a tela fica vazia
-- sem erro, que e o sintoma mais dificil de diagnosticar depois.
-- -----------------------------------------------------------------------------

select
  c.relname as tabela,
  count(p.polname) as policies,
  case
    when count(p.polname) = 0 then 'FALHA — RLS ligada e nenhuma policy'
    else 'ok'
  end as veredito
from pg_class as c
join pg_namespace as n on n.oid = c.relnamespace
left join pg_policy as p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity
group by c.relname
order by count(p.polname), c.relname;


-- -----------------------------------------------------------------------------
-- 3. subscriptions nao pode ter policy de escrita para `authenticated`
--
-- Se tiver, um membro se promove a Pro com um PATCH no PostgREST, sem pagar.
-- -----------------------------------------------------------------------------

select
  coalesce(p.polname, '(nenhuma)') as policy_de_escrita,
  case
    when p.polname is null then 'ok — billing so escreve via service-role'
    else 'FALHA — membro poderia alterar o proprio plano'
  end as veredito
from pg_class as c
join pg_namespace as n on n.oid = c.relnamespace
left join pg_policy as p
  on p.polrelid = c.oid
  and p.polcmd in ('a', 'w', 'd')  -- insert, update, delete
where n.nspname = 'public'
  and c.relname = 'subscriptions';


-- -----------------------------------------------------------------------------
-- 4. Isolamento de leitura entre workspaces
--
-- Assume o seed carregado: Marina (a0…001) e membro da Lumiar (b0…001) e da
-- Vertex (b0…002); Diego (a0…004) so da Vertex.
--
-- `set local role authenticated` + `request.jwt.claims` e o que faz auth.uid()
-- devolver o usuario simulado — sem isso a query roda como postgres e ignora
-- as policies, dando um falso "ok".
-- -----------------------------------------------------------------------------

begin;

-- Diego enxerga apenas a Vertex.
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}';

select
  'Diego ve workspaces' as cenario,
  count(*) as visiveis,
  case when count(*) = 1 then 'ok' else 'FALHA — deveria ver so a Vertex' end as veredito
from public.workspaces;

select
  'Diego ve leads da Lumiar' as cenario,
  count(*) as visiveis,
  case when count(*) = 0 then 'ok' else 'FALHA — vazamento entre empresas' end as veredito
from public.leads
where workspace_id = 'b0000000-0000-4000-8000-000000000001';

select
  'Diego ve negocios da Lumiar' as cenario,
  count(*) as visiveis,
  case when count(*) = 0 then 'ok' else 'FALHA — vazamento entre empresas' end as veredito
from public.deals
where workspace_id = 'b0000000-0000-4000-8000-000000000001';

select
  'Diego ve atividades da Lumiar' as cenario,
  count(*) as visiveis,
  case when count(*) = 0 then 'ok' else 'FALHA — vazamento entre empresas' end as veredito
from public.activities
where workspace_id = 'b0000000-0000-4000-8000-000000000001';

-- Marina, membro dos dois, enxerga os dois.
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';

select
  'Marina ve workspaces' as cenario,
  count(*) as visiveis,
  case when count(*) = 2 then 'ok' else 'FALHA — deveria ver Lumiar e Vertex' end as veredito
from public.workspaces;

rollback;


-- -----------------------------------------------------------------------------
-- 5. Isolamento de ESCRITA
--
-- O caso que passa despercebido: a leitura pode estar isolada e a escrita nao.
-- Sem `with check`, Diego gravaria um lead carimbado com o id da Lumiar.
-- Espera-se que os tres blocos abaixo sejam BLOQUEADOS.
-- -----------------------------------------------------------------------------

begin;

set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}';

-- 5a. Inserir lead em workspace alheio
do $$
begin
  insert into public.leads (workspace_id, name, owner_id, status)
  values (
    'b0000000-0000-4000-8000-000000000001',
    'Lead injetado por outro workspace',
    'a0000000-0000-4000-8000-000000000004',
    'novo'
  );
  raise warning 'FALHA — insert cruzado foi aceito em leads';
exception
  when insufficient_privilege or check_violation then
    raise notice 'ok — insert cruzado bloqueado pela RLS';
end $$;

-- 5b. Promover o proprio workspace a Pro
do $$
declare
  afetadas integer;
begin
  update public.subscriptions
  set plan = 'pro'
  where workspace_id = 'b0000000-0000-4000-8000-000000000002';

  get diagnostics afetadas = row_count;

  if afetadas > 0 then
    raise warning 'FALHA — membro alterou o proprio plano (% linhas)', afetadas;
  else
    raise notice 'ok — upgrade por conta propria bloqueado';
  end if;
exception
  when insufficient_privilege then
    raise notice 'ok — upgrade por conta propria bloqueado (sem grant)';
end $$;

-- 5c. Vincular negocio a lead de outra empresa
do $$
begin
  insert into public.deals (workspace_id, title, value, stage, owner_id, lead_id)
  values (
    'b0000000-0000-4000-8000-000000000002',
    'Negocio apontando para lead alheio',
    1000,
    'novo_lead',
    'a0000000-0000-4000-8000-000000000004',
    'c0000000-0000-4000-8000-000000000001'  -- lead da Lumiar
  );
  raise warning 'FALHA — negocio vinculou lead de outro workspace';
exception
  when foreign_key_violation or insufficient_privilege or check_violation then
    raise notice 'ok — vinculo cruzado bloqueado pelo trigger';
end $$;

rollback;


-- -----------------------------------------------------------------------------
-- 6. Resumo das policies, para conferencia visual
-- -----------------------------------------------------------------------------

select
  c.relname as tabela,
  p.polname as policy,
  case p.polcmd
    when 'r' then 'select'
    when 'a' then 'insert'
    when 'w' then 'update'
    when 'd' then 'delete'
    when '*' then 'all'
  end as operacao,
  case when p.polwithcheck is not null then 'sim' else '—' end as tem_with_check
from pg_policy as p
join pg_class as c on c.oid = p.polrelid
join pg_namespace as n on n.oid = c.relnamespace
where n.nspname = 'public'
order by c.relname, p.polcmd;

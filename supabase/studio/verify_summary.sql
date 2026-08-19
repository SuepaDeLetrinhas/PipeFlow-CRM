-- =============================================================================
-- PipeFlow CRM — verificacao resumida, em UMA tabela de resultado
--
-- O SQL Editor do Studio exibe apenas o resultado da ULTIMA query do script.
-- O verify_rls.sql tem 6 secoes, entao os vereditos das 5 primeiras passam
-- despercebidos. Este arquivo devolve tudo junto: uma linha por checagem,
-- com a coluna `veredito` marcando ok ou FALHA.
--
-- Rode DEPOIS de apply_all.sql. Nao altera schema nem dado.
--
-- As checagens de isolamento (4 e 5) so tem valor com o seed carregado. Sem
-- ele, este script diz "SEM SEED" em vez de fingir um ok: zero linhas visiveis
-- passaria no teste tanto por isolamento correto quanto por banco vazio.
-- =============================================================================

with

-- 1. RLS habilitada em toda tabela do schema public
rls as (
  select
    1 as ordem,
    'RLS habilitada' as checagem,
    c.relname as alvo,
    case when c.relrowsecurity then 'ok' else 'FALHA — RLS desabilitada' end as veredito
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),

-- 2. Toda tabela com RLS tem policy. RLS sem policy nega tudo em silencio:
-- a tela fica vazia sem erro, que e o sintoma mais dificil de diagnosticar.
--
-- Excecao: as tabelas de infraestrutura do webhook (`stripe_events`,
-- `payment_alerts`) sao deny-all de proposito — RLS ligada, policy nenhuma e
-- `revoke all` de anon/authenticated. Nenhuma tela le essas linhas; quem
-- escreve e le e a service-role, que ignora RLS. Para elas o veredito se
-- inverte: policy nenhuma e o esperado, e o que precisa ser conferido e se o
-- revoke esta mesmo valendo — sem ele o projeto cloud auto-expoe a tabela na
-- Data API e a leitura por anon devolve `[]` com 200 em vez de erro.
policies as (
  select
    2 as ordem,
    'Tem policies' as checagem,
    c.relname as alvo,
    case
      when c.relname in ('stripe_events', 'payment_alerts') then
        case
          when count(p.polname) > 0
            then 'FALHA — tabela deny-all ganhou ' || count(p.polname) || ' policy(s)'
          when exists (
            select 1 from information_schema.role_table_grants as g
            where g.table_schema = 'public'
              and g.table_name = c.relname
              and g.grantee in ('anon', 'authenticated')
          ) then 'FALHA — deny-all mas com grant para anon/authenticated'
          else 'ok — deny-all por desenho (so service-role)'
        end
      when count(p.polname) = 0 then 'FALHA — RLS ligada e nenhuma policy'
      else 'ok — ' || count(p.polname) || ' policies'
    end as veredito
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  left join pg_policy as p on p.polrelid = c.oid
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  group by c.relname
),

-- 3. subscriptions nao pode ter policy de escrita para `authenticated`:
-- com uma, um membro vira Pro com um PATCH no PostgREST, sem pagar.
billing as (
  select
    3 as ordem,
    'Billing protegido' as checagem,
    'subscriptions' as alvo,
    case
      when count(*) = 0 then 'ok — so escreve via service-role'
      else 'FALHA — ' || count(*) || ' policy(s) de escrita expostas'
    end as veredito
  from pg_policy as p
  join pg_class as c on c.oid = p.polrelid
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'subscriptions'
    and p.polcmd in ('a', 'w', 'd')
),

-- 4. Todo insert/update precisa de WITH CHECK. Sem ele, um membro grava
-- linha carimbada com o workspace_id de outra empresa — a leitura fica
-- isolada e a escrita nao, que e o caso que passa despercebido.
withcheck as (
  select
    4 as ordem,
    'WITH CHECK em escrita' as checagem,
    c.relname || '.' || p.polname as alvo,
    case
      when p.polwithcheck is null then 'FALHA — insert/update sem WITH CHECK'
      else 'ok'
    end as veredito
  from pg_policy as p
  join pg_class as c on c.oid = p.polrelid
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'public' and p.polcmd in ('a', 'w')
),

-- 5. As funcoes de apoio precisam ser SECURITY DEFINER: sem isso, a policy
-- de workspace_members consulta workspace_members e aborta por recursao.
funcoes as (
  select
    5 as ordem,
    'Funcao SECURITY DEFINER' as checagem,
    p.proname as alvo,
    case when p.prosecdef then 'ok' else 'FALHA — recursao de RLS provavel' end as veredito
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('is_workspace_member', 'is_workspace_admin', 'shares_workspace_with')
),

-- 6. Os triggers de integridade e de signup existem
triggers as (
  select
    6 as ordem,
    'Trigger presente' as checagem,
    t.tgname as alvo,
    'ok' as veredito
  from pg_trigger as t
  where not t.tgisinternal
    and t.tgname in (
      'on_auth_user_created', 'on_workspace_created',
      'deals_assert_lead_workspace', 'activities_assert_lead_workspace',
      'workspace_members_protect_owner'
    )
),

-- 7. O seed esta carregado? Define se as checagens de isolamento valem.
seed as (
  select
    7 as ordem,
    'Seed carregado' as checagem,
    'workspaces' as alvo,
    case
      when count(*) >= 2 then 'ok — ' || count(*) || ' workspaces, isolamento testavel'
      else 'SEM SEED — carregue supabase/seed.sql antes de testar isolamento'
    end as veredito
  from public.workspaces
)

select checagem, alvo, veredito
from (
  select * from rls
  union all select * from policies
  union all select * from billing
  union all select * from withcheck
  union all select * from funcoes
  union all select * from triggers
  union all select * from seed
) as t
-- FALHA primeiro: se houver problema, aparece no topo em vez de se perder
-- no meio de 40 linhas de ok.
order by (veredito like 'FALHA%') desc, ordem, alvo;

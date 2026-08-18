-- =============================================================================
-- PipeFlow CRM — agregações do dashboard (M13)
--
-- As quatro métricas e o funil eram calculados em JS sobre a lista inteira de
-- leads e negócios. Isso significa transferir todas as linhas do workspace para
-- somar e contar — trabalho que o Postgres faz sem mover dado nenhum.
--
-- Nenhuma função é `security definer`: todas rodam sob RLS, e portanto só
-- enxergam o workspace de quem chama. Como `is_workspace_member` já filtra as
-- linhas, uma métrica de workspace alheio volta zerada em vez de vazar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Métricas dos quatro cards
--
-- Uma função só, e não quatro: os números vêm do mesmo conjunto de linhas, e
-- separá-los faria o Postgres varrer `deals` três vezes para responder a uma
-- única tela.
-- -----------------------------------------------------------------------------

create or replace function public.dashboard_metrics(target_workspace_id uuid)
returns table (
  total_leads bigint,
  open_deals bigint,
  pipeline_value numeric,
  won_deals bigint,
  closed_deals bigint
)
language sql
stable
set search_path = ''
as $$
  select
    (
      select count(*)
      from public.leads
      where workspace_id = target_workspace_id
    ) as total_leads,
    count(*) filter (
      where stage not in ('fechado_ganho', 'fechado_perdido')
    ) as open_deals,
    -- `coalesce` porque `sum()` sobre conjunto vazio devolve null, e o card
    -- mostraria "R$ NaN" num workspace recém-criado.
    coalesce(
      sum(value) filter (
        where stage not in ('fechado_ganho', 'fechado_perdido')
      ),
      0
    ) as pipeline_value,
    count(*) filter (where stage = 'fechado_ganho') as won_deals,
    count(*) filter (
      where stage in ('fechado_ganho', 'fechado_perdido')
    ) as closed_deals
  from public.deals
  where workspace_id = target_workspace_id;
$$;

revoke execute on function public.dashboard_metrics(uuid) from public, anon;
grant execute on function public.dashboard_metrics(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Funil
--
-- Só as 4 etapas em aberto: Ganho e Perdido são desfecho, não degrau, e
-- incluí-los faria o mesmo negócio ser contado duas vezes ao longo do tempo
-- (decisão registrada no M6 do PLAN.md).
--
-- O `left join` contra a lista de etapas garante linha para etapa vazia — etapa
-- sem negócio é informação, não ausência, e sumir do gráfico distorceria a
-- leitura do funil.
-- -----------------------------------------------------------------------------

create or replace function public.dashboard_funnel(target_workspace_id uuid)
returns table (
  stage public.deal_stage,
  count bigint,
  value numeric
)
language sql
stable
set search_path = ''
as $$
  select
    s.stage,
    count(d.id) as count,
    coalesce(sum(d.value), 0) as value
  from unnest(array[
    'novo_lead',
    'contato_realizado',
    'proposta_enviada',
    'negociacao'
  ]::public.deal_stage[]) as s(stage)
  left join public.deals as d
    on d.stage = s.stage
   and d.workspace_id = target_workspace_id
  group by s.stage
  -- Ordena pela posição no enum, que o M8 declarou na ordem do funil.
  order by s.stage;
$$;

revoke execute on function public.dashboard_funnel(uuid) from public, anon;
grant execute on function public.dashboard_funnel(uuid) to authenticated;

-- =============================================================================
-- PipeFlow CRM — busca no banco e movimentação transacional de negócios
--
-- Duas necessidades que só apareceram quando as telas passaram a ler do
-- Postgres (M11/M12):
--
-- 1. O PostgREST filtra por COLUNA, não por expressão arbitrária. Os índices do
--    M8 foram criados sobre `pipeflow_normalize(...)` e sobre
--    `regexp_replace(phone, ...)`, que o cliente não tem como referenciar num
--    `.or()`. Sem colunas geradas, a busca voltaria para o Node — trazendo a
--    tabela inteira a cada tecla digitada.
--
-- 2. Reordenar o Kanban mexe em várias linhas de uma vez. Feito com updates
--    soltos, uma falha no meio deixa a coluna com posições duplicadas ou com
--    buracos. Uma função transacional resolve tudo ou nada.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Colunas geradas para a busca
--
-- `stored`, não `virtual`: o índice precisa de valor materializado, e a busca
-- de leads é muito mais frequente que a escrita.
-- -----------------------------------------------------------------------------

alter table public.leads
  add column if not exists search_text text
  generated always as (
    public.pipeflow_normalize(
      coalesce(name, '') || ' ' || coalesce(company, '') || ' ' || coalesce(email, '')
    )
  ) stored;

comment on column public.leads.search_text is
  'Nome + empresa + e-mail normalizados (sem acento, minúsculo). Existe para o '
  'PostgREST poder filtrar com ilike usando indice — o cliente nao consegue '
  'chamar pipeflow_normalize() dentro de um .or().';

alter table public.leads
  add column if not exists phone_digits text
  generated always as (regexp_replace(coalesce(phone, ''), '\D', '', 'g')) stored;

comment on column public.leads.phone_digits is
  'Telefone so com digitos: quem digita "11988124410" ou "(11) 98812" acha o '
  'mesmo lead, sem depender da mascara gravada.';

-- Os índices do M8 eram sobre as expressões; agora precisam ser sobre as
-- colunas, senão o planner não os associa ao `ilike` que o PostgREST gera.
drop index if exists public.leads_search_idx;
drop index if exists public.leads_phone_digits_idx;

create index leads_search_text_idx
  on public.leads using gin (search_text extensions.gin_trgm_ops);

create index leads_phone_digits_idx
  on public.leads using gin (phone_digits extensions.gin_trgm_ops);

-- gin_trgm_ops nos dois: a busca é por substring no meio da palavra
-- (`%termo%`), e btree só serviria para prefixo.

-- -----------------------------------------------------------------------------
-- Posição inicial de um negócio novo
--
-- O card entra no fim da coluna. Calcular no banco evita a corrida entre ler o
-- maior `position` e inserir com ele + 1: dois usuários criando ao mesmo tempo
-- receberiam a mesma posição.
-- -----------------------------------------------------------------------------

create or replace function public.next_deal_position(
  target_workspace_id uuid,
  target_stage public.deal_stage
)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(max(position) + 1, 0)
  from public.deals
  where workspace_id = target_workspace_id
    and stage = target_stage;
$$;

revoke execute on function public.next_deal_position(uuid, public.deal_stage)
  from public, anon;
grant execute on function public.next_deal_position(uuid, public.deal_stage)
  to authenticated;

-- -----------------------------------------------------------------------------
-- move_deal — mover entre etapas e reordenar dentro da coluna
--
-- NÃO é `security definer`. A função roda com os privilégios de quem chama, e
-- portanto **sob RLS**: mover um negócio de outro workspace não encontra a
-- linha e levanta exceção. Marcar como definer aqui contornaria justamente o
-- isolamento que o M8 construiu — a função não precisa de privilégio extra,
-- porque só toca linhas que o próprio usuário já pode atualizar.
-- -----------------------------------------------------------------------------

create or replace function public.move_deal(
  deal_id uuid,
  target_stage public.deal_stage,
  target_position integer
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  source_workspace uuid;
  source_stage public.deal_stage;
  final_position integer;
  column_size integer;
begin
  -- `for update` segura a linha até o fim da transação: dois arrastes
  -- simultâneos do mesmo card serializam em vez de embaralhar as posições.
  select workspace_id, stage into source_workspace, source_stage
  from public.deals
  where id = deal_id
  for update;

  -- Não encontrou: ou o id não existe, ou a RLS o tornou invisível. Os dois
  -- casos são o mesmo erro para quem chama — não confirmamos existência.
  if source_workspace is null then
    raise exception 'Negocio nao encontrado.'
      using errcode = 'no_data_found';
  end if;

  -- Tira o card da coluna de origem e fecha o buraco que ele deixou, para as
  -- posições seguirem contíguas a partir de zero.
  update public.deals
  set position = position - 1
  where workspace_id = source_workspace
    and stage = source_stage
    and position > (select position from public.deals where id = deal_id);

  select count(*) into column_size
  from public.deals
  where workspace_id = source_workspace
    and stage = target_stage
    and id <> deal_id;

  -- Posição forjada (ou defasada, quando outra pessoa mexeu na coluna no meio
  -- do gesto) é fixada no intervalo válido em vez de abrir buraco.
  final_position := greatest(0, least(target_position, column_size));

  -- Abre espaço no destino.
  update public.deals
  set position = position + 1
  where workspace_id = source_workspace
    and stage = target_stage
    and id <> deal_id
    and position >= final_position;

  update public.deals
  set stage = target_stage,
      position = final_position
  where id = deal_id;
end;
$$;

revoke execute on function public.move_deal(uuid, public.deal_stage, integer)
  from public, anon;
grant execute on function public.move_deal(uuid, public.deal_stage, integer)
  to authenticated;

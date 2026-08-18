-- =============================================================================
-- PipeFlow CRM — log de eventos processados do Stripe
--
-- Até aqui a idempotência do webhook vinha inteira do `on conflict
-- (workspace_id)` do upsert em `subscriptions`: reentregar o mesmo evento
-- reescrevia a mesma linha com os mesmos valores, e o efeito era nulo.
--
-- Isso é verdade enquanto **todo** handler for idempotente por construção, o
-- que é uma propriedade que ninguém declara e o próximo handler pode quebrar
-- sem que nada acuse. Registrar o `event.id` move a garantia do formato de
-- cada escrita para a porta de entrada: um evento já visto nem chega ao
-- switch.
--
-- Também é o que permite descartar evento **fora de ordem**. O Stripe não
-- garante ordem de entrega: um `customer.subscription.updated` atrasado pode
-- chegar depois do `.deleted` que veio a seguir, e o upsert cru reporia um
-- estado morto por cima do atual. Com `event_created_at` gravado, o handler
-- compara idades e ignora o mais velho.
-- =============================================================================

create table if not exists public.stripe_events (
  -- O id do próprio evento no Stripe (`evt_…`) é a chave: é ele que se repete
  -- na reentrega, e é sobre ele que a unicidade precisa valer. Sem coluna
  -- surrogate — não há nada que uma segunda chave acrescentasse.
  id text primary key,
  type text not null,
  -- `event.created` do Stripe, não `now()`: a comparação de antiguidade tem de
  -- ser feita no relógio de quem emitiu, senão dois eventos entregues fora de
  -- ordem seriam registrados na ordem errada de chegada.
  event_created_at timestamptz not null,
  processed_at timestamptz not null default now()
);

-- A limpeza periódica varre por idade; sem índice ela vira seq scan sobre uma
-- tabela que só cresce.
create index if not exists stripe_events_processed_at_idx
  on public.stripe_events (processed_at);

-- -----------------------------------------------------------------------------
-- RLS
--
-- Mesma postura de `subscriptions`, um passo além: aqui não há policy nenhuma,
-- nem de select. Não existe tela que leia este log — é infraestrutura do
-- webhook. Com RLS ligada e zero policies, `authenticated` não enxerga linha
-- alguma; quem escreve e lê é a service-role, que ignora RLS.
--
-- O `revoke` é explícito, e não uma omissão de `grant`. Verificado rodando: sem
-- ele, uma leitura com a chave anon devolve `[]` (200) em vez de erro — a RLS
-- barra as linhas, mas a tabela responde na Data API, porque o projeto cloud
-- ainda auto-expõe entidades novas criadas por `postgres` no schema `public`.
-- Escrita já estava barrada pela RLS (42501) nos dois casos; o revoke tira
-- também a existência da tabela do alcance de quem não tem nada a ver com ela.
-- -----------------------------------------------------------------------------

alter table public.stripe_events enable row level security;

revoke all on public.stripe_events from anon, authenticated;

-- =============================================================================
-- PipeFlow CRM — registro de avisos de cobrança enviados
--
-- O dunning do Stripe emite `invoice.payment_failed` a **cada** tentativa de
-- cobrança, não só na primeira: a configuração padrão tenta quatro vezes ao
-- longo de duas semanas. Sem registro, o admin recebe quatro e-mails idênticos
-- por uma única fatura vencida, e o quarto é o que faz a pessoa marcar o
-- remetente como spam.
--
-- `stripe_events` não resolve isso: ela deduplica **reentrega do mesmo
-- evento**, e cada retry do dunning é um evento novo e legítimo, com id
-- próprio. O que se repete é a fatura. Por isso a chave aqui é o `invoice_id`.
--
-- Uma linha por fatura avisada. A segunda tentativa da mesma fatura encontra a
-- linha e não envia; uma fatura nova (mês seguinte) tem id novo e avisa de
-- novo, que é o comportamento desejado.
-- =============================================================================

create table if not exists public.payment_alerts (
  -- O id da fatura no Stripe (`in_…`). É ela que se repete entre os retries.
  invoice_id text primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Quantos destinatários o envio alcançou. Serve para distinguir, no
  -- diagnóstico, "não avisamos" de "avisamos e ninguém leu".
  recipients integer not null default 0,
  sent_at timestamptz not null default now()
);

-- Diagnóstico por workspace ("este cliente foi avisado?") e a limpeza por
-- idade. Sem índice, as duas viram seq scan.
create index if not exists payment_alerts_workspace_id_sent_at_idx
  on public.payment_alerts (workspace_id, sent_at desc);

-- -----------------------------------------------------------------------------
-- RLS
--
-- Mesma postura de `stripe_events`: RLS ligada, policy nenhuma, grant nenhum.
-- Não há tela que leia este registro — é controle interno do webhook. O
-- `revoke` é explícito porque o projeto cloud ainda auto-expõe entidades novas
-- criadas por `postgres` no schema `public`, e a omissão do `grant` sozinha
-- deixaria a tabela respondendo `[]` com 200 na Data API.
-- -----------------------------------------------------------------------------

alter table public.payment_alerts enable row level security;

revoke all on public.payment_alerts from anon, authenticated;

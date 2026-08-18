import type Stripe from "stripe";

import { stripeEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan, SubscriptionStatus } from "@/types";

/**
 * Webhook do Stripe — o **único** lugar que escreve em `subscriptions`.
 *
 * Este é o segundo consumidor legítimo da service-role no projeto (o primeiro
 * é o aceite de convite). A razão está na migration de RLS: `subscriptions`
 * não tem policy de insert/update para `authenticated`, de propósito. Se
 * tivesse, um membro se promoveria a Pro com um PATCH no PostgREST e passaria
 * por cima do pagamento. Quem escreve é este handler, sem sessão de usuário,
 * autenticado pela assinatura do Stripe.
 *
 * ## Três invariantes
 *
 * 1. **Corpo cru.** A assinatura é calculada sobre os bytes exatos do payload.
 *    `req.text()`, nunca `req.json()`: reserializar muda espaços e ordem de
 *    chaves, e a verificação passa a falhar em eventos legítimos.
 * 2. **Idempotência.** O Stripe reentrega o mesmo evento em qualquer resposta
 *    que não seja 2xx, e reentrega mesmo depois de um 200 em falhas de rede.
 *    Todo handler aqui é um `upsert` com `onConflict: "workspace_id"` — rodar
 *    duas vezes tem o mesmo efeito de rodar uma.
 * 3. **Status HTTP com significado.** 400 em assinatura inválida (não adianta
 *    reentregar), 200 em evento que não tratamos (senão o Stripe reentrega
 *    para sempre) e 500 só em falha real de escrita, que é onde o retry ajuda.
 */

/**
 * Fora do runtime Edge de propósito: a verificação de assinatura usa o crypto
 * do Node, e `createAdminClient()` é `server-only`.
 */
export const runtime = "nodejs";

/**
 * Nada aqui pode ser cacheado nem pré-renderizado — toda requisição é um
 * evento novo.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Assinatura ausente." }, { status: 400 });
  }

  const { STRIPE_WEBHOOK_SECRET } = stripeEnv();
  const stripe = getStripe();
  const payload = await req.text();

  let event: Stripe.Event;

  try {
    // `constructEventAsync`, e não a versão síncrona: em runtimes que usam
    // WebCrypto a comparação é assíncrona, e a síncrona lança pedindo esta.
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    // Sem log do payload: um corpo não verificado é entrada anônima, e
    // despejá-lo no log convida a poluir a observabilidade de fora.
    console.error("[stripe] assinatura inválida no webhook", error);

    return Response.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, stripe);
        break;

      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object, stripe);
        break;

      default:
        // Evento que não tratamos ainda é evento entregue com sucesso. 200
        // aqui é o que impede o Stripe de reentregar em loop tudo o que o
        // endpoint estiver assinando e este switch não conhecer.
        break;
    }
  } catch (error) {
    console.error("[stripe] falha ao processar evento", {
      id: event.id,
      type: event.type,
      error,
    });

    // 500 pede retry ao Stripe. É o que queremos: a falha aqui é de escrita no
    // nosso banco, não do evento, e a próxima tentativa pode dar certo.
    return Response.json({ error: "Falha ao processar." }, { status: 500 });
  }

  return Response.json({ received: true });
}

/**
 * Fim do checkout. A sessão em si não traz a assinatura expandida, então
 * buscamos a Subscription e caímos no mesmo `syncSubscription()` dos demais
 * eventos — um caminho de escrita só.
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
) {
  // Modo `payment` (compra avulsa) não cria assinatura. Hoje o app só faz
  // checkout de subscription, mas o endpoint pode receber outros modos se
  // alguém criar uma sessão pelo painel.
  if (session.mode !== "subscription") return;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // A sessão conhece o workspace mesmo quando a subscription não conhece —
  // por `metadata` ou pelo `client_reference_id`. Repassar aqui cobre uma
  // assinatura criada à mão no painel, sem metadata nenhum.
  await syncSubscription(
    subscription,
    session.metadata?.workspace_id ?? session.client_reference_id ?? undefined,
  );
}

/**
 * Cobrança recorrente que falhou.
 *
 * Não rebaixa ninguém: quem decide isso é o Stripe, que move a assinatura para
 * `past_due` e depois `canceled` conforme as regras de dunning da conta. Aqui
 * só refletimos o estado atual da assinatura, para a tela de billing poder
 * avisar que o cartão precisa de atenção.
 */
async function handlePaymentFailed(invoice: Stripe.Invoice, stripe: Stripe) {
  // A ligação fatura → assinatura mudou de lugar entre versões da API: hoje
  // vem nas linhas da fatura, não num campo `subscription` no topo.
  const line = invoice.lines?.data
    .map((item) => item.subscription)
    .find((value): value is string | Stripe.Subscription => Boolean(value));

  if (!line) return;

  const id = typeof line === "string" ? line : line.id;

  await syncSubscription(await stripe.subscriptions.retrieve(id));
}

/**
 * Espelha uma Subscription do Stripe na tabela `subscriptions`.
 *
 * Único ponto de escrita: todos os eventos convergem para cá, então a regra de
 * "como um estado do Stripe vira uma linha nossa" existe uma vez só.
 */
async function syncSubscription(
  subscription: Stripe.Subscription,
  fallbackWorkspaceId?: string,
) {
  const workspaceId = subscription.metadata?.workspace_id ?? fallbackWorkspaceId;

  // Sem workspace não há o que atualizar. Acontece se alguém criar uma
  // assinatura pelo painel do Stripe sem o metadata — ignorar é melhor do que
  // adivinhar qual tenant promover.
  if (!workspaceId) {
    console.warn("[stripe] assinatura sem workspace_id no metadata", {
      subscriptionId: subscription.id,
    });

    return;
  }

  const status = mapStatus(subscription.status);
  const plan: Plan = status === "canceled" ? "free" : "pro";

  const admin = createAdminClient();

  const { error } = await admin.from("subscriptions").upsert(
    {
      workspace_id: workspaceId,
      stripe_customer_id:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      status,
      plan,
      current_period_end: periodEnd(subscription),
      updated_at: new Date().toISOString(),
    },
    // É este `onConflict` que torna o handler idempotente: a reentrega do
    // mesmo evento atualiza a linha existente em vez de estourar o
    // `unique (workspace_id)` da tabela.
    { onConflict: "workspace_id" },
  );

  if (error) {
    // `throw` para o POST devolver 500 e o Stripe reentregar. Engolir aqui
    // deixaria o workspace pago preso no Free sem nenhum sinal.
    throw new Error(`upsert em subscriptions falhou: ${error.message}`);
  }

  // `workspaces.plan` é cache denormalizado da mesma informação — a fonte da
  // verdade é a linha acima. Mantido em sincronia aqui, na mesma escrita, para
  // que as telas que já leem o workspace não precisem de um segundo
  // round-trip. Ver `resolvePlan()` em `lib/stripe/plan.ts`.
  const { error: workspaceError } = await admin
    .from("workspaces")
    .update({ plan })
    .eq("id", workspaceId);

  if (workspaceError) {
    throw new Error(
      `sincronizar workspaces.plan falhou: ${workspaceError.message}`,
    );
  }
}

/**
 * Fim do período pago, para a tela mostrar "renova em …".
 *
 * Mora nos **items**, e não na Subscription: a API moveu o campo quando
 * assinaturas passaram a poder ter itens com ciclos diferentes. Pegamos o
 * menor — é quando o próximo evento de cobrança acontece.
 */
function periodEnd(subscription: Stripe.Subscription): string | null {
  const ends = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number");

  if (!ends.length) return null;

  return new Date(Math.min(...ends) * 1000).toISOString();
}

/**
 * Traduz o status do Stripe para o enum `subscription_status` do Postgres, que
 * tem quatro valores contra os nove de lá.
 *
 * `unpaid`, `incomplete_expired` e `paused` caem em `canceled` — em todos eles
 * o acesso pago acabou. `incomplete` (checkout iniciado e não concluído) vira
 * `past_due`: ainda não pagou, mas também não é um cancelamento.
 */
function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "incomplete":
      return "past_due";
    default:
      return "canceled";
  }
}

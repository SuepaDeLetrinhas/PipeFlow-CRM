"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/actions/require-admin";
import type { ActionResult } from "@/lib/actions/result";
import { getSubscription } from "@/lib/data";
import { env, stripeEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe/client";

/**
 * Server Actions de cobrança: iniciar o checkout e abrir o Customer Portal.
 *
 * Separadas de `actions.ts` (equipe) porque compartilham só o `requireAdmin()`
 * e têm dependências bem diferentes — todo este arquivo carrega o SDK do
 * Stripe, que não tem por que entrar no grafo de quem só convida alguém.
 *
 * Ambas exigem **admin**: comprometer o cartão do workspace é decisão de quem
 * responde por ele, não de qualquer membro.
 *
 * As duas terminam em `redirect()` para uma URL do Stripe. Isso significa que
 * elas não retornam em caso de sucesso — `redirect()` lança internamente — e o
 * `ActionResult` no tipo cobre apenas os caminhos de recusa.
 */

const ADMIN_ONLY = "Só administradores podem gerenciar a assinatura.";

/**
 * Cria a Checkout Session do plano Pro e manda o navegador para o Stripe.
 *
 * O `workspace_id` vem de `requireAdmin()`, **nunca do payload**: aceitá-lo do
 * cliente deixaria qualquer pessoa assinar o Pro para um workspace alheio —
 * ou, pior, apontar o pagamento dela para outro tenant.
 */
export async function createCheckoutSession(): Promise<ActionResult> {
  const auth = await requireAdmin(ADMIN_ONLY);

  if (!auth.ok) return auth.result;

  const { workspaceId, workspaceName, userId } = auth.context;
  const { STRIPE_PRICE_ID_PRO } = stripeEnv();
  const stripe = getStripe();

  const subscription = await getSubscription();

  // Já pagante: mandar para o checkout de novo criaria uma segunda assinatura
  // para o mesmo workspace — e o `unique (workspace_id)` da tabela faria o
  // webhook da segunda sobrescrever a primeira, deixando uma órfã cobrando no
  // Stripe sem nenhuma linha apontando para ela.
  if (subscription?.plan === "pro" && subscription.status !== "canceled") {
    return { ok: false, message: "Este workspace já tem o plano Pro ativo." };
  }

  let session;

  try {
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: STRIPE_PRICE_ID_PRO, quantity: 1 }],

      // Reaproveita o customer de uma assinatura anterior (um downgrade que
      // voltou). Sem isso o mesmo workspace acumularia customers no Stripe, e
      // o histórico de cobrança apareceria partido para quem der suporte.
      ...(subscription?.stripe_customer_id
        ? { customer: subscription.stripe_customer_id }
        : {}),

      // O metadata é a **única** ligação entre o que acontece no Stripe e o
      // nosso banco, e por isso vai nos dois lugares:
      //
      // - `metadata` viaja na Checkout Session e chega em
      //   `checkout.session.completed`;
      // - `subscription_data.metadata` gruda na Subscription e é o que chega
      //   em `customer.subscription.updated` / `.deleted`, que **não** carregam
      //   o metadata da sessão.
      //
      // Só o primeiro faria o cancelamento chegar sem saber a qual workspace
      // pertence, e o webhook teria de adivinhar por `customer_id`.
      metadata: { workspace_id: workspaceId },
      subscription_data: {
        metadata: { workspace_id: workspaceId, workspace_name: workspaceName },
      },

      client_reference_id: workspaceId,

      // `?checkout=success` só pinta a UI. Quem promove o workspace é o
      // webhook: o usuário pode fechar o navegador antes do redirect, e o
      // Stripe entrega o evento de qualquer forma.
      success_url: `${env.NEXT_PUBLIC_SITE_URL}/settings?checkout=success`,
      cancel_url: `${env.NEXT_PUBLIC_SITE_URL}/settings?checkout=cancelado`,
    });
  } catch (error) {
    console.error("[stripe] falha ao criar checkout session", {
      workspaceId,
      userId,
      error,
    });

    return {
      ok: false,
      message: "Não foi possível iniciar o checkout. Tente novamente.",
    };
  }

  if (!session.url) {
    return {
      ok: false,
      message: "O Stripe não devolveu a URL do checkout. Tente novamente.",
    };
  }

  redirect(session.url);
}

/**
 * Abre o Customer Portal, onde a pessoa troca o cartão, vê faturas e cancela.
 *
 * Cancelar por lá não escreve nada aqui de imediato: o Stripe emite
 * `customer.subscription.updated` (ou `.deleted`, no fim do período) e o
 * webhook é quem rebaixa o workspace. Um único caminho de escrita.
 */
export async function createPortalSession(): Promise<ActionResult> {
  const auth = await requireAdmin(ADMIN_ONLY);

  if (!auth.ok) return auth.result;

  const { workspaceId } = auth.context;
  const subscription = await getSubscription();

  if (!subscription?.stripe_customer_id) {
    return {
      ok: false,
      message: "Este workspace ainda não tem assinatura para gerenciar.",
    };
  }

  const stripe = getStripe();

  let session;

  try {
    session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${env.NEXT_PUBLIC_SITE_URL}/settings`,
    });
  } catch (error) {
    console.error("[stripe] falha ao criar portal session", {
      workspaceId,
      error,
    });

    return {
      ok: false,
      message: "Não foi possível abrir o portal de cobrança. Tente novamente.",
    };
  }

  redirect(session.url);
}

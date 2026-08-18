import type { Plan, SubscriptionStatus } from "@/types";

/**
 * Regra única de "que plano vale agora". Pura e sem I/O de propósito: o
 * servidor a usa depois de ler `subscriptions`, e o webhook a usa antes de
 * gravar, sobre o objeto que veio do Stripe. Uma regra só, dois chamadores.
 *
 * ## Por que existe
 *
 * Até o M13 o plano era lido de duas colunas diferentes: `subscription.plan`
 * na criação de lead e `workspaces.plan` no convite. Enquanto nada escrevia em
 * `subscriptions`, tudo era Free e a divergência não aparecia. Com o webhook
 * gravando, ela vira bug de cobrança: o workspace paga, `subscriptions.plan`
 * vira `pro`, e o convite segue barrado porque `workspaces.plan` nunca mudou.
 *
 * `subscriptions` é a fonte da verdade — é a linha que o Stripe controla.
 * `workspaces.plan` continua existindo como cache denormalizado, mantido em
 * sincronia pelo webhook na mesma escrita, para telas que já leem o workspace
 * não precisarem de um segundo round-trip.
 *
 * ## Status que valem como pago
 *
 * `active` e `trialing` liberam o Pro. `past_due` **também** — a cobrança
 * falhou, mas o Stripe ainda vai tentar de novo, e derrubar alguém para o Free
 * no primeiro retry falho apagaria acesso a dados por um cartão que vence
 * amanhã. Quem encerra de fato é `canceled`, via
 * `customer.subscription.deleted`.
 *
 * Ausência de linha é Free — o caso mais restritivo, e o estado de todo
 * workspace que nunca passou pelo checkout.
 */
export function resolvePlan(
  subscription: { plan: Plan; status: SubscriptionStatus } | null,
): Plan {
  if (!subscription) return "free";
  if (subscription.plan !== "pro") return "free";

  return subscription.status === "canceled" ? "free" : "pro";
}

import "server-only";

import Stripe from "stripe";

import { stripeEnv } from "@/lib/env";

/**
 * Cliente do Stripe — servidor apenas.
 *
 * `apiVersion` fica **fixada**, e não na default do SDK. A versão define o
 * shape dos objetos que chegam no webhook; deixá-la flutuar faria um
 * `npm update` mudar payloads em produção sem uma linha de diff no projeto.
 * Subir de versão passa a ser uma decisão explícita, com o changelog aberto.
 *
 * Função, e não instância de módulo, para que a validação de `stripeEnv()` só
 * rode quando alguém realmente for cobrar. Como constante, o parse dispararia
 * no import — e derrubaria o build de qualquer ambiente sem as chaves.
 */
export function getStripe() {
  const { STRIPE_SECRET_KEY } = stripeEnv();

  return new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2026-07-29.dahlia",
    typescript: true,
    appInfo: { name: "PipeFlow CRM" },
  });
}

import { AlertTriangle } from "lucide-react";
import Link from "next/link";

import { getCurrentMember, getSubscription } from "@/lib/data";

/**
 * Aviso de cobrança recusada, visível em toda a área logada.
 *
 * Existe porque `past_due` **não rebaixa o plano** (ver `resolvePlan()`): o
 * acesso continua liberado enquanto o Stripe tenta de novo, o que é a decisão
 * certa para quem tem um cartão vencendo — mas deixava o app inteiro silencioso
 * até o cancelamento. O aviso morava só em `/settings`, tela que ninguém abre
 * sem motivo.
 *
 * Server Component que busca o próprio dado. Poderia receber por props do
 * layout, mas as duas queries já estão em `cache()` e são as mesmas que
 * `/settings` faz — no pior caso a requisição as reaproveita, e o layout não
 * precisa carregar contexto de billing que só interessa aqui.
 *
 * Renderiza `null` na esmagadora maioria das requisições. É o caso normal.
 */
export async function PastDueBanner() {
  const [subscription, member] = await Promise.all([
    getSubscription(),
    getCurrentMember(),
  ]);

  if (subscription?.status !== "past_due") return null;

  const isAdmin = member?.role === "admin";

  return (
    <div className="border-b border-warning/40 bg-warning/10">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm md:px-6 lg:px-8">
        <AlertTriangle className="size-4 shrink-0 text-warning" />

        <p className="text-foreground">
          O último pagamento não foi autorizado.
          <span className="text-muted-foreground">
            {" "}
            O acesso continua liberado enquanto tentamos de novo.
          </span>
        </p>

        {/* Só admin pode trocar o cartão — a action do portal recusa os
            demais. Para membro comum o banner informa sem prometer uma ação
            que ele não consegue executar. */}
        {isAdmin ? (
          <Link
            href="/settings"
            className="font-medium underline underline-offset-4 hover:text-warning"
          >
            Atualizar cartão
          </Link>
        ) : null}
      </div>
    </div>
  );
}

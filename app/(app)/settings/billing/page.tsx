import type { Metadata } from "next";
import { ArrowLeft, CreditCard } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import {
  ManageBillingButton,
  UpgradeButton,
} from "@/components/settings/billing-actions";
import { PlanComparison } from "@/components/settings/plan-comparison";
import { UsageMeter } from "@/components/settings/usage-meter";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PLAN_LABELS, PRO_PLAN_PRICE_BRL } from "@/lib/constants";
import { getCurrentMember, getEffectivePlan, getSubscription } from "@/lib/data";
import { canAddLead, canAddMember } from "@/lib/limits";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Cobrança" };

/**
 * Cobrança: plano atual, uso contra os limites e comparação Free × Pro.
 *
 * Rota própria, separada de `/settings` — que ficou com equipe e convites.
 * Billing tem dado e decisão diferentes do resto das configurações: quem entra
 * aqui quer comparar planos ou mexer no cartão, não gerenciar pessoas.
 *
 * Server Component. O papel decide o que aparece, mas só isso: `requireAdmin()`
 * revalida no servidor antes de qualquer chamada ao Stripe, e um membro que
 * forjasse a action receberia a recusa de lá.
 */
export default async function BillingPage() {
  const [plan, subscription, member, leads, seats] = await Promise.all([
    getEffectivePlan(),
    getSubscription(),
    getCurrentMember(),
    // As mesmas checagens que as Server Actions fazem antes de gravar. Aqui
    // interessa o `current`/`limit` para os medidores; lá, o `allowed`.
    canAddLead(),
    canAddMember(),
  ]);

  const isFree = plan === "free";
  const isAdmin = member?.role === "admin";

  return (
    <>
      <PageHeader
        title="Cobrança"
        description="Plano, uso e forma de pagamento deste workspace."
      >
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Configurações
        </Link>
      </PageHeader>

      <div className="space-y-8">
        {/* --- Plano atual -------------------------------------------------- */}
        <section className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg border bg-muted">
                <CreditCard className="size-4 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{PLAN_LABELS[plan]}</p>
                  {!isFree ? <Badge variant="outline">Ativo</Badge> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isFree
                    ? `${formatCurrency(0)} por mês`
                    : `${formatCurrency(PRO_PLAN_PRICE_BRL)} por mês`}
                </p>
              </div>
            </div>

            {/* Só admin cobra — mesma regra que as actions revalidam no
                servidor. Aqui o botão some; lá a chamada é recusada. */}
            {isAdmin ? (
              isFree ? (
                <UpgradeButton />
              ) : (
                <ManageBillingButton />
              )
            ) : null}
          </div>

          {/* Cobrança falhou e o Stripe ainda está tentando. O acesso segue
              liberado de propósito (ver `resolvePlan()`). */}
          {subscription?.status === "past_due" ? (
            <p className="mt-4 rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs text-foreground">
              O último pagamento não foi confirmado. Atualize o cartão em
              &laquo;Gerenciar assinatura&raquo; para não perder o acesso ao Pro.
            </p>
          ) : null}

          {!isFree && subscription?.current_period_end ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Renova em {formatDate(subscription.current_period_end)}.
            </p>
          ) : null}

          {!isAdmin ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Só administradores podem alterar o plano.
            </p>
          ) : null}
        </section>

        {/* --- Uso ---------------------------------------------------------- */}
        <section className="rounded-xl border bg-card">
          <header className="p-5">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              Uso
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isFree
                ? "Quanto deste workspace já está ocupado."
                : "O Pro não tem teto — os números abaixo são só referência."}
            </p>
          </header>

          <Separator />

          <div className="space-y-5 p-5">
            <UsageMeter
              label="Leads"
              used={leads.current}
              limit={leads.limit}
              hint="Contatos cadastrados neste workspace."
            />
            <UsageMeter
              label="Pessoas"
              used={seats.current}
              limit={seats.limit}
              hint="Membros mais convites pendentes — assentos comprometidos."
            />
          </div>
        </section>

        <PlanComparison plan={plan} canUpgrade={Boolean(isAdmin)} />
      </div>
    </>
  );
}

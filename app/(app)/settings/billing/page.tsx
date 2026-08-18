import type { Metadata } from "next";
import { ArrowLeft, Check, CreditCard, Minus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import {
  ManageBillingButton,
  UpgradeButton,
} from "@/components/settings/billing-actions";
import { UsageMeter } from "@/components/settings/usage-meter";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FREE_PLAN_LIMITS,
  PLAN_LABELS,
  PRO_PLAN_PRICE_BRL,
} from "@/lib/constants";
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

        {/* --- Comparação --------------------------------------------------- */}
        <section className="rounded-xl border bg-card">
          <header className="p-5">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              Free &times; Pro
            </h2>
          </header>

          <Separator />

          {/* Tabela em overflow próprio: em telas estreitas ela rola sozinha
              em vez de esticar a página inteira. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-4 text-left font-medium text-muted-foreground">
                    Recurso
                  </th>
                  <th className="p-4 text-left font-medium">
                    Free
                    {isFree ? (
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                        atual
                      </span>
                    ) : null}
                  </th>
                  <th className="p-4 text-left font-medium">
                    Pro
                    {!isFree ? (
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                        atual
                      </span>
                    ) : null}
                  </th>
                </tr>
              </thead>
              <tbody>
                <ComparisonRow
                  feature="Leads"
                  free={`Até ${FREE_PLAN_LIMITS.leads}`}
                  pro="Ilimitados"
                />
                <ComparisonRow
                  feature="Pessoas no workspace"
                  free={`Até ${FREE_PLAN_LIMITS.members}`}
                  pro="Ilimitadas"
                />
                <ComparisonRow feature="Pipeline Kanban" free pro />
                <ComparisonRow feature="Dashboard de métricas" free pro />
                <ComparisonRow feature="Timeline de atividades" free pro />
                <ComparisonRow
                  feature="Preço"
                  free={formatCurrency(0)}
                  pro={`${formatCurrency(PRO_PLAN_PRICE_BRL)}/mês`}
                />
              </tbody>
            </table>
          </div>

          {isFree && isAdmin ? (
            <>
              <Separator />
              <div className="p-5">
                <UpgradeButton />
              </div>
            </>
          ) : null}
        </section>
      </div>
    </>
  );
}

/**
 * Uma linha da comparação. `true` vira check, `false` vira traço, string vira o
 * próprio texto — assim recurso incluído e recurso quantificado usam a mesma
 * linha, sem dois componentes quase iguais.
 */
function ComparisonRow({
  feature,
  free,
  pro,
}: {
  feature: string;
  free: string | boolean;
  pro: string | boolean;
}) {
  return (
    <tr className="border-b last:border-0">
      <td className="p-4 text-muted-foreground">{feature}</td>
      <td className="p-4">
        <ComparisonCell value={free} />
      </td>
      <td className="p-4">
        <ComparisonCell value={pro} />
      </td>
    </tr>
  );
}

function ComparisonCell({ value }: { value: string | boolean }) {
  if (typeof value === "string") {
    return <span className="tabular-nums">{value}</span>;
  }

  return value ? (
    <Check className="size-4 text-success" aria-label="Incluído" />
  ) : (
    <Minus className="size-4 text-muted-foreground" aria-label="Não incluído" />
  );
}

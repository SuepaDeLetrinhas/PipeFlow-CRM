import { Check, Minus } from "lucide-react";

import { UpgradeButton } from "@/components/settings/billing-actions";
import { Separator } from "@/components/ui/separator";
import { FREE_PLAN_LIMITS, PRO_PLAN_PRICE_BRL } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { Plan } from "@/types";

/**
 * Tabela comparativa Free x Pro.
 *
 * Componente, e nao JSX inline, porque aparece em duas telas: em
 * `/settings/billing` e embaixo da seção Plano em `/settings`. Duas cópias
 * divergiriam no dia em que um recurso entrasse na lista — e a tela que
 * ficasse desatualizada estaria prometendo errado sobre o que o cliente paga.
 *
 * A lista de recursos mora aqui dentro, e não vem por prop: não há caso em que
 * as duas telas devam comparar coisas diferentes.
 *
 * Server Component; só o `UpgradeButton` que ele embrulha é cliente.
 */
export function PlanComparison({
  plan,
  /**
   * Só admin cobra — `createCheckoutSession()` recusa os demais via
   * `requireAdmin()`. Sem isso o botão apareceria para quem só levaria recusa.
   */
  canUpgrade,
}: {
  plan: Plan;
  canUpgrade: boolean;
}) {
  const isFree = plan === "free";

  return (
    <section className="rounded-xl border bg-card">
      <header className="p-5">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          Free &times; Pro
        </h2>
      </header>

      <Separator />

      {/*
        Overflow próprio como rede de segurança, mas a tabela cabe sozinha.

        Com `min-w-[420px]` num card de 341px (viewport de 375px), 79px ficavam
        escondidos atrás de rolagem lateral sem nenhuma pista — e o que sumia
        era justamente a coluna "Pro", a que decide o upgrade. O mínimo cai
        para 0 e o aperto vai para o padding das células, que encolhe abaixo de
        `sm`. Verificado em 375px: 341px de tabela em 341px úteis.
      */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm [&_td]:px-2 [&_td]:py-3 [&_th]:px-2 [&_th]:py-3 sm:[&_td]:px-4 sm:[&_td]:py-4 sm:[&_th]:px-4 sm:[&_th]:py-4">
          <thead>
            <tr className="border-b">
              <th className="text-left font-medium text-muted-foreground">
                Recurso
              </th>
              <th className="text-left font-medium">
                Free
                {isFree ? <CurrentTag /> : null}
              </th>
              <th className="text-left font-medium">
                Pro
                {!isFree ? <CurrentTag /> : null}
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

      {isFree && canUpgrade ? (
        <>
          <Separator />
          <div className="p-5">
            <UpgradeButton />
          </div>
        </>
      ) : null}
    </section>
  );
}

/** Marca a coluna do plano vigente, para a tabela não ser só informativa. */
function CurrentTag() {
  return (
    <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
      atual
    </span>
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
      <td className="text-muted-foreground">{feature}</td>
      <td>
        <ComparisonCell value={free} />
      </td>
      <td>
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

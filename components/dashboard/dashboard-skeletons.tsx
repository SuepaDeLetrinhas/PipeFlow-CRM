import { CardSkeleton, TableSkeleton } from "@/components/layout/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder da linha de 4 cards de métrica. */
export function MetricsRowSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Placeholder do funil: quatro barras de comprimento decrescente, para o bloco
 * não trocar de forma quando o gráfico chegar.
 */
export function FunnelChartSkeleton() {
  const widths = ["w-4/5", "w-3/5", "w-2/5", "w-1/4"];

  return (
    <div className="rounded-lg border bg-card p-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-2 h-3 w-56" />

      <div className="mt-6 space-y-5">
        {widths.map((width) => (
          <div key={width} className="flex items-center gap-3">
            <Skeleton className="h-3 w-28 shrink-0" />
            <Skeleton className={`h-5 ${width}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Placeholder da tabela de prazos. */
export function UpcomingDealsSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-2 h-3 w-64" />
      <TableSkeleton rows={5} className="mt-6 border-0" />
    </div>
  );
}

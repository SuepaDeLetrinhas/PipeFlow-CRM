import {
  PageHeaderSkeleton,
  SectionSkeleton,
} from "@/components/layout/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * `/settings/billing` espera cinco queries em paralelo — plano efetivo,
 * assinatura, papel de quem abriu e os dois medidores de uso. É a tela de
 * cobrança: ficar em branco enquanto resolve dá a impressão de que o plano
 * sumiu.
 */
export default function BillingLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="space-y-8">
        {/* Cartão do plano vigente: selo, preço e botão de ação. */}
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <Skeleton className="h-3 w-20" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-9 w-40" />
          </div>
        </div>

        {/* Medidores de uso: leads e assentos. */}
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="rounded-xl border bg-card p-5">
              <div className="flex items-baseline justify-between gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>

        <SectionSkeleton rows={4} />
      </div>
    </>
  );
}

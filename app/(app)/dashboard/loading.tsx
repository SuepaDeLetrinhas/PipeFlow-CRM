import {
  FunnelChartSkeleton,
  MetricsRowSkeleton,
  UpcomingDealsSkeleton,
} from "@/components/dashboard/dashboard-skeletons";
import { PageHeaderSkeleton } from "@/components/layout/loading-skeleton";

/**
 * Estado de carregamento do dashboard.
 *
 * A página já tem um `<Suspense>` por bloco, mas eles só entram depois que o
 * `getLeads()`/`getDeals()` do corpo resolve — é essa espera, antes de
 * qualquer pixel, que este arquivo cobre. Reaproveita os mesmos skeletons para
 * que a transição de um estado ao outro não mude a forma da tela.
 */
export default function DashboardLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="space-y-6">
        <MetricsRowSkeleton />
        <FunnelChartSkeleton />
        <UpcomingDealsSkeleton />
      </div>
    </>
  );
}

import { CircleDollarSign, Handshake, Target, Users } from "lucide-react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { getDashboardMetrics } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

/** As 4 métricas do topo do dashboard. */
export async function MetricsRow() {
  const {
    totalLeads,
    openDeals,
    pipelineValue,
    conversionRate,
    closedDeals,
    wonDeals,
  } = await getDashboardMetrics();

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Total de leads"
        value={String(totalLeads)}
        hint="No workspace ativo"
        icon={Users}
        accent="text-stage-novo-lead"
      />

      <MetricCard
        label="Negócios abertos"
        value={String(openDeals)}
        hint="Ainda em andamento no pipeline"
        icon={Handshake}
        accent="text-stage-contato-realizado"
      />

      <MetricCard
        label="Valor do pipeline"
        value={formatCurrency(pipelineValue)}
        hint="Soma dos negócios em aberto"
        icon={CircleDollarSign}
        accent="text-primary"
      />

      <MetricCard
        label="Taxa de conversão"
        value={`${percentFormatter.format(conversionRate)}%`}
        hint={
          closedDeals > 0
            ? `${wonDeals} ganhos de ${closedDeals} fechados`
            : "Nenhum negócio fechado ainda"
        }
        icon={Target}
        accent="text-success"
      />
    </div>
  );
}

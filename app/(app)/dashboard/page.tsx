import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { getDeals, getLeads, getOpenDeals } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [leads, deals, openDeals] = await Promise.all([
    getLeads(),
    getDeals(),
    getOpenDeals(),
  ]);

  const pipelineValue = openDeals.reduce((total, deal) => total + deal.value, 0);
  const won = deals.filter((deal) => deal.stage === "fechado_ganho").length;
  const closed =
    won + deals.filter((deal) => deal.stage === "fechado_perdido").length;
  const conversion = closed > 0 ? (won / closed) * 100 : 0;

  // Números diretos dos fixtures, só para provar que `lib/data/` está ligada.
  // Cards definitivos, funil e prazos ficam para o milestone do dashboard.
  const metrics = [
    { label: "Total de leads", value: String(leads.length) },
    { label: "Negócios abertos", value: String(openDeals.length) },
    { label: "Valor do pipeline", value: formatCurrency(pipelineValue) },
    {
      label: "Taxa de conversão",
      value: `${conversion.toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
      })}%`,
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral do workspace ativo."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardDescription>{metric.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-metric text-2xl font-semibold">
                {metric.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

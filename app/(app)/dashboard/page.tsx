import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

import {
  FunnelChartSkeleton,
  MetricsRowSkeleton,
  UpcomingDealsSkeleton,
} from "@/components/dashboard/dashboard-skeletons";
import { FunnelCard } from "@/components/dashboard/funnel-card";
import { MetricsRow } from "@/components/dashboard/metrics-row";
import { UpcomingDealsCard } from "@/components/dashboard/upcoming-deals-card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getDeals, getLeads } from "@/lib/data";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // Workspace recém-criado não deve mostrar quatro zeros e um gráfico vazio:
  // sem nenhum lead nem negócio, a tela vira um convite a começar.
  const [leads, deals] = await Promise.all([getLeads(), getDeals()]);
  const isEmpty = leads.length === 0 && deals.length === 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral do workspace ativo."
      />

      {isEmpty ? (
        <EmptyState
          icon={LayoutDashboard}
          title="Nada para medir ainda"
          description="Cadastre o primeiro lead e abra um negócio no pipeline — as métricas aparecem aqui automaticamente."
          action={
            <Button asChild>
              <Link href="/leads">Cadastrar primeiro lead</Link>
            </Button>
          }
        />
      ) : (
        /*
         * Um `<Suspense>` por bloco, e não um só em volta de tudo: no M13 cada
         * função de `lib/data/` vira uma query agregada com latência própria, e
         * o streaming por bloco já fica ligado sem mexer no layout.
         */
        <div className="space-y-6">
          <Suspense fallback={<MetricsRowSkeleton />}>
            <MetricsRow />
          </Suspense>

          {/*
           * Um bloco por linha, e não lado a lado.
           *
           * A tabela tem cinco colunas de texto — negócio, etapa, responsável,
           * valor e prazo. Dividindo a largura com o gráfico, mesmo em 8/12 de
           * 1440px, a coluna de prazo caía fora e virava scroll horizontal:
           * justamente a informação que a tabela existe para dar. O funil, por
           * ser barra horizontal, aproveita bem a largura inteira.
           */}
          <Suspense fallback={<FunnelChartSkeleton />}>
            <FunnelCard />
          </Suspense>

          <div className="min-w-0">
            <Suspense fallback={<UpcomingDealsSkeleton />}>
              <UpcomingDealsCard />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
}

import type { Metadata } from "next";
import { KanbanSquare } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { NewDealButton } from "@/components/pipeline/new-deal-button";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import {
  getCurrentUser,
  getDealsByStage,
  getLeads,
  getMembers,
} from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import type { Deal } from "@/types";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const [dealsByStage, currentUser, members, leads] = await Promise.all([
    getDealsByStage(),
    getCurrentUser(),
    getMembers(),
    getLeads(),
  ]);

  const owners = members.map((member) => member.user);
  const allDeals: Deal[] = Object.values(dealsByStage).flat();

  // O cabeçalho fala do que está em jogo — negócios fechados não contam.
  const openDeals = allDeals.filter(
    (deal) =>
      deal.stage !== "fechado_ganho" && deal.stage !== "fechado_perdido",
  );
  const openTotal = openDeals.reduce((sum, deal) => sum + deal.value, 0);

  return (
    <>
      <PageHeader
        title="Pipeline"
        description={
          openDeals.length === 1
            ? `1 negócio aberto · ${formatCurrency(openTotal)}`
            : `${openDeals.length} negócios abertos · ${formatCurrency(openTotal)}`
        }
      >
        <NewDealButton
          owners={owners}
          leads={leads}
          defaultOwnerId={currentUser.id}
        />
      </PageHeader>

      {allDeals.length === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          title="Nenhum negócio no pipeline"
          description="Crie a primeira oportunidade para acompanhar o funil de vendas deste workspace."
          action={
            <NewDealButton
              owners={owners}
              leads={leads}
              defaultOwnerId={currentUser.id}
            />
          }
        />
      ) : (
        <PipelineBoard
          initialDeals={dealsByStage}
          owners={owners}
          leads={leads}
        />
      )}
    </>
  );
}

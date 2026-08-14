import { deals } from "@/lib/mock/deals";
import type { Deal } from "@/types";

import { getCurrentWorkspace } from "./workspaces";

/** Negócios do workspace ativo, na ordem em que aparecem nas colunas. */
export async function getDeals(): Promise<Deal[]> {
  const workspace = await getCurrentWorkspace();

  return deals
    .filter((deal) => deal.workspace_id === workspace.id)
    .sort((a, b) => a.position - b.position);
}

export async function getDealsByLead(leadId: string): Promise<Deal[]> {
  const workspaceDeals = await getDeals();

  return workspaceDeals.filter((deal) => deal.lead_id === leadId);
}

/** Negócios abertos: tudo que não foi para Ganho ou Perdido. */
export async function getOpenDeals(): Promise<Deal[]> {
  const workspaceDeals = await getDeals();

  return workspaceDeals.filter(
    (deal) =>
      deal.stage !== "fechado_ganho" && deal.stage !== "fechado_perdido",
  );
}

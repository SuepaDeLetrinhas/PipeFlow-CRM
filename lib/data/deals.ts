import { DEAL_STAGES } from "@/lib/constants";
import { deals } from "@/lib/mock/deals";
import type { Deal, DealStage } from "@/types";

import { getCurrentWorkspace } from "./workspaces";

/** Negócios do workspace ativo, na ordem em que aparecem nas colunas. */
export async function getDeals(): Promise<Deal[]> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) return [];

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

/** Uma entrada por etapa, sempre — coluna vazia é coluna, não ausência. */
export type DealsByStage = Record<DealStage, Deal[]>;

/**
 * Negócios do workspace ativo agrupados por etapa, cada grupo já na ordem de
 * `position`. O board recebe isso pronto: agrupar na tela obrigaria o
 * componente a conhecer a lista de etapas, que é regra de domínio.
 *
 * No M12 o corpo vira uma query com `order("position")` e a assinatura não muda.
 */
export async function getDealsByStage(): Promise<DealsByStage> {
  const workspaceDeals = await getDeals();

  // Semeia todas as etapas antes de distribuir, senão uma etapa sem negócios
  // sumiria do board em vez de aparecer vazia.
  const grouped = Object.fromEntries(
    DEAL_STAGES.map((stage) => [stage, [] as Deal[]]),
  ) as DealsByStage;

  for (const deal of workspaceDeals) {
    grouped[deal.stage].push(deal);
  }

  return grouped;
}

import { DEAL_STAGES } from "@/lib/constants";
import type { Deal, DealStage, Lead, User } from "@/types";

import { getDeals, getOpenDeals } from "./deals";
import { getLeads } from "./leads";
import { getMembers } from "./workspaces";

/**
 * Leituras do dashboard.
 *
 * Tudo que a tela mostra é calculado aqui, nunca no componente: no M13 estes
 * corpos viram queries agregadas no Postgres (views ou funções) e as
 * assinaturas continuam as mesmas. Por isso cada função devolve o formato
 * final de exibição, já ordenado e já somado.
 */

export interface DashboardMetrics {
  totalLeads: number;
  openDeals: number;
  /** Soma do valor dos negócios abertos, em reais. */
  pipelineValue: number;
  /** Percentual de 0 a 100: ganhos sobre o total de negócios fechados. */
  conversionRate: number;
  /** Denominador da conversão — o card mostra "de N fechados". */
  closedDeals: number;
  wonDeals: number;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [leads, deals, openDeals] = await Promise.all([
    getLeads(),
    getDeals(),
    getOpenDeals(),
  ]);

  const pipelineValue = openDeals.reduce((total, deal) => total + deal.value, 0);

  const wonDeals = deals.filter(
    (deal) => deal.stage === "fechado_ganho",
  ).length;
  const lostDeals = deals.filter(
    (deal) => deal.stage === "fechado_perdido",
  ).length;
  const closedDeals = wonDeals + lostDeals;

  return {
    totalLeads: leads.length,
    openDeals: openDeals.length,
    pipelineValue,
    // Mede eficiência de fechamento, não do funil inteiro: negócio ainda em
    // aberto não é fracasso, então fica fora do denominador.
    conversionRate: closedDeals > 0 ? (wonDeals / closedDeals) * 100 : 0,
    closedDeals,
    wonDeals,
  };
}

export interface FunnelStage {
  stage: DealStage;
  count: number;
  /** Soma dos valores da etapa, em reais. */
  value: number;
}

/** Etapas que compõem o funil — os dois desfechos ficam fora. */
const FUNNEL_STAGES = DEAL_STAGES.filter(
  (stage) => stage !== "fechado_ganho" && stage !== "fechado_perdido",
);

/**
 * Negócios por etapa do funil, da entrada à negociação.
 *
 * Ganho e Perdido não entram: o funil mostra o caminho até o fechamento, e
 * empilhar os desfechos junto faria as barras contarem duas vezes o mesmo
 * negócio ao longo do tempo. Toda etapa aparece mesmo com zero — etapa vazia é
 * informação, não ausência.
 */
export async function getFunnelData(): Promise<FunnelStage[]> {
  const deals = await getDeals();

  const seeded = new Map<DealStage, FunnelStage>(
    FUNNEL_STAGES.map((stage) => [stage, { stage, count: 0, value: 0 }]),
  );

  for (const deal of deals) {
    const entry = seeded.get(deal.stage);
    if (!entry) continue;

    entry.count += 1;
    entry.value += deal.value;
  }

  return Array.from(seeded.values());
}

/** Um negócio com prazo, já acompanhado do responsável, para a tabela. */
export interface UpcomingDeal {
  /** `due_date` nunca é nulo aqui: sem prazo, o negócio não entra na lista. */
  deal: Deal & { due_date: string };
  owner?: User;
  lead?: Lead;
  /** Dias até o prazo; negativo quando já venceu. */
  daysLeft: number;
}

export interface UpcomingDealsOptions {
  /** Janela em dias a partir de hoje. Vencidos entram sempre. */
  days?: number;
  limit?: number;
}

/**
 * Diferença em dias civis entre hoje e o prazo.
 *
 * Compara datas zeradas, não instantes: um prazo às 23h de hoje não pode
 * contar como "amanhã" só porque agora são 22h. Mesma regra do `dueState` do
 * card do Kanban.
 */
function daysUntil(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${dueDate}T00:00:00`);

  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Negócios abertos com prazo dentro da janela, do mais urgente ao menos.
 *
 * Vencidos aparecem primeiro e independem da janela: um prazo estourado é
 * exatamente o que a tela precisa mostrar. Negócio sem prazo fica de fora, e
 * os já fechados também — cobrar prazo de algo encerrado não faz sentido.
 */
export async function getUpcomingDeals({
  days = 30,
  limit = 6,
}: UpcomingDealsOptions = {}): Promise<UpcomingDeal[]> {
  const [openDeals, members, leads] = await Promise.all([
    getOpenDeals(),
    getMembers(),
    getLeads(),
  ]);

  const usersById = new Map(
    members.map((member) => [member.user.id, member.user]),
  );
  const leadsById = new Map(leads.map((lead) => [lead.id, lead]));

  return openDeals
    .filter((deal): deal is Deal & { due_date: string } => Boolean(deal.due_date))
    .map((deal) => ({
      deal,
      owner: usersById.get(deal.owner_id),
      lead: deal.lead_id ? leadsById.get(deal.lead_id) : undefined,
      daysLeft: daysUntil(deal.due_date),
    }))
    .filter((entry) => entry.daysLeft <= days)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, limit);
}

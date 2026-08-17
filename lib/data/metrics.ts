import { DEAL_STAGES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Deal, DealStage, Lead, User } from "@/types";

import { getCurrentWorkspace } from "./workspaces";

/**
 * Leituras do dashboard — agregadas no Postgres desde o M13.
 *
 * Cada função devolve o formato final de exibição, já ordenado e já somado: a
 * tela nunca calcula. As assinaturas são as do M6; o que mudou é que a soma
 * acontece no banco, sem transferir as linhas para contá-las aqui.
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

const EMPTY_METRICS: DashboardMetrics = {
  totalLeads: 0,
  openDeals: 0,
  pipelineValue: 0,
  conversionRate: 0,
  closedDeals: 0,
  wonDeals: 0,
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) return EMPTY_METRICS;

  const supabase = await createClient();

  const { data } = await supabase
    .rpc("dashboard_metrics", { target_workspace_id: workspace.id })
    .maybeSingle();

  if (!data) return EMPTY_METRICS;

  // `count()` devolve bigint e `sum()` devolve numeric. Verificado contra o
  // banco: os dois chegam como `number` nas grandezas do PipeFlow. O `Number()`
  // é rede de segurança — bigint acima do inteiro seguro do JS viria como
  // string, e uma divisão sobre string devolveria NaN na taxa de conversão.
  const wonDeals = Number(data.won_deals);
  const closedDeals = Number(data.closed_deals);

  return {
    totalLeads: Number(data.total_leads),
    openDeals: Number(data.open_deals),
    pipelineValue: Number(data.pipeline_value),
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
 * informação, não ausência (o `left join` da função SQL garante a linha).
 */
export async function getFunnelData(): Promise<FunnelStage[]> {
  const workspace = await getCurrentWorkspace();

  const empty = FUNNEL_STAGES.map((stage) => ({ stage, count: 0, value: 0 }));

  if (!workspace) return empty;

  const supabase = await createClient();

  const { data } = await supabase.rpc("dashboard_funnel", {
    target_workspace_id: workspace.id,
  });

  if (!data) return empty;

  return data.map((row) => ({
    stage: row.stage,
    count: Number(row.count),
    value: Number(row.value),
  }));
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

/** Fim da janela em ISO (yyyy-mm-dd), para o filtro rodar no banco. */
function isoDayFromNow(days: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
}

/**
 * Negócios abertos com prazo dentro da janela, do mais urgente ao menos.
 *
 * Vencidos aparecem primeiro e independem da janela: um prazo estourado é
 * exatamente o que a tela precisa mostrar. Negócio sem prazo fica de fora, e
 * os já fechados também — cobrar prazo de algo encerrado não faz sentido.
 *
 * O join traz responsável e lead na mesma query. Buscar a lista de membros e a
 * de leads inteiras só para casar dois ids seria transferir dois conjuntos
 * completos para exibir seis linhas.
 */
export async function getUpcomingDeals({
  days = 30,
  limit = 6,
}: UpcomingDealsOptions = {}): Promise<UpcomingDeal[]> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from("deals")
    .select(
      `id, workspace_id, title, value, stage, position, due_date, lead_id, owner_id, created_at, updated_at,
       owner:profiles!deals_owner_id_fkey (id, full_name, email, avatar_url),
       lead:leads!deals_lead_id_fkey (id, workspace_id, name, email, phone, company, job_title, status, owner_id, created_at, updated_at)`,
    )
    .eq("workspace_id", workspace.id)
    .not("stage", "in", "(fechado_ganho,fechado_perdido)")
    // Sem prazo não entra na lista — a tela é sobre o que está por vencer.
    .not("due_date", "is", null)
    // O teto da janela vai no banco; vencidos entram sempre, então não há piso.
    .lte("due_date", isoDayFromNow(days))
    .order("due_date", { ascending: true })
    .limit(limit);

  if (!data) return [];

  return data.map((row) => {
    const { owner, lead, ...deal } = row;

    return {
      deal: {
        ...deal,
        // Mesma conversão de numeric→number de `lib/data/deals.ts`.
        value: Number(deal.value),
      } as Deal & { due_date: string },
      owner: owner ?? undefined,
      lead: lead ?? undefined,
      daysLeft: daysUntil(deal.due_date as string),
    };
  });
}

import { DEAL_STAGES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Deal, DealStage } from "@/types";

import { getCurrentWorkspace } from "./workspaces";

/**
 * Leitura de negócios — no Postgres desde o M12.
 *
 * As assinaturas são as do M5; só o corpo mudou.
 */

const DEAL_COLUMNS =
  "id, workspace_id, title, value, stage, position, due_date, lead_id, owner_id, created_at, updated_at";

/**
 * `value` é `numeric(12,2)`. Verificado contra o banco (Postgres 17 /
 * PostgREST 14): chega como `number`, coerente com a tipagem gerada.
 *
 * O `Number()` fica como rede de segurança porque a garantia é do serializador,
 * não do schema: numeric de precisão maior que o inteiro seguro do JS é
 * entregue como string para não perder dígito. O teto de R$ 100 milhões do
 * `dealSchema` mantém os valores do PipeFlow muito abaixo desse limite, mas a
 * conversão num ponto só custa nada e blinda a soma do cabeçalho da coluna —
 * com string, `+` concatenaria em vez de somar.
 */
function toDeal(row: Record<string, unknown>): Deal {
  return { ...row, value: Number(row.value) } as Deal;
}

/** Negócios do workspace ativo, na ordem em que aparecem nas colunas. */
export async function getDeals(): Promise<Deal[]> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from("deals")
    .select(DEAL_COLUMNS)
    .eq("workspace_id", workspace.id)
    // `stage` antes de `position`: o enum foi declarado na ordem do funil, então
    // isto já sai agrupado por coluna do board, cada uma na ordem dos cards.
    .order("stage", { ascending: true })
    .order("position", { ascending: true })
    // Desempate estável: duas linhas com a mesma posição (janela entre um
    // arraste e outro) manteriam ordem indefinida sem isto.
    .order("id", { ascending: true });

  return (data ?? []).map(toDeal);
}

export async function getDealsByLead(leadId: string): Promise<Deal[]> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from("deals")
    .select(DEAL_COLUMNS)
    .eq("workspace_id", workspace.id)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  return (data ?? []).map(toDeal);
}

/** Etapas de desfecho — negócio que chegou aqui saiu do pipeline. */
const CLOSED_STAGES: readonly DealStage[] = [
  "fechado_ganho",
  "fechado_perdido",
];

/** Negócios abertos: tudo que não foi para Ganho ou Perdido. */
export async function getOpenDeals(): Promise<Deal[]> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from("deals")
    .select(DEAL_COLUMNS)
    .eq("workspace_id", workspace.id)
    // Filtra no banco, não em memória: o dashboard só precisa dos abertos, e
    // trazer os fechados para descartá-los é transferência pura.
    .not("stage", "in", `(${CLOSED_STAGES.join(",")})`)
    .order("stage", { ascending: true })
    .order("position", { ascending: true });

  return (data ?? []).map(toDeal);
}

/** Uma entrada por etapa, sempre — coluna vazia é coluna, não ausência. */
export type DealsByStage = Record<DealStage, Deal[]>;

/**
 * Negócios do workspace ativo agrupados por etapa, cada grupo já na ordem de
 * `position`. O board recebe isso pronto: agrupar na tela obrigaria o
 * componente a conhecer a lista de etapas, que é regra de domínio.
 *
 * O agrupamento continua em JS mesmo com os dados vindo do banco — são no
 * máximo algumas centenas de cards, e uma query por etapa seriam seis
 * round-trips para montar uma tela só.
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

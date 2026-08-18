import "server-only";

import { FREE_PLAN_LIMITS } from "@/lib/constants";
import { countLeads, getEffectivePlan, getSeatUsage } from "@/lib/data";
import { resolvePlan } from "@/lib/stripe/plan";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Limites do plano, num lugar só.
 *
 * A regra já era checada corretamente antes disto — mas remontada à mão em
 * cinco lugares (criação de lead, convite, aceite de convite, tela de leads,
 * tela de settings), cada um repetindo "lê o plano, conta, compara" e
 * reescrevendo a mensagem de recusa. Cinco cópias de uma regra de cobrança são
 * cinco chances de uma divergir — e a que divergisse viraria bug de receita,
 * não de UI.
 *
 * ## Por que devolve objeto, e não booleano
 *
 * Quem chama nunca quer só "pode?". A Server Action precisa da mensagem de
 * recusa; a tela precisa do número atual para o medidor e para decidir o
 * aviso. Um booleano obrigaria os dois a contar de novo — duas queries onde
 * hoje há uma, e a segunda podendo discordar da primeira.
 *
 * ## Server-only de propósito
 *
 * `CLAUDE.md`: limites são checados **no servidor**, antes da escrita. Marcar
 * o módulo impede que alguém o importe num componente cliente e passe a tratar
 * a checagem como validação de formulário — que o usuário controla.
 */

/**
 * União discriminada, e não um objeto com `message?: string`.
 *
 * A diferença aparece em quem chama: depois de `if (!check.allowed)`, o
 * TypeScript sabe que `message` é `string` e ela pode ir direto para o
 * `ActionResult`. Com um campo opcional, cada uma das cinco chamadas precisaria
 * de um fallback (`?? "..."`) para um caso que não existe — e cinco fallbacks
 * escritos à mão são cinco chances de divergirem da mensagem real.
 */
export type LimitCheck =
  | {
      allowed: true;
      /** Quanto o workspace já usa. É o número que o medidor mostra. */
      current: number;
      /** Teto do plano vigente. `null` no Pro, que não tem limite. */
      limit: number | null;
      message: null;
    }
  | {
      allowed: false;
      current: number;
      limit: number;
      /** Recusa sempre tem texto — é o que o tipo garante. */
      message: string;
    };

const UNLIMITED: LimitCheck = {
  allowed: true,
  current: 0,
  limit: null,
  message: null,
};

/**
 * O workspace pode cadastrar mais um lead?
 *
 * O Pro sai antes de contar: a contagem só existe para comparar com um teto, e
 * sem teto ela é uma query jogada fora em toda criação de lead.
 */
export async function canAddLead(): Promise<LimitCheck> {
  if ((await getEffectivePlan()) !== "free") return UNLIMITED;

  const current = await countLeads();
  const limit = FREE_PLAN_LIMITS.leads;

  if (current < limit) {
    return { allowed: true, current, limit, message: null };
  }

  return {
    allowed: false,
    current,
    limit,
    message: `O plano Free permite ${limit} leads. Faça upgrade para o Pro para cadastrar mais.`,
  };
}

/**
 * O workspace pode receber mais uma pessoa?
 *
 * Conta **membros + convites pendentes**, não só membros: dois convites
 * abertos num workspace de uma pessoa já comprometem as duas vagas do Free, e
 * contar só quem já entrou deixaria o terceiro aceite estourar o limite.
 */
export async function canAddMember(): Promise<LimitCheck> {
  if ((await getEffectivePlan()) !== "free") return UNLIMITED;

  const usage = await getSeatUsage();
  const limit = FREE_PLAN_LIMITS.members;

  if (usage.total < limit) {
    return { allowed: true, current: usage.total, limit, message: null };
  }

  return {
    allowed: false,
    current: usage.total,
    limit,
    message: `O plano Free permite ${limit} pessoas no workspace. Revogue um convite pendente ou faça upgrade para o Pro.`,
  };
}

/**
 * Mesma pergunta que `canAddMember()`, para quem **ainda não é membro**.
 *
 * O aceite de convite é o único ponto que não pode usar a versão de cima: as
 * duas leituras dela dependem da sessão de quem chama — `getEffectivePlan()`
 * resolve o workspace pelo cookie, e a policy `subscriptions_select_member`
 * recusaria a leitura de quem está justamente tentando entrar. Aqui o
 * workspace vem por parâmetro e a leitura é pelo cliente admin.
 *
 * Reconferir no aceite, e não só no convite, importa: entre o envio e o clique
 * podem ter entrado outras pessoas, e é o aceite que de fato ocupa o assento.
 *
 * Conta só membros, sem os convites pendentes — ao contrário de
 * `canAddMember()`. O convite de quem está aceitando é um dos pendentes; somá-lo
 * faria a própria pessoa contar duas vezes e barraria o último assento livre.
 */
export async function canAcceptInvite(
  workspaceId: string,
): Promise<LimitCheck> {
  const admin = createAdminClient();

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("plan, status")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (resolvePlan(subscription) !== "free") return UNLIMITED;

  const { count } = await admin
    .from("workspace_members")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  const current = count ?? 0;
  const limit = FREE_PLAN_LIMITS.members;

  if (current < limit) {
    return { allowed: true, current, limit, message: null };
  }

  return {
    allowed: false,
    current,
    limit,
    // Mensagem diferente das outras de propósito: quem lê está do lado de
    // fora do workspace e não tem como fazer upgrade — só pedir.
    message:
      "Este workspace atingiu o limite de pessoas do plano Free. Peça ao administrador para fazer upgrade.",
  };
}

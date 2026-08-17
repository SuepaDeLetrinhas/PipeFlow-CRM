"use server";

import { revalidatePath } from "next/cache";

import { toFieldErrors, type ActionResult } from "@/lib/actions/result";
import { getCurrentWorkspace } from "@/lib/data/workspaces";
import { createClient } from "@/lib/supabase/server";
import {
  dealIdSchema,
  dealSchema,
  moveDealSchema,
} from "@/lib/validations/deal";

/**
 * Server Actions de negócios — gravando no Supabase desde o M12.
 *
 * Valem as mesmas três regras das actions de lead: `workspace_id` vem do
 * servidor, o Zod do servidor é lei, e erro do banco não vaza para a tela.
 */

function writeFailure(context: string, error: unknown): ActionResult {
  console.error(`[pipeline] ${context}:`, error);

  return {
    ok: false,
    message: "Não foi possível salvar. Tente de novo em alguns instantes.",
  };
}

const SEM_WORKSPACE: ActionResult = {
  ok: false,
  message: "Nenhum workspace ativo. Recarregue a página e tente de novo.",
};

export async function createDealAction(input: unknown): Promise<ActionResult> {
  const parsed = dealSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Confira os campos destacados.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const workspace = await getCurrentWorkspace();

  if (!workspace) return SEM_WORKSPACE;

  const supabase = await createClient();

  // A posição é calculada no banco: ler o maior `position` aqui e inserir com
  // ele + 1 abriria uma corrida entre dois usuários criando ao mesmo tempo.
  const { data: position, error: positionError } = await supabase.rpc(
    "next_deal_position",
    {
      target_workspace_id: workspace.id,
      target_stage: parsed.data.stage,
    },
  );

  if (positionError) return writeFailure("nextDealPosition", positionError);

  const { error } = await supabase.from("deals").insert({
    ...parsed.data,
    workspace_id: workspace.id,
    position: position ?? 0,
  });

  if (error) return writeFailure("createDeal", error);

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");

  // O negócio aparece na página do lead vinculado.
  if (parsed.data.lead_id) {
    revalidatePath(`/leads/${parsed.data.lead_id}`);
  }

  return { ok: true, message: "Negócio criado." };
}

export async function updateDealAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  if (!dealIdSchema.safeParse(id).success) {
    return { ok: false, message: "Negócio inválido." };
  }

  const parsed = dealSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Confira os campos destacados.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();

  // O `workspace_id` não entra no update: a RLS decide se a linha é visível, e
  // aceitá-lo do cliente seria oferecer ao atacante o campo a forjar.
  //
  // `position` também fica de fora — quem a controla é `moveDealAction`. Um
  // update do formulário de edição não deve reordenar a coluna.
  const { error, count } = await supabase
    .from("deals")
    .update(parsed.data, { count: "exact" })
    .eq("id", id);

  if (error) return writeFailure("updateDeal", error);

  if (count === 0) {
    return { ok: false, message: "Negócio não encontrado." };
  }

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");

  if (parsed.data.lead_id) {
    revalidatePath(`/leads/${parsed.data.lead_id}`);
  }

  return { ok: true, message: "Negócio atualizado." };
}

export async function deleteDealAction(id: string): Promise<ActionResult> {
  const parsed = dealIdSchema.safeParse(id);

  if (!parsed.success) {
    return { ok: false, message: "Negócio inválido." };
  }

  const supabase = await createClient();

  const { error, count } = await supabase
    .from("deals")
    .delete({ count: "exact" })
    .eq("id", parsed.data);

  if (error) return writeFailure("deleteDeal", error);

  if (count === 0) {
    return { ok: false, message: "Negócio não encontrado." };
  }

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");

  return { ok: true, message: "Negócio excluído." };
}

/**
 * Mover negócio entre etapas ou reordenar dentro da coluna.
 *
 * Delega para a função `move_deal` do Postgres, e não a um punhado de updates
 * daqui, porque reordenar mexe em várias linhas: tirar o card da origem fecha
 * um buraco, colocá-lo no destino abre espaço. Numa sequência de updates
 * soltos, uma falha no meio deixa a coluna com posições duplicadas — e o
 * board seguinte carrega numa ordem que ninguém pediu. Dentro da função tudo
 * acontece numa transação só.
 *
 * `move_deal` não é `security definer`: roda sob RLS e, portanto, não alcança
 * negócio de outro workspace.
 */
export async function moveDealAction(input: unknown): Promise<ActionResult> {
  const parsed = moveDealSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Não foi possível mover o negócio.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("move_deal", {
    deal_id: parsed.data.id,
    target_stage: parsed.data.stage,
    target_position: parsed.data.position,
  });

  if (error) {
    console.error("[pipeline] moveDeal:", error);

    return { ok: false, message: "Não foi possível mover o negócio." };
  }

  // Sem `revalidatePath("/pipeline")`: ele descartaria o estado otimista do
  // board e o card voltaria visualmente para a posição antiga por um instante.
  // O board já reflete o movimento; o servidor confirma em silêncio.
  //
  // O dashboard, esse sim, precisa: mover para Ganho/Perdido muda a conversão
  // e o valor do pipeline, e essa tela não tem estado otimista para preservar.
  revalidatePath("/dashboard");

  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";

import { toFieldErrors, type ActionResult } from "@/lib/actions/result";
import { getCurrentUser, getCurrentWorkspace } from "@/lib/data/workspaces";
import { canAddLead } from "@/lib/limits";
import { createClient } from "@/lib/supabase/server";
import {
  activitySchema,
  leadIdSchema,
  leadSchema,
} from "@/lib/validations/lead";

/**
 * Server Actions de leads e atividades — gravando no Supabase desde o M11.
 *
 * Três regras valem em todas elas:
 *
 * 1. **O `workspace_id` vem do servidor**, nunca do payload. Aceitá-lo do
 *    cliente ofereceria ao atacante exatamente o campo que precisa forjar para
 *    escrever na empresa alheia — a RLS barraria, mas a intenção do código já
 *    estaria errada.
 * 2. **A validação Zod é a mesma do cliente**, e aqui ela é lei: o formulário
 *    valida por conveniência, esta camada por segurança.
 * 3. **Erro do banco não vaza para a tela.** O usuário recebe uma frase útil; o
 *    detalhe (código do Postgres, nome de constraint) fica no log do servidor.
 */

/** Falha genérica de escrita, com o detalhe registrado só no servidor. */
function writeFailure(context: string, error: unknown): ActionResult {
  console.error(`[leads] ${context}:`, error);

  return {
    ok: false,
    message: "Não foi possível salvar. Tente de novo em alguns instantes.",
  };
}

const SEM_WORKSPACE: ActionResult = {
  ok: false,
  message: "Nenhum workspace ativo. Recarregue a página e tente de novo.",
};

export async function createLeadAction(input: unknown): Promise<ActionResult> {
  const parsed = leadSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Confira os campos destacados.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const workspace = await getCurrentWorkspace();

  if (!workspace) return SEM_WORKSPACE;

  // Limite do plano Free checado NO SERVIDOR antes do insert. A tela também
  // avisa ao atingir o teto, mas isso é conveniência: quem chamar a action
  // direto passaria por cima.
  //
  // A regra mora em `canAddLead()` (`lib/limits.ts`), junto com a do convite e
  // a das telas — inclusive a leitura do plano por `getEffectivePlan()`, que
  // ignora `plan = 'pro'` de assinatura cancelada.
  const limit = await canAddLead();

  if (!limit.allowed) {
    return { ok: false, message: limit.message };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("leads").insert({
    ...parsed.data,
    workspace_id: workspace.id,
  });

  if (error) return writeFailure("createLead", error);

  revalidatePath("/leads");
  // O dashboard conta leads; sem isto o card ficaria com o número velho.
  revalidatePath("/dashboard");

  return { ok: true, message: "Lead cadastrado." };
}

export async function updateLeadAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  if (!leadIdSchema.safeParse(id).success) {
    return { ok: false, message: "Lead inválido." };
  }

  const parsed = leadSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Confira os campos destacados.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();

  // O `workspace_id` não entra no update: a RLS é que decide se a linha é
  // visível, e mandá-lo do cliente seria oferecer ao atacante o campo a forjar.
  const { error, count } = await supabase
    .from("leads")
    .update(parsed.data, { count: "exact" })
    .eq("id", id);

  if (error) return writeFailure("updateLead", error);

  // Zero linhas afetadas com update válido = a RLS filtrou a linha. Lead de
  // outro workspace responde igual a lead inexistente: não confirmamos que o
  // id existe em algum lugar.
  if (count === 0) {
    return { ok: false, message: "Lead não encontrado." };
  }

  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
  revalidatePath("/pipeline");

  return { ok: true, message: "Lead atualizado." };
}

export async function deleteLeadAction(id: string): Promise<ActionResult> {
  // O id vem do cliente: sem validar, um `id` forjado seguiria direto para a
  // query.
  const parsed = leadIdSchema.safeParse(id);

  if (!parsed.success) {
    return { ok: false, message: "Lead inválido." };
  }

  const supabase = await createClient();

  // As atividades caem por `on delete cascade`; os negócios sobrevivem com
  // `lead_id` nulo (`on delete set null`), porque o valor já fechado continua
  // valendo para o funil.
  const { error, count } = await supabase
    .from("leads")
    .delete({ count: "exact" })
    .eq("id", parsed.data);

  if (error) return writeFailure("deleteLead", error);

  if (count === 0) {
    return { ok: false, message: "Lead não encontrado." };
  }

  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");

  return { ok: true, message: "Lead excluído." };
}

export async function createActivityAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = activitySchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Confira os campos destacados.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const [workspace, user] = await Promise.all([
    getCurrentWorkspace(),
    getCurrentUser(),
  ]);

  if (!workspace) return SEM_WORKSPACE;

  const supabase = await createClient();

  // `author_id` vem da sessão, não do formulário: a policy de insert exige
  // `author_id = auth.uid()` justamente para ninguém registrar uma ligação em
  // nome de outra pessoa.
  const { error } = await supabase.from("activities").insert({
    ...parsed.data,
    workspace_id: workspace.id,
    author_id: user.id,
  });

  if (error) return writeFailure("createActivity", error);

  revalidatePath(`/leads/${parsed.data.lead_id}`);

  return { ok: true, message: "Atividade registrada." };
}

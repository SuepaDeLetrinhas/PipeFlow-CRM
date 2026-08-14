"use server";

import { revalidatePath } from "next/cache";

import {
  simulateLatency,
  toFieldErrors,
  type ActionResult,
} from "@/lib/actions/result";
import {
  activitySchema,
  leadIdSchema,
  leadSchema,
} from "@/lib/validations/lead";

/**
 * Server Actions de leads e atividades — stubs.
 *
 * A validação com Zod já é a definitiva. O M9 troca o corpo depois do `parse`
 * por inserts no Supabase; as telas e as assinaturas não mudam.
 *
 * Como as fixtures são um módulo em memória, escrever nelas não sobreviveria ao
 * próximo request e daria a impressão falsa de persistência. Por isso as actions
 * validam, avisam e não gravam nada até o M9.
 */

const PENDENTE_M9 =
  "Formulário validado. A gravação entra no M9, quando o Supabase substituir as fixtures.";

export async function createLeadAction(input: unknown): Promise<ActionResult> {
  const parsed = leadSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Confira os campos destacados.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  await simulateLatency();

  // M9: checar FREE_PLAN_LIMITS.leads no servidor antes do insert, e então
  // supabase.from("leads").insert({ ...parsed.data, workspace_id })
  revalidatePath("/leads");

  return { ok: true, message: PENDENTE_M9 };
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

  await simulateLatency();

  // M9: supabase.from("leads").update(parsed.data).eq("id", id)
  // O `workspace_id` não entra no update: a RLS é que decide se a linha é
  // visível, e mandá-lo do cliente seria oferecer ao atacante o campo a forjar.
  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");

  return { ok: true, message: PENDENTE_M9 };
}

export async function deleteLeadAction(id: string): Promise<ActionResult> {
  // O id vem do cliente: sem validar, um `id` forjado seguiria direto para a
  // query do M9.
  const parsed = leadIdSchema.safeParse(id);

  if (!parsed.success) {
    return { ok: false, message: "Lead inválido." };
  }

  await simulateLatency();

  // M9: supabase.from("leads").delete().eq("id", id) — as atividades e negócios
  // vinculados caem por `on delete cascade` na migration.
  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");

  return {
    ok: true,
    message:
      "Exclusão validada. A remoção real entra no M9, junto com o cascade no banco.",
  };
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

  await simulateLatency();

  // M9: supabase.from("activities").insert({ ...parsed.data, workspace_id, author_id })
  revalidatePath(`/leads/${parsed.data.lead_id}`);

  return { ok: true, message: PENDENTE_M9 };
}

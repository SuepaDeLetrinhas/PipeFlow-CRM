"use server";

import { revalidatePath } from "next/cache";

import {
  simulateLatency,
  toFieldErrors,
  type ActionResult,
} from "@/lib/actions/result";
import {
  dealIdSchema,
  dealSchema,
  moveDealSchema,
} from "@/lib/validations/deal";

/**
 * Server Actions de negócios — stubs.
 *
 * A validação com Zod já é a definitiva. O M12 troca o corpo depois do `parse`
 * por queries no Supabase; as telas e as assinaturas não mudam.
 *
 * Como as fixtures são um módulo em memória, escrever nelas não sobreviveria ao
 * próximo request e daria a impressão falsa de persistência. Por isso as actions
 * validam, avisam e não gravam nada até o M12.
 */

const PENDENTE_M12 =
  "Formulário validado. A gravação entra no M12, quando o Supabase substituir as fixtures.";

export async function createDealAction(input: unknown): Promise<ActionResult> {
  const parsed = dealSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Confira os campos destacados.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  await simulateLatency();

  // M12: supabase.from("deals").insert({ ...parsed.data, workspace_id })
  revalidatePath("/pipeline");

  return { ok: true, message: PENDENTE_M12 };
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

  await simulateLatency();

  // M12: supabase.from("deals").update(parsed.data).eq("id", id)
  // O `workspace_id` não entra no update: a RLS decide se a linha é visível, e
  // aceitá-lo do cliente seria oferecer ao atacante o campo a forjar.
  revalidatePath("/pipeline");

  return { ok: true, message: PENDENTE_M12 };
}

export async function deleteDealAction(id: string): Promise<ActionResult> {
  const parsed = dealIdSchema.safeParse(id);

  if (!parsed.success) {
    return { ok: false, message: "Negócio inválido." };
  }

  await simulateLatency();

  // M12: supabase.from("deals").delete().eq("id", id)
  revalidatePath("/pipeline");

  return {
    ok: true,
    message: "Exclusão validada. A remoção real entra no M12.",
  };
}

/**
 * Mover negócio entre etapas ou reordenar dentro da coluna.
 *
 * Latência menor que a das demais: arrastar é gesto contínuo, e 600ms de espera
 * fariam o board parecer travado. Quem mantém a posição na tela até o M12 é o
 * estado local do board — esta action só valida o payload.
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

  await simulateLatency(150);

  // M12: update de `stage` e `position` + reindexação das posições da coluna.
  // Sem `revalidatePath` aqui: ele descartaria o estado otimista do board e o
  // card voltaria visualmente para a posição antiga.

  return { ok: true };
}

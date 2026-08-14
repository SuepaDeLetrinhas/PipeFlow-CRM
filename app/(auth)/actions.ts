"use server";

import { redirect } from "next/navigation";

import {
  simulateLatency,
  toFieldErrors,
  type ActionResult,
} from "@/lib/actions/result";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validations/auth";

/**
 * Server Actions de autenticação — stubs.
 *
 * A validação com Zod já é a definitiva: o M9 troca o corpo depois do `parse`
 * por chamadas ao Supabase Auth, sem mexer nas telas nem nas assinaturas.
 *
 * `ActionResult` e os helpers moram em `lib/actions/result` porque um arquivo
 * `"use server"` só pode exportar funções async.
 */

export type { ActionResult };

export async function signInAction(input: unknown): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Confira os campos destacados.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  await simulateLatency();

  // M9: supabase.auth.signInWithPassword(parsed.data)
  redirect("/dashboard");
}

export async function signUpAction(input: unknown): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Confira os campos destacados.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  await simulateLatency();

  // M9: supabase.auth.signUp(...) + confirmação por e-mail
  redirect("/dashboard");
}

export async function forgotPasswordAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  await simulateLatency();

  // M9: supabase.auth.resetPasswordForEmail(...)
  // A resposta é sempre positiva de propósito: dizer "e-mail não cadastrado"
  // entregaria a um atacante quais contas existem.
  return {
    ok: true,
    message:
      "Se houver uma conta com esse e-mail, o link de redefinição chega em instantes.",
  };
}

export async function resetPasswordAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Confira os campos destacados.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  await simulateLatency();

  // M9: supabase.auth.updateUser({ password })
  redirect("/login?redefinida=1");
}

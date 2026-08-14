"use server";

import { redirect } from "next/navigation";

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
 */

export interface ActionResult {
  ok: boolean;
  /** Erro geral do formulário: credencial inválida, e-mail já em uso… */
  message?: string;
  /** Erros por campo, no formato que o react-hook-form consome. */
  fieldErrors?: Record<string, string>;
}

/** Só existe para o estado de carregamento aparecer enquanto não há rede. */
function simulateLatency() {
  return new Promise((resolve) => setTimeout(resolve, 600));
}

function toFieldErrors(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): Record<string, string> {
  const { fieldErrors } = error.flatten();

  return Object.fromEntries(
    Object.entries(fieldErrors)
      .filter(([, messages]) => messages?.length)
      .map(([field, messages]) => [field, messages![0]]),
  );
}

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

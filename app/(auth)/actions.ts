"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { type ActionResult, toFieldErrors } from "@/lib/actions/result";
import { env } from "@/lib/env";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validations/auth";

/**
 * Server Actions de autenticação.
 *
 * A validação com Zod veio do M2 e não mudou: o M9 trocou apenas o corpo depois
 * do `parse`. As telas e as assinaturas continuam as mesmas.
 *
 * `ActionResult` e os helpers moram em `lib/actions/result` porque um arquivo
 * `"use server"` só pode exportar funções async.
 */

export type { ActionResult };

/**
 * `redirect()` funciona lançando uma exceção que o Next intercepta. Um
 * `try/catch` em volta a engoliria e transformaria o redirect em erro genérico,
 * então toda chamada fica FORA de bloco try — inclusive nas actions abaixo.
 */

/**
 * Destino pós-login. Vem do `?next=` que o middleware anexa ao expulsar quem
 * não tem sessão, então é entrada de usuário: só caminho interno passa.
 * `//host` seria lido pelo navegador como URL absoluta apesar da barra inicial.
 */
function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/dashboard";

  return value;
}

export async function signInAction(
  input: unknown,
  next?: string,
): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Confira os campos destacados.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Mensagem única para credencial errada, e-mail inexistente e conta não
    // confirmada. Distinguir os casos diria a um atacante quais e-mails têm
    // conta neste app — enumeração de contas pela tela de login.
    return { ok: false, message: "E-mail ou senha incorretos." };
  }

  // O layout de `(app)` é cacheado por rota; sem invalidar, a sidebar poderia
  // renderizar com o usuário da sessão anterior.
  revalidatePath("/", "layout");
  redirect(safeNext(next));
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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // `handle_new_user` lê `full_name` daqui para preencher o perfil. Sem
      // isso o nome nasceria vazio e a sidebar mostraria só o e-mail.
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/callback`,
    },
  });

  if (error) {
    // E-mail já cadastrado é o único caso que vale a pena nomear: quem está
    // se cadastrando já sabe se tem conta, e a alternativa ("erro ao criar
    // conta") deixaria a pessoa presa sem saber que o caminho é o login.
    if (error.code === "user_already_exists") {
      return {
        ok: false,
        fieldErrors: { email: "Já existe uma conta com este e-mail." },
      };
    }

    return { ok: false, message: "Não foi possível criar a conta. Tente novamente." };
  }

  // Com "Confirm email" ligado no painel, o signUp devolve usuário SEM sessão:
  // a conta só ativa depois do clique no e-mail. Redirecionar para /dashboard
  // nesse caso jogaria a pessoa direto na tela de login pelo middleware, sem
  // explicação nenhuma.
  if (!data.session) {
    return {
      ok: true,
      message:
        "Conta criada. Confira seu e-mail para confirmar o cadastro e entrar.",
    };
  }

  revalidatePath("/", "layout");
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

  const supabase = await createClient();

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/callback?next=/reset-password`,
  });

  // A resposta é sempre positiva, e o erro acima é deliberadamente ignorado:
  // dizer "e-mail não cadastrado" entregaria quais contas existem. Mesma razão
  // da mensagem única no login.
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

  const supabase = await createClient();

  // Quem chega aqui veio do link do e-mail, que o callback já trocou por
  // sessão. Sem sessão, `updateUser` não sabe de quem é a senha — e aceitar
  // silenciosamente deixaria a pessoa achando que redefiniu.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message:
        "O link expirou ou já foi usado. Peça um novo link de redefinição.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    // O Supabase recusa a senha nova quando ela é igual à atual.
    if (error.code === "same_password") {
      return {
        ok: false,
        fieldErrors: { password: "A nova senha precisa ser diferente da atual." },
      };
    }

    return { ok: false, message: "Não foi possível redefinir a senha." };
  }

  revalidatePath("/", "layout");
  redirect("/login?redefinida=1");
}

/**
 * Logout. Encerra a sessão no Supabase e limpa os cookies pelo cliente de
 * servidor, que é quem sabe escrevê-los na resposta.
 */
export async function signOutAction() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}

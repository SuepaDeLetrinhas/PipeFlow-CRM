"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { type ActionResult, toFieldErrors } from "@/lib/actions/result";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { WORKSPACE_COOKIE, workspaceCookieOptions } from "@/lib/workspace-cookie";
import {
  createWorkspaceSchema,
  switchWorkspaceSchema,
} from "@/lib/validations/workspace";

/**
 * Server Actions de workspace.
 *
 * O membro admin NÃO é criado aqui: o trigger `handle_new_workspace` (M8) o
 * insere junto com a linha de assinatura. Fazê-lo nesta action seria impossível
 * de qualquer forma — a policy de insert em `workspace_members` exige ser
 * admin, e no instante da criação ainda não existe admin algum.
 */

/**
 * Encontra um slug livre. O nome é do usuário e colide com facilidade ("Studio",
 * "Consultoria"), e a coluna tem unique — sem isto, a segunda empresa de mesmo
 * nome receberia um erro de constraint em vez de um workspace.
 */
async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
) {
  const base = slugify(name) || "workspace";

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;

    // `maybeSingle` porque ausência é o caso esperado e não deve virar erro.
    // A leitura passa por RLS: workspace de terceiros não aparece, então um
    // slug já usado por outra empresa pode "parecer" livre — o unique da coluna
    // é quem decide de fato, e o retry abaixo cobre a corrida.
    const { data } = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data) return candidate;
  }

  // Sufixo aleatório como última saída, em vez de falhar depois de 20 tentativas.
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createWorkspaceAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = createWorkspaceSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Confira os campos destacados.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sessão expirada. Entre novamente." };
  }

  let workspaceId: string | null = null;

  // Duas tentativas: entre checar o slug e inserir, outra pessoa pode ter
  // levado o mesmo. `23505` é unique_violation — só ele merece retry; qualquer
  // outro erro é problema real e sai pela mensagem.
  for (let attempt = 0; attempt < 2 && !workspaceId; attempt += 1) {
    const slug = await uniqueSlug(supabase, parsed.data.name);

    // Sem `.select()` encadeado, de propósito. Ele geraria `INSERT ...
    // RETURNING`, e o RETURNING é avaliado pela policy de SELECT
    // (`is_workspace_member(id)`) — que ainda é falsa neste instante: o vínculo
    // de membro só nasce no trigger `handle_new_workspace`, depois da linha
    // existir. O insert grava, mas a leitura de volta falha com 42501 e o
    // usuário veria "não foi possível criar" para um workspace que foi criado.
    const { error } = await supabase.from("workspaces").insert({
      name: parsed.data.name,
      slug,
      owner_id: user.id,
      plan: "free",
    });

    if (!error) {
      // Busca depois do insert: agora o trigger já rodou e a linha é visível.
      const { data } = await supabase
        .from("workspaces")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      workspaceId = data?.id ?? null;
      break;
    }

    if (error.code !== "23505") {
      return { ok: false, message: "Não foi possível criar o workspace." };
    }
  }

  if (!workspaceId) {
    return {
      ok: false,
      message: "Não foi possível criar o workspace. Tente outro nome.",
    };
  }

  // Entrar já no contexto recém-criado: sem isto, quem acabou de criar a
  // empresa cairia no workspace anterior (ou em nenhum) logo após o onboarding.
  cookies().set(WORKSPACE_COOKIE, workspaceId, workspaceCookieOptions());

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Troca o workspace ativo. O cookie é a fonte de verdade do contexto, lida por
 * `getCurrentWorkspace()`.
 */
export async function switchWorkspaceAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = switchWorkspaceSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: "Workspace inválido." };
  }

  const supabase = await createClient();

  // Confirma a associação ANTES de gravar o cookie. Sem esta checagem, um
  // workspace_id qualquer no payload gravaria um contexto ao qual a pessoa não
  // pertence — a RLS ainda barraria os dados, mas o app ficaria num estado
  // inconsistente, exibindo um contexto vazio sem explicação.
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", parsed.data.workspaceId)
    .maybeSingle();

  if (!membership) {
    return { ok: false, message: "Você não faz parte deste workspace." };
  }

  cookies().set(
    WORKSPACE_COOKIE,
    parsed.data.workspaceId,
    workspaceCookieOptions(),
  );

  revalidatePath("/", "layout");

  return { ok: true };
}

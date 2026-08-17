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
 * Monta o slug da tentativa `attempt`.
 *
 * Não há consulta prévia para "verificar se o slug está livre", de propósito:
 * a leitura passa por RLS e workspaces de terceiros não aparecem, então um slug
 * já em uso pareceria livre e a checagem daria falsa confiança — além de gastar
 * uma query por tentativa. Quem decide é o unique da coluna; a colisão volta
 * como 23505 e o laço em `createWorkspaceAction` tenta de novo.
 */
function buildSlug(name: string, attempt: number) {
  const base = slugify(name) || "workspace";

  // A primeira tentativa usa o slug limpo, que é o que aparece na URL no caso
  // comum. As seguintes ganham sufixo aleatório.
  if (attempt === 0) return base;

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

  // Nomes de empresa colidem com facilidade ("Studio", "Consultoria") e a
  // coluna tem unique. `23505` é unique_violation — só ele merece nova
  // tentativa, com sufixo aleatório; qualquer outro erro é problema real e sai
  // pela mensagem. Cinco tentativas tornam a falha por azar desprezível.
  for (let attempt = 0; attempt < 5 && !workspaceId; attempt += 1) {
    const slug = buildSlug(parsed.data.name, attempt);

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

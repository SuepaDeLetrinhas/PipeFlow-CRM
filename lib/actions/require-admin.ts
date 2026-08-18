import "server-only";

import type { ActionResult } from "@/lib/actions/result";
import { getCurrentUser, getCurrentWorkspace } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

/**
 * Contexto de uma action restrita a admin.
 *
 * Vive fora dos arquivos `"use server"` porque lá só se pode exportar funções
 * async — interfaces e helpers síncronos precisam de módulo próprio, mesma
 * razão de `lib/actions/result.ts`.
 */
export interface AdminContext {
  workspaceId: string;
  workspaceName: string;
  userId: string;
  userName: string;
}

/**
 * Resolve o workspace ativo e exige papel de admin.
 *
 * Nasceu privado nas actions de equipe e foi extraído no M14, quando o
 * checkout passou a precisar da mesma regra: só admin cobra, porque é quem
 * responde pelo cartão. Duplicar a checagem daria dois lugares para corrigir
 * quando o modelo de papéis mudar — e o esquecido seria o que autoriza gasto.
 *
 * Devolve `ActionResult` em caso de recusa, em vez de lançar, para que cada
 * action entregue a mensagem ao formulário pelo mesmo caminho dos erros de
 * validação.
 *
 * Esconder o botão na UI é conveniência para quem usa, não autorização. As
 * policies do Postgres são a camada final e recusariam a escrita de qualquer
 * forma, mas confiar só nelas devolveria um erro genérico de RLS em vez de uma
 * frase que explica o que houve.
 */
export async function requireAdmin(
  deniedMessage: string,
): Promise<{ ok: true; context: AdminContext } | { ok: false; result: ActionResult }> {
  const [user, workspace] = await Promise.all([
    getCurrentUser(),
    getCurrentWorkspace(),
  ]);

  if (!workspace) {
    return {
      ok: false,
      result: { ok: false, message: "Nenhum workspace ativo." },
    };
  }

  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "admin") {
    return { ok: false, result: { ok: false, message: deniedMessage } };
  }

  return {
    ok: true,
    context: {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      userId: user.id,
      userName: user.full_name,
    },
  };
}

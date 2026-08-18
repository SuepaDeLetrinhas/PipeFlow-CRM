import { createClient } from "@/lib/supabase/server";
import type { Invite } from "@/types";

import { getCurrentWorkspace } from "./workspaces";

/**
 * Leitura de convites do workspace ativo.
 *
 * Só admin enxerga: a policy `invites_select_admin` restringe o select, então
 * para um membro comum estas funções devolvem lista vazia e zero — sem que
 * exista uma segunda checagem de papel aqui. A regra mora no banco, num lugar
 * só.
 */

/**
 * Convites pendentes, do mais recente para o mais antigo.
 *
 * Convites vencidos são filtrados na query em vez de terem o status corrigido:
 * um `pending` com `expires_at` no passado já não vale para o aceite (a rota
 * confere as duas coisas), e sair reescrevendo linha em toda leitura tornaria
 * uma função de leitura numa que escreve.
 */
export async function getPendingInvites(): Promise<Invite[]> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from("invites")
    .select(
      "id, workspace_id, email, role, status, invited_by, expires_at, created_at, profiles (full_name)",
    )
    .eq("workspace_id", workspace.id)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (!data) return [];

  return data.map((invite) => {
    const { profiles, ...rest } = invite;

    return { ...rest, invited_by_name: profiles?.full_name ?? "Alguém" };
  });
}

/**
 * Quantos assentos o workspace já consumiu: membros + convites pendentes.
 *
 * Os convites entram na conta de propósito. Se só os membros contassem, um
 * admin do plano Free convidaria dez pessoas e o limite só apareceria no
 * aceite — tarde demais, com gente já convidada e um "não há vaga" para quem
 * clicou no link.
 */
export async function getSeatUsage(): Promise<{
  members: number;
  pendingInvites: number;
  total: number;
}> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) return { members: 0, pendingInvites: 0, total: 0 };

  const supabase = await createClient();

  // `head: true` com `count: "exact"`: só o número volta, sem trafegar linha
  // nenhuma — é uma contagem, não uma listagem.
  const [{ count: members }, { count: pendingInvites }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id),
    supabase
      .from("invites")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString()),
  ]);

  const memberCount = members ?? 0;
  const inviteCount = pendingInvites ?? 0;

  return {
    members: memberCount,
    pendingInvites: inviteCount,
    total: memberCount + inviteCount,
  };
}

"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import { type ActionResult, toFieldErrors } from "@/lib/actions/result";
import { FREE_PLAN_LIMITS } from "@/lib/constants";
import { getCurrentUser, getCurrentWorkspace, getSeatUsage } from "@/lib/data";
import { sendInviteEmail } from "@/lib/email/send-invite";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  inviteIdSchema,
  inviteMemberSchema,
  memberIdSchema,
  updateMemberRoleSchema,
} from "@/lib/validations/invite";

/**
 * Server Actions de colaboração: convidar, revogar, mudar papel, remover.
 *
 * Toda action aqui é de admin, e a checagem de papel acontece **no servidor**,
 * antes de qualquer escrita. Esconder o botão na UI é conveniência para quem
 * usa; não é autorização. As policies do Postgres são a terceira camada e
 * recusariam a escrita de qualquer forma, mas confiar só nelas devolveria um
 * erro genérico de RLS em vez de uma frase que explica o que houve.
 */

interface AdminContext {
  workspaceId: string;
  workspaceName: string;
  userId: string;
  userName: string;
}

/**
 * Resolve o contexto e exige papel de admin.
 *
 * Devolve `ActionResult` em caso de recusa (em vez de lançar) para que cada
 * action entregue a mensagem ao formulário pelo mesmo caminho dos erros de
 * validação.
 */
async function requireAdmin(): Promise<
  { ok: true; context: AdminContext } | { ok: false; result: ActionResult }
> {
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
    return {
      ok: false,
      result: {
        ok: false,
        message: "Só administradores podem gerenciar a equipe.",
      },
    };
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

/**
 * Token do convite.
 *
 * 32 bytes de `randomBytes` — CSPRNG. `Math.random()` seria inadequado: é
 * previsível, e este token é a única credencial que separa um estranho de
 * entrar no workspace. Base64url para caber na URL sem escape.
 */
function generateToken() {
  return randomBytes(32).toString("base64url");
}

function inviteUrl(token: string) {
  return `${env.NEXT_PUBLIC_SITE_URL}/invite/${token}`;
}

/**
 * Resultado do convite. Carrega o link porque a UI precisa exibi-lo quando o
 * e-mail não sai — ver a decisão em `lib/email/send-invite.ts`.
 */
export interface InviteActionResult extends ActionResult {
  inviteUrl?: string;
  emailDelivered?: boolean;
}

export async function inviteMemberAction(
  input: unknown,
): Promise<InviteActionResult> {
  const parsed = inviteMemberSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Confira os campos destacados.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const auth = await requireAdmin();

  if (!auth.ok) return auth.result;

  const { workspaceId, workspaceName, userId, userName } = auth.context;
  const supabase = await createClient();

  // --- Limite do plano ------------------------------------------------------
  // Checado no servidor antes da escrita, como manda o CLAUDE.md, contando
  // membros + convites pendentes: assentos comprometidos, não só ocupados.
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("plan")
    .eq("id", workspaceId)
    .maybeSingle();

  if (workspace?.plan === "free") {
    const usage = await getSeatUsage();

    if (usage.total >= FREE_PLAN_LIMITS.members) {
      return {
        ok: false,
        message: `O plano Free permite ${FREE_PLAN_LIMITS.members} pessoas no workspace. Revogue um convite pendente ou faça upgrade para o Pro.`,
      };
    }
  }

  // --- Já é membro? ---------------------------------------------------------
  // Convidar quem já está dentro gravaria um convite que, ao ser aceito,
  // falharia no unique de `workspace_members`. Melhor dizer agora.
  //
  // A busca é pelo perfil porque `workspace_members` guarda `user_id`, não
  // e-mail. Perfil inexistente significa que a pessoa ainda não tem conta —
  // caso normal de convite, e o motivo do `maybeSingle()`.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", parsed.data.email)
    .maybeSingle();

  if (profile) {
    const { data: existing } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (existing) {
      return {
        ok: false,
        message: "Essa pessoa já faz parte do workspace.",
        fieldErrors: { email: "Já é membro." },
      };
    }
  }

  // --- Gravação -------------------------------------------------------------
  const token = generateToken();

  const { data: invite, error } = await supabase
    .from("invites")
    .insert({
      workspace_id: workspaceId,
      email: parsed.data.email,
      role: parsed.data.role,
      token,
      invited_by: userId,
    })
    .select("expires_at")
    .single();

  if (error) {
    // 23505 é unique_violation. O único unique que um convite novo pode violar
    // é `invites_pending_unique` (workspace + lower(email), só para pendentes):
    // já existe convite em aberto para esse endereço.
    if (error.code === "23505") {
      return {
        ok: false,
        message: "Já existe um convite pendente para esse e-mail.",
        fieldErrors: { email: "Convite já enviado." },
      };
    }

    return { ok: false, message: "Não foi possível criar o convite." };
  }

  // --- Envio ----------------------------------------------------------------
  // Depois da gravação, e sem poder desfazê-la.
  const delivery = await sendInviteEmail({
    to: parsed.data.email,
    workspaceName,
    inviterName: userName,
    role: parsed.data.role,
    acceptUrl: inviteUrl(token),
    expiresAt: new Date(invite.expires_at),
  });

  revalidatePath("/settings");

  return {
    ok: true,
    inviteUrl: inviteUrl(token),
    emailDelivered: delivery.delivered,
  };
}

/**
 * Revoga um convite pendente.
 *
 * `delete`, e não `status = 'revoked'`: o índice `invites_pending_unique` só
 * cobre linhas pendentes, então apagar libera o e-mail para um novo convite na
 * hora. Manter a linha revogada guardaria histórico que nenhuma tela mostra.
 */
export async function revokeInviteAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = inviteIdSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: "Convite inválido." };
  }

  const auth = await requireAdmin();

  if (!auth.ok) return auth.result;

  const supabase = await createClient();

  // `select()` no delete para saber QUANTAS linhas saíram. Sem ele, um id de
  // outro workspace (ou já revogado) apagaria zero linhas e mesmo assim
  // voltaria sem erro — a action responderia "ok" para uma revogação que não
  // aconteceu, e a UI mostraria um toast de sucesso mentiroso.
  //
  // O filtro por `workspace_id` é redundante com a policy `invites_delete_admin`
  // e mantido de propósito: ele é o que garante que o id de outro workspace não
  // case, em vez de depender só da RLS.
  const { data: deleted, error } = await supabase
    .from("invites")
    .delete()
    .eq("id", parsed.data.inviteId)
    .eq("workspace_id", auth.context.workspaceId)
    .select("id");

  if (error) {
    return { ok: false, message: "Não foi possível revogar o convite." };
  }

  if (!deleted?.length) {
    return {
      ok: false,
      message: "Convite não encontrado. Ele pode já ter sido aceito ou revogado.",
    };
  }

  revalidatePath("/settings");

  return { ok: true };
}

export async function updateMemberRoleAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = updateMemberRoleSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: "Dados inválidos." };
  }

  const auth = await requireAdmin();

  if (!auth.ok) return auth.result;

  const supabase = await createClient();

  // `select()` para distinguir "alterou" de "não casou nenhuma linha". Sem ele,
  // um memberId de outro workspace atualizaria zero linhas e voltaria sem erro,
  // e a action responderia "ok" a uma alteração que não houve.
  const { data: updated, error } = await supabase
    .from("workspace_members")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.memberId)
    .eq("workspace_id", auth.context.workspaceId)
    .select("id");

  if (error) {
    // O trigger `protect_workspace_owner` levanta exceção ao tentar rebaixar o
    // dono. É a única falha esperada aqui, e merece a frase que a explica.
    return {
      ok: false,
      message:
        "Não foi possível alterar o papel. O dono do workspace não pode ser rebaixado.",
    };
  }

  if (!updated?.length) {
    return { ok: false, message: "Membro não encontrado neste workspace." };
  }

  revalidatePath("/settings");

  return { ok: true };
}

export async function removeMemberAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = memberIdSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: "Membro inválido." };
  }

  const auth = await requireAdmin();

  if (!auth.ok) return auth.result;

  const supabase = await createClient();

  // Remover a si mesmo pela lista de membros tiraria o admin do próprio
  // workspace com um clique cujo rótulo diz "remover" — e, se fosse o último
  // admin, sem ninguém para readmiti-lo. Sair é outra ação, com outro texto.
  const { data: target } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("id", parsed.data.memberId)
    .eq("workspace_id", auth.context.workspaceId)
    .maybeSingle();

  if (target?.user_id === auth.context.userId) {
    return {
      ok: false,
      message: "Para sair do workspace, use a opção de sair da equipe.",
    };
  }

  // `select()` pelo mesmo motivo do update acima: sem ele, um memberId que não
  // pertence a este workspace apagaria zero linhas e reportaria sucesso.
  const { data: deleted, error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("id", parsed.data.memberId)
    .eq("workspace_id", auth.context.workspaceId)
    .select("id");

  if (error) {
    return {
      ok: false,
      message:
        "Não foi possível remover. O dono do workspace não pode ser removido.",
    };
  }

  if (!deleted?.length) {
    return { ok: false, message: "Membro não encontrado neste workspace." };
  }

  revalidatePath("/settings");

  return { ok: true };
}

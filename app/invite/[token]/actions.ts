"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { ActionResult } from "@/lib/actions/result";
import { canAcceptInvite } from "@/lib/limits";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { acceptInviteSchema } from "@/lib/validations/invite";
import { WORKSPACE_COOKIE, workspaceCookieOptions } from "@/lib/workspace-cookie";

/**
 * Aceite de convite.
 *
 * Este é o segundo consumidor legítimo da service-role no projeto (o primeiro
 * será o webhook do Stripe). A razão está na migration de RLS: a policy
 * `invites_select_admin` restringe a leitura de `invites` a admins do
 * workspace, e quem clica no link é justamente quem **ainda não é membro**.
 * Abrir um select para `anon` transformaria a tabela num meio de enumerar
 * convites; então a leitura por token acontece aqui, no servidor, com a chave
 * secreta e sob validações explícitas.
 *
 * O que a service-role NÃO faz aqui é dispensar a identificação de quem
 * aceita: o vínculo só é criado para o usuário da sessão, e o e-mail dessa
 * sessão precisa bater com o do convite.
 */

/** O que a página precisa saber para se desenhar antes do clique. */
export interface InvitePreview {
  status: "valid" | "not_found" | "expired" | "already_member" | "full";
  workspaceName?: string;
  email?: string;
  role?: "admin" | "member";
  inviterName?: string;
}

/**
 * Lê o convite pelo token e diz em que estado ele está.
 *
 * Não escreve nada: serve para a página decidir entre mostrar o convite, o
 * aviso de expirado ou o "já é membro". A action de aceite refaz todas estas
 * checagens — esta existe para a tela, não como autorização.
 */
export async function getInvitePreview(token: string): Promise<InvitePreview> {
  const parsed = acceptInviteSchema.safeParse({ token });

  if (!parsed.success) return { status: "not_found" };

  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("invites")
    .select(
      "id, email, role, status, expires_at, workspace_id, workspaces (name, plan), profiles (full_name)",
    )
    .eq("token", parsed.data.token)
    .maybeSingle();

  // Convite inexistente e convite já usado devolvem a mesma coisa de
  // propósito: distinguir os dois diria a um estranho com token aleatório que
  // ele acertou um token real.
  if (!invite || invite.status !== "pending") return { status: "not_found" };

  if (new Date(invite.expires_at) < new Date()) {
    return {
      status: "expired",
      workspaceName: invite.workspaces?.name,
      email: invite.email,
    };
  }

  const base = {
    workspaceName: invite.workspaces?.name,
    email: invite.email,
    role: invite.role,
    inviterName: invite.profiles?.full_name ?? "Alguém",
  };

  // Se quem abriu o link já está logado e já é membro, a tela diz isso em vez
  // de oferecer um botão que falharia.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // A conferência de e-mail vem ANTES da de membership. Na ordem inversa,
    // um link encaminhado e aberto por quem já é membro do workspace ganharia
    // a tela "você já faz parte" — que não é falsa, mas esconde o que de fato
    // aconteceu: o convite era de outra pessoa. A página passa a dizer o mesmo
    // que a action responde ao recusar.
    const sessionEmail = user.email?.trim().toLowerCase() ?? "";

    if (sessionEmail !== invite.email.trim().toLowerCase()) {
      return { status: "valid", ...base };
    }

    const { data: membership } = await admin
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", invite.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership) return { status: "already_member", ...base };
  }

  return { status: "valid", ...base };
}

export async function acceptInviteAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = acceptInviteSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: "Convite inválido." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Entre na sua conta para aceitar o convite." };
  }

  const admin = createAdminClient();

  // Releitura sob a chave secreta: o preview da página é conveniência de UI e
  // pode estar velho. Quem autoriza a escrita é esta consulta.
  const { data: invite } = await admin
    .from("invites")
    .select("id, workspace_id, email, role, status, expires_at")
    .eq("token", parsed.data.token)
    .maybeSingle();

  if (!invite || invite.status !== "pending") {
    return { ok: false, message: "Convite inválido ou já utilizado." };
  }

  if (new Date(invite.expires_at) < new Date()) {
    return {
      ok: false,
      message: "Este convite expirou. Peça um novo ao administrador.",
    };
  }

  // O convite é nominal. Sem esta checagem, qualquer pessoa com o link entraria
  // no workspace — e o link viaja por e-mail, que é encaminhável.
  //
  // Comparação normalizada porque o e-mail foi gravado em minúsculas pelo
  // schema de convite, mas o do Auth vem como a pessoa digitou no cadastro.
  const sessionEmail = user.email?.trim().toLowerCase() ?? "";

  if (sessionEmail !== invite.email.trim().toLowerCase()) {
    return {
      ok: false,
      message: `Este convite foi enviado para ${invite.email}. Entre com essa conta para aceitá-lo.`,
    };
  }

  // Idempotência: dois cliques no mesmo link não podem virar erro de unique.
  const { data: existing } = await admin
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", invite.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    // O limite é reconferido no aceite, e não só no convite. `canAcceptInvite()`
    // e não `canAddMember()`: quem está aceitando ainda não é membro, e as
    // leituras da outra dependem da sessão dele. Ver `lib/limits.ts`.
    const limit = await canAcceptInvite(invite.workspace_id);

    if (!limit.allowed) {
      return { ok: false, message: limit.message };
    }

    const { error } = await admin.from("workspace_members").insert({
      workspace_id: invite.workspace_id,
      user_id: user.id,
      role: invite.role,
    });

    if (error) {
      return { ok: false, message: "Não foi possível aceitar o convite." };
    }
  }

  // Marca como aceito só depois do vínculo existir. Na ordem inversa, uma
  // falha no insert deixaria o convite queimado e a pessoa de fora.
  await admin
    .from("invites")
    .update({ status: "accepted" })
    .eq("id", invite.id);

  // Entra já no workspace recém-aceito: cair no contexto anterior logo depois
  // de aceitar um convite não faz sentido para quem clicou.
  cookies().set(WORKSPACE_COOKIE, invite.workspace_id, workspaceCookieOptions());

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

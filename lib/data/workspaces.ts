import { cache } from "react";

import {
  currentWorkspace,
  members,
  subscriptions,
  workspaces,
} from "@/lib/mock/workspaces";
import { createClient } from "@/lib/supabase/server";
import type {
  Subscription,
  User,
  Workspace,
  WorkspaceMember,
} from "@/types";

/**
 * Camada de acesso a dados. A partir do M9 o usuário logado vem do Supabase
 * Auth; workspaces, membros e assinatura seguem em fixtures até o M10, quando
 * o workspace ativo passa a existir de verdade (cookie de contexto).
 */

/**
 * Workspaces em que o usuário logado é membro.
 *
 * Ainda em fixtures: as tabelas existem e têm RLS, mas o vínculo entre a conta
 * real e um workspace só é criado no M10 (onboarding). Filtrar pelo id real
 * contra membros fictícios devolveria lista vazia e deixaria o switcher e o
 * app inteiro sem contexto — regressão visível numa etapa que não trata disso.
 */
export async function getWorkspaces(): Promise<Workspace[]> {
  return workspaces;
}

/** Workspace ativo. No M10 passa a vir do cookie de contexto. */
export async function getCurrentWorkspace(): Promise<Workspace> {
  return currentWorkspace;
}

/**
 * Usuário logado, a partir da sessão do Supabase Auth.
 *
 * `cache()` deduplica por request: a sidebar, o cabeçalho e as páginas chamam
 * esta função de forma independente, e sem isso cada chamada viraria um
 * round-trip ao Auth na mesma renderização.
 *
 * Lança se não houver sessão — quem chega aqui já passou pelo middleware, então
 * ausência de usuário é bug de rota desprotegida, não fluxo normal. Devolver
 * `null` obrigaria toda call-site a tratar um caso que não deveria existir.
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<User> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "getCurrentUser() sem sessão: rota da área logada sem proteção no middleware.",
    );
  }

  // O perfil é a fonte de nome e avatar (o trigger `handle_new_user` o cria no
  // signup). Se ainda não existir — conta criada antes do trigger, por exemplo
  // —, o e-mail cobre a exibição em vez de derrubar a tela.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    full_name: profile?.full_name || user.email?.split("@")[0] || "Usuário",
    email: profile?.email ?? user.email ?? "",
    avatar_url: profile?.avatar_url ?? null,
  };
});

/**
 * Papel do usuário logado no workspace ativo.
 *
 * Como `getWorkspaces`, ainda em fixtures até o M10 criar o vínculo real: o
 * usuário autenticado assume o papel do primeiro membro do workspace ativo.
 * Comparar o id real com `user_id` fictício devolveria `null` sempre, e um
 * `null` aqui significa "não é membro" — o que esconderia da própria conta os
 * controles de admin no M7.
 */
export async function getCurrentMember(): Promise<WorkspaceMember | null> {
  const [user, workspace] = await Promise.all([
    getCurrentUser(),
    getCurrentWorkspace(),
  ]);

  const member = members.find(
    (candidate) => candidate.workspace_id === workspace.id,
  );

  return member ? { ...member, user_id: user.id, user } : null;
}

export async function getMembers(): Promise<WorkspaceMember[]> {
  const workspace = await getCurrentWorkspace();

  return members.filter((member) => member.workspace_id === workspace.id);
}

export async function getSubscription(): Promise<Subscription | null> {
  const workspace = await getCurrentWorkspace();

  return (
    subscriptions.find(
      (subscription) => subscription.workspace_id === workspace.id,
    ) ?? null
  );
}

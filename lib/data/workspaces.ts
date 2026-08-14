import {
  currentWorkspace,
  members,
  subscriptions,
  workspaces,
} from "@/lib/mock/workspaces";
import { currentUser } from "@/lib/mock/users";
import type {
  Subscription,
  User,
  Workspace,
  WorkspaceMember,
} from "@/types";

/**
 * Camada de acesso a dados. Hoje devolve fixtures; a partir do M8 o corpo
 * destas funções vira query Supabase — a assinatura não muda.
 */

/** Workspaces em que o usuário logado é membro. */
export async function getWorkspaces(): Promise<Workspace[]> {
  const user = await getCurrentUser();

  return workspaces.filter((workspace) =>
    members.some(
      (member) =>
        member.workspace_id === workspace.id && member.user_id === user.id,
    ),
  );
}

/** Workspace ativo. No M10 passa a vir do cookie de contexto. */
export async function getCurrentWorkspace(): Promise<Workspace> {
  return currentWorkspace;
}

/** Usuário logado. No M9 passa a vir da sessão do Supabase Auth. */
export async function getCurrentUser(): Promise<User> {
  return currentUser;
}

/** Papel do usuário logado no workspace ativo. */
export async function getCurrentMember(): Promise<WorkspaceMember | null> {
  const [user, workspace] = await Promise.all([
    getCurrentUser(),
    getCurrentWorkspace(),
  ]);

  return (
    members.find(
      (member) =>
        member.workspace_id === workspace.id && member.user_id === user.id,
    ) ?? null
  );
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

import { cache } from "react";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { WORKSPACE_COOKIE } from "@/lib/workspace-cookie";
import type {
  Subscription,
  User,
  Workspace,
  WorkspaceMember,
} from "@/types";

/**
 * Camada de acesso a dados de workspace. Tudo aqui vem do banco desde o M11 —
 * `lib/mock/` não é mais importado por nenhuma função de leitura.
 */

/**
 * Workspaces em que o usuário logado é membro.
 *
 * Sem filtro por usuário na query: a policy `workspaces_select_member` já
 * restringe as linhas a quem é membro. Filtrar de novo aqui duplicaria a regra
 * em dois lugares, e o do cliente é o que sai de sincronia.
 */
export const getWorkspaces = cache(async function getWorkspaces(): Promise<
  Workspace[]
> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("workspaces")
    .select("id, name, slug, owner_id, plan, created_at")
    .order("created_at", { ascending: true });

  return data ?? [];
});

/**
 * Workspace ativo, do cookie de contexto.
 *
 * Devolve `null` quando a conta ainda não tem workspace — estado real de quem
 * acabou de se cadastrar, e o que dispara o onboarding. O layout de `(app)`
 * trata esse caso redirecionando; as telas nunca recebem `null`.
 *
 * O cookie é apenas uma preferência de contexto: se apontar para um workspace
 * do qual a pessoa não é (ou deixou de ser) membro, ele não aparece em
 * `getWorkspaces()` — barrado pela RLS — e cai no primeiro da lista.
 */
export const getCurrentWorkspace = cache(
  async function getCurrentWorkspace(): Promise<Workspace | null> {
    const available = await getWorkspaces();

    if (available.length === 0) return null;

    const preferred = cookies().get(WORKSPACE_COOKIE)?.value;
    const match = available.find((workspace) => workspace.id === preferred);

    return match ?? available[0];
  },
);

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
 * Papel do usuário logado no workspace ativo — do banco.
 *
 * `null` significa "não é membro deste workspace", e o M7 usa isso para decidir
 * quais controles de admin aparecem. A checagem definitiva continua sendo no
 * servidor: esconder botão é conveniência, não autorização.
 */
export async function getCurrentMember(): Promise<WorkspaceMember | null> {
  const [user, workspace] = await Promise.all([
    getCurrentUser(),
    getCurrentWorkspace(),
  ]);

  if (!workspace) return null;

  const supabase = await createClient();

  const { data } = await supabase
    .from("workspace_members")
    .select("id, workspace_id, user_id, role, created_at")
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id)
    .maybeSingle();

  return data ? { ...data, user } : null;
}

/**
 * Membros do workspace ativo, com o perfil de cada um.
 *
 * O join com `profiles` é o que dá nome e avatar à lista; a policy de profiles
 * permite ler o perfil de quem divide workspace com você, então o `select`
 * aninhado funciona sob RLS sem exceção nenhuma.
 */
export async function getMembers(): Promise<WorkspaceMember[]> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from("workspace_members")
    .select(
      "id, workspace_id, user_id, role, created_at, profiles (id, full_name, email, avatar_url)",
    )
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: true });

  if (!data) return [];

  return data.map((member) => {
    const { profiles, ...rest } = member;

    return {
      ...rest,
      user: profiles ?? {
        id: member.user_id,
        full_name: "Usuário",
        email: "",
        avatar_url: null,
      },
    };
  });
}

/**
 * Assinatura do workspace ativo.
 *
 * Todo workspace nasce com uma linha no plano Free — o trigger
 * `handle_new_workspace` do M8 garante isso —, então `null` aqui significa
 * workspace inexistente, não "sem assinatura". Quem checa limite trata a
 * ausência como Free, que é o mais restritivo.
 *
 * Somente leitura por construção: `subscriptions` não tem policy de
 * insert/update para `authenticated`. Quem escreve é o webhook do Stripe com a
 * service-role, no M14.
 */
export async function getSubscription(): Promise<Subscription | null> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) return null;

  const supabase = await createClient();

  const { data } = await supabase
    .from("subscriptions")
    .select(
      "id, workspace_id, stripe_customer_id, stripe_subscription_id, status, plan, current_period_end, created_at, updated_at",
    )
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  return data ?? null;
}

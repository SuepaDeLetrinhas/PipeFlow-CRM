import type { User } from "@/types";

import { DEMO_USERS } from "./identity";

/**
 * Perfis de usuário para a demonstração.
 *
 * Marina e Diego usam os ids das contas reais (ver `identity.ts`), para que os
 * leads e negócios atribuídos a eles apareçam quando se entra com essas contas.
 * Rafael e Camila seguem fictícios: existem para a lista de responsáveis ter
 * mais de um nome, e não precisam de conta no Auth porque estas telas ainda
 * leem de `lib/mock/`.
 *
 * O usuário logado de verdade vem de `getCurrentUser()`, que consulta a sessão
 * do Supabase — não daqui.
 */
export const users: User[] = [
  {
    id: DEMO_USERS.marina,
    full_name: "Marina Duarte",
    email: "marina.teste@pipeflow.dev",
    avatar_url: null,
  },
  {
    id: DEMO_USERS.rafael,
    full_name: "Rafael Nogueira",
    email: "rafael@lumiar.com.br",
    avatar_url: null,
  },
  {
    id: DEMO_USERS.camila,
    full_name: "Camila Souza",
    email: "camila@lumiar.com.br",
    avatar_url: null,
  },
  {
    id: DEMO_USERS.diego,
    full_name: "Diego Ferraz",
    email: "diego.teste@pipeflow.dev",
    avatar_url: null,
  },
];

/**
 * Mantido só para os fixtures que ainda o referenciam. A área logada usa
 * `getCurrentUser()`, que lê a sessão real.
 */
export const currentUser: User = users[0];

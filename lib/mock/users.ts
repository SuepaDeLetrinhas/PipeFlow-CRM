import type { User } from "@/types";

/**
 * Perfis de usuário. No M9 estes registros vêm de `auth.users` + tabela de
 * perfis; o shape (id, full_name, email, avatar_url) já é o mesmo.
 */
export const users: User[] = [
  {
    id: "a0000000-0000-4000-8000-000000000001",
    full_name: "Marina Duarte",
    email: "marina@lumiar.com.br",
    avatar_url: null,
  },
  {
    id: "a0000000-0000-4000-8000-000000000002",
    full_name: "Rafael Nogueira",
    email: "rafael@lumiar.com.br",
    avatar_url: null,
  },
  {
    id: "a0000000-0000-4000-8000-000000000003",
    full_name: "Camila Souza",
    email: "camila@lumiar.com.br",
    avatar_url: null,
  },
  {
    id: "a0000000-0000-4000-8000-000000000004",
    full_name: "Diego Ferraz",
    email: "diego@vertex.com.br",
    avatar_url: null,
  },
];

/** Usuário "logado" enquanto não existe autenticação real (M9). */
export const currentUser: User = users[0];

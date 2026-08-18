/**
 * Tipos de domínio do PipeFlow.
 *
 * A partir do M11 estes tipos **derivam de `types/database.ts`** em vez de
 * repetir o shape à mão. O PLAN.md previa isso: enquanto as telas liam
 * fixtures, uma divergência entre os dois arquivos era detalhe invisível;
 * agora que a leitura vem do Postgres, ela precisa ser erro de compilação.
 *
 * `Tables<"leads">` é a linha exata que o PostgREST devolve. Se uma migration
 * mudar uma coluna, `npm run db:types` regenera e o erro aparece aqui, não em
 * produção.
 */

import type { Database, Tables } from "./database";

type Enums = Database["public"]["Enums"];

export type Role = Enums["role"];

export type Plan = Enums["plan"];

export type LeadStatus = Enums["lead_status"];

/** Etapas fixas do pipeline, na ordem do PRD. */
export type DealStage = Enums["deal_stage"];

export type ActivityType = Enums["activity_type"];

export type SubscriptionStatus = Enums["subscription_status"];

export type Workspace = Tables<"workspaces">;

/**
 * Usuário exibível. Não é `Tables<"profiles">` inteiro: `created_at` do perfil
 * não interessa a nenhuma tela, e mantê-lo obrigaria todo join a selecioná-lo.
 */
export type User = Pick<
  Tables<"profiles">,
  "id" | "full_name" | "email" | "avatar_url"
>;

/**
 * Membro com o perfil embutido. O `user` não existe na tabela — vem do join
 * com `profiles`, que é o que dá nome e avatar à lista.
 */
export type WorkspaceMember = Tables<"workspace_members"> & { user: User };

/**
 * `search_text` e `phone_digits` ficam de fora de propósito.
 *
 * As duas são colunas geradas que existem só para o PostgREST poder filtrar
 * com índice (migration `20260817140000`) — são plumbing de busca, não dado de
 * domínio. Expô-las obrigaria todo lugar que monta um `Lead` a inventar valor
 * para colunas que o banco calcula sozinho, e daria à UI dois campos
 * redundantes que ninguém deve exibir.
 */
export type Lead = Omit<Tables<"leads">, "search_text" | "phone_digits">;

/**
 * `value` chega como `number` na tipagem gerada, mas a coluna é
 * `numeric(12,2)` e o PostgREST serializa numeric como **string** no JSON.
 * A conversão acontece em `lib/data/deals.ts`, num ponto só.
 */
export type Deal = Tables<"deals">;

export type Activity = Tables<"activities">;

export type Subscription = Tables<"subscriptions">;

export type InviteStatus = Enums["invite_status"];

/**
 * Convite pendente com o nome de quem convidou.
 *
 * `token` fica **fora** de propósito: ele é a credencial de aceite, e a lista
 * de membros é um Server Component que serializa o que devolve para o cliente.
 * Quem precisa do link é a action que acabou de criar o convite, que o tem em
 * mãos sem passar por aqui.
 */
export type Invite = Omit<Tables<"invites">, "token"> & {
  invited_by_name: string;
};

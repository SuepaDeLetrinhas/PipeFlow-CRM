/**
 * Ponte entre os fixtures e as contas reais do Supabase.
 *
 * Os fixtures nasceram com uuids inventados (`a0000000-…`, `b0000000-…`). Depois
 * do M9/M10 o app passou a ler usuário e workspace do banco, então esses ids
 * deixaram de casar com nada: as telas filtram por `workspace_id` e não
 * encontravam registro nenhum — leads, pipeline e dashboard ficavam vazios para
 * quem entrasse com uma conta de verdade.
 *
 * Este arquivo declara os ids reais num lugar só. Os fixtures o importam, então
 * apontar a demonstração para outra conta é editar aqui, e não caçar uuid em
 * cinco arquivos.
 *
 * ⚠️ Isto é ANDAIME DE DEMONSTRAÇÃO, com prazo de validade curto: no M11/M12 as
 * telas passam a consultar o Postgres e `lib/mock/` inteiro sai de cena. Não
 * construa nada em cima disso — e não versione conta de usuário final aqui.
 */

/** Workspaces reais usados na demonstração. */
export const DEMO_WORKSPACES = {
  /** Workspace da conta marina.teste@pipeflow.dev. */
  marina: "f3a642cd-d640-4791-8e75-41af404dcb25",
  /** Workspace da conta diego.teste@pipeflow.dev. */
  diego: "ae35439f-b323-439f-ad9e-e98618b7679e",
} as const;

/**
 * Usuários reais. Rafael e Camila não têm conta no Auth — existem só como
 * responsáveis nos fixtures, para a lista de leads e os cards do Kanban terem
 * mais de um nome. Como as telas atuais leem esses registros de `lib/mock/` e
 * não do banco, eles não precisam existir em `profiles`.
 */
export const DEMO_USERS = {
  marina: "4b040789-4e54-4d44-98d6-8fbef12fa4cb",
  diego: "e88dcf5c-614a-4925-bf0f-4f5c79b70425",
  rafael: "a0000000-0000-4000-8000-000000000002",
  camila: "a0000000-0000-4000-8000-000000000003",
} as const;

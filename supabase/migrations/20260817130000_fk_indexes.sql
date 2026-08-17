-- =============================================================================
-- Índices nas colunas de chave estrangeira que ainda não tinham
--
-- Postgres não indexa FK automaticamente. Achado auditando o schema contra
-- `schema-foreign-key-indexes` da skill supabase-postgres-best-practices.
--
-- As quatro colunas abaixo apontam para `profiles`. Todas as FKs para
-- `workspaces` já estavam cobertas pelos índices por `workspace_id` do M8.
--
-- Por que os índices compostos existentes NÃO resolvem:
--
--   leads  (workspace_id, owner_id)            -- owner_id em 2a posição
--   deals  (workspace_id, owner_id, due_date)  -- idem
--
-- O Postgres só usa um índice composto quando o filtro inclui a PRIMEIRA
-- coluna. Uma consulta por `owner_id` sozinho — que é exatamente o que a
-- verificação de FK faz ao apagar um perfil — não os aproveita e cai em
-- sequential scan.
--
-- O custo disso não é hipotético: `leads.owner_id` e `deals.owner_id` são
-- `on delete restrict`, então apagar um perfil obriga o Postgres a varrer as
-- duas tabelas inteiras para decidir se pode. Com a tabela grande, isso
-- segura um lock enquanto varre.
-- =============================================================================

-- `concurrently` não é usado aqui de propósito: ele não roda dentro de bloco
-- transacional, e a CLI do Supabase envolve cada migration numa transação.
-- Nas tabelas atuais (vazias ou quase) a criação é instantânea; se um dia
-- forem grandes, o índice deve ser criado à parte, fora de migration.

create index if not exists leads_owner_id_idx
  on public.leads (owner_id);

create index if not exists deals_owner_id_idx
  on public.deals (owner_id);

create index if not exists activities_author_id_idx
  on public.activities (author_id);

create index if not exists invites_invited_by_idx
  on public.invites (invited_by);

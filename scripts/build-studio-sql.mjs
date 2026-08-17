/**
 * Consolida as migrations num único script para colar no SQL Editor do
 * Supabase Studio.
 *
 *   node scripts/build-studio-sql.mjs   (npm run db:studio-sql)
 *
 * Por que não basta concatenar os arquivos:
 *
 * A CLI aplica cada migration uma única vez, em ordem, contra um banco limpo.
 * O SQL Editor não tem esse controle — reexecutar o mesmo script é o modo
 * normal de trabalhar ali. `create type`, `create policy` e `create trigger`
 * não aceitam `if not exists` (ou aceitam de forma inútil), então a segunda
 * execução abortaria no primeiro enum já existente, deixando o schema pela
 * metade.
 *
 * Este script embrulha o conteúdo de forma a ser reexecutável:
 *   - enums viram bloco `do $$ ... exception when duplicate_object $$`
 *   - policies ganham `drop policy if exists` antes do create
 *   - triggers ganham `drop trigger if exists` antes do create
 *
 * A saída é gerada, não editada à mão: a fonte de verdade continua sendo os
 * arquivos em supabase/migrations/.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const SOURCES = [
  "supabase/migrations/20260817120000_init_schema.sql",
  "supabase/migrations/20260817120100_rls_policies.sql",
];

const OUTPUT = "supabase/studio/apply_all.sql";

/**
 * `create type X as enum (...);` -> bloco que engole o erro de duplicata.
 * Só o enum inteiro, incluindo os valores multi-linha, até o `);`.
 */
function guardEnums(sql) {
  return sql.replace(
    /^create type (public\.\w+) as enum \(([\s\S]*?)\);/gm,
    (_match, name, body) =>
      [
        "do $$",
        "begin",
        `  create type ${name} as enum (${body.trim()});`,
        "exception",
        "  when duplicate_object then null;",
        "end $$;",
      ].join("\n"),
  );
}

/**
 * `create policy "nome" on public.tabela ...` -> precedido de drop.
 * O nome da policy e a tabela saem do próprio create, então renomear uma
 * policy no fonte não deixa a antiga órfã aqui.
 */
function guardPolicies(sql) {
  return sql.replace(
    /^create policy "([^"]+)"\n(\s*)on (public\.\w+)/gm,
    (_match, name, indent, table) =>
      `drop policy if exists "${name}" on ${table};\ncreate policy "${name}"\n${indent}on ${table}`,
  );
}

/**
 * `create trigger nome ... on public.tabela` -> precedido de drop.
 * O `on <tabela>` pode estar na linha seguinte, daí o [\s\S] limitado.
 */
function guardTriggers(sql) {
  return sql.replace(
    /^create trigger (\w+)\n(\s*)(before|after) ([\s\S]*?) on (public\.\w+|auth\.\w+)/gm,
    (_match, name, indent, timing, event, table) =>
      `drop trigger if exists ${name} on ${table};\n` +
      `create trigger ${name}\n${indent}${timing} ${event} on ${table}`,
  );
}

const HEADER = `-- =============================================================================
-- PipeFlow CRM — script consolidado para o SQL Editor do Supabase Studio
--
-- GERADO por scripts/build-studio-sql.mjs. Nao edite este arquivo: a fonte de
-- verdade sao as migrations em supabase/migrations/. Edite la e rode
-- \`npm run db:studio-sql\`.
--
-- Como usar:
--   1. Supabase Studio > SQL Editor > New query
--   2. Cole este arquivo inteiro e execute (Run)
--   3. Confira o resultado com supabase/studio/verify_rls.sql
--
-- ESTE SCRIPT ESPERA UM BANCO VAZIO (schema public sem as tabelas do PipeFlow).
--
-- Enums, policies e triggers estao protegidos contra reexecucao, mas os
-- \`create table\` NAO: se as tabelas ja existirem, o script para na primeira
-- com "relation already exists". Isso e proposital — um script que engolisse
-- tabela existente daria a impressao de ter aplicado o schema novo enquanto
-- deixasse o antigo no lugar, e o erro so apareceria depois, na aplicacao.
--
-- Se precisar reaplicar do zero num banco de DESENVOLVIMENTO, rode antes o
-- reset comentado no fim deste cabecalho. Ele APAGA TODOS OS DADOS.
--
-- NAO inclui o seed. Dados de desenvolvimento estao em supabase/seed.sql e
-- nao devem ir para um banco com dados reais.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- RESET — descomente APENAS em banco de desenvolvimento.
--
-- Apaga as 8 tabelas do PipeFlow, os enums, as funcoes e os usuarios de teste.
-- Nao ha desfazer. Em banco com dado real, isto destroi o dado real.
-- -----------------------------------------------------------------------------

-- drop table if exists public.activities        cascade;
-- drop table if exists public.deals             cascade;
-- drop table if exists public.leads             cascade;
-- drop table if exists public.invites           cascade;
-- drop table if exists public.subscriptions     cascade;
-- drop table if exists public.workspace_members cascade;
-- drop table if exists public.workspaces        cascade;
-- drop table if exists public.profiles          cascade;
--
-- drop function if exists public.is_workspace_member(uuid)              cascade;
-- drop function if exists public.is_workspace_admin(uuid)               cascade;
-- drop function if exists public.shares_workspace_with(uuid)            cascade;
-- drop function if exists public.pipeflow_normalize(text)               cascade;
-- drop function if exists public.handle_new_user()                      cascade;
-- drop function if exists public.handle_user_update()                   cascade;
-- drop function if exists public.handle_new_workspace()                 cascade;
-- drop function if exists public.touch_updated_at()                     cascade;
-- drop function if exists public.protect_workspace_owner()              cascade;
-- drop function if exists public.assert_deal_lead_same_workspace()      cascade;
-- drop function if exists public.assert_activity_lead_same_workspace()  cascade;
--
-- drop type if exists public.invite_status       cascade;
-- drop type if exists public.subscription_status cascade;
-- drop type if exists public.activity_type       cascade;
-- drop type if exists public.deal_stage          cascade;
-- drop type if exists public.lead_status         cascade;
-- drop type if exists public.plan                cascade;
-- drop type if exists public.role                cascade;
--
-- Usuarios de teste do seed (so existem em desenvolvimento):
-- delete from auth.users where email like '%@lumiar.com.br'
--                          or email like '%@vertex.com.br';

`;

async function main() {
  const parts = [];

  for (const source of SOURCES) {
    const raw = await readFile(resolve(root, source), "utf8");
    const guarded = guardTriggers(guardPolicies(guardEnums(raw)));

    parts.push(
      `-- ${"=".repeat(75)}\n-- Origem: ${source}\n-- ${"=".repeat(75)}\n\n${guarded}`,
    );
  }

  const output = HEADER + parts.join("\n\n");

  await mkdir(resolve(root, "supabase/studio"), { recursive: true });
  await writeFile(resolve(root, OUTPUT), output, "utf8");

  const enums = (output.match(/when duplicate_object/g) ?? []).length;
  const policies = (output.match(/^drop policy if exists/gm) ?? []).length;
  const triggers = (output.match(/^drop trigger if exists/gm) ?? []).length;

  console.log(
    `${OUTPUT} gerado: ${enums} enums, ${policies} policies e ${triggers} ` +
      `triggers protegidos contra reexecucao.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

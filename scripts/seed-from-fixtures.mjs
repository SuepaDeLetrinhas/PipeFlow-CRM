/**
 * Reemite a seção de dados de domínio do `supabase/seed.sql` a partir dos
 * fixtures de `lib/mock/`.
 *
 * O seed precisa espelhar os fixtures (M8 do PLAN.md). Copiar ~200 registros à
 * mão significaria que a primeira edição num fixture faria os dois divergirem
 * em silêncio — e um seed que não corresponde à UI de fixtures não serve para
 * comparar as duas fases.
 *
 *   node scripts/seed-from-fixtures.mjs
 *
 * Reescreve apenas o trecho entre os marcadores FIXTURES:START/END; o cabeçalho
 * do seed (usuários, workspaces, assinaturas) é mantido à mão e preservado.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const seedPath = resolve(root, "supabase/seed.sql");

const START = "-- <<< FIXTURES:START >>>";
const END = "-- <<< FIXTURES:END >>>";

/**
 * Os fixtures são TypeScript com `import type` e alias `@/`. Em vez de puxar um
 * runtime de TS só para isto, extraímos os literais: o conteúdo é dado puro, e
 * `import type` some na compilação de qualquer forma.
 */
async function loadFixture(relativePath, exportName) {
  const source = await readFile(resolve(root, relativePath), "utf8");

  const marker = `export const ${exportName}`;
  const startIndex = source.indexOf(marker);
  if (startIndex === -1) {
    throw new Error(`Export \`${exportName}\` nao encontrado em ${relativePath}`);
  }

  // Parte do `=`, não do primeiro `[`: a anotação de tipo (`: Workspace[]`)
  // vem antes do valor, e buscar o colchete direto capturaria o par vazio dela
  // em vez do array de verdade.
  const assignIndex = source.indexOf("=", startIndex);
  const arrayStart = source.indexOf("[", assignIndex);
  if (assignIndex === -1 || arrayStart === -1) {
    throw new Error(`Array de \`${exportName}\` nao encontrado em ${relativePath}`);
  }

  // Varre até o colchete que fecha, respeitando strings e comentários — contar
  // colchetes ingenuamente quebraria num "[" dentro de uma descrição.
  let depth = 0;
  let index = arrayStart;
  let inString = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    const previous = source[index - 1];

    if (inLineComment) {
      if (char === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }
    if (inString) {
      if (char === inString && previous !== "\\") inString = null;
      continue;
    }
    if (char === "/" && next === "/") {
      inLineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      continue;
    }
    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) break;
    }
  }

  const literal = source.slice(arrayStart, index + 1);

  // Os fixtures referenciam helpers (`leadId(4)`, `users[0].id`, `LUMIAR`).
  // Resolvemos com um require de um módulo temporário seria mais frágil que
  // avaliar o literal com os símbolos que ele usa em escopo — que é o que
  // `resolveHelpers` monta abaixo.
  return literal;
}

/** Escapa string para literal SQL. */
function sql(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function insertStatement(table, columns, rows) {
  if (rows.length === 0) return "";

  const values = rows
    .map((row) => `  (${columns.map((column) => sql(row[column])).join(", ")})`)
    .join(",\n");

  return `insert into public.${table} (${columns.join(", ")})\nvalues\n${values};\n`;
}

async function main() {
  // Avalia os fixtures num escopo com os mesmos símbolos que eles usam.
  const require = createRequire(import.meta.url);
  void require;

  const usersLiteral = await loadFixture("lib/mock/users.ts", "users");
  const workspacesLiteral = await loadFixture("lib/mock/workspaces.ts", "workspaces");
  const leadsLiteral = await loadFixture("lib/mock/leads.ts", "leads");
  const dealsLiteral = await loadFixture("lib/mock/deals.ts", "deals");
  const activitiesLiteral = await loadFixture("lib/mock/activities.ts", "activities");

  const users = evaluate(usersLiteral, {});
  const workspaces = evaluate(workspacesLiteral, { users });

  const scope = {
    users,
    workspaces,
    LUMIAR: workspaces[0].id,
    VERTEX: workspaces[1].id,
    marina: users[0].id,
    rafael: users[1].id,
    camila: users[2].id,
    diego: users[3].id,
  };

  const leads = evaluate(leadsLiteral, scope);
  const leadScope = { ...scope, leads, leadId: (n) => leads[n - 1].id };

  const deals = evaluate(dealsLiteral, leadScope);
  const activities = evaluate(activitiesLiteral, leadScope);

  const sections = [
    insertStatement(
      "leads",
      [
        "id", "workspace_id", "name", "email", "phone",
        "company", "job_title", "status", "owner_id", "created_at",
      ],
      leads,
    ),
    insertStatement(
      "deals",
      [
        "id", "workspace_id", "title", "value", "stage",
        "position", "due_date", "lead_id", "owner_id", "created_at",
      ],
      deals,
    ),
    insertStatement(
      "activities",
      [
        "id", "workspace_id", "lead_id", "type",
        "description", "author_id", "occurred_at",
      ],
      activities,
    ),
  ];

  const generated = [
    START,
    "-- Gerado por scripts/seed-from-fixtures.mjs — nao editar a mao.",
    `-- ${leads.length} leads, ${deals.length} negocios, ${activities.length} atividades.`,
    "",
    ...sections,
    END,
  ].join("\n");

  const seed = await readFile(seedPath, "utf8");
  const startIndex = seed.indexOf(START);
  const endIndex = seed.indexOf(END);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error("Marcadores FIXTURES:START/END nao encontrados em supabase/seed.sql");
  }

  const updated =
    seed.slice(0, startIndex) + generated + seed.slice(endIndex + END.length);

  await writeFile(seedPath, updated, "utf8");

  console.log(
    `seed.sql atualizado: ${leads.length} leads, ${deals.length} negocios, ` +
      `${activities.length} atividades.`,
  );
}

/**
 * Avalia o literal do fixture com os símbolos auxiliares em escopo. A entrada
 * é código do próprio repositório, versionado — não entrada de usuário.
 */
function evaluate(literal, scope) {
  const names = Object.keys(scope);
  const values = Object.values(scope);

  // eslint-disable-next-line no-new-func
  const factory = new Function(...names, `return (${literal});`);

  return factory(...values);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

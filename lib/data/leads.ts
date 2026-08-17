import { createClient } from "@/lib/supabase/server";
import type { Lead, LeadStatus } from "@/types";

import { getCurrentWorkspace } from "./workspaces";

/**
 * Leitura de leads — no Postgres desde o M11.
 *
 * Busca, filtros, ordenação e paginação são executados **no banco**. Trazer a
 * tabela inteira para o Node e filtrar em memória só funcionava com 12
 * fixtures; com 50 leads do plano Free (ou os ilimitados do Pro) seria
 * transferir tudo a cada tecla digitada para descartar quase tudo.
 *
 * As assinaturas são as mesmas do M4 — só o corpo mudou, como o PLAN.md previa.
 */

/** Colunas da tabela. Reaproveitado por toda query daqui. */
const LEAD_COLUMNS =
  "id, workspace_id, name, email, phone, company, job_title, status, owner_id, created_at, updated_at";

/** Leads do workspace ativo, do mais recente para o mais antigo. */
export async function getLeads(): Promise<Lead[]> {
  const workspace = await getCurrentWorkspace();

  // Sem workspace ativo não há o que listar. O layout de `(app)` já redireciona
  // para o onboarding nesse caso, então na prática as telas não chegam aqui.
  if (!workspace) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export interface LeadFilters {
  /** Busca livre por nome, empresa, e-mail ou telefone. */
  search?: string;
  status?: LeadStatus;
  ownerId?: string;
  /** Recorte por data de criação, em ISO (yyyy-mm-dd). */
  from?: string;
  to?: string;
}

/** Colunas ordenáveis da tabela. */
export type LeadSortField = "name" | "company" | "status" | "created_at";

export type SortDirection = "asc" | "desc";

export interface LeadSort {
  field: LeadSortField;
  direction: SortDirection;
}

/** Mais recente primeiro — o que faz sentido numa lista de leads. */
export const DEFAULT_LEAD_SORT: LeadSort = {
  field: "created_at",
  direction: "desc",
};

export interface LeadPage {
  leads: Lead[];
  /** Total após os filtros — a paginação precisa dele, não do tamanho da página. */
  total: number;
  page: number;
  pageCount: number;
  perPage: number;
}

export const LEADS_PER_PAGE = 10;

/**
 * Normaliza para busca acento-insensível: "Sao Paulo" acha "São Paulo".
 *
 * Espelha `public.pipeflow_normalize(text)`, a função imutável do M8 sobre a
 * qual o índice GIN foi construído. Normalizar o termo aqui e a coluna lá é o
 * que permite ao planner usar o índice: comparar já-normalizado com
 * já-normalizado.
 */
function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/**
 * Neutraliza os metacaracteres do filtro dentro de um `.or()`.
 *
 * Dentro de `.or(...)` o curinga do PostgREST é o **asterisco**, que ele
 * traduz para o `%` do LIKE. Verificado contra o banco: sem tratar o `*`,
 * buscar por `*` devolvia a tabela inteira e "a*a" casava "Alfa" por wildcard,
 * quando o usuário queria os três caracteres literais.
 *
 * Aqui `*` e `%` convergem os dois para um `%` escapado — nenhum atua como
 * curinga, que é o ponto. A consequência aceita é que buscar `*` encontra quem
 * tem `%` no texto e vice-versa: um empate raro entre dois símbolos que quase
 * nunca aparecem em nome de lead, e muito melhor que devolver a tabela inteira.
 *
 * Vírgula e parênteses saem por outro motivo: são a sintaxe do próprio `.or()`,
 * e um termo com vírgula quebraria o parse do filtro inteiro.
 */
function escapeSearchTerm(term: string) {
  return term
    // A barra invertida vem primeiro para não escapar as que os passos
    // seguintes introduzem.
    .replace(/[\\%_]/g, "\\$&")
    .replace(/\*/g, "\\%")
    .replace(/[,()]/g, "");
}

/**
 * Aplica os filtros comuns a uma query de leads.
 *
 * Existe para que a contagem e a página usem exatamente o mesmo predicado —
 * duplicar a lógica faria o total divergir da lista na primeira mudança.
 */
function applyFilters<Q>(query: Q, filters: LeadFilters): Q {
  // Tipar isto genericamente é mais ruído do que valor: o builder do PostgREST
  // encadeia tipos por método e o retorno muda a cada chamada. O `any` fica
  // contido nesta função, com o resto do módulo tipado.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let q = query as any;

  if (filters.status) {
    q = q.eq("status", filters.status);
  }

  if (filters.ownerId) {
    q = q.eq("owner_id", filters.ownerId);
  }

  // Recorte por dia civil, inclusivo nas duas pontas. O `to` vai até o fim do
  // dia: `lte("2026-06-02")` compararia contra 00:00 e perderia o dia inteiro.
  if (filters.from) {
    q = q.gte("created_at", `${filters.from}T00:00:00.000Z`);
  }

  if (filters.to) {
    q = q.lte("created_at", `${filters.to}T23:59:59.999Z`);
  }

  if (filters.search) {
    const term = escapeSearchTerm(normalize(filters.search));
    const digits = onlyDigits(filters.search);

    // `search_text` e `phone_digits` são colunas GERADAS (migration
    // `20260817140000`), não expressões: o PostgREST filtra por coluna, e é
    // isso que torna os índices GIN alcançáveis a partir do cliente.
    const conditions = [`search_text.ilike.*${term}*`];

    // Só busca por telefone quando o termo tem dígito — senão "ana" viraria uma
    // condição de telefone vazia, que casa com todo mundo.
    if (digits.length > 0) {
      conditions.push(`phone_digits.ilike.*${digits}*`);
    }

    q = q.or(conditions.join(","));
  }

  return q as Q;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/**
 * Traduz o campo de ordenação para colunas reais, com desempate estável.
 *
 * Empate cai para `created_at` desc e, por fim, para o id. Sem desempate a
 * ordem varia entre queries e a paginação repete ou perde linhas na fronteira
 * das páginas — o Postgres não garante ordem para linhas equivalentes.
 *
 * `status` ordena pela posição no enum, não alfabeticamente: o M8 declarou
 * `lead_status` na ordem do ciclo, então `order by status` já sai do "novo" ao
 * "perdido". Alfabético colocaria "Cliente" antes de "Novo" e não diria nada
 * sobre o funil.
 */
function applySort<Q>(query: Q, sort: LeadSort): Q {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const ascending = sort.direction === "asc";
  let q = query as any;

  if (sort.field === "company") {
    // Lead sem empresa vai sempre para o fim, independente da direção —
    // encabeçar a lista com "—" esconderia justamente o que se quer ver.
    q = q.order("company", { ascending, nullsFirst: false });
  } else {
    q = q.order(sort.field, { ascending });
  }

  if (sort.field !== "created_at") {
    q = q.order("created_at", { ascending: false });
  }

  return q.order("id", { ascending: true }) as Q;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/**
 * Página de leads do workspace ativo, já filtrada e ordenada — a tela nunca
 * filtra nem ordena sozinha.
 */
export async function getLeadsPage(
  filters: LeadFilters = {},
  page = 1,
  perPage = LEADS_PER_PAGE,
  sort: LeadSort = DEFAULT_LEAD_SORT,
): Promise<LeadPage> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return { leads: [], total: 0, page: 1, pageCount: 1, perPage };
  }

  const supabase = await createClient();

  // Uma primeira query só para contar. O `range()` precisa do total ANTES de
  // saber qual página pedir: com uma página fora do intervalo (URL editada à
  // mão, filtro que encolheu o resultado) o `range` devolveria lista vazia em
  // vez de cair na última página válida.
  const countQuery = applyFilters(
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id),
    filters,
  );

  const { count } = await countQuery;
  const total = count ?? 0;

  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * perPage;

  if (total === 0) {
    return { leads: [], total: 0, page: 1, pageCount: 1, perPage };
  }

  const pageQuery = applySort(
    applyFilters(
      supabase
        .from("leads")
        .select(LEAD_COLUMNS)
        .eq("workspace_id", workspace.id),
      filters,
    ),
    sort,
  ).range(start, start + perPage - 1);

  const { data } = await pageQuery;

  return {
    leads: data ?? [],
    total,
    page: safePage,
    pageCount,
    perPage,
  };
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) return null;

  const supabase = await createClient();

  // O filtro por workspace é redundante com a RLS, mas explicita a intenção:
  // lead de outro workspace vira 404, não "acesso negado" — a tela não
  // confirma que o id existe em algum lugar.
  const { data } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  return data ?? null;
}

/**
 * Total de leads do workspace — o denominador do limite do plano Free.
 *
 * `head: true` não transfere linha nenhuma: só o cabeçalho com a contagem. É a
 * diferença entre contar 50 leads e baixar 50 leads para chamar `.length`.
 */
export async function countLeads(): Promise<number> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) return 0;

  const supabase = await createClient();

  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id);

  return count ?? 0;
}

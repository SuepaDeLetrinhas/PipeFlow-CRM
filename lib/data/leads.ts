import { leads } from "@/lib/mock/leads";
import type { Lead, LeadStatus } from "@/types";

import { getCurrentWorkspace } from "./workspaces";

/** Leads do workspace ativo, do mais recente para o mais antigo. */
export async function getLeads(): Promise<Lead[]> {
  const workspace = await getCurrentWorkspace();

  return leads
    .filter((lead) => lead.workspace_id === workspace.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
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

/**
 * Ordem de exibição dos status, do início ao fim do ciclo. Ordenar por status
 * alfabeticamente ("Cliente" antes de "Novo") não diria nada sobre o funil.
 */
const STATUS_ORDER: Record<LeadStatus, number> = {
  novo: 0,
  contatado: 1,
  qualificado: 2,
  cliente: 3,
  perdido: 4,
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
 * No M9 o Postgres faz esse trabalho com `unaccent`.
 */
function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matches(lead: Lead, filters: LeadFilters) {
  if (filters.status && lead.status !== filters.status) return false;
  if (filters.ownerId && lead.owner_id !== filters.ownerId) return false;

  // Compara os dez primeiros caracteres do ISO (yyyy-mm-dd) para que o recorte
  // seja por dia civil e inclua as duas pontas.
  const day = lead.created_at.slice(0, 10);
  if (filters.from && day < filters.from) return false;
  if (filters.to && day > filters.to) return false;

  if (filters.search) {
    const term = normalize(filters.search);
    const haystack = [lead.name, lead.company, lead.email]
      .filter(Boolean)
      .map((value) => normalize(value as string));

    // O telefone entra só em dígitos dos dois lados: quem digita "11988124410"
    // ou "(11) 98812" acha o mesmo lead, sem depender da máscara gravada.
    const digits = onlyDigits(filters.search);
    const phoneMatch =
      digits.length > 0 && onlyDigits(lead.phone ?? "").includes(digits);

    if (!haystack.some((value) => value.includes(term)) && !phoneMatch) {
      return false;
    }
  }

  return true;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/**
 * Comparador estável: empate cai para `created_at` desc e, por fim, para o id.
 * Sem desempate a ordem varia entre renders e a paginação repete ou perde
 * linhas na fronteira das páginas.
 */
function compareLeads(a: Lead, b: Lead, sort: LeadSort) {
  const factor = sort.direction === "asc" ? 1 : -1;
  let result = 0;

  switch (sort.field) {
    case "name":
      result = normalize(a.name).localeCompare(normalize(b.name), "pt-BR");
      break;
    case "company":
      // Lead sem empresa vai sempre para o fim, independente da direção —
      // encabeçar a lista com "—" esconderia justamente o que se quer ver.
      if (!a.company || !b.company) {
        if (a.company === b.company) break;
        return a.company ? -1 : 1;
      }
      result = normalize(a.company).localeCompare(normalize(b.company), "pt-BR");
      break;
    case "status":
      result = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      break;
    case "created_at":
      result = a.created_at.localeCompare(b.created_at);
      break;
  }

  if (result !== 0) return result * factor;

  const byDate = b.created_at.localeCompare(a.created_at);

  return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
}

/**
 * Página de leads do workspace ativo, já filtrada e ordenada — a tela nunca
 * filtra nem ordena sozinha.
 *
 * `sort` é opcional para não quebrar quem chama só com filtros; no M11 o corpo
 * vira `order()` no Supabase e a assinatura continua a mesma.
 */
export async function getLeadsPage(
  filters: LeadFilters = {},
  page = 1,
  perPage = LEADS_PER_PAGE,
  sort: LeadSort = DEFAULT_LEAD_SORT,
): Promise<LeadPage> {
  const workspaceLeads = await getLeads();
  const filtered = workspaceLeads
    .filter((lead) => matches(lead, filters))
    .sort((a, b) => compareLeads(a, b, sort));

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  // Página fora do intervalo (URL editada à mão, filtro que encolheu o
  // resultado) volta para a última válida em vez de devolver lista vazia.
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * perPage;

  return {
    leads: filtered.slice(start, start + perPage),
    total: filtered.length,
    page: safePage,
    pageCount,
    perPage,
  };
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const workspace = await getCurrentWorkspace();

  return (
    leads.find(
      (lead) => lead.id === id && lead.workspace_id === workspace.id,
    ) ?? null
  );
}

export async function countLeads(): Promise<number> {
  const workspaceLeads = await getLeads();

  return workspaceLeads.length;
}

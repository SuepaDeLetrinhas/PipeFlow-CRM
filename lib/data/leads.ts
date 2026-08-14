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
  /** Busca livre por nome, empresa ou e-mail. */
  search?: string;
  status?: LeadStatus;
  ownerId?: string;
  /** Recorte por data de criação, em ISO (yyyy-mm-dd). */
  from?: string;
  to?: string;
}

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

    if (!haystack.some((value) => value.includes(term))) return false;
  }

  return true;
}

/** Página de leads do workspace ativo já filtrada — a tela nunca filtra sozinha. */
export async function getLeadsPage(
  filters: LeadFilters = {},
  page = 1,
  perPage = LEADS_PER_PAGE,
): Promise<LeadPage> {
  const workspaceLeads = await getLeads();
  const filtered = workspaceLeads.filter((lead) => matches(lead, filters));

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

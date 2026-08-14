import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchX, Users } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { LeadsFilters } from "@/components/leads/leads-filters";
import { LeadsPagination } from "@/components/leads/leads-pagination";
import { LeadsTable } from "@/components/leads/leads-table";
import { LeadsTableSkeleton } from "@/components/leads/leads-table-skeleton";
import { NewLeadButton } from "@/components/leads/new-lead-button";
import { LEAD_STATUS_LABELS } from "@/lib/constants";
import { getCurrentUser, getLeadsPage, getMembers } from "@/lib/data";
import type { LeadFilters } from "@/lib/data/leads";
import type { LeadStatus, User } from "@/types";

export const metadata: Metadata = { title: "Leads" };

/** Aceita só status conhecido — `?status=qualquer-coisa` é ignorado. */
function parseStatus(value?: string): LeadStatus | undefined {
  return value && value in LEAD_STATUS_LABELS
    ? (value as LeadStatus)
    : undefined;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function parseDay(value?: string) {
  return value && ISO_DAY.test(value) ? value : undefined;
}

interface LeadsPageProps {
  searchParams: {
    busca?: string;
    status?: string;
    responsavel?: string;
    de?: string;
    ate?: string;
    pagina?: string;
  };
}

interface LeadsResultsProps {
  filters: LeadFilters;
  page: number;
  owners: User[];
  currentUserId: string;
}

/**
 * A parte que depende da consulta. Fica separada para poder ficar sob um
 * <Suspense> local — um `loading.tsx` no segmento cobriria também
 * `leads/[id]`, e o shell sairia com 200 antes de a página de detalhe
 * conseguir devolver 404.
 */
async function LeadsResults({
  filters,
  page,
  owners,
  currentUserId,
}: LeadsResultsProps) {
  const result = await getLeadsPage(filters, page);
  const hasFilters = Object.values(filters).some(Boolean);
  const ownersById = new Map(owners.map((user) => [user.id, user]));

  if (result.total === 0) {
    return hasFilters ? (
      <EmptyState
        icon={SearchX}
        title="Nenhum lead encontrado"
        description="Nenhum lead corresponde à busca e aos filtros selecionados. Ajuste os critérios para ver mais resultados."
      />
    ) : (
      <EmptyState
        icon={Users}
        title="Nenhum lead cadastrado"
        description="Cadastre o primeiro contato para começar a registrar atividades e abrir negócios."
        action={
          <NewLeadButton owners={owners} defaultOwnerId={currentUserId} />
        }
      />
    );
  }

  return (
    <>
      <p className="pb-3 text-sm text-muted-foreground">
        {hasFilters
          ? `${result.total} ${result.total === 1 ? "lead encontrado" : "leads encontrados"} com os filtros atuais.`
          : `${result.total} ${result.total === 1 ? "lead" : "leads"} neste workspace.`}
      </p>

      <LeadsTable leads={result.leads} owners={ownersById} />

      {result.pageCount > 1 ? (
        <LeadsPagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          perPage={result.perPage}
        />
      ) : null}
    </>
  );
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const [currentUser, members] = await Promise.all([
    getCurrentUser(),
    getMembers(),
  ]);

  const owners = members.map((member) => member.user);
  const ownerIds = new Set(owners.map((user) => user.id));

  const filters: LeadFilters = {
    search: searchParams.busca?.trim() || undefined,
    status: parseStatus(searchParams.status),
    // Responsável de outro workspace é descartado: sem isso a lista viria
    // vazia sem explicar o motivo.
    ownerId:
      searchParams.responsavel && ownerIds.has(searchParams.responsavel)
        ? searchParams.responsavel
        : undefined,
    from: parseDay(searchParams.de),
    to: parseDay(searchParams.ate),
  };

  const page = Number(searchParams.pagina) || 1;

  return (
    <>
      <PageHeader title="Leads" description="Contatos deste workspace.">
        <NewLeadButton owners={owners} defaultOwnerId={currentUser.id} />
      </PageHeader>

      <LeadsFilters owners={owners} />

      {/* A key refaz o boundary a cada filtro: sem ela o React reaproveitaria
          o resultado anterior e o skeleton não reapareceria. */}
      <Suspense
        key={JSON.stringify({ filters, page })}
        fallback={<LeadsTableSkeleton />}
      >
        <LeadsResults
          filters={filters}
          page={page}
          owners={owners}
          currentUserId={currentUser.id}
        />
      </Suspense>
    </>
  );
}

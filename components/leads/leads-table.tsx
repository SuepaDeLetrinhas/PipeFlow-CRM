import Link from "next/link";

import { LeadRowActions } from "@/components/leads/lead-row-actions";
import { LeadsSortHeader } from "@/components/leads/leads-sort-header";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, initials } from "@/lib/utils";
import type { LeadSortField, SortDirection } from "@/lib/data/leads";
import type { Lead, User } from "@/types";

interface LeadsTableProps {
  leads: Lead[];
  /** Responsáveis indexados por id — evita varrer a lista a cada linha. */
  owners: Map<string, User>;
  /** Lista para o dialog de edição, que precisa das opções de responsável. */
  ownerOptions: User[];
  sortField: LeadSortField;
  sortDirection: SortDirection;
}

/** `aria-sort` só vale na coluna ativa; nas demais o valor correto é "none". */
function ariaSort(
  field: LeadSortField,
  active: LeadSortField,
  direction: SortDirection,
) {
  if (field !== active) return "none" as const;

  return direction === "asc" ? ("ascending" as const) : ("descending" as const);
}

export function LeadsTable({
  leads,
  owners,
  ownerOptions,
  sortField,
  sortDirection,
}: LeadsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        {/* Cabeçalho em mono uppercase (guia v2). Aplicado aqui, e não em
            components/ui/table.tsx, que é gerado pela CLI do shadcn. */}
        <TableHeader className="[&_th]:text-label">
          <TableRow className="hover:bg-transparent">
            <TableHead aria-sort={ariaSort("name", sortField, sortDirection)}>
              <LeadsSortHeader
                field="name"
                label="Nome"
                active={sortField}
                direction={sortDirection}
              />
            </TableHead>
            <TableHead
              className="hidden md:table-cell"
              aria-sort={ariaSort("company", sortField, sortDirection)}
            >
              <LeadsSortHeader
                field="company"
                label="Empresa"
                active={sortField}
                direction={sortDirection}
              />
            </TableHead>
            <TableHead className="hidden lg:table-cell">Cargo</TableHead>
            <TableHead aria-sort={ariaSort("status", sortField, sortDirection)}>
              <LeadsSortHeader
                field="status"
                label="Status"
                active={sortField}
                direction={sortDirection}
              />
            </TableHead>
            <TableHead className="hidden sm:table-cell">Responsável</TableHead>
            <TableHead
              className="hidden sm:table-cell text-right"
              aria-sort={ariaSort("created_at", sortField, sortDirection)}
            >
              <LeadsSortHeader
                field="created_at"
                label="Criado em"
                active={sortField}
                direction={sortDirection}
                className="justify-end"
              />
            </TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const owner = owners.get(lead.owner_id);

            return (
              <TableRow key={lead.id} className="group">
                <TableCell className="font-medium">
                  {/* `position: relative` em <tr> não é confiável entre
                      navegadores, então o alvo de clique é a célula do nome —
                      previsível e suficiente como área de toque no mobile. */}
                  <Link
                    href={`/leads/${lead.id}`}
                    className="block hover:underline focus-visible:underline"
                  >
                    {lead.name}
                  </Link>
                  <span className="mt-0.5 block text-xs text-muted-foreground md:hidden">
                    {lead.company ?? "Sem empresa"}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {lead.company ?? "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {lead.job_title ?? "—"}
                </TableCell>
                <TableCell>
                  <LeadStatusBadge status={lead.status} />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {owner ? (
                    <span className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarFallback className="text-[0.625rem]">
                          {initials(owner.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm text-muted-foreground">
                        {owner.full_name}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-right text-sm text-muted-foreground text-metric">
                  {formatDate(lead.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <LeadRowActions lead={lead} owners={ownerOptions} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

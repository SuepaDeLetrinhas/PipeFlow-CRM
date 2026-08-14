import Link from "next/link";

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
import type { Lead, User } from "@/types";

interface LeadsTableProps {
  leads: Lead[];
  /** Responsáveis indexados por id — evita varrer a lista a cada linha. */
  owners: Map<string, User>;
}

export function LeadsTable({ leads, owners }: LeadsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Nome</TableHead>
            <TableHead className="hidden md:table-cell">Empresa</TableHead>
            <TableHead className="hidden lg:table-cell">Cargo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Responsável</TableHead>
            <TableHead className="hidden sm:table-cell text-right">
              Criado em
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
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

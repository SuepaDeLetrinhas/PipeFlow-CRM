import Link from "next/link";
import { CalendarClock, CalendarCheck2 } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { StageBadge } from "@/components/pipeline/stage-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getUpcomingDeals } from "@/lib/data";
import { cn, formatCurrency, formatDate, initials } from "@/lib/utils";

/** Janela da tabela: um mês à frente, mais tudo que já venceu. */
const WINDOW_DAYS = 30;

/** Texto relativo do prazo — o que a coluna "Prazo" diz em uma olhada. */
function deadlineLabel(daysLeft: number) {
  if (daysLeft < 0) {
    const overdue = Math.abs(daysLeft);
    return overdue === 1 ? "1 dia atrasado" : `${overdue} dias atrasado`;
  }
  if (daysLeft === 0) return "Vence hoje";
  if (daysLeft === 1) return "Vence amanhã";

  return `Em ${daysLeft} dias`;
}

/**
 * Negócios mais próximos do prazo.
 *
 * Mesma semântica de cor do card do Kanban: vencido em vermelho, prazo curto
 * em laranja, o resto neutro. Repetir a regra aqui evita que a mesma urgência
 * apareça com dois códigos visuais diferentes no app.
 */
export async function UpcomingDealsCard() {
  const upcoming = await getUpcomingDeals({ days: WINDOW_DAYS });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Prazos próximos</CardTitle>
        <CardDescription>
          Negócios em aberto que vencem nos próximos {WINDOW_DAYS} dias.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarCheck2}
            title="Nenhum prazo à vista"
            description={`Nenhum negócio em aberto vence nos próximos ${WINDOW_DAYS} dias.`}
            className="py-8"
          />
        ) : (
          <Table>
            <TableHeader className="[&_th]:text-label">
              <TableRow>
                <TableHead>Negócio</TableHead>
                <TableHead className="hidden md:table-cell">Etapa</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Responsável
                </TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Prazo</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {upcoming.map(({ deal, owner, lead, daysLeft }) => {
                const overdue = daysLeft < 0;
                const soon = daysLeft >= 0 && daysLeft <= 3;

                return (
                  <TableRow key={deal.id}>
                    <TableCell className="max-w-[14rem]">
                      <span className="block truncate font-medium">
                        {deal.title}
                      </span>
                      {lead ? (
                        <Link
                          href={`/leads/${lead.id}`}
                          className="block truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                        >
                          {lead.company ?? lead.name}
                        </Link>
                      ) : null}
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      {/* `whitespace-nowrap` porque "Contato Realizado" quebra
                          em duas linhas e desalinha a altura da linha. */}
                      <StageBadge
                        stage={deal.stage}
                        className="whitespace-nowrap"
                      />
                    </TableCell>

                    <TableCell className="hidden sm:table-cell">
                      {owner ? (
                        <span className="flex min-w-0 items-center gap-2">
                          <Avatar className="size-6 shrink-0">
                            <AvatarFallback className="text-[10px]">
                              {initials(owner.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate text-xs text-muted-foreground">
                            {owner.full_name}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-metric whitespace-nowrap text-right font-medium">
                      {formatCurrency(deal.value)}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-right">
                      <span
                        className={cn(
                          "inline-flex items-center justify-end gap-1 text-xs",
                          overdue && "font-medium text-danger",
                          soon && "font-medium text-warning",
                          !overdue && !soon && "text-muted-foreground",
                        )}
                      >
                        {overdue || soon ? (
                          <CalendarClock className="size-3 shrink-0" aria-hidden />
                        ) : null}
                        {deadlineLabel(daysLeft)}
                      </span>
                      <span className="text-metric block text-[11px] text-muted-foreground">
                        {formatDate(deal.due_date)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

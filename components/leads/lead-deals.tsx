import { Handshake } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { DEAL_STAGE_LABELS } from "@/lib/constants";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Deal, DealStage } from "@/types";

const STAGE_CLASSES: Record<DealStage, string> = {
  novo_lead: "bg-muted text-muted-foreground",
  contato_realizado: "bg-primary/10 text-primary",
  proposta_enviada: "bg-primary/10 text-primary",
  negociacao: "bg-warning-muted text-warning-foreground",
  fechado_ganho: "bg-success-muted text-success-foreground",
  fechado_perdido: "bg-danger-muted text-danger-foreground",
};

interface LeadDealsProps {
  deals: Deal[];
}

export function LeadDeals({ deals }: LeadDealsProps) {
  if (deals.length === 0) {
    return (
      <EmptyState
        icon={Handshake}
        title="Nenhum negócio vinculado"
        description="Os negócios deste lead aparecem aqui assim que forem criados no pipeline."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {deals.map((deal) => (
        <li
          key={deal.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{deal.title}</p>
            <p className="text-xs text-muted-foreground">
              {deal.due_date
                ? `Prazo em ${formatDate(deal.due_date)}`
                : "Sem prazo definido"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-medium",
                STAGE_CLASSES[deal.stage],
              )}
            >
              {DEAL_STAGE_LABELS[deal.stage]}
            </span>
            <span className="text-metric text-sm font-semibold">
              {formatCurrency(deal.value)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

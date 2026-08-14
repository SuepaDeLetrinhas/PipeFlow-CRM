"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { DealCard } from "@/components/pipeline/deal-card";
import { DEAL_STAGE_LABELS } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";
import type { Deal, DealStage, Lead, User } from "@/types";

/**
 * Ganho e Perdido recebem tratamento visual distinto, como pede o PRD: são
 * destinos finais, não mais uma etapa do caminho.
 */
const COLUMN_ACCENT: Partial<Record<DealStage, string>> = {
  fechado_ganho: "border-success/40 bg-success-muted/25",
  fechado_perdido: "border-danger/40 bg-danger-muted/25",
};

const TITLE_ACCENT: Partial<Record<DealStage, string>> = {
  fechado_ganho: "text-success",
  fechado_perdido: "text-danger",
};

interface PipelineColumnProps {
  stage: DealStage;
  deals: Deal[];
  ownersById: Map<string, User>;
  leadsById: Map<string, Lead>;
  owners: User[];
  leads: Lead[];
  /** Índice da coluna — alimenta o atraso do stagger de entrada. */
  index: number;
}

export function PipelineColumn({
  stage,
  deals,
  ownersById,
  leadsById,
  owners,
  leads,
  index,
}: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = deals.reduce((sum, deal) => sum + deal.value, 0);

  return (
    <section
      className="animate-stagger-in flex w-72 shrink-0 flex-col"
      style={{ animationDelay: `${index * 60}ms` }}
      aria-label={`${DEAL_STAGE_LABELS[stage]}, ${deals.length} ${deals.length === 1 ? "negócio" : "negócios"}`}
    >
      <header className="flex items-baseline justify-between gap-2 px-1 pb-2">
        <h2
          className={cn(
            "truncate text-sm font-semibold",
            TITLE_ACCENT[stage] ?? "text-foreground",
          )}
        >
          {DEAL_STAGE_LABELS[stage]}
        </h2>
        <span className="text-metric shrink-0 text-xs text-muted-foreground">
          {deals.length} · {formatCurrency(total, { compact: true })}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-32 flex-1 flex-col gap-2 rounded-lg border border-transparent bg-muted/40 p-2",
          "transition-colors duration-200",
          COLUMN_ACCENT[stage],
          // Realce do destino durante o arraste — sem ele não há como saber
          // em qual coluna o card vai cair.
          isOver && "border-primary/50 bg-primary/5",
        )}
      >
        <SortableContext
          items={deals.map((deal) => deal.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              owner={ownersById.get(deal.owner_id)}
              lead={deal.lead_id ? leadsById.get(deal.lead_id) : undefined}
              owners={owners}
              leads={leads}
            />
          ))}
        </SortableContext>

        {deals.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Nenhum negócio nesta etapa.
          </p>
        ) : null}
      </div>
    </section>
  );
}

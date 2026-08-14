"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { DealCard } from "@/components/pipeline/deal-card";
import { STAGE_COLORS } from "@/components/pipeline/stage-colors";
import { DEAL_STAGE_LABELS } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";
import type { Deal, DealStage, Lead, User } from "@/types";

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
  const color = STAGE_COLORS[stage];

  return (
    <section
      className="animate-stagger-in flex w-72 shrink-0 flex-col"
      style={{ animationDelay: `${index * 60}ms` }}
      aria-label={`${DEAL_STAGE_LABELS[stage]}, ${deals.length} ${deals.length === 1 ? "negócio" : "negócios"}`}
    >
      <header className="flex items-center gap-2 px-1 pb-2">
        {/* Ponto na cor da etapa: identifica a coluna mesmo quando o título
            fica truncado, e ancora a associação cor → etapa. */}
        <span
          className={cn("size-2 shrink-0 rounded-full", color.accent)}
          aria-hidden
        />
        <h2 className={cn("truncate text-sm font-semibold", color.title)}>
          {DEAL_STAGE_LABELS[stage]}
        </h2>
        <span className="text-metric ml-auto shrink-0 text-xs text-muted-foreground">
          {deals.length} · {formatCurrency(total, { compact: true })}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "relative flex min-h-32 flex-1 flex-col gap-2 overflow-hidden rounded-lg border p-2",
          "transition-colors duration-200",
          color.surface,
          color.border,
          // Realce do destino durante o arraste, na própria cor da coluna —
          // sem ele não há como saber onde o card vai cair.
          isOver && color.over,
        )}
      >
        {/* Barra superior: a marca de cor mais evidente da coluna. */}
        <span
          className={cn(
            "absolute inset-x-0 top-0 h-0.5",
            color.accent,
          )}
          aria-hidden
        />
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

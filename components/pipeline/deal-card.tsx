"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, GripVertical } from "lucide-react";

import { DealCardActions } from "@/components/pipeline/deal-card-actions";
import { STAGE_COLORS } from "@/components/pipeline/stage-colors";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatCurrency, formatDate, initials } from "@/lib/utils";
import type { Deal, Lead, User } from "@/types";

/** Janela do destaque âmbar: vence hoje, amanhã ou depois. */
const DUE_SOON_DAYS = 3;

/**
 * Compara por dia civil, não por instante: um prazo às 23h de hoje não deve
 * contar como "amanhã" só porque agora são 22h.
 */
export function dueState(dueDate: string | null) {
  if (!dueDate) return "none" as const;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${dueDate}T00:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) return "overdue" as const;
  if (days <= DUE_SOON_DAYS) return "soon" as const;

  return "future" as const;
}

interface DealCardProps {
  deal: Deal;
  owner?: User;
  lead?: Lead;
  /** Opções dos dialogs de edição — repassadas ao menu de ações. */
  owners: User[];
  leads: Lead[];
  /** True enquanto este card está sendo arrastado: o original vira fantasma. */
  isDragging?: boolean;
  /** Render dentro do DragOverlay — sem listeners, com destaque de elevação. */
  overlay?: boolean;
}

/**
 * Card do Kanban. Ordem de peso visual definida no CLAUDE.md:
 * título, valor, lead, responsável, prazo.
 */
export function DealCard({
  deal,
  owner,
  lead,
  owners,
  leads,
  isDragging,
  overlay,
}: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableDragging,
  } = useSortable({ id: deal.id, data: { stage: deal.stage } });

  const dragging = isDragging ?? sortableDragging;
  const due = dueState(deal.due_date);
  // A cor acompanha a etapa atual: durante o arraste o `onDragOver` já reescreve
  // `deal.stage`, então o card troca de cor ao entrar na coluna de destino.
  const color = STAGE_COLORS[deal.stage];

  return (
    <article
      ref={overlay ? undefined : setNodeRef}
      style={
        overlay
          ? undefined
          : { transform: CSS.Translate.toString(transform), transition }
      }
      className={cn(
        "group/card relative overflow-hidden rounded-lg border bg-card p-3 pl-4 shadow-sm",
        /*
         * A transição NÃO pode incluir `transform`.
         *
         * O dnd-kit escreve `transform` inline a cada quadro do arraste (linha
         * acima). Animar a mesma propriedade por CSS faz o elemento ficar em
         * movimento contínuo, e como o dnd-kit remede o retângulo a cada
         * atualização, medição e animação se realimentam — é o
         * "Maximum update depth exceeded" dentro de `measureRect`.
         *
         * Sombra e borda continuam animadas; o realce do hover passa a ser só
         * sombra e cor, sem deslocar o card.
         */
        "transition-[box-shadow,border-color] duration-200",
        color.cardBorder,
        // O hover só vale quando nada está sendo arrastado: durante o gesto o
        // ponteiro passa por cima dos vizinhos, e mexer na geometria deles
        // reabriria o mesmo ciclo de remedição.
        !overlay && !dragging && cn("hover:shadow-md", color.cardHover),
        // O original vira fantasma enquanto o overlay carrega o card de verdade.
        dragging && !overlay && "opacity-40",
        overlay && "rotate-2 bg-card/80 shadow-lg backdrop-blur-sm",
      )}
      aria-label={`${deal.title}, ${formatCurrency(deal.value)}`}
    >
      {/* Faixa lateral na cor da etapa — repete a marca da coluna no card, e
          é o que identifica a origem enquanto o card está no ar. */}
      <span
        className={cn("absolute inset-y-0 left-0 w-1", color.accent)}
        aria-hidden
      />

      <div className="flex items-start gap-1.5">
        {/* A alça isola o arraste: sem ela, qualquer clique no card viraria
            drag e o menu de ações ficaria inalcançável no toque. */}
        <button
          type="button"
          className={cn(
            "-ml-1 mt-0.5 shrink-0 cursor-grab touch-none rounded text-muted-foreground/50",
            "opacity-0 transition-opacity focus-visible:opacity-100 focus-visible:outline-none",
            "focus-visible:ring-1 focus-visible:ring-ring group-hover/card:opacity-100",
            "active:cursor-grabbing",
            overlay && "opacity-100",
          )}
          aria-label={`Arrastar ${deal.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        <p className="min-w-0 flex-1 text-sm font-medium leading-tight">
          {deal.title}
        </p>

        {!overlay ? (
          <DealCardActions deal={deal} owners={owners} leads={leads} />
        ) : null}
      </div>

      <p className="text-metric mt-2 text-base font-semibold">
        {formatCurrency(deal.value)}
      </p>

      {lead ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {lead.company ?? lead.name}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        {owner ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <Avatar className="size-5 shrink-0">
              <AvatarFallback className="text-[9px]">
                {initials(owner.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-[11px] text-muted-foreground">
              {owner.full_name}
            </span>
          </span>
        ) : (
          <span />
        )}

        {deal.due_date ? (
          <span
            className={cn(
              "text-metric flex shrink-0 items-center gap-1 text-[11px]",
              due === "overdue" && "font-medium text-danger",
              due === "soon" && "font-medium text-warning",
              due === "future" && "text-muted-foreground",
            )}
            title={
              due === "overdue"
                ? "Prazo vencido"
                : due === "soon"
                  ? "Prazo próximo"
                  : undefined
            }
          >
            {due === "overdue" || due === "soon" ? (
              <CalendarClock className="size-3" aria-hidden />
            ) : null}
            {formatDate(deal.due_date)}
            {due === "overdue" ? (
              <span className="sr-only">(prazo vencido)</span>
            ) : null}
          </span>
        ) : null}
      </div>
    </article>
  );
}

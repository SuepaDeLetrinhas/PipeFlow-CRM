"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { toast } from "sonner";

import { moveDealAction } from "@/app/(app)/pipeline/actions";
import { DealCard } from "@/components/pipeline/deal-card";
import { MoveDealProvider } from "@/components/pipeline/pipeline-board-context";
import { PipelineColumn } from "@/components/pipeline/pipeline-column";
import { DEAL_STAGES, DEAL_STAGE_LABELS } from "@/lib/constants";
import type { DealsByStage } from "@/lib/data/deals";
import type { Deal, DealStage, Lead, User } from "@/types";

interface PipelineBoardProps {
  initialDeals: DealsByStage;
  owners: User[];
  leads: Lead[];
}

/** Etapa que contém o card, ou a própria etapa quando se solta na coluna vazia. */
function findStage(
  board: DealsByStage,
  id: string,
): DealStage | undefined {
  if (DEAL_STAGES.includes(id as DealStage)) return id as DealStage;

  return DEAL_STAGES.find((stage) =>
    board[stage].some((deal) => deal.id === id),
  );
}

export function PipelineBoard({
  initialDeals,
  owners,
  leads,
}: PipelineBoardProps) {
  const [board, setBoard] = React.useState<DealsByStage>(initialDeals);
  const [activeDeal, setActiveDeal] = React.useState<Deal | null>(null);

  // O servidor é a fonte da verdade: quando ele revalida (criar, editar,
  // excluir), o estado local recomeça do que chegou.
  React.useEffect(() => {
    setBoard(initialDeals);
  }, [initialDeals]);

  const ownersById = React.useMemo(
    () => new Map(owners.map((user) => [user.id, user])),
    [owners],
  );
  const leadsById = React.useMemo(
    () => new Map(leads.map((lead) => [lead.id, lead])),
    [leads],
  );

  const sensors = useSensors(
    // 8px antes de considerar arraste: sem isso, o clique no menu "⋯" ou na
    // alça viraria drag e o card nunca abriria.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  /** Persiste a posição; em caso de erro, desfaz para o snapshot anterior. */
  const persist = React.useCallback(
    (snapshot: DealsByStage, id: string, stage: DealStage, position: number) => {
      void moveDealAction({ id, stage, position }).then((result) => {
        if (!result.ok) {
          setBoard(snapshot);
          toast.error(result.message ?? "Não foi possível mover o negócio.");
        }
      });
    },
    [],
  );

  /** Move por menu — o mesmo caminho do arraste, para o toque e o teclado. */
  const moveDeal = React.useCallback(
    (id: string, stage: DealStage) => {
      setBoard((current) => {
        const from = findStage(current, id);
        if (!from || from === stage) return current;

        const deal = current[from].find((item) => item.id === id);
        if (!deal) return current;

        const next: DealsByStage = {
          ...current,
          [from]: current[from].filter((item) => item.id !== id),
          [stage]: [...current[stage], { ...deal, stage }],
        };

        persist(current, id, stage, next[stage].length - 1);
        toast.success(`Movido para ${DEAL_STAGE_LABELS[stage]}.`);

        return next;
      });
    },
    [persist],
  );

  function onDragStart(event: DragStartEvent) {
    const stage = findStage(board, String(event.active.id));
    const deal = stage
      ? board[stage].find((item) => item.id === event.active.id)
      : undefined;

    setActiveDeal(deal ?? null);
  }

  /** Passa o card para a coluna sob o cursor, para o preview seguir o gesto. */
  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    setBoard((current) => {
      const from = findStage(current, activeId);
      const to = findStage(current, overId);

      if (!from || !to || from === to) return current;

      const deal = current[from].find((item) => item.id === activeId);
      if (!deal) return current;

      // Solto sobre outro card: entra na posição dele. Solto na coluna: vai
      // para o fim.
      const overIndex = current[to].findIndex((item) => item.id === overId);
      const insertAt = overIndex >= 0 ? overIndex : current[to].length;
      const target = [...current[to]];

      target.splice(insertAt, 0, { ...deal, stage: to });

      return {
        ...current,
        [from]: current[from].filter((item) => item.id !== activeId),
        [to]: target,
      };
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDeal(null);

    if (!over) return;

    const activeId = String(active.id);
    const snapshot = board;
    const stage = findStage(board, activeId);

    if (!stage) return;

    const oldIndex = board[stage].findIndex((item) => item.id === activeId);
    const overIndex = board[stage].findIndex((item) => item.id === over.id);
    const newIndex = overIndex >= 0 ? overIndex : board[stage].length - 1;

    if (oldIndex === newIndex) {
      // Não houve reordenação dentro da coluna, mas o onDragOver pode ter
      // trocado a etapa — nesse caso ainda é preciso persistir.
      persist(snapshot, activeId, stage, Math.max(newIndex, 0));
      return;
    }

    setBoard((current) => ({
      ...current,
      [stage]: arrayMove(current[stage], oldIndex, newIndex),
    }));

    persist(snapshot, activeId, stage, newIndex);
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Negócio ${active.id} levantado.`,
    onDragOver: ({ over }) =>
      over
        ? `Sobre ${DEAL_STAGE_LABELS[findStage(board, String(over.id)) ?? "novo_lead"]}.`
        : "Fora de qualquer coluna.",
    onDragEnd: ({ over }) =>
      over
        ? `Solto em ${DEAL_STAGE_LABELS[findStage(board, String(over.id)) ?? "novo_lead"]}.`
        : "Movimento cancelado.",
    onDragCancel: () => "Movimento cancelado.",
  };

  return (
    <MoveDealProvider value={moveDeal}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        accessibility={{ announcements }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveDeal(null)}
      >
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
          <div className="flex gap-3">
            {DEAL_STAGES.map((stage, index) => (
              <PipelineColumn
                key={stage}
                stage={stage}
                deals={board[stage]}
                ownersById={ownersById}
                leadsById={leadsById}
                owners={owners}
                leads={leads}
                index={index}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
          {activeDeal ? (
            <DealCard
              deal={activeDeal}
              owner={ownersById.get(activeDeal.owner_id)}
              lead={
                activeDeal.lead_id
                  ? leadsById.get(activeDeal.lead_id)
                  : undefined
              }
              owners={owners}
              leads={leads}
              overlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </MoveDealProvider>
  );
}

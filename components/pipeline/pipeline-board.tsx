"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringFrequency,
  MeasuringStrategy,
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

  /**
   * Assinatura do que veio do servidor. `initialDeals` é um objeto novo a cada
   * render do Server Component, então depender dele por referência criava um
   * ciclo: efeito → setBoard → render → objeto novo → efeito. Durante o arraste
   * o dnd-kit remede a cada mudança de estado, e o ciclo estourava o
   * "Maximum update depth exceeded" dentro de `measureRect`.
   *
   * Comparar o conteúdo faz o efeito rodar só quando o servidor de fato mudou.
   */
  const serverSignature = React.useMemo(
    () =>
      DEAL_STAGES.map(
        (stage) =>
          `${stage}:${initialDeals[stage].map((deal) => `${deal.id}@${deal.position}`).join(",")}`,
      ).join("|"),
    [initialDeals],
  );

  // Guarda a referência mais recente sem virar dependência do efeito.
  const latestFromServer = React.useRef(initialDeals);
  latestFromServer.current = initialDeals;

  // Espelho do estado para os handlers do dnd-kit: eles são recriados a cada
  // render, mas o dnd-kit chama a versão capturada no início do gesto.
  const latestBoard = React.useRef(board);
  latestBoard.current = board;

  /** Estado no início do arraste — destino do rollback se a action falhar. */
  const dragStartSnapshot = React.useRef<DealsByStage | null>(null);

  // O servidor é a fonte da verdade: quando ele revalida (criar, editar,
  // excluir), o estado local recomeça do que chegou.
  React.useEffect(() => {
    setBoard(latestFromServer.current);
  }, [serverSignature]);

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
      // Fora do updater: chamado duas vezes sob StrictMode, o `persist` dispararia
      // duas requisições e o toast apareceria em dobro.
      const current = latestBoard.current;
      const from = findStage(current, id);

      if (!from || from === stage) return;

      const deal = current[from].find((item) => item.id === id);
      if (!deal) return;

      setBoard({
        ...current,
        [from]: current[from].filter((item) => item.id !== id),
        [stage]: [...current[stage], { ...deal, stage }],
      });

      persist(current, id, stage, current[stage].length);
      toast.success(`Movido para ${DEAL_STAGE_LABELS[stage]}.`);
    },
    [persist],
  );

  function onDragStart(event: DragStartEvent) {
    const current = latestBoard.current;
    const stage = findStage(current, String(event.active.id));
    const deal = stage
      ? current[stage].find((item) => item.id === event.active.id)
      : undefined;

    // Congela o ponto de partida antes de qualquer movimento deste gesto.
    dragStartSnapshot.current = current;
    setActiveDeal(deal ?? null);
  }

  /**
   * Passa o card para a coluna sob o cursor, para o preview seguir o gesto.
   *
   * Só age na TROCA de coluna. O dnd-kit dispara `onDragOver` a cada movimento
   * do ponteiro; devolver um objeto novo em todos eles forçaria uma remedição a
   * cada pixel arrastado. Reordenar dentro da mesma coluna fica para o
   * `onDragEnd`, quando o gesto termina.
   */
  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    setBoard((current) => {
      const from = findStage(current, activeId);
      const to = findStage(current, overId);

      // `from === to` sai aqui devolvendo o MESMO objeto: o React trata como
      // "sem mudança" e não re-renderiza.
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

    // O `board` do closure está defasado: o `onDragOver` já pode ter movido o
    // card de coluna neste mesmo gesto. `latestBoard` acompanha o valor atual.
    const current = latestBoard.current;
    const stage = findStage(current, activeId);

    if (!stage) return;

    const oldIndex = current[stage].findIndex((item) => item.id === activeId);
    const overIndex = current[stage].findIndex((item) => item.id === over.id);
    const newIndex = overIndex >= 0 ? overIndex : current[stage].length - 1;

    if (oldIndex < 0) return;

    if (oldIndex !== newIndex) {
      setBoard((state) => ({
        ...state,
        [stage]: arrayMove(state[stage], oldIndex, newIndex),
      }));
    }

    // O rollback volta ao estado ANTES do gesto inteiro, guardado no
    // `onDragStart` — usar `current` devolveria o card à coluna nova.
    persist(
      dragStartSnapshot.current ?? current,
      activeId,
      stage,
      Math.max(newIndex, 0),
    );
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Negócio ${active.id} levantado.`,
    onDragOver: ({ over }) =>
      over
        ? `Sobre ${DEAL_STAGE_LABELS[findStage(latestBoard.current, String(over.id)) ?? "novo_lead"]}.`
        : "Fora de qualquer coluna.",
    onDragEnd: ({ over }) =>
      over
        ? `Solto em ${DEAL_STAGE_LABELS[findStage(latestBoard.current, String(over.id)) ?? "novo_lead"]}.`
        : "Movimento cancelado.",
    onDragCancel: () => "Movimento cancelado.",
  };

  return (
    <MoveDealProvider value={moveDeal}>
      <DndContext
        // `id` fixo: sem ele o dnd-kit numera os ids de acessibilidade a partir
        // de um contador global, que no servidor e no cliente começa em pontos
        // diferentes — e o React acusa hydration mismatch em `aria-describedby`.
        id="pipeline-board"
        sensors={sensors}
        collisionDetection={closestCorners}
        /*
         * Por padrão o dnd-kit remede os droppables sempre que o estado muda.
         * Como o `onDragOver` move o card de coluna — o que muda o estado —
         * medir de novo a cada mudança realimenta o ciclo de remedição.
         *
         * `WhileDragging` mede uma vez ao começar o gesto e volta a medir só
         * quando as colunas de fato mudam de tamanho. `frequency: Optimized`
         * agrupa as medições em vez de fazer uma por atualização.
         */
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.WhileDragging,
            frequency: MeasuringFrequency.Optimized,
          },
        }}
        accessibility={{ announcements }}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          // O onDragOver já pode ter movido o card entre colunas; cancelar (Esc,
          // ponteiro perdido) precisa desfazer isso à mão — o dnd-kit não mexe
          // no estado que é nosso.
          if (dragStartSnapshot.current) {
            setBoard(dragStartSnapshot.current);
          }
          setActiveDeal(null);
        }}
      >
        {/*
          Altura limitada pela viewport. É ela que dá às colunas um teto fixo:
          sem isso elas voltam a crescer com o conteúdo e o dnd-kit entra em
          ciclo de remedição ao mover um card entre colunas.
          O valor desconta o cabeçalho da página e as margens do shell.
        */}
        <div className="-mx-4 h-[calc(100vh-15rem)] min-h-96 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
          <div className="flex h-full gap-3">
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

"use client";

import * as React from "react";
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

  /*
   * A lista de ids PRECISA ser memoizada por conteúdo.
   *
   * O `useSortable` compara `items !== previous.current.items` — por
   * REFERÊNCIA. Montar o array na prop (`deals.map(...)`) entrega um array novo
   * a cada render, então essa comparação é sempre verdadeira: o dnd-kit conclui
   * que a lista mudou, liga a animação de layout e o `useDerivedTransform` mede
   * e grava estado a cada ciclo. Esse é o laço que o React reporta como
   * "Maximum update depth exceeded" apontando para `DealCard`.
   *
   * A dependência é a lista de ids em string: só quando os ids ou a ordem
   * mudam de fato é que uma referência nova deve chegar ao dnd-kit.
   */
  const idsKey = deals.map((deal) => deal.id).join(",");
  const itemIds = React.useMemo(
    () => idsKey.split(",").filter(Boolean),
    [idsKey],
  );

  // Fica `true` só até a animação de entrada terminar (0.4s + o atraso do
  // stagger). Depois disso a classe sai e nenhum re-render a reinicia.
  const [entering, setEntering] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setEntering(false), 400 + index * 60 + 50);

    return () => clearTimeout(timer);
  }, [index]);

  return (
    <section
      /*
       * `h-full` + altura fixa vinda do board: a área que recebe os cards não
       * pode crescer conforme o conteúdo.
       *
       * Com `flex-1` sobre conteúdo variável, mover um card para cá aumentava a
       * altura da coluna; o dnd-kit remedia, o React re-renderizava e a altura
       * mudava de novo — um ciclo geométrico que estourava o
       * "Maximum update depth exceeded". Com a altura estável, mover um card
       * não altera o retângulo que o dnd-kit mede.
       */
      /*
       * A animação de entrada é descartada assim que termina.
       *
       * Ela anima `transform`, e o dnd-kit lê `transform` para posicionar os
       * elementos. Enquanto a classe estivesse aplicada, cada re-render
       * durante o arraste reiniciava o deslocamento — o dnd-kit remedia, o
       * React re-renderizava, a animação reiniciava, e o ciclo estourava o
       * "Maximum update depth exceeded". Depois de entrar, a coluna fica
       * estática e o arraste mede geometria parada.
       */
      className={cn(
        // Sem `h-full`: a coluna acompanha o próprio conteúdo, e as colunas
        // ficam alinhadas pelo topo (`items-start` no board).
        "flex w-72 shrink-0 flex-col",
        entering && "animate-stagger-in",
      )}
      style={entering ? { animationDelay: `${index * 60}ms` } : undefined}
      aria-label={`${DEAL_STAGE_LABELS[stage]}, ${deals.length} ${deals.length === 1 ? "negócio" : "negócios"}`}
    >
      <header className="flex items-center gap-2 px-1 pb-2">
        {/* Ponto na cor da etapa: identifica a coluna mesmo quando o título
            fica truncado, e ancora a associação cor → etapa. */}
        <span
          className={cn("size-2 shrink-0 rounded-full", color.accent)}
          aria-hidden
        />
        {/*
          Cabeçalho em mono uppercase (guia v2).

          `text-label` fica FORA do `cn()`: o tailwind-merge trata
          `text-label` e `text-stage-…-ink` como o mesmo grupo de utilitário
          (`text-*`) e descarta o primeiro, deixando o título em Syne.
          Concatenar direto preserva os dois.
        */}
        <h2 className={`text-label truncate ${color.title}`}>
          {DEAL_STAGE_LABELS[stage]}
        </h2>
        <span className="text-metric ml-auto shrink-0 text-xs text-muted-foreground">
          {deals.length} · {formatCurrency(total, { compact: true })}
        </span>
      </header>

      <div
        ref={setNodeRef}
        /*
         * `scrollbar-gutter: stable` (via style, o Tailwind 3 não tem
         * utilitário): reserva a canaleta da barra de rolagem SEMPRE.
         *
         * Com `overflow-y-auto` puro, a barra some e aparece conforme o número
         * de cards. Ao receber um card numa janela baixa, ela surgia, a largura
         * útil da coluna mudava, o dnd-kit remedia o retângulo, o React
         * re-renderizava e a largura mudava de novo — o mesmo ciclo geométrico
         * da altura, agora na horizontal. Reservando a canaleta, a geometria
         * não depende mais de haver ou não rolagem.
         */
        className={cn(
          /*
           * A coluna NÃO rola por dentro.
           *
           * Enquanto rolava, ao receber o 6º card o conteúdo cruzava a altura
           * disponível e a barra entrava: `clientWidth` caía de 288 para 271.
           * Essa mudança de largura no meio do gesto fazia o dnd-kit remedir, o
           * React re-renderizar e a largura oscilar — o
           * "Maximum update depth exceeded" que aparecia sempre no arraste que
           * levava a coluna a 6 cards. Nem `overflow-y-scroll` nem
           * `scrollbar-gutter: stable` evitaram, porque o limiar continuava lá.
           *
           * Agora a coluna cresce com o conteúdo e quem rola é o board. Não há
           * mais limiar a cruzar durante o arraste.
           */
          "relative flex min-h-32 flex-col gap-2 overflow-hidden rounded-lg border p-2",
          "transition-colors duration-200",
          color.surface,
          color.border,
          // Realce do destino durante o arraste, na própria cor da coluna —
          // sem ele não há como saber onde o card vai cair.
          isOver && color.over,
        )}
      >
        {/* Barra superior: a marca de cor mais evidente da coluna. Volta a ser
            `absolute` porque o container não rola mais. */}
        <span
          className={cn("absolute inset-x-0 top-0 h-0.5", color.accent)}
          aria-hidden
        />
        <SortableContext
          items={itemIds}
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

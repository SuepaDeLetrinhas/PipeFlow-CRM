import { STAGE_COLORS } from "@/components/pipeline/stage-colors";
import { DEAL_STAGE_LABELS } from "@/lib/constants";
import { cn, formatCurrency, initials } from "@/lib/utils";
import type { DealStage } from "@/types";

/**
 * Mockup estático do pipeline para o hero. Não lê de `lib/data/` de propósito:
 * é vitrine, não produto — os dados aqui existem só para a imagem ser honesta.
 *
 * A cor e o rótulo de cada coluna vêm de `STAGE_COLORS` e `DEAL_STAGE_LABELS`,
 * as mesmas fontes que o board e o funil usam. A vitrine mostra o produto real:
 * se uma etapa mudar de cor no design system, ela muda aqui junto.
 */

interface PreviewCard {
  title: string;
  value: number;
  lead: string;
  owner: string;
}

const columns: {
  stage: DealStage;
  cards: PreviewCard[];
}[] = [
  {
    stage: "contato_realizado",
    cards: [
      {
        title: "Automação de propostas",
        value: 31500,
        lead: "Construtora Piave",
        owner: "Rafael Nogueira",
      },
      {
        title: "Rebranding",
        value: 12800,
        lead: "Estúdio Marco",
        owner: "Camila Souza",
      },
    ],
  },
  {
    stage: "proposta_enviada",
    cards: [
      {
        title: "Integração ERP",
        value: 68000,
        lead: "Norte Logística",
        owner: "Marina Duarte",
      },
      {
        title: "App de agendamento",
        value: 22400,
        lead: "Bela Forma",
        owner: "Camila Souza",
      },
    ],
  },
  {
    stage: "negociacao",
    cards: [
      {
        title: "Catálogo digital",
        value: 37500,
        lead: "Ferrolar Parts",
        owner: "Marina Duarte",
      },
    ],
  },
  {
    stage: "fechado_ganho",
    cards: [
      {
        title: "Prontuário digital",
        value: 72000,
        lead: "Clínica Vitta",
        owner: "Marina Duarte",
      },
    ],
  },
];

export function PipelinePreview() {
  return (
    <div
      className="overflow-hidden rounded-xl border bg-card shadow-sm"
      aria-label="Prévia do pipeline de vendas"
      role="img"
    >
      <div className="flex items-center gap-1.5 border-b bg-muted/40 px-4 py-3">
        <span className="size-2.5 rounded-full bg-danger/70" />
        <span className="size-2.5 rounded-full bg-warning/70" />
        <span className="size-2.5 rounded-full bg-success/70" />
        <span className="ml-3 text-xs font-medium text-muted-foreground">
          Pipeline · Lumiar Digital
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-4">
        {columns.map((column, index) => {
          const total = column.cards.reduce((sum, card) => sum + card.value, 0);
          const color = STAGE_COLORS[column.stage];

          return (
            <div
              key={column.stage}
              className={cn(
                // Coluna em neutro, como no board: a cor da etapa já está no
                // título e na faixa do card. Tingir o fundo também somaria uma
                // terceira camada da mesma cor e o mockup viraria bloco.
                "flex flex-col gap-2 rounded-lg bg-muted/40 p-2.5",
                // Nas telas estreitas, só as duas primeiras colunas cabem.
                index > 1 && "hidden lg:flex",
              )}
            >
              <div className="flex items-baseline justify-between gap-2 px-1">
                {/* `text-label` fora do `cn()`: o tailwind-merge trata
                    `text-label` e `text-stage-…-ink` como o mesmo grupo de
                    utilitário e descartaria um dos dois. */}
                <span className={`text-label truncate ${color.title}`}>
                  {DEAL_STAGE_LABELS[column.stage]}
                </span>
                <span className="text-metric shrink-0 text-[10px] text-muted-foreground">
                  {formatCurrency(total, { compact: true })}
                </span>
              </div>

              {column.cards.map((card) => (
                <div
                  key={card.title}
                  className={cn(
                    "relative space-y-2 overflow-hidden rounded-md border bg-card p-2.5 pl-3 shadow-sm",
                    color.cardBorder,
                  )}
                >
                  {/* Faixa lateral na cor da etapa — a mesma marca que o card
                      do board carrega. */}
                  <span
                    className={cn("absolute inset-y-0 left-0 w-0.5", color.accent)}
                    aria-hidden
                  />

                  <p className="truncate text-xs font-medium leading-tight">
                    {card.title}
                  </p>
                  <p className="text-metric text-sm font-semibold">
                    {formatCurrency(card.value)}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground">
                      {initials(card.owner)}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {card.lead}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

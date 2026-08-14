import type { DealStage } from "@/types";

/**
 * Cor de cada etapa, aplicada na coluna e repetida no card para que a origem
 * de um card continue óbvia enquanto ele é arrastado.
 *
 * As classes vêm escritas por extenso porque o Tailwind lê o código-fonte para
 * decidir o que gerar: `bg-stage-${stage}/10` nunca chegaria ao CSS final.
 */
export interface StageColor {
  /** Barra superior da coluna e faixa lateral do card. */
  accent: string;
  /** Texto do título da coluna. */
  title: string;
  /** Fundo tênue da coluna. */
  surface: string;
  /** Fundo do badge — mais presente que o da coluna, para ler como etiqueta. */
  chip: string;
  /** Borda da coluna em repouso. */
  border: string;
  /** Borda do card em repouso — mais tênue que a da coluna. */
  cardBorder: string;
  /** Borda e sombra do card no hover. */
  cardHover: string;
  /** Realce da coluna quando um card paira sobre ela. */
  over: string;
}

export const STAGE_COLORS: Record<DealStage, StageColor> = {
  novo_lead: {
    accent: "bg-stage-novo-lead",
    title: "text-stage-novo-lead-ink",
    surface: "bg-stage-novo-lead/5",
    chip: "bg-stage-novo-lead/15",
    border: "border-stage-novo-lead/20",
    cardBorder: "border-stage-novo-lead/25",
    cardHover:
      "hover:border-stage-novo-lead/60 hover:shadow-stage-novo-lead/10",
    over: "border-stage-novo-lead/60 bg-stage-novo-lead/10",
  },
  contato_realizado: {
    accent: "bg-stage-contato-realizado",
    title: "text-stage-contato-realizado-ink",
    surface: "bg-stage-contato-realizado/5",
    chip: "bg-stage-contato-realizado/15",
    border: "border-stage-contato-realizado/20",
    cardBorder: "border-stage-contato-realizado/25",
    cardHover:
      "hover:border-stage-contato-realizado/60 hover:shadow-stage-contato-realizado/10",
    over: "border-stage-contato-realizado/60 bg-stage-contato-realizado/10",
  },
  proposta_enviada: {
    accent: "bg-stage-proposta-enviada",
    title: "text-stage-proposta-enviada-ink",
    surface: "bg-stage-proposta-enviada/5",
    chip: "bg-stage-proposta-enviada/15",
    border: "border-stage-proposta-enviada/20",
    cardBorder: "border-stage-proposta-enviada/25",
    cardHover:
      "hover:border-stage-proposta-enviada/60 hover:shadow-stage-proposta-enviada/10",
    over: "border-stage-proposta-enviada/60 bg-stage-proposta-enviada/10",
  },
  negociacao: {
    accent: "bg-stage-negociacao",
    title: "text-stage-negociacao-ink",
    surface: "bg-stage-negociacao/5",
    chip: "bg-stage-negociacao/15",
    border: "border-stage-negociacao/20",
    cardBorder: "border-stage-negociacao/25",
    cardHover:
      "hover:border-stage-negociacao/60 hover:shadow-stage-negociacao/10",
    over: "border-stage-negociacao/60 bg-stage-negociacao/10",
  },
  fechado_ganho: {
    accent: "bg-stage-fechado-ganho",
    title: "text-stage-fechado-ganho-ink",
    surface: "bg-stage-fechado-ganho/5",
    chip: "bg-stage-fechado-ganho/15",
    border: "border-stage-fechado-ganho/20",
    cardBorder: "border-stage-fechado-ganho/25",
    cardHover:
      "hover:border-stage-fechado-ganho/60 hover:shadow-stage-fechado-ganho/10",
    over: "border-stage-fechado-ganho/60 bg-stage-fechado-ganho/10",
  },
  fechado_perdido: {
    accent: "bg-stage-fechado-perdido",
    title: "text-stage-fechado-perdido-ink",
    surface: "bg-stage-fechado-perdido/5",
    chip: "bg-stage-fechado-perdido/15",
    border: "border-stage-fechado-perdido/20",
    cardBorder: "border-stage-fechado-perdido/25",
    cardHover:
      "hover:border-stage-fechado-perdido/60 hover:shadow-stage-fechado-perdido/10",
    over: "border-stage-fechado-perdido/60 bg-stage-fechado-perdido/10",
  },
};

import { STAGE_COLORS } from "@/components/pipeline/stage-colors";
import { DEAL_STAGE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { DealStage } from "@/types";

interface StageBadgeProps {
  stage: DealStage;
  className?: string;
}

/**
 * Etiqueta da etapa, na mesma cor que a coluna correspondente no board — quem
 * aprendeu "violeta = Proposta Enviada" no pipeline reconhece o badge na página
 * do lead sem reler o texto.
 */
export function StageBadge({ stage, className }: StageBadgeProps) {
  const color = STAGE_COLORS[stage];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        // A cor fica no ponto e no texto; o fundo é só um tingimento leve, para
        // o badge não virar um bloco saturado no meio da lista.
        color.chip,
        color.title,
        className,
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", color.accent)}
        aria-hidden
      />
      {DEAL_STAGE_LABELS[stage]}
    </span>
  );
}

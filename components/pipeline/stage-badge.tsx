import { DEAL_STAGE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { DealStage } from "@/types";

/**
 * Cores das etapas do pipeline. Vivia duplicado em `lead-deals.tsx`; agora é um
 * lugar só, usado tanto na lista de negócios do lead quanto no board.
 *
 * O par é sempre `bg-X-muted` + `text-X-on-muted` — `-foreground` é para texto
 * sobre o fundo sólido e daria contraste insuficiente aqui.
 */
export const STAGE_CLASSES: Record<DealStage, string> = {
  novo_lead: "bg-muted text-muted-foreground",
  contato_realizado: "bg-primary/10 text-primary",
  proposta_enviada: "bg-primary/10 text-primary",
  negociacao: "bg-warning-muted text-warning-on-muted",
  fechado_ganho: "bg-success-muted text-success-on-muted",
  fechado_perdido: "bg-danger-muted text-danger-on-muted",
};

interface StageBadgeProps {
  stage: DealStage;
  className?: string;
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        STAGE_CLASSES[stage],
        className,
      )}
    >
      {DEAL_STAGE_LABELS[stage]}
    </span>
  );
}

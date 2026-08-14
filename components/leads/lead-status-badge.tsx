import { LEAD_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/types";

/**
 * Cores do ciclo de vida do lead. As variantes do Badge do shadcn não cobrem
 * semântica, então as classes vêm dos tokens de `globals.css`, que já têm par
 * claro/escuro — nada de cor fixa em hex aqui.
 */
const STATUS_CLASSES: Record<LeadStatus, string> = {
  novo: "bg-primary/10 text-primary ring-primary/20",
  contatado: "bg-warning-muted text-warning-foreground ring-warning/30",
  qualificado: "bg-primary/15 text-primary ring-primary/25",
  cliente: "bg-success-muted text-success-foreground ring-success/30",
  perdido: "bg-danger-muted text-danger-foreground ring-danger/30",
};

interface LeadStatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        STATUS_CLASSES[status],
        className,
      )}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}

import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  /** Já formatado — BRL, percentual ou contagem. Formatar é papel de quem chama. */
  value: string;
  /** Linha de apoio: o denominador, o recorte, o que o número não diz sozinho. */
  hint?: string;
  icon: LucideIcon;
  /** Cor do ícone e da faixa superior. Uma classe de texto do design system. */
  accent?: string;
  className?: string;
}

/**
 * Card de métrica do dashboard.
 *
 * Segue a hierarquia do guia: label em mono caixa-alta, número em Syne com
 * tabular-nums, apoio em corpo pequeno. O ícone é decorativo — a label já diz
 * o que o número é.
 */
export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "text-primary-ink",
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("relative overflow-hidden p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        {/* `text-label` fora do `cn()`: o tailwind-merge trata `text-label` e
            `text-muted-foreground` como o mesmo grupo e descartaria um deles. */}
        <p className="text-label text-muted-foreground">{label}</p>
        <Icon className={cn("size-4 shrink-0", accent)} aria-hidden />
      </div>

      <p className="text-display-metric mt-3 text-3xl leading-none">{value}</p>

      {hint ? (
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </Card>
  );
}

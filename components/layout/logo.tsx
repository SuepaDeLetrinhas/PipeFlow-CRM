import { cn } from "@/lib/utils";

/**
 * Marca do PipeFlow (identidade v2): quadrado chartreuse com "P" em Syne 800.
 *
 * O guia é explícito em não usar um ícone SVG elaborado — "o 'P' no quadrado é
 * direto e reconhecível". `bg-primary` já é o chartreuse, e
 * `text-primary-foreground` é o quase-preto que contrasta com ele.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md bg-primary",
        "font-display text-lg font-extrabold leading-none text-primary-foreground",
        className,
      )}
      aria-hidden
    >
      P
    </div>
  );
}

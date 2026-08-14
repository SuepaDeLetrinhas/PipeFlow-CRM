import { cn } from "@/lib/utils";

/** Marca do PipeFlow: três barras decrescentes, o funil de vendas em miniatura. */
export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground",
        className,
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="size-4"
        role="presentation"
      >
        <rect x="3" y="5" width="18" height="3.5" rx="1.75" />
        <rect x="6" y="10.25" width="12" height="3.5" rx="1.75" />
        <rect x="9" y="15.5" width="6" height="3.5" rx="1.75" />
      </svg>
    </div>
  );
}

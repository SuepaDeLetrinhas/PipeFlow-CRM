import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Bloco de linhas — placeholder genérico de lista ou texto. */
export function LoadingSkeleton({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

/** Placeholder de um card de métrica do dashboard. */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-5", className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-32" />
      <Skeleton className="mt-2 h-3 w-20" />
    </div>
  );
}

/** Placeholder de tabela: cabeçalho mais N linhas. */
export function TableSkeleton({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border", className)}>
      <div className="border-b px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-32 sm:block" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Placeholder do `<PageHeader>` — título, descrição e, opcionalmente, o botão
 * de ação. Mantém a mesma altura e o mesmo `pb-6` do componente real, para o
 * conteúdo abaixo não saltar quando os dados chegam.
 */
export function PageHeaderSkeleton({
  withAction = false,
}: {
  withAction?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      {withAction ? <Skeleton className="h-9 w-36 shrink-0" /> : null}
    </div>
  );
}

/** Placeholder de uma seção em card de `/settings`: cabeçalho e N linhas. */
export function SectionSkeleton({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      <div className="space-y-2 p-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="divide-y border-t">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-5 py-3.5">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

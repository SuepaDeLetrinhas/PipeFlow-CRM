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

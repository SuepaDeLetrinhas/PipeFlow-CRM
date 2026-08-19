import { STAGE_COLORS } from "@/components/pipeline/stage-colors";
import { Skeleton } from "@/components/ui/skeleton";
import { DEAL_STAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Quantos cards fantasma por coluna — decrescente, como um funil real. */
const CARDS_PER_STAGE = [3, 3, 2, 2, 1, 1];

/**
 * Placeholder do Kanban.
 *
 * Repete a geometria do board de verdade — mesmo `w-72` por coluna, mesmo
 * `gap-3`, mesma sangria negativa que deixa a rolagem horizontal encostar nas
 * bordas — para que a troca pelo board carregado não desloque nada. As cores
 * de etapa entram já aqui: são o que identifica a coluna antes mesmo de o
 * título existir.
 */
export function PipelineBoardSkeleton() {
  return (
    <div
      className="-mx-4 overflow-x-hidden px-4 pb-4 sm:-mx-6 sm:px-6"
      aria-busy
      aria-label="Carregando pipeline"
    >
      <div className="flex items-start gap-3">
        {DEAL_STAGES.map((stage, index) => {
          const color = STAGE_COLORS[stage];

          return (
            <section key={stage} className="flex w-72 shrink-0 flex-col">
              <header className="flex items-center gap-2 px-1 pb-2">
                <span
                  className={cn("size-2 shrink-0 rounded-full", color.accent)}
                  aria-hidden
                />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="ml-auto h-3 w-14" />
              </header>

              <div
                className={cn(
                  "relative flex min-h-32 flex-col gap-2 overflow-hidden rounded-lg border p-2",
                  color.surface,
                  color.border,
                )}
              >
                <span
                  className={cn("absolute inset-x-0 top-0 h-0.5", color.accent)}
                  aria-hidden
                />
                {Array.from({ length: CARDS_PER_STAGE[index] ?? 1 }).map(
                  (_, card) => (
                    <div
                      key={card}
                      className="rounded-lg border bg-card p-3 pl-4"
                    >
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="mt-2 h-5 w-24" />
                      <Skeleton className="mt-1 h-3 w-2/5" />
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ),
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

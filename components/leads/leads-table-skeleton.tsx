import { TableSkeleton } from "@/components/layout/loading-skeleton";

/**
 * Placeholder da tabela enquanto a busca filtrada resolve.
 *
 * Fica num Suspense em volta da tabela, e não num `loading.tsx` no segmento
 * `leads/`: de lá o boundary envolveria também `leads/[id]`, e o Next
 * responderia 200 com o shell antes de a página filha chamar `notFound()` —
 * a tela de "lead não encontrado" apareceria com status de sucesso.
 */
export function LeadsTableSkeleton() {
  return <TableSkeleton rows={8} />;
}

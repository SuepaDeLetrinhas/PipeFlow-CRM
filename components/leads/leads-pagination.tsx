"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface LeadsPaginationProps {
  page: number;
  pageCount: number;
  total: number;
  perPage: number;
}

export function LeadsPagination({
  page,
  pageCount,
  total,
  perPage,
}: LeadsPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goTo(next: number) {
    const params = new URLSearchParams(searchParams.toString());

    // Página 1 é o padrão: mantê-la fora da URL deixa o link limpo e evita
    // duas URLs diferentes para a mesma tela.
    if (next <= 1) {
      params.delete("pagina");
    } else {
      params.set("pagina", String(next));
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  const first = (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 pt-4 sm:flex-row">
      <p
        className="text-sm text-muted-foreground"
        aria-live="polite"
        role="status"
      >
        Exibindo <span className="text-metric font-medium">{first}</span>–
        <span className="text-metric font-medium">{last}</span> de{" "}
        <span className="text-metric font-medium">{total}</span>
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft />
          Anterior
        </Button>
        <span className="text-metric text-sm text-muted-foreground">
          {page} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => goTo(page + 1)}
          disabled={page >= pageCount}
        >
          Próxima
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

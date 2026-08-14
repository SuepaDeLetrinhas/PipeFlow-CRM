"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import type { LeadSortField, SortDirection } from "@/lib/data/leads";

interface LeadsSortHeaderProps {
  field: LeadSortField;
  label: string;
  /** Campo e direção vigentes, vindos da URL pelo Server Component. */
  active: LeadSortField;
  direction: SortDirection;
  className?: string;
}

/**
 * Cabeçalho clicável de coluna. A ordenação vive na URL como `?ordem=&dir=`,
 * igual aos filtros — assim o estado sobrevive a recarregar e a compartilhar
 * o link.
 */
export function LeadsSortHeader({
  field,
  label,
  active,
  direction,
  className,
}: LeadsSortHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isActive = active === field;
  // Datas começam pela mais recente; texto e status, pelo começo da lista.
  const defaultDirection: SortDirection =
    field === "created_at" ? "desc" : "asc";
  const nextDirection: SortDirection = isActive
    ? direction === "asc"
      ? "desc"
      : "asc"
    : defaultDirection;

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());

    params.set("ordem", field);
    params.set("dir", nextDirection);
    // Reordenar recomeça da primeira página: a linha procurada provavelmente
    // mudou de página.
    params.delete("pagina");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const Icon = !isActive ? ChevronsUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      onClick={toggle}
      // `aria-sort` vai no <th> pelo componente pai; aqui o rótulo explica a
      // ação para quem navega por leitor de tela.
      aria-label={`Ordenar por ${label}, ${nextDirection === "asc" ? "crescente" : "decrescente"}`}
      className={cn(
        "-mx-2 inline-flex items-center gap-1 rounded px-2 py-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        isActive ? "text-foreground" : "text-muted-foreground",
        className,
      )}
    >
      {label}
      <Icon
        className={cn("size-3.5 shrink-0", isActive ? "opacity-100" : "opacity-50")}
        aria-hidden
      />
    </button>
  );
}

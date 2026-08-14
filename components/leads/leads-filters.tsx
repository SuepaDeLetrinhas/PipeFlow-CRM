"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_STATUS_LABELS } from "@/lib/constants";
import type { User } from "@/types";

/** Valor do <Select> para "sem filtro" — Radix não aceita SelectItem com "". */
const ANY = "todos";

interface LeadsFiltersProps {
  owners: User[];
}

export function LeadsFilters({ owners }: LeadsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get("busca") ?? "";
  const [term, setTerm] = React.useState(search);

  // O campo é controlado localmente, mas a URL é a fonte da verdade: quando ela
  // muda por fora (voltar no histórico, "limpar filtros"), o input acompanha.
  React.useEffect(() => {
    setTerm(search);
  }, [search]);

  const updateParams = React.useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "" || value === ANY) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      // Qualquer mudança de filtro volta para a primeira página — senão o
      // usuário cai numa página que o novo recorte pode nem ter.
      params.delete("pagina");

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  // Debounce só da busca: cada tecla trocaria a URL e refaria o request.
  React.useEffect(() => {
    if (term === search) return;

    const timer = setTimeout(() => updateParams({ busca: term }), 350);
    return () => clearTimeout(timer);
  }, [term, search, updateParams]);

  const status = searchParams.get("status") ?? ANY;
  const owner = searchParams.get("responsavel") ?? ANY;
  const from = searchParams.get("de") ?? "";
  const to = searchParams.get("ate") ?? "";

  const hasFilters =
    Boolean(search) || status !== ANY || owner !== ANY || Boolean(from || to);

  function clearAll() {
    setTerm("");
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3 pb-4 lg:flex-row lg:flex-wrap lg:items-end">
      <div className="relative w-full lg:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Buscar por nome, empresa ou e-mail"
          className="pl-8"
          aria-label="Buscar leads"
        />
      </div>

      <Select
        value={status}
        onValueChange={(value) => updateParams({ status: value })}
      >
        <SelectTrigger className="w-full lg:w-44" aria-label="Filtrar por status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Todos os status</SelectItem>
          {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={owner}
        onValueChange={(value) => updateParams({ responsavel: value })}
      >
        <SelectTrigger
          className="w-full lg:w-48"
          aria-label="Filtrar por responsável"
        >
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Todos os responsáveis</SelectItem>
          {owners.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <label
            htmlFor="filtro-de"
            className="text-xs font-medium text-muted-foreground"
          >
            De
          </label>
          <Input
            id="filtro-de"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => updateParams({ de: event.target.value })}
            className="w-full lg:w-[9.5rem]"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="filtro-ate"
            className="text-xs font-medium text-muted-foreground"
          >
            Até
          </label>
          <Input
            id="filtro-ate"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => updateParams({ ate: event.target.value })}
            className="w-full lg:w-[9.5rem]"
          />
        </div>
      </div>

      {hasFilters ? (
        <Button
          variant="ghost"
          onClick={clearAll}
          className="self-start text-muted-foreground lg:self-auto"
        >
          <X />
          Limpar
        </Button>
      ) : null}
    </div>
  );
}

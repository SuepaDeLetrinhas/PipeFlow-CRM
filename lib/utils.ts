import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const currencyCompactFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Formata um valor em reais: 1234.5 -> "R$ 1.234,50". */
export function formatCurrency(value: number, options?: { compact?: boolean }) {
  const formatter = options?.compact
    ? currencyCompactFormatter
    : currencyFormatter;

  return formatter.format(value);
}

/** Iniciais para avatares e marcadores: "Marina Duarte" -> "MD". */
export function initials(name: string, max = 2) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, max)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const dateFormatters = {
  short: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }),
  long: new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }),
  datetime: new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }),
} as const;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function toDate(value: Date | string | number) {
  if (value instanceof Date) return value;

  // "2026-08-13" é interpretado como UTC pelo construtor e recuaria um dia em
  // fusos negativos. Colunas `date` do Postgres chegam exatamente nesse formato.
  if (typeof value === "string" && DATE_ONLY.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(value);
}

/** Formata uma data em pt-BR: "13/08/2026", "13 de agosto de 2026" ou com hora. */
export function formatDate(
  value: Date | string | number,
  format: keyof typeof dateFormatters = "short",
) {
  const date = toDate(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return dateFormatters[format].format(date);
}

/**
 * Gera um slug de URL a partir do nome do workspace: "Lumiar Digital" vira
 * "lumiar-digital".
 *
 * A normalização NFD + remoção de diacríticos é a mesma ideia do `normalize()`
 * da busca de leads: "Construções Piave" precisa virar "construcoes-piave", e
 * não "construes-piave" (o que aconteceria descartando os acentuados).
 *
 * O resultado precisa satisfazer o `check` da coluna `workspaces.slug`
 * (`^[a-z0-9]+(-[a-z0-9]+)*$`), então nome só de símbolos devolve string vazia
 * e quem chama trata — ver `uniqueSlug` na action de criação.
 */
export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

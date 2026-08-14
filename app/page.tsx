import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { formatCurrency, formatDate } from "@/lib/utils";

/**
 * Página temporária do M0: serve para conferir o design system no navegador.
 * O M1 substitui esta rota pela landing page em `app/(marketing)/page.tsx`.
 */

const stages = [
  { label: "Novo Lead", className: "bg-secondary text-secondary-foreground" },
  {
    label: "Contato Realizado",
    className: "bg-secondary text-secondary-foreground",
  },
  {
    label: "Proposta Enviada",
    className: "bg-primary/10 text-primary",
  },
  { label: "Negociação", className: "bg-warning-muted text-warning-foreground" },
  {
    label: "Fechado Ganho",
    className: "bg-success text-success-foreground",
  },
  { label: "Fechado Perdido", className: "bg-danger text-danger-foreground" },
];

const metrics = [
  { label: "Total de leads", value: "128" },
  { label: "Negócios abertos", value: "23" },
  { label: "Valor do pipeline", value: formatCurrency(184320.5) },
  { label: "Taxa de conversão", value: "31,4%" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">PipeFlow CRM</h1>
          <p className="text-sm text-muted-foreground">
            M0 — design system aplicado. Nenhuma tela de produto ainda.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Abrir o app</Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <Separator />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardDescription>{metric.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-metric text-2xl font-semibold">
                {metric.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Etapas do pipeline</CardTitle>
          <CardDescription>
            Cores semânticas do CLAUDE.md, validadas em tema claro e escuro.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {stages.map((stage) => (
            <Badge key={stage.label} className={stage.className}>
              {stage.label}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Formatação pt-BR</CardTitle>
          <CardDescription>
            <code>formatCurrency()</code> e <code>formatDate()</code> de{" "}
            <code>lib/utils.ts</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-metric space-y-1 text-sm">
          <p>{formatCurrency(49)} / mês — plano Pro</p>
          <p>{formatCurrency(1234567.89)}</p>
          <p>{formatDate("2026-08-13", "long")}</p>
          <p>{formatDate("2026-08-13T14:30:00", "datetime")}</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button>Ação primária</Button>
        <Button variant="secondary">Secundária</Button>
        <Button variant="outline">Contorno</Button>
        <Button variant="ghost">Fantasma</Button>
        <Button variant="destructive">Excluir</Button>
      </div>
    </main>
  );
}

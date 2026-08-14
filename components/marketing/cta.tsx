import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CallToAction() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* rounded-xl (12px) é o teto do guia v2 — nada mais arredondado. */}
        <div className="relative overflow-hidden rounded-xl border bg-card px-6 py-14 text-center sm:px-12">
          {/* Faixa accent no topo em vez do glow que havia aqui: a mesma
              linguagem de edge seco das colunas do board. */}
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-1 bg-primary"
          />

          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(80%_70%_at_50%_0%,black,transparent)] bg-[linear-gradient(hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.5)_1px,transparent_1px)] bg-[size:48px_48px]"
          />

          <div className="relative mx-auto max-w-xl">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Sua próxima venda não cabe numa planilha
            </h2>
            <p className="text-balance mt-4 text-muted-foreground">
              Crie seu workspace em menos de um minuto e traga o time junto.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href="/signup">
                Começar grátis
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

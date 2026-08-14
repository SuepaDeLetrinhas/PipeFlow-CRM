import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PipelinePreview } from "@/components/marketing/pipeline-preview";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b">
      {/* Brilho índigo atrás do conteúdo, discreto nos dois temas. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-80 bg-[radial-gradient(60%_100%_at_50%_100%,hsl(var(--primary)/0.18),transparent)]"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            CRM para pequenas empresas e times de vendas
          </span>

          <h1 className="text-balance mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
            Seu funil de vendas inteiro em{" "}
            <span className="text-primary">uma tela</span>
          </h1>

          <p className="text-balance mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Leads, negócios e follow-ups saem da planilha e entram num pipeline
            que o time todo enxerga. Sem campos demais, sem treinamento.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/signup">
                Começar grátis
                <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Link href="/#planos">Ver planos</Link>
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Plano gratuito para sempre · até 2 colaboradores e 50 leads · sem
            cartão de crédito
          </p>
        </div>

        <div className="mt-14 sm:mt-16">
          <PipelinePreview />
        </div>
      </div>
    </section>
  );
}

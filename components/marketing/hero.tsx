import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PipelinePreview } from "@/components/marketing/pipeline-preview";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b">
      {/*
       * Grid modular no lugar do glow.
       *
       * O v1 tinha aqui um `radial-gradient` da cor primária — o "neon glow"
       * que o guia v2 lista em O que NÃO usar. A textura do fundo é o grão de
       * ruído global (`body::before`); a seção acrescenta só a trama de linhas,
       * que é a "brutalidade controlada" do guia: grid modular, edge seco.
       * A máscara apaga a trama nas bordas para ela não virar moldura.
       */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)] bg-[linear-gradient(hsl(var(--border)/0.55)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.55)_1px,transparent_1px)] bg-[size:64px_64px]"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            CRM para pequenas empresas e times de vendas
          </span>

          <h1 className="text-balance mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
            Seu funil de vendas inteiro em{" "}
            {/* `-ink` porque aqui o accent é texto: em `--primary` puro a
                headline sumiria no tema claro (1.13:1). */}
            <span className="text-primary-ink">uma tela</span>
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

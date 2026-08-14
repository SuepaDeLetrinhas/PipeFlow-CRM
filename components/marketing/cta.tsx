import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CallToAction() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border bg-card px-6 py-14 text-center sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_50%_0%,hsl(var(--primary)/0.18),transparent)]"
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

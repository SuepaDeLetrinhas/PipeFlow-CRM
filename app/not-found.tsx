import Link from "next/link";
import { Compass } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

/**
 * 404 raiz — URL que não casa com rota nenhuma.
 *
 * Fica fora dos grupos de rota de propósito: um `not-found` dentro de `(app)`
 * exigiria sessão para renderizar, e quem chega a uma URL quebrada vindo de
 * fora não necessariamente está logado. Por isso traz a própria moldura, sem
 * shell nem sidebar.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo className="mb-8 size-10" />

      <p className="text-label text-muted-foreground">Erro 404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Página não encontrada
      </h1>
      <p className="mt-3 max-w-md text-balance text-sm text-muted-foreground">
        O endereço não existe, mudou de lugar ou o link que trouxe você até aqui
        está desatualizado.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/dashboard">
            <Compass className="size-4" />
            Ir para o dashboard
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Voltar para o início</Link>
        </Button>
      </div>
    </main>
  );
}

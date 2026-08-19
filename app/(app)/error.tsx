"use client";

import * as React from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

/**
 * Boundary de erro da área autenticada.
 *
 * Fica no grupo `(app)` e não em cada rota: assim o shell — sidebar, topbar,
 * troca de workspace — continua de pé, e quem viu a falha ainda consegue
 * navegar para outra tela em vez de encarar a página em branco do Next.
 *
 * Não trata `notFound()`: `notFound.tsx` tem precedência sobre este arquivo.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // O `digest` é o único elo com o log do servidor: em produção a mensagem
    // real é omitida do cliente de propósito, e sem ele não há como cruzar o
    // relato do usuário com a stack registrada na Vercel.
    console.error("[app] erro não tratado", error.digest ?? error.message);
  }, [error]);

  return (
    <EmptyState
      icon={AlertTriangle}
      title="Algo deu errado ao carregar esta tela"
      description="A falha foi registrada. Tente de novo — se persistir, recarregue a página ou volte mais tarde."
      action={
        <div className="flex flex-col items-center gap-3">
          <Button onClick={reset}>
            <RotateCw className="size-4" />
            Tentar de novo
          </Button>
          {error.digest ? (
            <p className="text-metric text-xs text-muted-foreground">
              Código: {error.digest}
            </p>
          ) : null}
        </div>
      }
      className="mt-10"
    />
  );
}

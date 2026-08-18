"use client";

import * as React from "react";
import { ArrowUpRight, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";

import {
  createCheckoutSession,
  createPortalSession,
} from "@/app/(app)/settings/billing-actions";
import { Button } from "@/components/ui/button";

/**
 * Botões de cobrança: upgrade (Free) e gerenciar assinatura (Pro).
 *
 * Ambas as actions terminam em `redirect()` para uma URL do Stripe — em caso
 * de sucesso elas **não retornam**, e o `await` nem chega a resolver. Só o
 * caminho de recusa devolve `ActionResult`, e é o único que este componente
 * precisa exibir.
 *
 * Nenhuma trata do estado pós-pagamento: quem promove o workspace é o webhook.
 * Esta tela só abre a porta.
 */

export function UpgradeButton({ disabled }: { disabled?: boolean }) {
  const [pending, startTransition] = React.useTransition();

  function upgrade() {
    startTransition(async () => {
      const result = await createCheckoutSession();

      // Chegar aqui significa recusa: o sucesso teria redirecionado.
      if (!result.ok) {
        toast.error(result.message ?? "Não foi possível iniciar o checkout.");
      }
    });
  }

  return (
    <Button onClick={upgrade} disabled={pending || disabled}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <ArrowUpRight className="size-4" />
      )}
      Fazer upgrade para o Pro
    </Button>
  );
}

export function ManageBillingButton({ disabled }: { disabled?: boolean }) {
  const [pending, startTransition] = React.useTransition();

  function manage() {
    startTransition(async () => {
      const result = await createPortalSession();

      if (!result.ok) {
        toast.error(result.message ?? "Não foi possível abrir o portal.");
      }
    });
  }

  return (
    <Button variant="outline" onClick={manage} disabled={pending || disabled}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Settings2 className="size-4" />
      )}
      Gerenciar assinatura
    </Button>
  );
}

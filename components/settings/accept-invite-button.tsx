"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";

import { acceptInviteAction } from "@/app/invite/[token]/actions";
import { FormError } from "@/components/auth/form-error";
import { Button } from "@/components/ui/button";

/**
 * Botão de aceite.
 *
 * Client Component só porque precisa do estado de carregamento e da mensagem
 * de erro; a decisão inteira de quem pode aceitar já foi tomada no servidor.
 */
export function AcceptInviteButton({ token }: { token: string }) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onAccept() {
    setError(null);

    startTransition(async () => {
      // Em caso de sucesso a action redireciona para o dashboard e nada abaixo
      // executa — só chega aqui quando algo recusou o aceite.
      const result = await acceptInviteAction({ token });

      setError(result.message ?? "Não foi possível aceitar o convite.");
    });
  }

  return (
    <div className="space-y-3">
      <FormError message={error} />

      <Button className="w-full" onClick={onAccept} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Check className="size-4" />}
        Aceitar convite
      </Button>
    </div>
  );
}

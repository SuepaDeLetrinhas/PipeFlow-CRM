"use client";

import * as React from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { revokeInviteAction } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";

/** Revoga um convite pendente. Libera o assento e o e-mail para novo convite. */
export function InviteRowActions({
  inviteId,
  email,
}: {
  inviteId: string;
  email: string;
}) {
  const [pending, startTransition] = React.useTransition();

  function revoke() {
    startTransition(async () => {
      const result = await revokeInviteAction({ inviteId });

      if (!result.ok) {
        toast.error(result.message ?? "Não foi possível revogar.");
        return;
      }

      toast.success(`Convite para ${email} revogado.`);
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={revoke}
      disabled={pending}
      className="text-muted-foreground hover:text-danger"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <X className="size-4" />
      )}
      <span className="sr-only">Revogar convite para {email}</span>
    </Button>
  );
}

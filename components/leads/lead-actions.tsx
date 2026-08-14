"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteLeadAction } from "@/app/(app)/leads/actions";
import { LeadFormDialog } from "@/components/leads/lead-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Lead, User } from "@/types";

interface LeadActionsProps {
  lead: Lead;
  owners: User[];
}

export function LeadActions({ lead, owners }: LeadActionsProps) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function onDelete() {
    startTransition(async () => {
      const result = await deleteLeadAction(lead.id);

      if (!result.ok) {
        toast.error(result.message ?? "Não foi possível excluir o lead.");
        return;
      }

      toast.success(result.message ?? "Lead excluído.");
      setConfirming(false);
      // A partir do M9 o lead deixa de existir; voltar para a lista é o
      // destino certo nos dois casos.
      router.push("/leads");
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setEditing(true)}>
        <Pencil />
        Editar
      </Button>
      <Button
        variant="outline"
        onClick={() => setConfirming(true)}
        className="text-danger hover:text-danger"
      >
        <Trash2 />
        Excluir
      </Button>

      <LeadFormDialog
        open={editing}
        onOpenChange={setEditing}
        owners={owners}
        lead={lead}
        defaultOwnerId={lead.owner_id}
      />

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir lead</DialogTitle>
            <DialogDescription>
              {lead.name} e todo o histórico vinculado — atividades e negócios —
              serão removidos. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              onClick={onDelete}
              disabled={pending}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {pending ? <Loader2 className="animate-spin" /> : null}
              Excluir lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import * as React from "react";
import { Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Lead, User } from "@/types";

interface LeadRowActionsProps {
  lead: Lead;
  owners: User[];
}

/**
 * Editar e excluir direto da linha, sem abrir o detalhe.
 *
 * Difere de `LeadActions` (usado no detalhe) em um ponto: ao excluir, a lista
 * permanece na tela — não há para onde navegar, basta revalidar.
 */
export function LeadRowActions({ lead, owners }: LeadRowActionsProps) {
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
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground data-[state=open]:bg-accent"
            aria-label={`Ações para ${lead.name}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setConfirming(true)}
            className="text-danger focus:text-danger"
          >
            <Trash2 />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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

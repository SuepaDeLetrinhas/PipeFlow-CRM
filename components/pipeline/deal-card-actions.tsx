"use client";

import * as React from "react";
import { Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteDealAction } from "@/app/(app)/pipeline/actions";
import { DealFormDialog } from "@/components/pipeline/deal-form-dialog";
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
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STAGE_COLORS } from "@/components/pipeline/stage-colors";
import { DEAL_STAGES, DEAL_STAGE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Deal, DealStage, Lead, User } from "@/types";

import { useMoveDeal } from "./pipeline-board-context";

interface DealCardActionsProps {
  deal: Deal;
  owners: User[];
  leads: Lead[];
}

export function DealCardActions({ deal, owners, leads }: DealCardActionsProps) {
  const [editing, setEditing] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const moveDeal = useMoveDeal();

  function onDelete() {
    startTransition(async () => {
      const result = await deleteDealAction(deal.id);

      if (!result.ok) {
        toast.error(result.message ?? "Não foi possível excluir o negócio.");
        return;
      }

      toast.success(result.message ?? "Negócio excluído.");
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
            className="-mr-1 -mt-1 size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover/card:opacity-100 data-[state=open]:opacity-100"
            aria-label={`Ações para ${deal.title}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
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

          <DropdownMenuSeparator />

          {/* Alternativa ao arraste: no toque e no leitor de tela, mover por
              menu é mais confiável do que segurar e arrastar. */}
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Mover para
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={deal.stage}
            onValueChange={(value) => moveDeal(deal.id, value as DealStage)}
          >
            {DEAL_STAGES.map((stage) => (
              <DropdownMenuRadioItem key={stage} value={stage}>
                <span
                  className={cn(
                    "mr-2 size-2 shrink-0 rounded-full",
                    STAGE_COLORS[stage].accent,
                  )}
                  aria-hidden
                />
                {DEAL_STAGE_LABELS[stage]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DealFormDialog
        open={editing}
        onOpenChange={setEditing}
        deal={deal}
        owners={owners}
        leads={leads}
        defaultOwnerId={deal.owner_id}
        defaultStage={deal.stage}
      />

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir negócio</DialogTitle>
            <DialogDescription>
              {deal.title} será removido do pipeline. Esta ação não pode ser
              desfeita.
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
              Excluir negócio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

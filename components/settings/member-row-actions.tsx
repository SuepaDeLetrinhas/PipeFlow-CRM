"use client";

import * as React from "react";
import { Loader2, MoreHorizontal, ShieldCheck, Trash2, User } from "lucide-react";
import { toast } from "sonner";

import {
  removeMemberAction,
  updateMemberRoleAction,
} from "@/app/(app)/settings/actions";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Role } from "@/types";

/**
 * Ações sobre um membro: trocar papel, remover.
 *
 * Só é renderizado para admin, e o dono do workspace não recebe nenhuma delas —
 * mas isso é aparência. Quem recusa de verdade são as actions (que checam o
 * papel no servidor) e o trigger `protect_workspace_owner` no Postgres.
 */
export function MemberRowActions({
  memberId,
  memberName,
  role,
  isOwner,
  isSelf,
}: {
  memberId: string;
  memberName: string;
  role: Role;
  isOwner: boolean;
  isSelf: boolean;
}) {
  const [pending, startTransition] = React.useTransition();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // O dono não pode ser rebaixado nem removido: um workspace sem admin fica
  // impossível de administrar. Sem ações, não há menu a mostrar.
  if (isOwner) return null;

  const nextRole: Role = role === "admin" ? "member" : "admin";

  function changeRole() {
    startTransition(async () => {
      const result = await updateMemberRoleAction({ memberId, role: nextRole });

      if (!result.ok) {
        toast.error(result.message ?? "Não foi possível alterar o papel.");
        return;
      }

      toast.success(
        nextRole === "admin"
          ? `${memberName} agora é administrador.`
          : `${memberName} agora é membro.`,
      );
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeMemberAction({ memberId });

      if (!result.ok) {
        toast.error(result.message ?? "Não foi possível remover.");
        return;
      }

      setConfirmOpen(false);
      toast.success(`${memberName} saiu do workspace.`);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MoreHorizontal className="size-4" />
            )}
            <span className="sr-only">Ações para {memberName}</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={changeRole}>
            {nextRole === "admin" ? (
              <ShieldCheck className="size-4" />
            ) : (
              <User className="size-4" />
            )}
            Tornar {nextRole === "admin" ? "administrador" : "membro"}
          </DropdownMenuItem>

          {/* Remover a si mesmo pela lista seria um clique com rótulo errado —
              a action recusa, e o menu nem oferece. */}
          {isSelf ? null : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-danger focus:text-danger"
                onSelect={(event) => {
                  // Sem isto, o menu fecha e leva o diálogo junto no mesmo tick.
                  event.preventDefault();
                  setConfirmOpen(true);
                }}
              >
                <Trash2 className="size-4" />
                Remover do workspace
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover {memberName}?</DialogTitle>
            <DialogDescription>
              A pessoa perde o acesso a este workspace imediatamente. Os leads e
              negócios sob responsabilidade dela continuam onde estão.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              onClick={remove}
              disabled={pending}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {pending ? <Loader2 className="animate-spin" /> : null}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

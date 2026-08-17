"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { switchWorkspaceAction } from "@/app/(app)/workspaces/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PLAN_LABELS } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";
import type { Workspace } from "@/types";

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  collapsed?: boolean;
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  collapsed = false,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const active =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    workspaces[0];

  function onSelect(workspaceId: string) {
    if (workspaceId === active?.id) return;

    startTransition(async () => {
      const result = await switchWorkspaceAction({ workspaceId });

      if (!result.ok) {
        toast.error(result.message ?? "Não foi possível trocar de workspace.");
        return;
      }

      // `refresh()` refaz os Server Components com o cookie novo. Sem ele, a
      // tela continuaria mostrando os dados do workspace anterior até a próxima
      // navegação — o contexto teria mudado no servidor, mas não na tela.
      router.refresh();
    });
  }

  if (!active) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto w-full justify-start gap-2 px-2 py-2 hover:bg-accent",
            collapsed && "justify-center px-0",
          )}
          aria-label={`Workspace ativo: ${active.name}. Trocar de workspace`}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
            {initials(active.name)}
          </span>
          {collapsed ? null : (
            <>
              <span className="flex min-w-0 flex-1 flex-col items-start text-left">
                <span className="w-full truncate text-sm font-medium leading-tight">
                  {active.name}
                </span>
                <span className="text-xs leading-tight text-muted-foreground">
                  Plano {PLAN_LABELS[active.plan]}
                </span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Workspaces
        </DropdownMenuLabel>
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onSelect={() => onSelect(workspace.id)}
            disabled={pending}
            className="gap-2"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-semibold text-primary">
              {initials(workspace.name)}
            </span>
            <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
            {workspace.id === active.id ? (
              <Check className="size-4 shrink-0 text-primary" />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2 text-muted-foreground">
          <Link href="/workspaces/novo">
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Criar workspace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

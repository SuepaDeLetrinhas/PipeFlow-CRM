"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PLAN_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Plan, Workspace } from "@/types";

interface SidebarContentProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  /**
   * Plano vindo de `getEffectivePlan()`, e não de `activeWorkspace.plan`.
   * A coluna do workspace é cache denormalizado mantido pelo webhook; lê-la
   * aqui faria o card oferecer "fazer upgrade" a um assinante Pro se o cache
   * saísse de sincronia, e esconder o botão de um ex-assinante cancelado.
   */
  plan: Plan;
  collapsed?: boolean;
  onNavigate?: () => void;
}

/**
 * Conteúdo da sidebar. Renderizado duas vezes: como coluna fixa no desktop e
 * dentro do drawer no mobile — por isso não posiciona a si mesmo.
 */
export function SidebarContent({
  workspaces,
  activeWorkspace,
  plan,
  collapsed = false,
  onNavigate,
}: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col gap-4 py-4">
      <div className={cn("px-3", collapsed && "px-2")}>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2 rounded-md px-1 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            collapsed && "justify-center px-0",
          )}
        >
          <Logo />
          <span className={cn("text-base font-semibold tracking-tight", collapsed && "sr-only")}>
            PipeFlow
          </span>
        </Link>
      </div>

      <div className={cn("px-3", collapsed && "px-2")}>
        <WorkspaceSwitcher
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspace.id}
          collapsed={collapsed}
        />
      </div>

      <Separator />

      <div className={cn("flex-1 px-3", collapsed && "px-2")}>
        <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
      </div>

      {collapsed ? null : (
        <div className="px-3">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Plano atual
            </p>
            <p className="mt-0.5 text-sm font-semibold">
              {PLAN_LABELS[plan]}
            </p>
            {plan === "free" ? (
              <Button
                asChild
                size="sm"
                className="mt-3 w-full"
                onClick={onNavigate}
              >
                <Link href="/settings/billing">
                  <Sparkles className="size-4" />
                  Fazer upgrade
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

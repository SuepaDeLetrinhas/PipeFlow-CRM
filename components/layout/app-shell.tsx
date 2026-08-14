"use client";

import * as React from "react";

import { SidebarContent } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { User, Workspace } from "@/types";

/** Cookie que guarda o estado da sidebar entre visitas. */
export const SIDEBAR_COOKIE = "pipeflow_sidebar";

interface AppShellProps {
  user: User;
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

export function AppShell({
  user,
  workspaces,
  activeWorkspace,
  defaultCollapsed = false,
  children,
}: AppShellProps) {
  // O valor inicial vem do cookie lido no servidor, então a sidebar já nasce
  // no estado certo — sem piscar de aberta para recolhida na hidratação.
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  function toggleCollapsed() {
    setCollapsed((previous) => {
      const next = !previous;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-background">
        <aside
          className={cn(
            "hidden shrink-0 border-r bg-card transition-[width] duration-200 md:sticky md:top-0 md:block md:h-screen",
            collapsed ? "md:w-[4.5rem]" : "md:w-64",
          )}
        >
          <SidebarContent
            workspaces={workspaces}
            activeWorkspace={activeWorkspace}
            collapsed={collapsed}
          />
        </aside>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <SheetDescription className="sr-only">
              Navegue entre dashboard, leads, pipeline e configurações.
            </SheetDescription>
            <SidebarContent
              workspaces={workspaces}
              activeWorkspace={activeWorkspace}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            user={user}
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
            onOpenMobileNav={() => setMobileNavOpen(true)}
          />
          <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}

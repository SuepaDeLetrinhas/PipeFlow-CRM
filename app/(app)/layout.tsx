import { cookies } from "next/headers";

import { AppShell, SIDEBAR_COOKIE } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";
import {
  getCurrentUser,
  getCurrentWorkspace,
  getWorkspaces,
} from "@/lib/data";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, workspaces, activeWorkspace] = await Promise.all([
    getCurrentUser(),
    getWorkspaces(),
    getCurrentWorkspace(),
  ]);

  const collapsed =
    cookies().get(SIDEBAR_COOKIE)?.value === "collapsed";

  return (
    <AppShell
      user={user}
      workspaces={workspaces}
      activeWorkspace={activeWorkspace}
      defaultCollapsed={collapsed}
    >
      {children}
      {/* Só na área autenticada: as telas públicas não disparam toasts. */}
      <Toaster />
    </AppShell>
  );
}

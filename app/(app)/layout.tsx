import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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

  // Conta sem workspace nenhum: acabou de se cadastrar e ainda não passou pelo
  // onboarding. Sem este desvio, a sidebar renderizaria um switcher vazio e
  // todas as telas mostrariam "nenhum dado" — sem dizer o que fazer a respeito.
  if (!activeWorkspace) {
    redirect("/onboarding");
  }

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

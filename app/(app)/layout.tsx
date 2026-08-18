import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell, SIDEBAR_COOKIE } from "@/components/layout/app-shell";
import { PastDueBanner } from "@/components/settings/past-due-banner";
import { Toaster } from "@/components/ui/sonner";
import {
  getCurrentUser,
  getCurrentWorkspace,
  getEffectivePlan,
  getWorkspaces,
} from "@/lib/data";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, workspaces, activeWorkspace, plan] = await Promise.all([
    getCurrentUser(),
    getWorkspaces(),
    getCurrentWorkspace(),
    // Fonte da verdade, de `subscriptions` — o card da sidebar lia
    // `workspace.plan`, o cache denormalizado, e divergia de todo o resto do
    // app quando o webhook e a coluna saíam de sincronia.
    getEffectivePlan(),
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
      plan={plan}
      defaultCollapsed={collapsed}
      /* Cobrança recusada é a única coisa que interrompe qualquer tela: o
         `past_due` não rebaixa o plano, então sem isto o app fica silencioso
         até o Stripe cancelar. Vai no slot `banner`, e não em `children`, para
         ficar em largura total sob a topbar. Renderiza `null` no caso normal. */
      banner={<PastDueBanner />}
    >
      {children}
      {/* Só na área autenticada: as telas públicas não disparam toasts. */}
      <Toaster />
    </AppShell>
  );
}

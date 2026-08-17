import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { getCurrentUser, getWorkspaces } from "@/lib/data";

export const metadata: Metadata = { title: "Criar workspace" };

/**
 * Onboarding: primeira empresa da conta.
 *
 * Fica FORA do route group `(app)` de propósito. O layout de `(app)` redireciona
 * para cá quem não tem workspace; se esta página vivesse lá dentro, o layout
 * rodaria antes dela e o redirect entraria em loop infinito.
 */
export default async function OnboardingPage() {
  const [user, workspaces] = await Promise.all([
    getCurrentUser(),
    getWorkspaces(),
  ]);

  // Quem já tem workspace não tem o que fazer aqui — inclusive quem chega pelo
  // "Criar workspace" do switcher e desiste, ou quem volta pelo histórico.
  if (workspaces.length > 0) {
    redirect("/dashboard");
  }

  // Só o primeiro nome: "Bem-vinda, Marina" soa melhor que o nome completo.
  const firstName = user.full_name.split(" ")[0];

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-lg flex-col justify-center gap-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-label text-muted-foreground">Bem-vindo(a), {firstName}</p>
        <h1 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
          Vamos criar sua empresa
        </h1>
        <p className="text-pretty text-muted-foreground">
          Todo lead, negócio e atividade pertence a uma empresa. Você pode
          convidar seu time depois — e criar outras empresas quando quiser.
        </p>
      </header>

      <OnboardingForm />
    </main>
  );
}

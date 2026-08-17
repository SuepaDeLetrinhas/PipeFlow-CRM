import type { Metadata } from "next";

import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Nova empresa" };

/**
 * Criar mais uma empresa, a partir do switcher.
 *
 * Reaproveita o formulário do onboarding — é a mesma Server Action e as mesmas
 * regras. O que muda é só a moldura: aqui dentro da casca do app, porque quem
 * chega já tem contexto e pode desistir e voltar.
 */
export default function NovoWorkspacePage() {
  return (
    <>
      <PageHeader
        title="Nova empresa"
        description="Cada empresa tem seus próprios leads, negócios e time — nada é compartilhado entre elas."
      />

      <div className="max-w-lg">
        <OnboardingForm />
      </div>
    </>
  );
}

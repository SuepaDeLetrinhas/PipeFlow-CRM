import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FREE_PLAN_LIMITS } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    price: formatCurrency(0),
    period: "para sempre",
    description: "Para quem está saindo da planilha agora.",
    features: [
      `Até ${FREE_PLAN_LIMITS.leads} leads`,
      `Até ${FREE_PLAN_LIMITS.members} colaboradores`,
      "Pipeline Kanban completo",
      "Timeline de atividades",
      "Dashboard de métricas",
    ],
    cta: "Criar conta grátis",
    highlighted: false,
  },
  {
    name: "Pro",
    price: formatCurrency(49),
    period: "por mês",
    description: "Para times que já vivem do funil.",
    features: [
      "Leads ilimitados",
      "Colaboradores ilimitados",
      "Múltiplos workspaces",
      "Convites por e-mail",
      "Suporte prioritário",
    ],
    cta: "Assinar o Pro",
    highlighted: true,
  },
];

export function Pricing() {
  return (
    <section id="planos" className="scroll-mt-16 border-b py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Preço de ferramenta pequena
          </h2>
          <p className="text-balance mt-4 text-muted-foreground">
            Comece de graça e passe para o Pro quando o time crescer. Cancele
            quando quiser.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-xl border bg-card p-6",
                plan.highlighted && "border-primary shadow-lg md:scale-[1.02]",
              )}
            >
              {plan.highlighted ? (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Mais popular
                </span>
              ) : null}

              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.description}
              </p>

              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="text-metric text-4xl font-semibold tracking-tight">
                  {plan.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {plan.period}
                </span>
              </p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        // `-ink`: o chartreuse puro como ícone some no tema
                        // claro (1.14:1 contra o fundo do card).
                        plan.highlighted ? "text-primary-ink" : "text-success",
                      )}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className="mt-8 w-full"
                variant={plan.highlighted ? "default" : "outline"}
              >
                <Link href="/signup">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

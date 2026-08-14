import {
  BarChart3,
  Building2,
  KanbanSquare,
  MessageSquare,
  SlidersHorizontal,
  Users,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Leads e contatos",
    description:
      "Cadastro completo com empresa, cargo e status. Busca e filtros por responsável, situação e período.",
  },
  {
    icon: KanbanSquare,
    title: "Pipeline Kanban",
    description:
      "Seis etapas fixas, do primeiro contato ao fechamento. Arraste o negócio e o time inteiro vê a mudança.",
  },
  {
    icon: MessageSquare,
    title: "Timeline de atividades",
    description:
      "Ligações, e-mails, reuniões e notas ficam registrados no lead — nada se perde na caixa de entrada de alguém.",
  },
  {
    icon: BarChart3,
    title: "Dashboard de métricas",
    description:
      "Leads, negócios abertos, valor em jogo e taxa de conversão. Mais o funil e os prazos que vencem esta semana.",
  },
  {
    icon: Building2,
    title: "Multi-empresa",
    description:
      "Um workspace por empresa ou cliente, com convite de colaboradores por e-mail e papéis de admin e membro.",
  },
  {
    icon: SlidersHorizontal,
    title: "Busca e filtros",
    description:
      "Encontre por nome, empresa, e-mail ou telefone. Filtre por status, responsável e período — o recorte fica na URL e você compartilha do jeito que está.",
  },
];

export function Features() {
  return (
    <section
      id="funcionalidades"
      className="scroll-mt-16 border-b py-16 sm:py-20"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            O suficiente para vender. Nada além disso.
          </h2>
          <p className="text-balance mt-4 text-muted-foreground">
            Seis recursos que resolvem o dia a dia de quem vende — em vez de
            duzentos que ninguém usa.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }, index) => (
            <div
              key={title}
              className="accent-line animate-stagger-in relative overflow-hidden rounded-xl border bg-card p-6 transition-colors hover:border-primary/40"
              style={{ animationDelay: `${index * 0.06}s` }}
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary-ink">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

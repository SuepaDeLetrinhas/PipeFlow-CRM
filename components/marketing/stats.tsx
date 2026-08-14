import { cn } from "@/lib/utils";

/**
 * Números de resultado.
 *
 * O guia pede métricas em "grid com bordas verticais (não cards soltos)" —
 * por isso a separação aqui é `divide-x`, e não quatro `Card`. Valor em Syne
 * bold (`text-display-metric`), label em mono caixa-alta (`text-label`).
 *
 * `label` descreve o que o número mede; `note` é a régua — sem ela um "+47%"
 * não diz sobre o quê.
 */
const stats: { value: string; label: string; note: string }[] = [
  {
    value: "+47%",
    label: "Conversão",
    note: "Mais negócios fechados no primeiro trimestre de uso",
  },
  {
    value: "3,2x",
    label: "Leads qualificados",
    note: "Volume que chega à etapa de proposta",
  },
  {
    value: "-62%",
    label: "Ciclo de venda",
    note: "Tempo entre o primeiro contato e o fechamento",
  },
  {
    value: "1.200+",
    label: "Times ativos",
    note: "Empresas usando o PipeFlow todo dia",
  },
];

export function Stats() {
  return (
    <section className="border-b">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <dl className="grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={cn(
                "animate-stagger-in px-6 py-8 sm:px-8",
                // A borda de baixo do grid 2×2 sobraria na última linha do
                // mobile; em sm a divisão passa a ser vertical.
                index === 1 && "sm:border-t-0",
                index > 1 && "sm:border-t lg:border-t-0",
              )}
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              {/*
               * `primary-ink` e não `primary`: o chartreuse puro sobre o fundo
               * claro dá 1.13:1, ilegível para um número que é o argumento da
               * seção. O token ink é a versão escura no light e volta ao
               * chartreuse no dark — mesma mecânica dos badges de etapa.
               */}
              <dd className="text-display-metric text-4xl text-primary-ink">
                {stat.value}
              </dd>
              <dt className="text-label mt-3 text-muted-foreground">
                {stat.label}
              </dt>
              <p className="mt-2 text-sm text-muted-foreground">{stat.note}</p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

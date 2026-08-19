"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DEAL_STAGE_LABELS } from "@/lib/constants";
import type { FunnelStage } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

/**
 * Cor de cada etapa como CSS variable, não hex.
 *
 * As mesmas variáveis que a coluna do Kanban usa: a etapa tem uma cor só no
 * app inteiro, e o toggle de tema reveste o gráfico sem re-render, porque quem
 * troca é o CSS. Recharts aceita `fill` como string arbitrária, então
 * `hsl(var(--…))` chega intacto no SVG.
 */
const STAGE_FILL: Record<string, string> = {
  novo_lead: "hsl(var(--stage-novo-lead))",
  contato_realizado: "hsl(var(--stage-contato-realizado))",
  proposta_enviada: "hsl(var(--stage-proposta-enviada))",
  negociacao: "hsl(var(--stage-negociacao))",
};

/**
 * `true` abaixo do breakpoint `sm` do Tailwind (640px).
 *
 * Media query em JS, e não classe utilitária, porque o que precisa mudar é
 * uma prop numérica do Recharts — `width` do eixo — que não existe como CSS.
 * Começa em `false` e só corrige após montar: no servidor não há viewport, e
 * assumir desktop mantém o HTML inicial igual ao caso mais comum.
 */
function useIsCompact() {
  const [compact, setCompact] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const sync = () => setCompact(query.matches);

    sync();
    query.addEventListener("change", sync);

    return () => query.removeEventListener("change", sync);
  }, []);

  return compact;
}

interface FunnelDatum extends FunnelStage {
  label: string;
}

function FunnelTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: FunnelDatum }[];
}) {
  if (!active || !payload?.length) return null;

  const { label, count, value } = payload[0].payload;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md">
      <p className="text-label text-muted-foreground">{label}</p>
      <p className="text-metric mt-1 text-sm font-semibold">
        {count} {count === 1 ? "negócio" : "negócios"}
      </p>
      <p className="text-metric text-xs text-muted-foreground">
        {formatCurrency(value)}
      </p>
    </div>
  );
}

/**
 * Funil de vendas: negócios por etapa, da entrada à negociação.
 *
 * Barras horizontais porque os nomes das etapas são longos em pt-BR — na
 * vertical eles girariam ou truncariam. A contagem é o comprimento; o valor em
 * BRL fica no rótulo e no tooltip, sem um segundo eixo.
 */
export function FunnelChart({ data }: { data: FunnelStage[] }) {
  /*
   * A faixa dos rótulos encolhe no telefone.
   *
   * `width` do YAxis é px fixo — o Recharts não aceita porcentagem aqui. Em
   * 132px, num viewport de 360px (onde o gráfico tem ~280px úteis), o eixo
   * levava quase metade da largura e as barras viravam tocos de poucos
   * pixels: o funil deixava de comunicar proporção, que é a única coisa que
   * ele existe para mostrar. Abaixo de `sm` o eixo cai para 96px e a fonte
   * para 10px, e "Contato Realizado" passa a truncar — perda aceitável, já
   * que a cor da barra repete a etapa e o tooltip traz o nome inteiro.
   */
  const compact = useIsCompact();
  const axisWidth = compact ? 96 : 132;

  const chartData: FunnelDatum[] = data.map((entry) => ({
    ...entry,
    label: DEAL_STAGE_LABELS[entry.stage],
  }));

  const total = data.reduce((sum, entry) => sum + entry.count, 0);

  if (total === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Nenhum negócio em aberto para desenhar o funil.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: compact ? 28 : 44, bottom: 4, left: 4 }}
        barCategoryGap={12}
      >
        {/* Eixo de valores oculto: o rótulo em cada barra já dá o número, e uma
            régua a mais só competiria com ele. */}
        <XAxis type="number" dataKey="count" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={axisWidth}
          tickLine={false}
          axisLine={false}
          tick={{
            fill: "hsl(var(--muted-foreground))",
            fontSize: compact ? 10 : 11,
          }}
        />
        <Tooltip
          content={<FunnelTooltip />}
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
        />
        <Bar
          dataKey="count"
          radius={[0, 4, 4, 0]}
          maxBarSize={24}
          isAnimationActive={false}
        >
          {chartData.map((entry) => (
            <Cell key={entry.stage} fill={STAGE_FILL[entry.stage]} />
          ))}
          {/* Rótulo direto em toda barra: são quatro, e no tema claro o
              chartreuse não alcança 3:1 contra o fundo — o número é o que
              garante a leitura sem depender da cor. */}
          <LabelList
            dataKey="count"
            position="right"
            className="text-metric"
            fill="hsl(var(--foreground))"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

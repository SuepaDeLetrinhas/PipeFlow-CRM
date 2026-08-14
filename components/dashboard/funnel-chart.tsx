"use client";

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
        margin={{ top: 4, right: 44, bottom: 4, left: 4 }}
        barCategoryGap={12}
      >
        {/* Eixo de valores oculto: o rótulo em cada barra já dá o número, e uma
            régua a mais só competiria com ele. */}
        <XAxis type="number" dataKey="count" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={132}
          tickLine={false}
          axisLine={false}
          tick={{
            fill: "hsl(var(--muted-foreground))",
            fontSize: 11,
          }}
        />
        <Tooltip
          content={<FunnelTooltip />}
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={false}>
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

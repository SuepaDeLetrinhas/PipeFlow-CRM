import { FunnelChart } from "@/components/dashboard/funnel-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getFunnelData } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

/** Funil de vendas — busca no servidor, desenha no cliente. */
export async function FunnelCard() {
  const data = await getFunnelData();

  const totalValue = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Funil de vendas</CardTitle>
        <CardDescription>
          Negócios por etapa, da entrada à negociação —{" "}
          <span className="text-metric">{formatCurrency(totalValue)}</span> em
          jogo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Barra de contagem não precisa de 1400px: esticada, o comprimento
            deixa de ser comparável de relance. */}
        <div className="max-w-3xl">
          <FunnelChart data={data} />
        </div>
      </CardContent>
    </Card>
  );
}

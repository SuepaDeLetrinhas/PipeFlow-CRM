import type { Metadata } from "next";
import { KanbanSquare, Plus } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getOpenDeals } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const openDeals = await getOpenDeals();
  const total = openDeals.reduce((sum, deal) => sum + deal.value, 0);

  return (
    <>
      <PageHeader
        title="Pipeline"
        description={`${openDeals.length} negócios abertos · ${formatCurrency(total)}`}
      >
        <Button disabled>
          <Plus />
          Novo negócio
        </Button>
      </PageHeader>

      <EmptyState
        icon={KanbanSquare}
        title="O board Kanban entra em uma aula própria"
        description="As seis etapas do PRD já estão em lib/constants e os negócios em lib/mock. Falta montar as colunas e o drag-and-drop."
      />
    </>
  );
}

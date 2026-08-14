import type { Metadata } from "next";
import { Plus, Users } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getLeads } from "@/lib/data";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage() {
  const leads = await getLeads();

  return (
    <>
      <PageHeader
        title="Leads"
        description={`${leads.length} leads neste workspace.`}
      >
        <Button disabled>
          <Plus />
          Novo lead
        </Button>
      </PageHeader>

      <EmptyState
        icon={Users}
        title="A listagem de leads entra na próxima aula"
        description="Os dados já existem em lib/mock e são lidos por getLeads(). Falta a tabela com busca, filtros e a página de detalhe."
      />
    </>
  );
}

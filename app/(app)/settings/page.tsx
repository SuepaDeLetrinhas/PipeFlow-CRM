import type { Metadata } from "next";
import { Settings } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { getCurrentWorkspace, getMembers } from "@/lib/data";
import { PLAN_LABELS } from "@/lib/constants";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const [workspace, members] = await Promise.all([
    getCurrentWorkspace(),
    getMembers(),
  ]);

  return (
    <>
      <PageHeader
        title="Configurações"
        description={`${workspace.name} · plano ${PLAN_LABELS[workspace.plan]} · ${members.length} membros`}
      />

      <EmptyState
        icon={Settings}
        title="Workspace, membros e billing entram mais adiante"
        description="Esta rota existe para a navegação ficar completa. As abas com convite de colaboradores e assinatura vêm depois."
      />
    </>
  );
}

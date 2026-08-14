import { leads } from "@/lib/mock/leads";
import type { Lead } from "@/types";

import { getCurrentWorkspace } from "./workspaces";

/** Leads do workspace ativo, do mais recente para o mais antigo. */
export async function getLeads(): Promise<Lead[]> {
  const workspace = await getCurrentWorkspace();

  return leads
    .filter((lead) => lead.workspace_id === workspace.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const workspace = await getCurrentWorkspace();

  return (
    leads.find(
      (lead) => lead.id === id && lead.workspace_id === workspace.id,
    ) ?? null
  );
}

export async function countLeads(): Promise<number> {
  const workspaceLeads = await getLeads();

  return workspaceLeads.length;
}

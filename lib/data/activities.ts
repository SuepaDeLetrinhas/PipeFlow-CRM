import { createClient } from "@/lib/supabase/server";
import type { Activity } from "@/types";

import { getCurrentWorkspace } from "./workspaces";

/** Timeline de um lead, da atividade mais recente para a mais antiga. */
export async function getActivitiesByLead(
  leadId: string,
): Promise<Activity[]> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from("activities")
    .select(
      "id, workspace_id, lead_id, type, description, author_id, occurred_at, created_at",
    )
    .eq("workspace_id", workspace.id)
    .eq("lead_id", leadId)
    // O índice `activities_lead_id_occurred_at_idx` do M8 é exatamente
    // `(lead_id, occurred_at desc)`, então esta ordenação sai dele.
    .order("occurred_at", { ascending: false })
    // Duas atividades no mesmo instante (importação, registro em lote) ficariam
    // em ordem indefinida sem desempate.
    .order("id", { ascending: true });

  return data ?? [];
}

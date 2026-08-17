import { activities } from "@/lib/mock/activities";
import type { Activity } from "@/types";

import { getCurrentWorkspace } from "./workspaces";

/** Timeline de um lead, da atividade mais recente para a mais antiga. */
export async function getActivitiesByLead(
  leadId: string,
): Promise<Activity[]> {
  const workspace = await getCurrentWorkspace();

  if (!workspace) return [];

  return activities
    .filter(
      (activity) =>
        activity.workspace_id === workspace.id && activity.lead_id === leadId,
    )
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
}

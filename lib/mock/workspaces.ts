import type { Subscription, Workspace, WorkspaceMember } from "@/types";

import { DEMO_WORKSPACES } from "./identity";
import { users } from "./users";

/**
 * Os ids são os dos workspaces reais criados pelo onboarding (ver
 * `identity.ts`) — é isso que faz os leads e negócios abaixo aparecerem ao
 * entrar com as contas de teste. Nome e plano continuam de demonstração: o
 * switcher e o cabeçalho leem do banco, não daqui.
 */
export const workspaces: Workspace[] = [
  {
    id: DEMO_WORKSPACES.marina,
    name: "Lumiar Digital",
    slug: "lumiar-digital",
    owner_id: users[0].id,
    plan: "pro",
    created_at: "2026-02-10T13:00:00.000Z",
  },
  {
    id: DEMO_WORKSPACES.diego,
    name: "Vertex Consultoria",
    slug: "vertex-consultoria",
    owner_id: users[3].id,
    plan: "free",
    created_at: "2026-05-22T17:30:00.000Z",
  },
];

/** Workspace ativo enquanto não há cookie de contexto (M10). */
export const currentWorkspace: Workspace = workspaces[0];

export const members: WorkspaceMember[] = [
  {
    id: "f0000000-0000-4000-8000-000000000001",
    workspace_id: workspaces[0].id,
    user_id: users[0].id,
    role: "admin",
    created_at: "2026-02-10T13:00:00.000Z",
    user: users[0],
  },
  {
    id: "f0000000-0000-4000-8000-000000000002",
    workspace_id: workspaces[0].id,
    user_id: users[1].id,
    role: "member",
    created_at: "2026-02-18T11:20:00.000Z",
    user: users[1],
  },
  {
    id: "f0000000-0000-4000-8000-000000000003",
    workspace_id: workspaces[0].id,
    user_id: users[2].id,
    role: "member",
    created_at: "2026-03-04T09:45:00.000Z",
    user: users[2],
  },
  {
    id: "f0000000-0000-4000-8000-000000000004",
    workspace_id: workspaces[1].id,
    user_id: users[3].id,
    role: "admin",
    created_at: "2026-05-22T17:30:00.000Z",
    user: users[3],
  },
  // Marina também colabora na Vertex — é o que dá o que trocar no switcher.
  {
    id: "f0000000-0000-4000-8000-000000000005",
    workspace_id: workspaces[1].id,
    user_id: users[0].id,
    role: "member",
    created_at: "2026-06-01T14:00:00.000Z",
    user: users[0],
  },
];

export const subscriptions: Subscription[] = [
  {
    id: "c1000000-0000-4000-8000-000000000001",
    workspace_id: workspaces[0].id,
    stripe_customer_id: "cus_mock_lumiar",
    stripe_subscription_id: "sub_mock_lumiar",
    status: "active",
    plan: "pro",
    current_period_end: "2026-09-10T13:00:00.000Z",
    created_at: "2026-06-01T13:00:00.000Z",
    updated_at: "2026-08-10T13:00:00.000Z",
  },
  {
    id: "c1000000-0000-4000-8000-000000000002",
    workspace_id: workspaces[1].id,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    status: "active",
    plan: "free",
    current_period_end: null,
    created_at: "2026-06-01T14:00:00.000Z",
    updated_at: "2026-06-01T14:00:00.000Z",
  },
];

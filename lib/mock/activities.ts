import type { Activity } from "@/types";

import { leads } from "./leads";
import { users } from "./users";
import { workspaces } from "./workspaces";

const LUMIAR = workspaces[0].id;

const [marina, rafael, camila] = users.map((user) => user.id);

const leadId = (n: number) => leads[n - 1].id;

/** Timeline do lead — ordenada da mais recente para a mais antiga no M4. */
export const activities: Activity[] = [
  {
    id: "e0000000-0000-4000-8000-000000000001",
    workspace_id: LUMIAR,
    lead_id: leadId(1),
    type: "call",
    description:
      "Ligação de descoberta: Beatriz confirmou orçamento aprovado para o segundo semestre.",
    author_id: marina,
    occurred_at: "2026-06-04T14:00:00.000Z",
  },
  {
    id: "e0000000-0000-4000-8000-000000000002",
    workspace_id: LUMIAR,
    lead_id: leadId(1),
    type: "email",
    description: "Enviada apresentação institucional e cases de logística.",
    author_id: marina,
    occurred_at: "2026-06-05T11:30:00.000Z",
  },
  {
    id: "e0000000-0000-4000-8000-000000000003",
    workspace_id: LUMIAR,
    lead_id: leadId(1),
    type: "meeting",
    description:
      "Reunião técnica com o time de TI para mapear a integração com o ERP atual.",
    author_id: rafael,
    occurred_at: "2026-06-18T16:00:00.000Z",
  },
  {
    id: "e0000000-0000-4000-8000-000000000004",
    workspace_id: LUMIAR,
    lead_id: leadId(1),
    type: "note",
    description:
      "Decisão final depende do conselho, que se reúne na segunda quinzena de agosto.",
    author_id: marina,
    occurred_at: "2026-07-29T09:15:00.000Z",
  },
  {
    id: "e0000000-0000-4000-8000-000000000005",
    workspace_id: LUMIAR,
    lead_id: leadId(2),
    type: "call",
    description: "Primeiro contato. Henrique pediu retorno em duas semanas.",
    author_id: rafael,
    occurred_at: "2026-06-11T10:20:00.000Z",
  },
  {
    id: "e0000000-0000-4000-8000-000000000006",
    workspace_id: LUMIAR,
    lead_id: leadId(2),
    type: "email",
    description: "Follow-up com proposta de escopo reduzido para piloto.",
    author_id: rafael,
    occurred_at: "2026-06-26T15:45:00.000Z",
  },
  {
    id: "e0000000-0000-4000-8000-000000000007",
    workspace_id: LUMIAR,
    lead_id: leadId(6),
    type: "meeting",
    description:
      "Demo do produto para o time de engenharia. Boa recepção, dúvidas sobre SSO.",
    author_id: rafael,
    occurred_at: "2026-07-10T13:00:00.000Z",
  },
  {
    id: "e0000000-0000-4000-8000-000000000008",
    workspace_id: LUMIAR,
    lead_id: leadId(6),
    type: "note",
    description: "Gustavo é o decisor técnico; a compra passa pelo financeiro.",
    author_id: rafael,
    occurred_at: "2026-07-11T09:05:00.000Z",
  },
  {
    id: "e0000000-0000-4000-8000-000000000009",
    workspace_id: LUMIAR,
    lead_id: leadId(3),
    type: "meeting",
    description: "Kickoff do projeto de prontuário digital.",
    author_id: marina,
    occurred_at: "2026-05-05T14:30:00.000Z",
  },
  {
    id: "e0000000-0000-4000-8000-000000000010",
    workspace_id: LUMIAR,
    lead_id: leadId(11),
    type: "call",
    description: "Renata pediu proposta com prazo de implantação de 45 dias.",
    author_id: camila,
    occurred_at: "2026-07-06T17:10:00.000Z",
  },
  {
    id: "e0000000-0000-4000-8000-000000000011",
    workspace_id: LUMIAR,
    lead_id: leadId(10),
    type: "email",
    description: "Enviada revisão da proposta com desconto por volume.",
    author_id: marina,
    occurred_at: "2026-08-06T12:40:00.000Z",
  },
  {
    id: "e0000000-0000-4000-8000-000000000012",
    workspace_id: LUMIAR,
    lead_id: leadId(14),
    type: "note",
    description:
      "Concorrente direto apresentou proposta 15% mais barata — reforçar diferencial de suporte.",
    author_id: camila,
    occurred_at: "2026-08-07T18:25:00.000Z",
  },
];

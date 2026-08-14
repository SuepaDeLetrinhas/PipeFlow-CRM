import type {
  ActivityType,
  DealStage,
  LeadStatus,
  Plan,
  Role,
} from "@/types";

/** Etapas do pipeline na ordem do PRD — a ordem desta lista define as colunas. */
export const DEAL_STAGES: readonly DealStage[] = [
  "novo_lead",
  "contato_realizado",
  "proposta_enviada",
  "negociacao",
  "fechado_ganho",
  "fechado_perdido",
] as const;

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  novo_lead: "Novo Lead",
  contato_realizado: "Contato Realizado",
  proposta_enviada: "Proposta Enviada",
  negociacao: "Negociação",
  fechado_ganho: "Fechado Ganho",
  fechado_perdido: "Fechado Perdido",
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Contatado",
  qualificado: "Qualificado",
  cliente: "Cliente",
  perdido: "Perdido",
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  call: "Ligação",
  email: "E-mail",
  meeting: "Reunião",
  note: "Nota",
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  member: "Membro",
};

export const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
};

/** Limites do plano Free — checados no servidor a partir do M11. */
export const FREE_PLAN_LIMITS = {
  members: 2,
  leads: 50,
} as const;

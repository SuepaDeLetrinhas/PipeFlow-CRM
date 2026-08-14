/**
 * Tipos de domínio do PipeFlow.
 *
 * Espelham o modelo de dados do CLAUDE.md linha a linha (snake_case,
 * `workspace_id` em toda tabela de domínio, ids em uuid). No M8 estes tipos
 * dão lugar aos gerados em `types/database.ts` — por isso nada aqui usa forma
 * diferente da que o Postgres vai devolver.
 */

export type Role = "admin" | "member";

export type Plan = "free" | "pro";

export type LeadStatus =
  | "novo"
  | "contatado"
  | "qualificado"
  | "cliente"
  | "perdido";

/** Etapas fixas do pipeline, na ordem do PRD. */
export type DealStage =
  | "novo_lead"
  | "contato_realizado"
  | "proposta_enviada"
  | "negociacao"
  | "fechado_ganho"
  | "fechado_perdido";

export type ActivityType = "call" | "email" | "meeting" | "note";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  plan: Plan;
  created_at: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: Role;
  created_at: string;
  /** Vem de join com o perfil do usuário. */
  user: User;
}

export interface Lead {
  id: string;
  workspace_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  status: LeadStatus;
  owner_id: string;
  created_at: string;
}

export interface Deal {
  id: string;
  workspace_id: string;
  title: string;
  value: number;
  stage: DealStage;
  position: number;
  due_date: string | null;
  lead_id: string | null;
  owner_id: string;
  created_at: string;
}

export interface Activity {
  id: string;
  workspace_id: string;
  lead_id: string;
  type: ActivityType;
  description: string;
  author_id: string;
  occurred_at: string;
}

export interface Subscription {
  id: string;
  workspace_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  plan: Plan;
  current_period_end: string | null;
}

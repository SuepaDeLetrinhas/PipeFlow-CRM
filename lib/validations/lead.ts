import { z } from "zod";

import { ACTIVITY_TYPE_LABELS, LEAD_STATUS_LABELS } from "@/lib/constants";
import type { ActivityType, LeadStatus } from "@/types";

/**
 * Schemas de lead e atividade. Valem no cliente (react-hook-form) e no servidor
 * (Server Action) — o cliente é conveniência, o servidor é lei.
 */

// `Object.keys` devolve `string[]`; o cast preserva o literal para o z.enum e
// mantém a lista amarrada a LEAD_STATUS_LABELS: status novo no tipo, opção nova
// no formulário, sem uma segunda lista para esquecer de atualizar.
const LEAD_STATUS_VALUES = Object.keys(LEAD_STATUS_LABELS) as [
  LeadStatus,
  ...LeadStatus[],
];

const ACTIVITY_TYPE_VALUES = Object.keys(ACTIVITY_TYPE_LABELS) as [
  ActivityType,
  ...ActivityType[],
];

// Campos opcionais chegam do formulário como "" e vão ao banco como null —
// coluna nullable com string vazia vira um segundo jeito de dizer "sem valor".
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => value || null)
    .nullable();

export const leadSchema = z.object({
  name: z
    .string({ required_error: "Informe o nome do lead." })
    .trim()
    .min(2, "Informe o nome do lead.")
    .max(120, "Nome muito longo."),
  email: z
    .string()
    .trim()
    .max(160, "E-mail muito longo.")
    .email("E-mail inválido.")
    .or(z.literal(""))
    .transform((value) => value || null)
    .nullable(),
  phone: optionalText(40, "Telefone muito longo."),
  company: optionalText(120, "Nome da empresa muito longo."),
  job_title: optionalText(120, "Cargo muito longo."),
  // `errorMap` em vez de `invalid_type_error`: para enum o Zod monta a
  // mensagem "Invalid enum value. Expected 'novo' | …" em inglês, que
  // vazaria para o usuário e ainda listaria os valores internos.
  status: z.enum(LEAD_STATUS_VALUES, {
    errorMap: () => ({ message: "Selecione um status válido." }),
  }),
  owner_id: z
    .string({ required_error: "Selecione um responsável." })
    .uuid("Responsável inválido."),
});

/** Id de lead vindo da URL ou de uma action — nunca confiar no formato. */
export const leadIdSchema = z
  .string({ required_error: "Lead não informado." })
  .uuid("Lead inválido.");

export const activitySchema = z.object({
  lead_id: leadIdSchema,
  type: z.enum(ACTIVITY_TYPE_VALUES, {
    errorMap: () => ({ message: "Selecione um tipo válido." }),
  }),
  description: z
    .string({ required_error: "Descreva a atividade." })
    .trim()
    .min(3, "Descreva a atividade.")
    .max(600, "Descrição muito longa."),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type ActivityInput = z.infer<typeof activitySchema>;

/** Entrada do formulário, antes das transformações que trocam "" por null. */
export type LeadFormValues = z.input<typeof leadSchema>;

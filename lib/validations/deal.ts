import { z } from "zod";

import { DEAL_STAGE_LABELS } from "@/lib/constants";
import type { DealStage } from "@/types";

/**
 * Schemas de negócio. Valem no cliente (react-hook-form) e no servidor
 * (Server Action) — o cliente é conveniência, o servidor é lei.
 */

// Amarrado a DEAL_STAGE_LABELS para não existir uma segunda lista de etapas
// que alguém possa esquecer de atualizar.
const DEAL_STAGE_VALUES = Object.keys(DEAL_STAGE_LABELS) as [
  DealStage,
  ...DealStage[],
];

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Teto alto o bastante para não atrapalhar e baixo o bastante para barrar erro
 *  de digitação (R$ 100 milhões). */
const MAX_VALUE = 100_000_000;

export const dealIdSchema = z
  .string({ required_error: "Negócio não informado." })
  .uuid("Negócio inválido.");

export const dealSchema = z.object({
  title: z
    .string({ required_error: "Informe o título do negócio." })
    .trim()
    .min(3, "Informe o título do negócio.")
    .max(120, "Título muito longo."),
  // O <input type="number"> entrega string; a action pode receber number.
  // Aceitar os dois e converter à mão (em vez de `z.coerce`) mantém o tipo de
  // ENTRADA como string, que é o que o react-hook-form controla — com `coerce`
  // o `z.input` viraria `number` e o formulário não tiparia.
  // O campo vazio precisa cair em "Informe o valor", não no NaN de Number("").
  value: z
    .union([z.string(), z.number()])
    .superRefine((raw, ctx) => {
      const text = typeof raw === "string" ? raw.trim() : String(raw);

      if (!text) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe o valor do negócio." });
        return;
      }
      if (Number.isNaN(Number(text))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe um valor válido." });
        return;
      }
      if (Number(text) <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "O valor precisa ser maior que zero." });
        return;
      }
      if (Number(text) > MAX_VALUE) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valor acima do limite permitido." });
      }
    })
    .transform((raw) => Number(typeof raw === "string" ? raw.trim() : raw)),
  stage: z.enum(DEAL_STAGE_VALUES, {
    errorMap: () => ({ message: "Selecione uma etapa válida." }),
  }),
  due_date: z
    .string()
    .trim()
    .regex(ISO_DAY, "Data inválida.")
    .or(z.literal(""))
    .transform((value) => value || null)
    .nullable(),
  // Negócio pode existir sem lead vinculado — prospecção que ainda não virou
  // contato. O "" vem do <Select> quando o usuário escolhe "Nenhum".
  lead_id: z
    .string()
    .uuid("Lead inválido.")
    .or(z.literal(""))
    .transform((value) => value || null)
    .nullable(),
  owner_id: z
    .string({ required_error: "Selecione um responsável." })
    .uuid("Responsável inválido."),
});

/**
 * Payload do arrastar. Chega do cliente e por isso é validado como qualquer
 * outra entrada: `position` negativa ou etapa forjada não podem seguir para a
 * query do M12.
 */
export const moveDealSchema = z.object({
  id: dealIdSchema,
  stage: z.enum(DEAL_STAGE_VALUES, {
    errorMap: () => ({ message: "Etapa inválida." }),
  }),
  position: z
    .number({ required_error: "Posição não informada." })
    .int("Posição inválida.")
    .min(0, "Posição inválida."),
});

export type DealInput = z.infer<typeof dealSchema>;
export type MoveDealInput = z.infer<typeof moveDealSchema>;

/** Entrada do formulário, antes das transformações que trocam "" por null. */
export type DealFormValues = z.input<typeof dealSchema>;

import { z } from "zod";

/**
 * Schemas de workspace. Como em auth, as mesmas regras valem no cliente
 * (react-hook-form) e no servidor (Server Action) — o cliente é conveniência,
 * o servidor é lei.
 */

export const createWorkspaceSchema = z.object({
  name: z
    .string({ required_error: "Informe o nome da empresa." })
    .trim()
    .min(2, "O nome precisa de pelo menos 2 caracteres.")
    // 80 é o mesmo limite do `check` na coluna: passar disso seria recusado
    // pelo Postgres com erro genérico, sem apontar o campo.
    .max(80, "O nome pode ter no máximo 80 caracteres."),
});

export const switchWorkspaceSchema = z.object({
  workspaceId: z
    .string({ required_error: "Workspace não informado." })
    .uuid("Workspace inválido."),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type SwitchWorkspaceInput = z.infer<typeof switchWorkspaceSchema>;

import { z } from "zod";

/**
 * Schemas de convite e gestão de membros.
 *
 * Valem no cliente (react-hook-form) e no servidor (Server Action). Como em
 * todo o resto do projeto, o cliente é conveniência e o servidor é lei — as
 * actions revalidam tudo mesmo quando o formulário já validou.
 */

/**
 * Os dois papéis do modelo de dados. Espelha o enum `role` do Postgres.
 *
 * `errorMap` em vez de `invalid_type_error`: num `z.enum`, um valor fora da
 * lista é `invalid_enum_value`, não `invalid_type`, e o `invalid_type_error`
 * não o alcança — a mensagem padrão do Zod ("Expected 'admin' | 'member',
 * received …") vazaria em inglês para a UI, que é toda em pt-BR.
 */
export const roleSchema = z.enum(["admin", "member"], {
  errorMap: () => ({ message: "Papel inválido." }),
});

export const inviteMemberSchema = z.object({
  email: z
    .string({ required_error: "Informe o e-mail." })
    .trim()
    // `toLowerCase` no schema, e não só na action: o índice
    // `invites_pending_unique` é sobre `lower(email)`, então normalizar aqui
    // faz o unique do banco e a checagem da aplicação enxergarem a mesma
    // string. Sem isso, "Ana@x.com" e "ana@x.com" pareceriam convites
    // distintos até o Postgres recusar o segundo.
    .toLowerCase()
    .email("E-mail inválido."),
  role: roleSchema,
});

export const inviteIdSchema = z.object({
  inviteId: z
    .string({ required_error: "Convite não informado." })
    .uuid("Convite inválido."),
});

export const updateMemberRoleSchema = z.object({
  memberId: z
    .string({ required_error: "Membro não informado." })
    .uuid("Membro inválido."),
  role: roleSchema,
});

export const memberIdSchema = z.object({
  memberId: z
    .string({ required_error: "Membro não informado." })
    .uuid("Membro inválido."),
});

export const acceptInviteSchema = z.object({
  token: z
    .string({ required_error: "Convite não informado." })
    .trim()
    .min(1, "Convite inválido."),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

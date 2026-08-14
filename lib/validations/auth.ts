import { z } from "zod";

/**
 * Schemas de autenticação. As mesmas regras valem no cliente (react-hook-form)
 * e no servidor (Server Action) — o cliente é conveniência, o servidor é lei.
 */

// `required_error` cobre o campo ausente no payload — sem ele o Zod responde
// "Required" em inglês para quem chamar a Server Action fora do formulário.
const email = z
  .string({ required_error: "Informe seu e-mail." })
  .min(1, "Informe seu e-mail.")
  .email("E-mail inválido.");

const password = z
  .string({ required_error: "Informe uma senha." })
  .min(8, "A senha precisa de pelo menos 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.");

export const signInSchema = z.object({
  email,
  password: z
    .string({ required_error: "Informe sua senha." })
    .min(1, "Informe sua senha."),
});

export const signUpSchema = z.object({
  fullName: z
    .string({ required_error: "Informe seu nome completo." })
    .min(2, "Informe seu nome completo.")
    .max(80, "Nome muito longo."),
  email,
  password,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password,
    passwordConfirmation: z
      .string({ required_error: "Confirme a nova senha." })
      .min(1, "Confirme a nova senha."),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "As senhas não conferem.",
    path: ["passwordConfirmation"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

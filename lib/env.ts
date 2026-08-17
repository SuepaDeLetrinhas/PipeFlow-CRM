import { z } from "zod";

/**
 * Variáveis de ambiente validadas no boot. Chave faltando derruba aqui, com o
 * nome da variável na mensagem, em vez de virar `undefined` numa query três
 * telas adiante.
 *
 * As `NEXT_PUBLIC_*` precisam ser lidas de `process.env.NOME` literal — o Next
 * substitui a expressão no bundle em build time, e `process.env[nome]` não é
 * substituído.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  SUPABASE_JWKS_URL: z.string().url(),
});

function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);

  if (!result.success) {
    const faltando = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");

    throw new Error(
      `Variáveis de ambiente ausentes ou inválidas: ${faltando}. ` +
        "Copie .env.example para .env.local e preencha os valores.",
    );
  }

  return result.data;
}

export const env = parse(publicSchema, {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

/**
 * Segredos do servidor. Função, e não constante de módulo, para que o parse só
 * rode quando alguém realmente precisar da chave — importar este arquivo no
 * cliente não deve explodir.
 */
export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() não pode ser chamado no cliente.");
  }

  return parse(serverSchema, {
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_JWKS_URL: process.env.SUPABASE_JWKS_URL,
  });
}

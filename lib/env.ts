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

/**
 * Envio de e-mail. Separado do `serverSchema` porque é **opcional**: sem chave
 * do Resend o convite continua sendo gravado e o admin copia o link à mão.
 *
 * Fosse obrigatório aqui, `serverEnv()` passaria a derrubar toda rota que usa
 * a service-role em qualquer ambiente sem Resend configurado — inclusive o
 * aceite de convite, que não manda e-mail nenhum.
 */
const emailSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().min(1),
});

/**
 * Stripe. Ao contrário do Resend, **obrigatório** — e por isso separado do
 * `serverSchema`, não fundido a ele.
 *
 * A separação é pelo mesmo motivo do e-mail, invertido: cada grupo derruba
 * apenas quem depende dele. Fundir Stripe no `serverSchema` faria o aceite de
 * convite (que usa a service-role e não toca em cobrança) parar de funcionar
 * num ambiente sem chave do Stripe.
 *
 * Já o `null` do padrão do Resend não cabe aqui: sem chave, um convite ainda
 * pode ser copiado à mão, mas um checkout não tem degradação possível. Falhar
 * alto, com o nome da variável, é melhor do que um botão de upgrade que não
 * faz nada.
 *
 * O `STRIPE_WEBHOOK_SECRET` entra junto porque é a única coisa que separa um
 * evento assinado pelo Stripe de um POST anônimo na rota pública do webhook.
 */
const stripeSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_ID_PRO: z.string().min(1),
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

/**
 * Config do Resend, ou `null` quando não houver.
 *
 * Devolver `null` em vez de lançar é o que mantém o convite utilizável antes
 * de o domínio de envio existir: `sendInviteEmail()` vira no-op e a UI mostra
 * o link para copiar. Um throw aqui transformaria "e-mail não configurado" em
 * "convite não pode ser criado", que são problemas de gravidade diferente.
 */
export function emailEnv() {
  if (typeof window !== "undefined") {
    throw new Error("emailEnv() não pode ser chamado no cliente.");
  }

  const result = emailSchema.safeParse({
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  });

  return result.success ? result.data : null;
}

/**
 * Segredos do Stripe. Função pelo mesmo motivo de `serverEnv()`: o parse só
 * roda quando alguém precisa cobrar, e importar este módulo no cliente não
 * explode.
 */
export function stripeEnv() {
  if (typeof window !== "undefined") {
    throw new Error("stripeEnv() não pode ser chamado no cliente.");
  }

  return parse(stripeSchema, {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID_PRO: process.env.STRIPE_PRICE_ID_PRO,
  });
}

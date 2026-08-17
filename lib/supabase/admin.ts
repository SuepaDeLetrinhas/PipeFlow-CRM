import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { env, serverEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente com a chave secreta — **ignora RLS por completo**.
 *
 * Uso permitido apenas em webhooks e rotinas admin no servidor (CLAUDE.md).
 * Hoje não tem consumidor; o primeiro será o webhook do Stripe no M14, que
 * precisa escrever em `subscriptions` sem sessão de usuário.
 *
 * O `import "server-only"` acima faz o build falhar se este módulo entrar em
 * qualquer grafo de Client Component.
 */
export function createAdminClient() {
  const { SUPABASE_SECRET_KEY } = serverEnv();

  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

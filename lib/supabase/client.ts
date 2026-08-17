import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente para Client Components. Usa a chave publishable e roda sob RLS —
 * o isolamento por workspace é responsabilidade das policies no Postgres.
 *
 * Singleton lazy: instanciado na primeira chamada e reaproveitado depois. Um
 * `createBrowserClient()` por componente abriria um canal de auth por
 * instância, e o `onAuthStateChange` de cada uma dispararia em paralelo no
 * refresh de token. Uma instância só por aba mantém a sessão consistente.
 */
let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
  }

  return client;
}

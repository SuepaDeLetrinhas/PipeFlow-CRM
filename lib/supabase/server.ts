import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente para Server Components, Server Actions e Route Handlers. Chave
 * publishable, sob RLS — a service-role vive só em `admin.ts`.
 *
 * Sem singleton, ao contrário do `client.ts`: cada request carrega o próprio
 * cookie store, e reaproveitar a instância entre requests vazaria a sessão de
 * um usuário para outro. Uma instância nova por chamada é o comportamento
 * correto aqui.
 *
 * A função é async porque no Next 15 `cookies()` passa a devolver Promise —
 * chamar com `await` desde já evita ter de tocar em toda call-site no upgrade.
 */
export async function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component não pode escrever cookie. O refresh de sessão
            // acontece no middleware, então ignorar aqui é seguro.
          }
        },
      },
    },
  );
}

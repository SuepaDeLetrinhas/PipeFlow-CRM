import { type NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Refresh do cookie de sessão a cada request. Sem isso o token expira e o
 * usuário cai para fora em Server Components, que não podem escrever cookie.
 *
 * A proteção de rotas entra no M9 — hoje o app roda sobre fixtures e não há
 * login real; redirecionar agora deixaria a área logada inacessível.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Revalida o token e reemite os cookies. Não remover: é o efeito colateral
  // que mantém a sessão viva.
  await supabase.auth.getUser();

  return response;
}

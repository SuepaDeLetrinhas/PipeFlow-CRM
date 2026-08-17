import { type NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Refresh do cookie de sessão a cada request + proteção de rotas.
 *
 * Sem o refresh o token expira e o usuário cai para fora em Server Components,
 * que não podem escrever cookie.
 */

/** Área logada: exige sessão. */
const APP_ROUTES = ["/dashboard", "/leads", "/pipeline", "/settings"];

/** Telas de entrada: quem já está logado não tem o que fazer aqui. */
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

/**
 * `/callback` e `/reset-password` ficam de fora das duas listas de propósito.
 *
 * Quem clica no link de redefinição chega COM sessão (o callback acabou de
 * criá-la). Tratar `/reset-password` como rota de auth mandaria essa pessoa
 * para o dashboard, tornando impossível redefinir a senha pelo e-mail.
 */

function matches(pathname: string, routes: string[]) {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

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

  // `getUser()`, não `getSession()`: o primeiro valida o JWT contra o servidor
  // do Auth, o segundo apenas lê o cookie — que o cliente pode forjar. Numa
  // decisão de autorização, ler o cookie sem validar não protege nada.
  //
  // A chamada também é o efeito colateral que renova a sessão. Não remover.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && matches(pathname, APP_ROUTES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Preserva o destino para voltar depois do login: quem clicou num link
    // direto de lead volta ao lead, não ao dashboard.
    url.searchParams.set("next", `${pathname}${search}`);

    return NextResponse.redirect(url);
  }

  if (user && matches(pathname, AUTH_ROUTES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";

    return NextResponse.redirect(url);
  }

  return response;
}

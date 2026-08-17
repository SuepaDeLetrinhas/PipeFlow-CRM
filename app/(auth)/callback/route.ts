import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Callback de autenticação: troca o `code` do link por uma sessão.
 *
 * Serve dois fluxos que chegam por e-mail — confirmação de cadastro e
 * redefinição de senha. O que muda entre eles é só o `next`.
 */

/**
 * Só caminhos internos passam. Um `next` vindo da URL é entrada de usuário:
 * repassar `?next=https://site-falso/` direto para o redirect daria um open
 * redirect com o domínio do app emprestando credibilidade ao destino.
 *
 * `//host` e `/\host` são barrados porque o navegador os lê como URL absoluta
 * protocol-relative, apesar de começarem com barra.
 */
function safeNext(value: string | null): string {
  if (!value) return "/dashboard";
  if (!value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/dashboard";

  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  // O Supabase manda `error`/`error_description` quando o link expirou ou já
  // foi usado. Sem tratar, a pessoa cairia numa tela em branco.
  const error = searchParams.get("error");

  if (error) {
    const description =
      searchParams.get("error_description") ?? "O link expirou ou é inválido.";

    return NextResponse.redirect(
      `${origin}/login?erro=${encodeURIComponent(description)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code,
  );

  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/login?erro=${encodeURIComponent(
        "Não foi possível validar o link. Peça um novo.",
      )}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}

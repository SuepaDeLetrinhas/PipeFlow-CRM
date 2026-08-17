/**
 * Cookie do workspace ativo.
 *
 * Vive fora dos arquivos `"use server"` porque lá só é permitido exportar
 * funções async — mesmo motivo de `lib/actions/result`.
 *
 * O cookie guarda apenas QUAL workspace está selecionado, nunca permissão: cada
 * leitura de dado continua passando pela RLS, que decide o que a pessoa pode
 * ver. Um cookie adulterado troca o contexto para um workspace alheio e recebe
 * de volta um contexto vazio — não os dados de outra empresa.
 */

export const WORKSPACE_COOKIE = "pipeflow_workspace";

export function workspaceCookieOptions() {
  return {
    // Legível só pelo servidor: nenhum código de cliente precisa dele, e
    // deixá-lo fora do alcance de script reduz a superfície de XSS.
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // 1 ano: a escolha de contexto é preferência de longo prazo, e expirar
    // silenciosamente jogaria a pessoa noutro workspace sem explicação.
    maxAge: 60 * 60 * 24 * 365,
  };
}

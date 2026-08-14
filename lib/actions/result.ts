/**
 * Contrato compartilhado das Server Actions.
 *
 * Vive fora dos arquivos `"use server"` porque lá só é permitido exportar
 * funções async — tipos e helpers síncronos precisam de um módulo próprio.
 */

export interface ActionResult {
  ok: boolean;
  /** Erro geral do formulário: credencial inválida, e-mail já em uso… */
  message?: string;
  /** Erros por campo, no formato que o react-hook-form consome. */
  fieldErrors?: Record<string, string>;
}

/** Só existe para o estado de carregamento aparecer enquanto não há rede. */
export function simulateLatency(ms = 600) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Achata o erro do Zod para a primeira mensagem de cada campo. */
export function toFieldErrors(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): Record<string, string> {
  const { fieldErrors } = error.flatten();

  return Object.fromEntries(
    Object.entries(fieldErrors)
      .filter(([, messages]) => messages?.length)
      .map(([field, messages]) => [field, messages![0]]),
  );
}

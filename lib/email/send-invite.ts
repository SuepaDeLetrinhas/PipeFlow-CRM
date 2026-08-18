import "server-only";

import { Resend } from "resend";

import { emailEnv } from "@/lib/env";
import type { Role } from "@/types";

import {
  inviteEmailHtml,
  inviteEmailSubject,
  inviteEmailText,
} from "./invite-template";

/**
 * Envio do convite pelo Resend.
 *
 * O resultado é deliberadamente não-fatal. Quem chama (a action de convite) já
 * gravou a linha em `invites` quando chega aqui; se o envio falhar, o convite
 * continua válido e a UI mostra o link para o admin repassar por outro canal.
 * Tratar falha de e-mail como falha de convite obrigaria a desfazer a gravação
 * — e deixaria o produto inutilizável enquanto o domínio de envio não estiver
 * verificado no Resend.
 */

export type SendInviteResult =
  | { delivered: true }
  | { delivered: false; reason: "not_configured" | "failed" };

interface SendInviteInput {
  to: string;
  workspaceName: string;
  inviterName: string;
  role: Role;
  acceptUrl: string;
  expiresAt: Date;
}

export async function sendInviteEmail(
  input: SendInviteInput,
): Promise<SendInviteResult> {
  const config = emailEnv();

  // Sem chave configurada não é erro: é o estado esperado em dev e antes de o
  // domínio ser verificado. O convite vale pelo link.
  if (!config) return { delivered: false, reason: "not_configured" };

  const resend = new Resend(config.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: config.RESEND_FROM_EMAIL,
      to: input.to,
      subject: inviteEmailSubject(input.workspaceName),
      html: inviteEmailHtml(input),
      text: inviteEmailText(input),
    });

    if (error) {
      // O erro vai para o log do servidor, não para a UI: a mensagem do Resend
      // pode citar domínio e remetente, que não interessam a quem convidou.
      console.error("[invite] Resend recusou o envio:", error);

      return { delivered: false, reason: "failed" };
    }

    return { delivered: true };
  } catch (error) {
    // Rede fora, DNS, timeout. Mesmo tratamento: o convite já existe.
    console.error("[invite] falha ao chamar o Resend:", error);

    return { delivered: false, reason: "failed" };
  }
}

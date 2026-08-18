import "server-only";

import { Resend } from "resend";

import { emailEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  paymentFailedEmailHtml,
  paymentFailedEmailSubject,
  paymentFailedEmailText,
  type PaymentFailedEmailInput,
} from "./payment-failed-template";

/**
 * Aviso de cobrança recusada para os admins do workspace.
 *
 * Não-fatal, como o convite: quem chama é o webhook, que já refletiu o status
 * em `subscriptions` quando chega aqui. Se o envio falhar, o estado no banco
 * segue correto e o banner na UI continua avisando — devolver 500 ao Stripe
 * por causa de e-mail faria o evento ser reentregue e reprocessado à toa.
 *
 * **Vai para os admins, não para o titular do cartão.** O Stripe já envia ao
 * e-mail do customer, se a cobrança automática estiver ligada no painel. Quem
 * pode agir aqui é quem administra o workspace — e nem sempre é a mesma
 * pessoa que cadastrou o cartão.
 *
 * Leitura pelo cliente admin porque não há sessão de usuário num webhook: a
 * policy de `workspace_members` recusaria a consulta sem `auth.uid()`.
 */

export type SendPaymentFailedResult =
  | { delivered: true; recipients: number }
  | {
      delivered: false;
      reason: "not_configured" | "no_admins" | "failed" | "already_sent";
    };

export async function sendPaymentFailedEmail(
  workspaceId: string,
  /**
   * Id da fatura no Stripe. É a chave da guarda de reenvio — ver
   * `payment_alerts`: o dunning emite `invoice.payment_failed` a cada retry,
   * e o que se repete entre eles é a fatura, não o evento.
   */
  invoiceId: string,
  input: Omit<PaymentFailedEmailInput, "workspaceName">,
): Promise<SendPaymentFailedResult> {
  const config = emailEnv();

  // Sem chave configurada não é erro: é o estado esperado em dev e antes de o
  // domínio ser verificado no Resend.
  if (!config) return { delivered: false, reason: "not_configured" };

  const admin = createAdminClient();

  // Reserva o envio **antes** de enviar, e o insert é a própria checagem: a PK
  // faz a segunda tentativa da mesma fatura falhar com 23505. Um `select`
  // seguido de `insert` teria uma janela em que dois retries simultâneos
  // passariam ambos pelo select e mandariam dois e-mails.
  //
  // Reservar antes significa que uma falha de envio depois daqui não é
  // reenviada — preferimos não avisar a avisar quatro vezes: o banner na UI
  // continua lá, e o Stripe manda o próprio aviso ao titular do cartão.
  const { error: alertError } = await admin.from("payment_alerts").insert({
    invoice_id: invoiceId,
    workspace_id: workspaceId,
  });

  if (alertError) {
    if (alertError.code === "23505") {
      return { delivered: false, reason: "already_sent" };
    }

    console.error("[billing] falha ao registrar aviso de cobrança", {
      workspaceId,
      invoiceId,
      error: alertError,
    });

    return { delivered: false, reason: "failed" };
  }

  const { data: workspace } = await admin
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .maybeSingle();

  const { data: members, error } = await admin
    .from("workspace_members")
    .select("profiles ( email )")
    .eq("workspace_id", workspaceId)
    .eq("role", "admin");

  if (error) {
    console.error("[billing] falha ao buscar admins do workspace", {
      workspaceId,
      error,
    });

    return { delivered: false, reason: "failed" };
  }

  const recipients = (members ?? [])
    .map((member) => member.profiles?.email)
    .filter((email): email is string => Boolean(email));

  // Workspace sem admin com e-mail não deveria existir (o dono vira admin na
  // criação), mas um `delete` manual no banco deixaria a linha órfã. Sair aqui
  // é melhor do que chamar o Resend com lista vazia e ler o erro dele.
  if (!recipients.length) {
    console.warn("[billing] workspace sem admin para avisar", { workspaceId });

    return { delivered: false, reason: "no_admins" };
  }

  const resend = new Resend(config.RESEND_API_KEY);
  const payload = { ...input, workspaceName: workspace?.name ?? "seu workspace" };

  try {
    const { error: sendError } = await resend.emails.send({
      from: config.RESEND_FROM_EMAIL,
      // Todos os admins de uma vez. São no máximo dois no Free e poucos no
      // Pro; uma chamada por destinatário só multiplicaria a chance de o
      // webhook estourar o tempo.
      to: recipients,
      subject: paymentFailedEmailSubject(payload.workspaceName),
      html: paymentFailedEmailHtml(payload),
      text: paymentFailedEmailText(payload),
    });

    if (sendError) {
      console.error("[billing] Resend recusou o aviso de cobrança:", sendError);

      return { delivered: false, reason: "failed" };
    }

    await admin
      .from("payment_alerts")
      .update({ recipients: recipients.length })
      .eq("invoice_id", invoiceId);

    return { delivered: true, recipients: recipients.length };
  } catch (sendError) {
    console.error("[billing] falha ao chamar o Resend:", sendError);

    return { delivered: false, reason: "failed" };
  }
}

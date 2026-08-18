import { formatCurrency } from "@/lib/utils";

/**
 * Template do aviso de cobrança recusada.
 *
 * Mesmas restrições do convite (estilo inline, tabela de layout, hex literais)
 * pelo mesmo motivo: cliente de e-mail não é navegador, e o token do
 * `globals.css` não chega à caixa de entrada.
 *
 * O tom aqui é diferente do convite de propósito. Ninguém escolhe receber um
 * aviso de cobrança falhada, e a pessoa que lê já pode estar irritada com o
 * banco. O e-mail diz o que aconteceu, o que **não** aconteceu (o acesso
 * continua) e o que fazer — nessa ordem, sem urgência fabricada.
 */

const BG = "#0C0C0E";
const SURFACE = "#141416";
const BORDER = "#26262A";
const ACCENT = "#CAFF33";
const WARNING = "#FF6B35";
const TEXT = "#F4F4F5";
const MUTED = "#8A8A93";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface PaymentFailedEmailInput {
  workspaceName: string;
  /** Valor da fatura recusada, em centavos, como o Stripe entrega. */
  amountDue: number;
  /**
   * Próxima tentativa do dunning do Stripe, quando houver. `null` na última
   * tentativa — e é justamente aí que o texto precisa avisar que não haverá
   * outra.
   */
  nextAttemptAt: Date | null;
  /** Link para a tela de billing; o portal do Stripe abre a partir dela. */
  billingUrl: string;
}

export function paymentFailedEmailSubject(workspaceName: string) {
  return `Pagamento recusado no ${workspaceName}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
  }).format(date);
}

/**
 * O que muda quando não há próxima tentativa: deixa de ser um aviso e passa a
 * ser um prazo. Vale dizer isso explicitamente — a diferença entre "vamos
 * tentar de novo" e "essa foi a última" decide se a pessoa age hoje ou não.
 */
function retryLine(nextAttemptAt: Date | null) {
  return nextAttemptAt
    ? `Vamos tentar de novo em ${formatDate(nextAttemptAt)}.`
    : `Essa era a última tentativa automática. Sem uma atualização do cartão, a assinatura será cancelada.`;
}

export function paymentFailedEmailText({
  workspaceName,
  amountDue,
  nextAttemptAt,
  billingUrl,
}: PaymentFailedEmailInput) {
  return [
    `A cobrança de ${formatCurrency(amountDue / 100)} do workspace ${workspaceName} não foi autorizada.`,
    ``,
    `O acesso ao plano Pro continua liberado por enquanto — ninguém perdeu dados nem foi rebaixado.`,
    retryLine(nextAttemptAt),
    ``,
    `Atualize o cartão em:`,
    billingUrl,
    ``,
    `Se você já resolveu com o banco, pode ignorar este e-mail.`,
  ].join("\n");
}

export function paymentFailedEmailHtml({
  workspaceName,
  amountDue,
  nextAttemptAt,
  billingUrl,
}: PaymentFailedEmailInput) {
  const workspace = escapeHtml(workspaceName);
  const amount = formatCurrency(amountDue / 100);

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:${BG};color:${TEXT};font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${SURFACE};border:1px solid ${BORDER};border-radius:12px;">
            <tr>
              <td style="padding:32px 32px 0;">
                <p style="margin:0;font-family:'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:${MUTED};">
                  PipeFlow CRM
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0;">
                <h1 style="margin:0;font-family:'Syne',Georgia,serif;font-size:26px;line-height:1.25;font-weight:700;color:${TEXT};">
                  A cobrança de ${amount} não foi autorizada
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:${MUTED};">
                  O banco recusou o pagamento da assinatura do
                  <strong style="color:${TEXT};">${workspace}</strong>.
                  O acesso ao Pro <strong style="color:${TEXT};">continua liberado</strong> —
                  ninguém perdeu dados nem foi rebaixado.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0;">
                <div style="border-left:3px solid ${WARNING};padding:2px 0 2px 14px;">
                  <p style="margin:0;font-size:14px;line-height:1.6;color:${TEXT};">
                    ${retryLine(nextAttemptAt)}
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 0;">
                <a href="${billingUrl}"
                   style="display:inline-block;background:${ACCENT};color:${BG};text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;">
                  Atualizar cartão
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;">
                <div style="border-top:1px solid ${BORDER};padding-top:16px;">
                  <p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};">
                    Já resolveu com o banco? Pode ignorar este e-mail — a próxima
                    tentativa vai passar sozinha.
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

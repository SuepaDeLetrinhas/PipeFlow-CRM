import { ROLE_LABELS } from "@/lib/constants";
import type { Role } from "@/types";

/**
 * Template do e-mail de convite.
 *
 * HTML escrito à mão, com estilo inline e tabela de layout, porque cliente de
 * e-mail não é navegador: Gmail remove `<style>` do head, Outlook renderiza com
 * o motor do Word e nenhum dos dois entende flexbox ou variável CSS. Os hex da
 * identidade aparecem literais aqui — é a única parte do projeto onde isso é
 * correto, já que o token do `globals.css` não chega à caixa de entrada.
 */

const BG = "#0C0C0E";
const SURFACE = "#141416";
const BORDER = "#26262A";
const ACCENT = "#CAFF33";
const TEXT = "#F4F4F5";
const MUTED = "#8A8A93";

/** Impede que nome de workspace com `<` ou `&` quebre (ou injete) o HTML. */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface InviteEmailInput {
  workspaceName: string;
  inviterName: string;
  role: Role;
  acceptUrl: string;
  expiresAt: Date;
}

export function inviteEmailSubject(workspaceName: string) {
  return `Convite para o ${workspaceName} no PipeFlow`;
}

/**
 * Versão texto puro. Não é opcional: e-mail só-HTML pontua alto em filtro de
 * spam, e alguns clientes exibem exatamente esta parte.
 */
export function inviteEmailText({
  workspaceName,
  inviterName,
  role,
  acceptUrl,
  expiresAt,
}: InviteEmailInput) {
  return [
    `${inviterName} convidou você para o workspace ${workspaceName} no PipeFlow.`,
    ``,
    `Papel: ${ROLE_LABELS[role]}`,
    ``,
    `Aceite o convite em:`,
    acceptUrl,
    ``,
    `O link expira em ${formatDate(expiresAt)}.`,
    `Se você não esperava este convite, ignore este e-mail.`,
  ].join("\n");
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function inviteEmailHtml({
  workspaceName,
  inviterName,
  role,
  acceptUrl,
  expiresAt,
}: InviteEmailInput) {
  const workspace = escapeHtml(workspaceName);
  const inviter = escapeHtml(inviterName);

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
                  ${inviter} convidou você para o ${workspace}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:${MUTED};">
                  Você entra como <strong style="color:${TEXT};">${ROLE_LABELS[role]}</strong>
                  e passa a ver os leads, o pipeline e as métricas dessa empresa.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 0;">
                <a href="${acceptUrl}"
                   style="display:inline-block;background:${ACCENT};color:${BG};text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;">
                  Aceitar convite
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};word-break:break-all;">
                  Se o botão não funcionar, copie este endereço:<br />
                  <span style="color:${TEXT};">${acceptUrl}</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;">
                <div style="border-top:1px solid ${BORDER};padding-top:16px;">
                  <p style="margin:0;font-family:'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:0.1em;color:${MUTED};">
                    EXPIRA EM ${formatDate(expiresAt).toUpperCase()}
                  </p>
                  <p style="margin:8px 0 0;font-size:12px;line-height:1.6;color:${MUTED};">
                    Não esperava este convite? Pode ignorar este e-mail.
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

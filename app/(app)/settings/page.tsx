import type { Metadata } from "next";
import { ArrowRight, CreditCard, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { InviteForm } from "@/components/settings/invite-form";
import { InviteRowActions } from "@/components/settings/invite-row-actions";
import { MemberRowActions } from "@/components/settings/member-row-actions";
import { UsageMeter } from "@/components/settings/usage-meter";
import { UpgradePrompt } from "@/components/settings/upgrade-prompt";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getCurrentMember,
  getCurrentUser,
  getCurrentWorkspace,
  getEffectivePlan,
  getMembers,
  getPendingInvites,
  getSeatUsage,
  getSubscription,
} from "@/lib/data";
import { FREE_PLAN_LIMITS, PLAN_LABELS, ROLE_LABELS } from "@/lib/constants";
import { formatDate, initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Configurações" };

/**
 * Configurações do workspace: equipe, convites e plano.
 *
 * Server Component. O papel de quem está vendo decide o que aparece — mas
 * apenas isso: toda ação daqui revalida o papel no servidor antes de escrever.
 * Um membro que forjasse a chamada receberia a recusa da action, e depois a da
 * policy no Postgres.
 */
export default async function SettingsPage() {
  const [workspace, currentUser, currentMember, members, plan, subscription] =
    await Promise.all([
      getCurrentWorkspace(),
      getCurrentUser(),
      getCurrentMember(),
      getMembers(),
      // O plano vem de `subscriptions` via `getEffectivePlan()`, e não de
      // `workspace.plan`: a coluna do workspace é cache mantido pelo webhook, e
      // a tela que decide mostrar "upgrade" ou "gerenciar" precisa da fonte da
      // verdade.
      getEffectivePlan(),
      getSubscription(),
    ]);

  // O layout de `(app)` já mandou para o onboarding quem não tem workspace, mas
  // o tipo é anulável e o TypeScript cobra o tratamento aqui.
  if (!workspace) return null;

  const isAdmin = currentMember?.role === "admin";

  // Convites e uso de assentos só interessam a admin — e `getPendingInvites()`
  // devolveria lista vazia para os demais de qualquer forma, barrado pela
  // policy. Não buscar poupa duas queries por render de membro comum.
  const [invites, usage] = isAdmin
    ? await Promise.all([getPendingInvites(), getSeatUsage()])
    : [[], null];

  const isFree = plan === "free";
  const seatsFull = isFree && (usage?.total ?? 0) >= FREE_PLAN_LIMITS.members;

  return (
    <>
      <PageHeader
        title="Configurações"
        description={`${workspace.name} · plano ${PLAN_LABELS[plan]}`}
      />

      <div className="space-y-8">
        {/* --- Equipe ------------------------------------------------------ */}
        <section className="rounded-xl border bg-card">
          <header className="flex flex-col gap-1 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                Equipe
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {members.length}{" "}
                {members.length === 1 ? "pessoa" : "pessoas"} neste workspace
                {isFree ? ` · limite de ${FREE_PLAN_LIMITS.members} no Free` : null}
              </p>
            </div>

            {isFree && usage ? (
              <div className="w-full sm:w-56">
                <UsageMeter
                  label="Assentos"
                  used={usage.total}
                  limit={FREE_PLAN_LIMITS.members}
                />
              </div>
            ) : null}
          </header>

          <Separator />

          <ul className="divide-y">
            {members.map((member) => {
              const isOwner = member.user_id === workspace.owner_id;
              const isSelf = member.user_id === currentUser.id;

              return (
                <li
                  key={member.id}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials(member.user.full_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {member.user.full_name}
                      {isSelf ? (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          (você)
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {isOwner ? (
                      <Badge variant="outline" className="gap-1">
                        <ShieldCheck className="size-3" />
                        Dono
                      </Badge>
                    ) : (
                      <Badge
                        variant={member.role === "admin" ? "secondary" : "outline"}
                      >
                        {ROLE_LABELS[member.role]}
                      </Badge>
                    )}

                    {isAdmin ? (
                      <MemberRowActions
                        memberId={member.id}
                        memberName={member.user.full_name}
                        role={member.role}
                        isOwner={isOwner}
                        isSelf={isSelf}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* --- Convites ---------------------------------------------------- */}
        {isAdmin ? (
          <section className="rounded-xl border bg-card">
            <header className="p-5">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                Convidar
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A pessoa recebe um link por e-mail, válido por 7 dias.
              </p>
            </header>

            <div className="px-5 pb-5">
              {seatsFull ? (
                // Este bloco só renderiza dentro de `isAdmin`, então o botão
                // de upgrade sempre cabe aqui — quem não é admin nem vê a
                // seção de convites.
                <UpgradePrompt
                  title="Limite do plano Free atingido"
                  description={`São ${FREE_PLAN_LIMITS.members} pessoas no total, contando convites pendentes. Revogue um convite ou faça upgrade para o Pro para convidar mais.`}
                  canUpgrade
                />
              ) : (
                <InviteForm />
              )}
            </div>

            {invites.length > 0 ? (
              <>
                <Separator />
                <div className="px-5 pt-4">
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                    Pendentes
                  </h3>
                </div>
                <ul className="divide-y">
                  {invites.map((invite) => (
                    <li
                      key={invite.id}
                      className="flex items-center gap-3 px-5 py-3.5"
                    >
                      <div className="flex size-9 items-center justify-center rounded-full border bg-muted">
                        <Mail className="size-4 text-muted-foreground" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {invite.email}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          Convidado por {invite.invited_by_name} · expira em{" "}
                          {formatDate(invite.expires_at)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline">
                          {ROLE_LABELS[invite.role]}
                        </Badge>
                        <InviteRowActions
                          inviteId={invite.id}
                          email={invite.email}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        ) : null}

        {/* --- Plano ------------------------------------------------------- */}
        {/* Resumo, não a tela inteira: plano, uso e comparação moram em
            /settings/billing. Aqui fica só o suficiente para saber onde se
            está e como chegar lá. */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Plano
          </h2>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg border bg-muted">
                <CreditCard className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{PLAN_LABELS[plan]}</p>
                <p className="text-xs text-muted-foreground">
                  {isFree
                    ? `Até ${FREE_PLAN_LIMITS.members} pessoas e ${FREE_PLAN_LIMITS.leads} leads.`
                    : "Pessoas e leads ilimitados."}
                </p>
              </div>
            </div>

            <Link
              href="/settings/billing"
              className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
            >
              {isFree ? "Ver planos" : "Gerenciar cobrança"}
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {/* Cobrança falhou e o Stripe ainda está tentando de novo. O acesso
              segue liberado de propósito (ver `resolvePlan()`): derrubar
              alguém no primeiro retry falho apagaria acesso por um cartão que
              vence amanhã. */}
          {subscription?.status === "past_due" ? (
            <p className="mt-4 rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs text-foreground">
              O último pagamento não foi confirmado. Atualize o cartão em
              Cobrança para não perder o acesso ao Pro.
            </p>
          ) : null}
        </section>
      </div>
    </>
  );
}

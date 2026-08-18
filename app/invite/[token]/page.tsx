import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowRight, Clock, UserCheck } from "lucide-react";

import { AcceptInviteButton } from "@/components/settings/accept-invite-button";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ROLE_LABELS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

import { getInvitePreview } from "./actions";

export const metadata: Metadata = { title: "Convite" };

/**
 * Página de aceite do convite.
 *
 * Pública por natureza: quem recebeu o e-mail muitas vezes ainda não tem conta.
 * Ela fica fora dos route groups `(app)` e `(auth)` — e, por isso, fora das duas
 * listas do middleware, que é exatamente o comportamento desejado: `/invite`
 * não exige sessão nem expulsa quem já tem uma.
 *
 * O layout é repetido do `(auth)` em vez de reaproveitado porque um route group
 * não pode emprestar layout a quem está fora dele; são poucas linhas e a
 * alternativa seria mover a rota para dentro de `(auth)`, onde o middleware
 * mandaria todo usuário logado para o dashboard — e ninguém conseguiria aceitar
 * convite estando logado.
 */
export default async function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const preview = await getInvitePreview(params.token);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(50%_100%_at_50%_0%,hsl(var(--primary)/0.14),transparent)]"
      />

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-sm">
        <Link
          href="/"
          className="mx-auto mb-8 flex w-fit items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Logo />
          <span className="text-lg font-semibold tracking-tight">PipeFlow</span>
        </Link>

        <div className="rounded-xl border bg-card p-6">
          <InviteBody preview={preview} token={params.token} user={user} />
        </div>
      </div>
    </div>
  );
}

function InviteBody({
  preview,
  token,
  user,
}: {
  preview: Awaited<ReturnType<typeof getInvitePreview>>;
  token: string;
  user: { email?: string } | null;
}) {
  if (preview.status === "not_found") {
    return (
      <Message
        icon={AlertCircle}
        title="Convite não encontrado"
        description="Este link não vale mais — ou já foi usado, ou foi revogado. Peça um novo ao administrador do workspace."
      />
    );
  }

  if (preview.status === "expired") {
    return (
      <Message
        icon={Clock}
        title="Convite expirado"
        description={`O convite para o ${preview.workspaceName ?? "workspace"} passou do prazo de 7 dias. Peça ao administrador para enviar outro.`}
      />
    );
  }

  if (preview.status === "already_member") {
    return (
      <Message
        icon={UserCheck}
        title="Você já faz parte"
        description={`Sua conta já é membro do ${preview.workspaceName ?? "workspace"}.`}
        action={
          <Button asChild className="w-full">
            <Link href="/dashboard">
              Ir para o dashboard
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />
    );
  }

  // A partir daqui o convite é válido. O que muda é se há sessão — e, havendo,
  // se ela é da pessoa certa.
  const sessionEmail = user?.email?.trim().toLowerCase();
  const inviteEmail = preview.email?.trim().toLowerCase();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          Convite
        </p>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">
          {preview.inviterName} convidou você para o {preview.workspaceName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Você entra como{" "}
          <strong className="text-foreground">
            {preview.role ? ROLE_LABELS[preview.role] : "Membro"}
          </strong>{" "}
          e passa a ver os leads, o pipeline e as métricas dessa empresa.
        </p>
      </div>

      {!user ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Entre com <strong className="text-foreground">{preview.email}</strong>{" "}
            para aceitar.
          </p>
          <Button asChild className="w-full">
            {/* `next` traz de volta a esta página depois do login/cadastro — o
                mesmo mecanismo que o middleware usa em rota protegida. */}
            <Link href={`/signup?next=/invite/${token}`}>
              Criar conta
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/login?next=/invite/${token}`}>Já tenho conta</Link>
          </Button>
        </div>
      ) : sessionEmail !== inviteEmail ? (
        <div className="space-y-3">
          <p className="text-sm text-destructive">
            Este convite foi enviado para{" "}
            <strong>{preview.email}</strong>, mas você está logado como{" "}
            <strong>{user.email}</strong>.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard">Voltar ao dashboard</Link>
          </Button>
        </div>
      ) : (
        <AcceptInviteButton token={token} />
      )}
    </div>
  );
}

function Message({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-lg border bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

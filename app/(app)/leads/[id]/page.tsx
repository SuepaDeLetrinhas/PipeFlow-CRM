import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Calendar, Mail, Phone, User2 } from "lucide-react";

import { ActivityForm } from "@/components/leads/activity-form";
import { ActivityTimeline } from "@/components/leads/activity-timeline";
import { LeadActions } from "@/components/leads/lead-actions";
import { LeadDeals } from "@/components/leads/lead-deals";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getActivitiesByLead,
  getDealsByLead,
  getLeadById,
  getMembers,
} from "@/lib/data";
import { formatDate, initials } from "@/lib/utils";

interface LeadDetailPageProps {
  params: { id: string };
}

export async function generateMetadata({
  params,
}: LeadDetailPageProps): Promise<Metadata> {
  const lead = await getLeadById(params.id);

  // O `notFound()` precisa acontecer aqui também: o `generateMetadata` resolve
  // antes do corpo da página, e se ele retornar normalmente o Next já
  // respondeu 200 — a tela de "não encontrado" apareceria com status de
  // sucesso, enganando buscadores e monitoramento.
  if (!lead) {
    notFound();
  }

  return { title: lead.name };
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  // `getLeadById` já filtra pelo workspace ativo: lead de outro workspace cai
  // no 404, não em "acesso negado" — não confirmamos que o id existe.
  const lead = await getLeadById(params.id);

  if (!lead) {
    notFound();
  }

  const [activities, deals, members] = await Promise.all([
    getActivitiesByLead(lead.id),
    getDealsByLead(lead.id),
    getMembers(),
  ]);

  const owners = members.map((member) => member.user);
  const usersById = new Map(owners.map((user) => [user.id, user]));
  const owner = usersById.get(lead.owner_id);

  // `href` só existe quando há valor — caso contrário viraria "mailto:null".
  const contact = [
    {
      icon: Mail,
      label: "E-mail",
      value: lead.email,
      href: lead.email ? `mailto:${lead.email}` : null,
    },
    {
      icon: Phone,
      label: "Telefone",
      value: lead.phone,
      // O tel: não aceita espaços nem parênteses da máscara pt-BR.
      href: lead.phone ? `tel:${lead.phone.replace(/[^\d+]/g, "")}` : null,
    },
    { icon: Building2, label: "Empresa", value: lead.company, href: null },
    { icon: User2, label: "Cargo", value: lead.job_title, href: null },
  ];

  return (
    <>
      <Link
        href="/leads"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar para leads
      </Link>

      <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-12">
            <AvatarFallback>{initials(lead.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">
                {lead.name}
              </h1>
              <LeadStatusBadge status={lead.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {lead.job_title && lead.company
                ? `${lead.job_title} · ${lead.company}`
                : (lead.company ?? lead.job_title ?? "Sem empresa informada")}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <LeadActions lead={lead} owners={owners} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Atividades</CardTitle>
              <CardDescription>
                Histórico de contatos com {lead.name.split(" ")[0]}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityTimeline activities={activities} authors={usersById} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Negócios vinculados</CardTitle>
              <CardDescription>
                {deals.length === 1
                  ? "1 negócio ligado a este lead."
                  : `${deals.length} negócios ligados a este lead.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeadDeals deals={deals} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados de contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {contact.map(({ icon: Icon, label, value, href }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    {value ? (
                      href ? (
                        <a
                          href={href}
                          className="block truncate text-sm hover:underline"
                        >
                          {value}
                        </a>
                      ) : (
                        <p className="truncate text-sm">{value}</p>
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Não informado
                      </p>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex items-start gap-3 border-t pt-3">
                <Calendar
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div>
                  <p className="text-xs text-muted-foreground">Criado em</p>
                  <p className="text-metric text-sm">
                    {formatDate(lead.created_at, "long")}
                  </p>
                </div>
              </div>

              {owner ? (
                <div className="flex items-center gap-3 border-t pt-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">
                      {initials(owner.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Responsável</p>
                    <p className="truncate text-sm">{owner.full_name}</p>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nova atividade</CardTitle>
              <CardDescription>
                Registre uma ligação, e-mail, reunião ou nota.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityForm leadId={lead.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

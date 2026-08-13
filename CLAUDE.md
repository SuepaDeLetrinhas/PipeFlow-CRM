# PipeFlow CRM — Briefing do Projeto

SaaS multi-empresa de gestão de clientes e vendas: cadastro de leads, pipeline Kanban de negócios, timeline de atividades, dashboard de métricas e assinaturas via Stripe. Público-alvo: pequenas empresas, times de vendas e freelancers que hoje usam planilhas.

Fonte de verdade do produto: [docs/PRD.md](docs/PRD.md). Em caso de divergência, o PRD manda.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 14 (App Router) + React 18 |
| Linguagem | TypeScript 5 |
| Estilo | Tailwind CSS + shadcn/ui |
| Banco + Auth | Supabase (PostgreSQL + RLS + Auth) |
| Pagamentos | Stripe (Checkout, Webhooks, Customer Portal) |
| E-mail | Resend (convites de colaboradores) |
| Drag-and-drop | @dnd-kit |
| Gráficos | Recharts |
| Validação | Zod |
| Deploy | Vercel + Supabase |

## Estrutura de pastas

```
app/
  (marketing)/            # landing page pública
  (auth)/                 # login, signup, callback
  (app)/                  # área autenticada
    dashboard/
    leads/[id]/
    pipeline/
    settings/             # workspace, membros, billing
  api/
    stripe/webhook/
    invites/
components/
  ui/                     # shadcn/ui (gerado pela CLI — não editar à mão)
  leads/  pipeline/  dashboard/  layout/
lib/
  supabase/               # clients: server, browser, middleware
  stripe/
  validations/            # schemas Zod
  utils.ts
types/
  database.ts             # tipos gerados do Supabase
supabase/
  migrations/
docs/
  PRD.md
```

## Convenções

- **Server Components por padrão.** `"use client"` só onde houver estado, efeitos ou handlers de evento.
- **Mutations via Server Actions.** API Routes ficam reservadas para webhooks e integrações externas.
- **Toda Server Action valida a entrada com Zod** antes de tocar o banco.
- **Nunca usar a service-role key fora de webhooks/rotinas admin.** As queries do app rodam com a chave anon, sob RLS.
- **Toda tabela de domínio carrega `workspace_id`.** O isolamento é garantido por policy RLS no Postgres, nunca por filtro no cliente.
- **Tipos do banco são gerados** (`supabase gen types typescript`), nunca escritos à mão.
- **Limites de plano são checados no servidor**, antes da escrita (Free: 2 colaboradores, 50 leads).
- Componentes em PascalCase; utilitários e hooks em camelCase; arquivos de rota seguem a convenção do Next.
- Valores monetários sempre formatados em pt-BR / BRL; datas em pt-BR.

## Modelo de dados (esboço)

- `workspaces` — id, nome, owner_id, plano
- `workspace_members` — workspace_id, user_id, role (`admin` | `member`)
- `invites` — workspace_id, email, role, token, status
- `leads` — workspace_id, nome, email, telefone, empresa, cargo, status, owner_id
- `deals` — workspace_id, título, valor, stage, due_date, lead_id, owner_id
- `activities` — workspace_id, lead_id, tipo (`call` | `email` | `meeting` | `note`), autor, descrição, data
- `subscriptions` — workspace_id, stripe_customer_id, stripe_subscription_id, status, plano

### Etapas do pipeline (enum fixo)

`Novo Lead` → `Contato Realizado` → `Proposta Enviada` → `Negociação` → `Fechado Ganho` / `Fechado Perdido`

## Identidade visual

Referências: HubSpot CRM, Pipedrive, DataCrazy. Interface limpa, densidade de dados alta, cantos suaves, sem ornamento.

- **Primária**: azul índigo — ações, links, estágio ativo
- **Neutros**: escala slate para superfícies, bordas e texto
- **Semânticas**: verde (Fechado Ganho), vermelho (Fechado Perdido), âmbar (prazo próximo)
- **Tipografia**: Inter; números tabulares em métricas e valores
- **Dark mode** via CSS variables do shadcn, previsto desde o início
- Cards do Kanban compactos: título, valor, lead, responsável, prazo — nessa ordem de peso visual

## Milestones

Plano de execução detalhado em [docs/PLAN.md](docs/PLAN.md) — 16 milestones, cada um com branch, entregas e commit final.

A construção é **interface primeiro, backend depois**: M0–M7 entregam toda a UI sobre fixtures tipadas em `lib/mock/`; M8–M15 substituem os fixtures por Supabase e Stripe sem redesenhar telas. Para que isso funcione, todo acesso a dados passa por `lib/data/` — funções cuja assinatura não muda quando o corpo vira query real.

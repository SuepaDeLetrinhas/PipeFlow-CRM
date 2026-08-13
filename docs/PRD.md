# PROJECT ARCHITECTURE: PipeFlow CRM

## 1. Context & Problem

Pequenas e médias empresas, freelancers e times de vendas perdem oportunidades de negócio por falta de organização no processo comercial. Leads são gerenciados em planilhas, anotações soltas ou ferramentas genéricas que não oferecem visão clara do funil de vendas.

Não há registro centralizado de interações com clientes, e quando a equipe cresce, os dados ficam espalhados sem controle de acesso por empresa/time.

Soluções como HubSpot e Pipedrive existem, mas são caras ou complexas demais para quem está começando.

## 2. Proposed Solution

Construir o **PipeFlow CRM** — uma plataforma SaaS de gestão de clientes e vendas, multi-empresa, com pipeline visual Kanban, gestão completa de leads e negócios, registro de interações e integração de pagamento para monetização.

- CRM completo com cadastro de leads/contatos (nome, e-mail, telefone, empresa, cargo)
- Pipeline Kanban de vendas com drag-and-drop entre etapas
- Página de detalhe do lead com histórico completo de atividades
- Sistema multi-empresa com convite de colaboradores por e-mail
- Dashboard com métricas de vendas e gráfico de funil
- Monetização via planos de assinatura
- Landing page de apresentação do produto

## 3. Functional Requirements

Requisitos transversais:

- Login e Autenticação
- Kanban
- Dashboards
- Multi usuário
- Multi empresa
- Permissões por usuário
- Parte premium (paga)
- Integrações (API)
- Busca e Filtros
- Landing Page
- Onboarding do Usuário

### 3.1 Gestão de Leads e Contatos

- Cadastro completo: nome, e-mail, telefone, empresa, cargo, status
- Listagem com busca e filtros (por status, responsável, data)
- Página de detalhe com perfil completo e timeline de atividades

### 3.2 Pipeline Kanban de Vendas

Colunas por etapa:

1. Novo Lead
2. Contato Realizado
3. Proposta Enviada
4. Negociação
5. Fechado Ganho
6. Fechado Perdido

Cards de negócios com:

- Título
- Valor estimado (R$)
- Lead vinculado
- Responsável
- Prazo

Drag-and-drop entre etapas com persistência no banco.

### 3.3 Registro de Atividades

Tipos:

- Ligação
- E-mail
- Reunião
- Nota

Campos:

- Autor
- Descrição
- Data

Timeline cronológica vinculada ao lead.

### 3.4 Dashboard de Métricas

Cards:

- Total de leads
- Negócios abertos
- Valor total do pipeline
- Taxa de conversão

Além dos cards:

- Gráfico de funil de vendas (Recharts)
- Negócios do usuário logado com prazo próximo

### 3.5 Multi-empresa e Colaboração

- Criar workspaces (cada empresa/time = 1 workspace)
- Convite de colaboradores por e-mail (com Resend)
- Papéis:
  - **Admin** — acesso total
  - **Membro** — leads e negócios
- Alternar entre workspaces via dropdown na sidebar
- Isolamento de dados via Row Level Security (RLS) no Supabase

### 3.6 Monetização (Stripe)

- **Plano Free**: até 2 colaboradores e 50 leads
- **Plano Pro**: colaboradores e leads ilimitados (R$ 49/mês)
- Checkout integrado via Stripe Checkout
- Webhook para ativar/desativar plano automaticamente
- Customer Portal do Stripe para gerenciamento de assinatura

### 3.7 Landing Page

Página pública de apresentação do PipeFlow CRM, com as seções:

- Hero
- Funcionalidades
- Planos e preços
- CTA

## 4. User Personas

### Dono do Negócio / Empreendedor (Admin)

Pequeno empresário que precisa organizar seu processo de vendas. Cria o workspace, convida o time, gerencia planos e possui acesso completo às funcionalidades.

### Vendedor / Colaborador (Membro)

Profissional de vendas que utiliza o CRM no dia a dia. Cadastra leads, move negócios no pipeline e registra atividades. Pode participar de múltiplos workspaces.

### Freelancer / Consultor (Admin Solo)

Profissional independente que atende vários clientes. Utiliza workspaces separados para cada cliente/projeto. Começa no plano Free e faz upgrade conforme cresce.

## 5. Technical Stack

- Next.js
- React
- Tailwind CSS
- shadcn/ui
- Supabase
- Stripe
- Vercel
- Claude Code
- Node.js
- PostgreSQL
- TypeScript
- Resend (e-mails)

Detalhamento por camada:

- **Frontend**: Next.js 14 (App Router) + React 18 + Tailwind CSS + shadcn/ui
- **Backend/API**: Next.js API Routes (Server Components)
- **Banco de Dados + Auth**: Supabase (PostgreSQL + RLS + Auth)
- **Pagamento**: Stripe (checkout + webhooks)
- **E-mail transacional**: Resend
- **Drag-and-drop**: @dnd-kit
- **Gráficos**: Recharts
- **Versionamento**: Git + GitHub
- **Deploy**: Vercel + Supabase
- **IDE**: Cursor com Claude Code no terminal
- **Linguagem**: TypeScript 5

## 6. Design Language

Referências: HubSpot CRM, Pipedrive e DataCrazy.

## 7. Process

- Break app build into logical milestones (steps)
- Each milestone should be a deliverable increment
- Prioritize core functionality first, then iterate
- Test each milestone before moving to the next

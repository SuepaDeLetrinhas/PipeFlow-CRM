# PipeFlow CRM — Plano de Execução

Plano de milestones do setup ao deploy. Referências: [PRD.md](PRD.md) (o que construir) e [../CLAUDE.md](../CLAUDE.md) (como construir).

## Estratégia: interface primeiro, backend depois

Os milestones **M0–M7 constroem toda a interface** com dados falsos (fixtures tipadas). Os milestones **M8–M14 trocam os fixtures por Supabase/Stripe**, tela por tela, sem redesenhar nada.

Para que a troca seja barata, três regras valem desde o M0:

1. Os fixtures vivem em `lib/mock/` e seguem **exatamente** o shape das tabelas do modelo de dados do CLAUDE.md (snake_case, `workspace_id` presente, ids como uuid). Quando `types/database.ts` for gerado no M8, os fixtures passam a ser tipados por ele.
2. Todo acesso a dados passa por funções em `lib/data/` (`getLeads()`, `getDeals()`, …). Na fase de UI elas retornam fixtures; na fase de backend o corpo vira query Supabase e **a assinatura não muda**.
3. Toda mutation já é escrita como Server Action com validação Zod desde a fase de UI — na fase de UI ela apenas valida e devolve sucesso; depois passa a escrever no banco.

Convenção de branch: `feat/mN-slug`, sempre a partir de `main`, PR ao final do milestone. Cada milestone deve rodar (`npm run dev`) e ser verificado no navegador antes do commit final.

---

## Fase 1 — Interface

### M0 · Setup e design system

**Branch:** `feat/m0-setup`

**Objetivo:** projeto rodando com o design system aplicado, sem nenhuma tela de produto ainda.

- [x] `create-next-app` com TypeScript, Tailwind, App Router, ESLint, alias `@/*`
- [x] `shadcn init` — tema slate, CSS variables habilitadas
- [x] Paleta do CLAUDE.md nas CSS variables (índigo primária; verde/vermelho/âmbar semânticas) em `app/globals.css`
- [x] Fonte Inter via `next/font`; `font-variant-numeric: tabular-nums` na classe utilitária de métricas
- [x] Dark mode com `next-themes` + toggle funcional
- [x] `lib/utils.ts` com `cn()`, `formatCurrency()` (BRL) e `formatDate()` (pt-BR)
- [x] Estrutura de pastas vazia conforme CLAUDE.md
- [x] `.env.example` com todas as chaves previstas (Supabase, Stripe, Resend)
- [x] `.gitignore` cobrindo `.env*.local`; README com instruções de dev
- [x] Git inicializado e repositório criado no GitHub

**Commit final:** `chore: setup Next.js 14 com Tailwind, shadcn/ui e design system`

---

### M1 · Landing page

**Branch:** `feat/m1-landing`

**Objetivo:** página pública completa e responsiva em `/`, pronta para receber tráfego.

- [x] Layout do route group `(marketing)` com header e footer
- [x] Seção Hero: headline, subheadline, CTA primário para `/signup`, mockup visual do pipeline
- [x] Seção Funcionalidades: cards de Leads, Pipeline Kanban, Atividades, Dashboard, Multi-empresa
- [x] Seção Planos: Free (2 colaboradores, 50 leads) e Pro (R$ 49/mês, ilimitado), com destaque no Pro
- [x] Seção CTA final
- [x] Responsivo mobile (menu hambúrguer) e dark mode revisado
- [x] Metadata, Open Graph e favicon (`app/icon.svg`) — imagem OG pendente: `next/og` não roda no Windows

**Commit final:** `feat: landing page com hero, funcionalidades, planos e CTA`

---

### M2 · Telas de autenticação

**Branch:** `feat/m2-auth-ui`

**Objetivo:** telas de login/cadastro completas, ainda sem autenticar de verdade.

- [ ] Layout do route group `(auth)` — centralizado, com logo
- [ ] `/login`: e-mail e senha, link para recuperação, link para cadastro
- [ ] `/signup`: nome, e-mail, senha
- [ ] `/forgot-password` e `/reset-password`
- [ ] Schemas Zod em `lib/validations/auth.ts` + validação no cliente com react-hook-form
- [ ] Estados de loading, erro por campo e erro geral do formulário
- [ ] Submit chama Server Action stub que valida e redireciona para `/dashboard`

**Commit final:** `feat: telas de login, cadastro e recuperação de senha`

---

### M3 · Shell da aplicação

**Branch:** `feat/m3-app-shell`

**Objetivo:** casca navegável da área logada — todas as rotas existem e a navegação funciona.

- [x] Layout do route group `(app)`: sidebar + área de conteúdo
- [x] Barra superior com título da seção, busca (inerte até o M4), tema e menu do usuário
- [x] Sidebar com navegação (Dashboard, Leads, Pipeline, Configurações) e item ativo destacado
- [x] Dropdown de troca de workspace no topo da sidebar (lista mockada)
- [x] Menu do usuário: nome, avatar, tema, sair
- [x] Sidebar colapsável em desktop (estado em cookie) e drawer em mobile
- [x] Dark mode como tema padrão
- [x] Fixtures em `lib/mock/`: workspaces, membros, leads, deals, activities, subscription
- [x] `lib/data/` com as funções de leitura retornando fixtures
- [x] Componentes compartilhados: `PageHeader`, `EmptyState`, `LoadingSkeleton`
- [x] Rotas `/dashboard`, `/leads`, `/pipeline`, `/settings` renderizando placeholder

**Commit final:** `feat: shell da aplicação com sidebar, workspace switcher e fixtures`

---

### M4 · Interface de leads

**Branch:** `feat/m4-leads-ui`

**Objetivo:** listagem, filtros e página de detalhe do lead, lendo de `lib/data/`.

- [ ] `/leads`: tabela com nome, empresa, cargo, status, responsável e data
- [ ] Busca por texto e filtros por status, responsável e período (estado na URL via searchParams)
- [ ] Badges de status coloridos; paginação ou scroll infinito
- [ ] Dialog de novo lead com formulário completo e Zod (`lib/validations/lead.ts`)
- [ ] `/leads/[id]`: header com dados do contato, ações de editar/excluir
- [ ] Timeline de atividades no detalhe, agrupada por data, com ícone por tipo
- [ ] Formulário de nova atividade (ligação, e-mail, reunião, nota)
- [ ] Negócios vinculados ao lead listados no detalhe
- [ ] Empty states de lista vazia e de busca sem resultado

**Commit final:** `feat: listagem, filtros e página de detalhe de leads`

---

### M5 · Pipeline Kanban

**Branch:** `feat/m5-pipeline-ui`

**Objetivo:** board com drag-and-drop fluido, persistindo apenas em estado local.

- [ ] `/pipeline` com as 6 colunas fixas do PRD
- [ ] `DealCard`: título, valor em BRL, lead, responsável, prazo — com destaque âmbar em prazo próximo
- [ ] Colunas com contador de negócios e soma de valores no cabeçalho
- [ ] @dnd-kit: arrastar entre colunas e reordenar dentro da coluna
- [ ] Overlay de arraste e indicador de posição de destino
- [ ] Colunas Ganho/Perdido com tratamento visual distinto (verde/vermelho)
- [ ] Dialog de novo negócio e de edição, com Zod (`lib/validations/deal.ts`)
- [ ] Scroll horizontal em telas menores; board utilizável em tablet
- [ ] Server Action stub de mover negócio, com update otimista

**Commit final:** `feat: pipeline Kanban com drag-and-drop via @dnd-kit`

---

### M6 · Dashboard

**Branch:** `feat/m6-dashboard-ui`

**Objetivo:** painel de métricas completo, calculado sobre os fixtures.

- [ ] 4 cards de métrica: total de leads, negócios abertos, valor do pipeline, taxa de conversão
- [ ] Números tabulares e valores em BRL
- [ ] Gráfico de funil de vendas com Recharts, respeitando a paleta e o dark mode
- [ ] Lista "meus negócios com prazo próximo", ordenada por data
- [ ] Skeletons de carregamento por card e por gráfico
- [ ] Empty state para workspace sem dados
- [ ] Layout responsivo dos cards e do gráfico

**Commit final:** `feat: dashboard com métricas e gráfico de funil`

---

### M7 · Configurações e billing (UI)

**Branch:** `feat/m7-settings-ui`

**Objetivo:** telas de workspace, membros e assinatura — sem integração real.

- [ ] `/settings` com navegação por abas
- [ ] Aba Workspace: nome, criação de novo workspace
- [ ] Aba Membros: lista com papel, dialog de convite por e-mail, remover membro
- [ ] Controles restritos a admin desabilitados/ocultos para membro
- [ ] Aba Billing: plano atual, uso (leads e colaboradores) contra o limite do Free
- [ ] Comparativo Free × Pro com botão de upgrade (ainda inerte)
- [ ] Banner de limite atingido, reutilizável nas telas de leads e membros
- [ ] Fluxo de onboarding: criar primeiro workspace após cadastro

**Commit final:** `feat: telas de configurações, membros e billing`

---

## Fase 2 — Backend

### M8 · Schema, RLS e clientes Supabase

**Branch:** `feat/m8-supabase-schema`

**Objetivo:** banco modelado, isolado por workspace e tipado — sem tela conectada ainda.

- [ ] Projeto Supabase criado; Supabase CLI inicializada em `supabase/`
- [ ] Migration com as 7 tabelas do CLAUDE.md, enums (`role`, `lead_status`, `deal_stage`, `activity_type`, `plan`) e índices por `workspace_id`
- [ ] Trigger de criação de perfil no signup
- [ ] Função `is_workspace_member(workspace_id)` para uso nas policies
- [ ] RLS habilitado em todas as tabelas + policies de select/insert/update/delete por workspace
- [ ] Policies de admin (gerenciar membros, convites e billing)
- [ ] Seed de desenvolvimento espelhando os fixtures
- [ ] Clientes em `lib/supabase/`: `server.ts`, `client.ts`, `middleware.ts`
- [ ] `types/database.ts` gerado; fixtures do M3 retipados por ele
- [ ] Teste manual de isolamento: usuário do workspace A não enxerga dados do B

**Commit final:** `feat: schema Postgres, policies RLS e clientes Supabase`

---

### M9 · Autenticação real

**Branch:** `feat/m9-auth`

**Objetivo:** telas do M2 autenticando de verdade, com rotas protegidas.

- [ ] Supabase Auth com e-mail/senha ligado às Server Actions do M2
- [ ] Rota de callback e confirmação de e-mail
- [ ] `middleware.ts` protegendo `(app)` e redirecionando logado para fora de `(auth)`
- [ ] Refresh de sessão no middleware
- [ ] Recuperação e redefinição de senha funcionando
- [ ] Logout
- [ ] Usuário real substitui o mock no menu da sidebar

**Commit final:** `feat: autenticação com Supabase Auth e proteção de rotas`

---

### M10 · Workspaces e convites

**Branch:** `feat/m10-workspaces`

**Objetivo:** multi-empresa funcionando ponta a ponta, com convite por e-mail.

- [ ] Criar workspace (torna o criador admin) no fluxo de onboarding
- [ ] Workspace ativo persistido em cookie; switcher trocando o contexto de verdade
- [ ] Todas as funções de `lib/data/` passam a filtrar pelo workspace ativo
- [ ] Convite: gera token, grava em `invites`, envia e-mail com Resend
- [ ] Template do e-mail de convite com a identidade visual
- [ ] Rota `/invite/[token]`: aceitar convite, com e sem conta prévia
- [ ] Gestão de membros: alterar papel, remover — restrito a admin no servidor
- [ ] Autorização por papel checada na Server Action, não só na UI

**Commit final:** `feat: workspaces, troca de contexto e convites por e-mail`

---

### M11 · Leads e atividades reais

**Branch:** `feat/m11-leads-backend`

**Objetivo:** telas do M4 escrevendo e lendo do Postgres.

- [ ] Server Actions de criar, editar e excluir lead, com Zod e `revalidatePath`
- [ ] Listagem com busca, filtros e paginação executados no banco
- [ ] Índice de busca textual em nome, e-mail e empresa
- [ ] Detalhe do lead carregando de query real
- [ ] Server Action de criar atividade; timeline lendo do banco
- [ ] Limite de 50 leads do plano Free verificado no servidor antes do insert
- [ ] Tratamento de erro com toast e mensagens por campo

**Commit final:** `feat: CRUD de leads e atividades persistido no Supabase`

---

### M12 · Pipeline persistido

**Branch:** `feat/m12-pipeline-backend`

**Objetivo:** drag-and-drop do M5 gravando no banco.

- [ ] Server Actions de criar, editar e excluir negócio
- [ ] Mover negócio grava `stage` e `position`; reordenação dentro da coluna persiste
- [ ] Update otimista com rollback em caso de erro
- [ ] Negócios carregados por workspace com o lead e o responsável em join
- [ ] Vincular negócio a lead existente no formulário
- [ ] Negócios do lead na página de detalhe vindo do banco

**Commit final:** `feat: persistência do pipeline e reordenação de negócios`

---

### M13 · Dashboard com dados reais

**Branch:** `feat/m13-dashboard-backend`

**Objetivo:** métricas calculadas no banco, não no cliente.

- [ ] Queries agregadas (views ou funções Postgres) para as 4 métricas
- [ ] Dados do funil agregados por etapa
- [ ] Negócios com prazo próximo filtrados por usuário logado e janela de dias
- [ ] Métricas escopadas ao workspace ativo e respeitando RLS
- [ ] Streaming com Suspense por card, mantendo os skeletons do M6

**Commit final:** `feat: métricas do dashboard calculadas no Postgres`

---

### M14 · Stripe

**Branch:** `feat/m14-stripe`

**Objetivo:** monetização ativa — upgrade, downgrade e limites aplicados.

- [ ] Produtos e preços criados no Stripe (Pro, R$ 49/mês)
- [ ] Server Action de checkout criando a Checkout Session com `workspace_id` no metadata
- [ ] `app/api/stripe/webhook/route.ts` com verificação de assinatura e handler idempotente
- [ ] Eventos tratados: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [ ] Tabela `subscriptions` atualizada pelo webhook usando service-role key (único lugar permitido)
- [ ] Customer Portal para gerenciar/cancelar assinatura
- [ ] Limites do Free aplicados no servidor; Pro sem limite
- [ ] Testado com Stripe CLI (`stripe listen`) e cartões de teste

**Commit final:** `feat: assinaturas via Stripe Checkout, webhook e Customer Portal`

---

### M15 · Polimento e deploy

**Branch:** `feat/m15-deploy`

**Objetivo:** aplicação em produção, estável e acessível.

- [ ] Revisão de todos os empty states, loadings e mensagens de erro
- [ ] `error.tsx`, `not-found.tsx` e `loading.tsx` nas rotas principais
- [ ] Acessibilidade: foco visível, navegação por teclado no Kanban, labels e contraste
- [ ] Revisão responsiva completa em mobile
- [ ] Auditoria de segurança: RLS em todas as tabelas, nenhuma service-role key exposta ao cliente
- [ ] Variáveis de ambiente configuradas na Vercel (preview e production)
- [ ] Migrations aplicadas no Supabase de produção; webhook do Stripe apontando para a URL final
- [ ] Deploy, smoke test do fluxo completo (cadastro → workspace → lead → negócio → upgrade)
- [ ] README final com setup, variáveis e comandos

**Commit final:** `chore: polimento final e deploy em produção`

---

## Ordem de dependências

```
M0 → M1 → M2 → M3 → M4 ─┐
                M3 → M5 ─┼→ M8 → M9 → M10 → M11 → M12 → M13 → M14 → M15
                M3 → M6 ─┤
                M3 → M7 ─┘
```

M4, M5, M6 e M7 dependem só do M3 e podem ser feitos em paralelo. Toda a Fase 2 é sequencial: M8 é pré-requisito de tudo, e M10 (workspace ativo) precisa existir antes de M11–M13, que dependem do escopo por workspace.

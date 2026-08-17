# PipeFlow CRM — Plano de Execução

Plano de milestones do setup ao deploy. Referências: [PRD.md](PRD.md) (o que construir) e [../CLAUDE.md](../CLAUDE.md) (como construir).

## Estratégia: interface primeiro, backend depois

Os milestones **M0–M7 constroem toda a interface** com dados falsos (fixtures tipadas). Os milestones **M8–M14 trocam os fixtures por Supabase/Stripe**, tela por tela, sem redesenhar nada.

Para que a troca seja barata, três regras valem desde o M0:

1. Os fixtures vivem em `lib/mock/` e seguem **exatamente** o shape das tabelas do modelo de dados do CLAUDE.md (snake_case, `workspace_id` presente, ids como uuid). `types/database.ts` foi gerado no M8, mas os fixtures **continuam tipados por `types/index.ts`** (à mão): retipá-los só tem valor junto com as queries reais, no M11, quando qualquer divergência entre os dois shapes vira erro de compilação em vez de detalhe invisível.
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

**Alinhamento ao brand v2** — branch `fix/m1-landing-brand-v2`, commits
`a16246b` e `d52286b`. O redesign visual reescreveu o `globals.css` mas passou
por `components/marketing/` sem revisitar; como os componentes usam tokens e
não hex, a paleta fluiu sozinha e escondeu o que não fluiu:

- [x] Glow radial removido do hero e do CTA — "Neon glow" está em *O que NÃO
      usar*. No lugar, grid modular com máscara, sobre o grão global do `body`
- [x] `PipelinePreview` lendo `STAGE_COLORS` e `DEAL_STAGE_LABELS`: a vitrine
      mostra as seis cores do produto, não um accent binário
- [x] Labels do preview em `text-label` (mono, caixa alta), como no board
- [x] Token `--primary-ink`: o chartreuse puro como TEXTO dá 1.13:1 no tema
      claro. Afetava a headline do hero, os ícones das funcionalidades e os
      checks do plano Pro — todos ilegíveis em light
- [x] `.accent-line`: linha accent no topo do card no hover (0 → 100%, 0.4s)
- [x] Seção de números de resultado, em grid com bordas verticais
- [x] Sexta funcionalidade (busca e filtros) e entrada escalonada nos cards
- [x] Alvo de toque dos links do rodapé: eram 20px de altura (texto puro),
      pequeno demais no dedo — subiram para ~36px sem inchar o rodapé

**Revisão da página** — 8 seções renderizando, os 13 links com destino válido
(`/login` e `/signup` em 200, âncoras `#funcionalidades` e `#planos` existindo),
menu mobile abrindo de verdade com os 4 links, e sem scroll horizontal em 390px
(`scrollWidth == clientWidth == 375`).

⚠️ **Os números de resultado são fictícios.** `+47%`, `3,2x`, `-62%` e `1.200+`
são placeholder de layout. Antes de a página receber tráfego real eles precisam
virar dado verdadeiro ou sair — é alegação a cliente.

---

### M2 · Telas de autenticação

**Branch:** `feat/m2-auth-ui`

**Objetivo:** telas de login/cadastro completas, ainda sem autenticar de verdade.

- [x] Layout do route group `(auth)` — centralizado, com logo
- [x] `/login`: e-mail e senha, link para recuperação, link para cadastro
- [x] `/signup`: nome, e-mail, senha
- [x] `/forgot-password` e `/reset-password`
- [x] Schemas Zod em `lib/validations/auth.ts` + validação no cliente com react-hook-form
- [x] Estados de loading, erro por campo e erro geral do formulário
- [x] Submit chama Server Action stub que valida e redireciona para `/dashboard`

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

- [x] `/leads`: tabela com nome, empresa, cargo, status, responsável e data
- [x] Busca por texto e filtros por status, responsável e período (estado na URL via searchParams)
- [x] Badges de status coloridos; paginação ou scroll infinito
- [x] Dialog de novo lead com formulário completo e Zod (`lib/validations/lead.ts`)
- [x] `/leads/[id]`: header com dados do contato, ações de editar/excluir
- [x] Timeline de atividades no detalhe, agrupada por data, com ícone por tipo
- [x] Formulário de nova atividade (ligação, e-mail, reunião, nota)
- [x] Negócios vinculados ao lead listados no detalhe
- [x] Empty states de lista vazia e de busca sem resultado
- [x] Server Actions de lead e atividade validando com Zod (gravação real no M9)
- [x] Skeleton da tabela em `<Suspense>` local — um `loading.tsx` no segmento
      faria `/leads/[id]` responder 200 antes do `notFound()`

**Commit final:** `feat: listagem, filtros e página de detalhe de leads`

**Adicionado depois do M4** (`feat: ordenacao por coluna, acoes na linha e busca por telefone`):

- [x] Ordenação por nome, empresa, status e data, com estado na URL (`?ordem=&dir=`)
- [x] Menu de ações por linha na tabela (editar e excluir sem abrir o detalhe)
- [x] Busca também por telefone, comparando apenas dígitos

---

### M5 · Pipeline Kanban

**Branch:** `feat/m5-pipeline-ui`

**Objetivo:** board com drag-and-drop fluido, persistindo apenas em estado local.

- [x] `/pipeline` com as 6 colunas fixas do PRD
- [x] `DealCard`: título, valor em BRL, lead, responsável, prazo — com destaque âmbar em prazo próximo
- [x] Colunas com contador de negócios e soma de valores no cabeçalho
- [x] @dnd-kit: arrastar entre colunas e reordenar dentro da coluna
- [x] Overlay de arraste e indicador de posição de destino
- [x] Colunas Ganho/Perdido com tratamento visual distinto (verde/vermelho)
- [x] Dialog de novo negócio e de edição, com Zod (`lib/validations/deal.ts`)
- [x] Scroll horizontal em telas menores; board utilizável em tablet
- [x] Server Action stub de mover negócio, com update otimista

**Além do previsto no M5:**

- [x] Navegação por teclado no board (`KeyboardSensor` + anúncios em pt-BR) — o
      M15 pedia isso, mas sai de graça junto com o @dnd-kit
- [x] Menu "Mover para" no card, alternativa ao arraste no toque
- [x] Token `-on-muted` para as semânticas: `-foreground` sobre `bg-*-muted`
      dava texto invisível em light mode nos badges já em produção
- [x] `prefers-reduced-motion` zerando as animações de entrada

**Commit final:** `feat: pipeline Kanban com drag-and-drop via @dnd-kit`

---

### M6 · Dashboard

**Branch:** `feat/m6-dashboard-ui`

**Objetivo:** painel de métricas completo, calculado sobre os fixtures.

- [x] 4 cards de métrica: total de leads, negócios abertos, valor do pipeline, taxa de conversão
- [x] Números tabulares e valores em BRL
- [x] Gráfico de funil de vendas com Recharts, respeitando a paleta e o dark mode
- [x] Lista "meus negócios com prazo próximo", ordenada por data
- [x] Skeletons de carregamento por card e por gráfico
- [x] Empty state para workspace sem dados
- [x] Layout responsivo dos cards e do gráfico

**Decisões do M6:**

- [x] Funil cobre só as 4 etapas em aberto — Ganho e Perdido são desfecho, não
      degrau; incluí-los faria o mesmo negócio ser contado duas vezes
- [x] Conversão = ganhos ÷ fechados (não ÷ total): negócio em aberto não é
      fracasso. O card mostra o denominador para a leitura não ficar ambígua
- [x] Funil e tabela empilhados, não lado a lado — dividindo a largura, a
      coluna de prazo caía no scroll horizontal mesmo em 1440px
- [x] Rótulo de valor em toda barra: no tema claro o chartreuse não alcança
      3:1 contra o fundo, então o número é o que garante a leitura
- [x] Fixtures ajustadas para o funil afunilar de fato (6 → 4 → 3 → 2)
- [x] Ícone do card "Valor do pipeline" em `--primary-ink`: o chartreuse puro
      sumia no tema claro. O token nasceu no M1 e passou a valer aqui no rebase

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

**Branch:** `feat/supabase-core` (o plano previa `feat/m8-supabase-schema`)

**Objetivo:** banco modelado, isolado por workspace e tipado — sem tela conectada ainda.

- [x] Projeto Supabase criado; Supabase CLI inicializada em `supabase/`
- [x] Migration com as tabelas do CLAUDE.md, enums e índices por `workspace_id`
- [x] Trigger de criação de perfil no signup
- [x] Função `is_workspace_member(workspace_id)` para uso nas policies
- [x] RLS habilitado em todas as tabelas + policies de select/insert/update/delete por workspace
- [x] Policies de admin (gerenciar membros, convites e billing)
- [x] Seed de desenvolvimento espelhando os fixtures
- [x] Clientes em `lib/supabase/`: `server.ts`, `client.ts`, `middleware.ts` (vieram no PR #6)
- [x] `types/database.ts` gerado
- [ ] **Fixtures do M3 retipados pelos tipos gerados** — `lib/mock/` ainda importa
      de `types/index.ts` (tipos à mão). Fica para o M11, quando as telas
      passarem a ler do banco e a diferença entre os dois shapes aparecer
- [ ] **Teste de isolamento: usuário do workspace A não enxerga dados do B** —
      ver "o que falta", abaixo

**Commit final:** `feat: schema Postgres, policies RLS e clientes Supabase`

**Duas tabelas além das 7 do CLAUDE.md:**

- `profiles` — o tipo `User` precisa de `full_name`/`avatar_url` e `auth.users`
  não é legível sob RLS pelo cliente. Sem esse espelho, nenhum join de
  responsável ou autor teria nome para exibir
- `invites` — está no modelo de dados do CLAUDE.md e é pré-requisito do M10

**Decisões de segurança:**

- As funções de apoio são `security definer` por necessidade estrutural: uma
  policy sobre `workspace_members` que consulte `workspace_members` dispara a
  própria policy e aborta por recursão infinita
- `subscriptions` não tem policy de insert/update para `authenticated`. Quem
  escreve billing é o webhook com service-role. Com uma policy de update, um
  membro viraria Pro com um PATCH no PostgREST, sem pagar
- Sem `force row level security`: `force` valeria também para `postgres`, a
  identidade por trás da service-role, e quebraria o webhook do Stripe
- Dois triggers impedem negócio e atividade de referenciar lead de outro
  workspace — o `with check` valida o `workspace_id` da linha, não o do lead
  apontado, e essa brecha seria um vazamento por join
- O dono do workspace não pode ser removido nem rebaixado, senão a policy que
  deixa um membro sair sozinho poderia deixar o workspace sem admin nenhum

**Aplicação:** o schema foi aplicado pelo SQL Editor do Studio, não pela CLI
(sem Docker na máquina de desenvolvimento). `supabase/studio/` tem o script
consolidado (`apply_all.sql`, reexecutável) e as verificações. O seed é gerado
a partir de `lib/mock/` por `npm run db:seed`.

**Verificado contra o banco remoto** (`supabase db query --linked`): 8 tabelas
com RLS ativo, 27 policies, 7 enums, 3 funções `security definer`, 5 triggers
de integridade, `WITH CHECK` em toda escrita e `subscriptions` somente leitura.

- [x] **Teste de isolamento** — fechado no M9/M10 com duas contas reais criadas
      pelo signup (o seed nunca foi carregado, porque o banco está marcado
      `PRODUCTION`). Verificado: Diego não vê os workspaces da Marina nem o
      inverso; acesso direto por id devolve vazio; escrita cruzada em `leads`
      é recusada com `42501`; `update` de `subscriptions` para `pro` afeta 0
      linhas — o auto-upgrade sem pagar está barrado

**Índices de FK** (`20260817130000`, achado auditando o schema contra a skill
`supabase-postgres-best-practices`): `leads.owner_id`, `deals.owner_id`,
`activities.author_id` e `invites.invited_by` não tinham índice próprio. Os
compostos não serviam — `(workspace_id, owner_id)` só é usado quando o filtro
inclui a primeira coluna, e a verificação de FK consulta `owner_id` sozinho.
Como as duas primeiras são `on delete restrict`, apagar um perfil varria as
tabelas inteiras segurando lock.

⚠️ **O que falta para o M8 estar realmente fechado:**

1. **Histórico de migrations vazio no remoto.** Aplicar pelo SQL Editor não
   registra nada na tabela de controle, então `supabase migration list` mostra
   as migrations com `remote: ""`. Um `db:push` futuro tentaria reaplicar tudo e
   falharia em `relation already exists`. Corrige-se com
   `supabase migration repair --status applied 20260817120000 20260817120100 20260817120200 20260817130000`.

---

### M9 · Autenticação real

**Branch:** `feat/m9-auth`

**Objetivo:** telas do M2 autenticando de verdade, com rotas protegidas.

- [x] Supabase Auth com e-mail/senha ligado às Server Actions do M2
- [x] Rota de callback e confirmação de e-mail
- [x] `middleware.ts` protegendo `(app)` e redirecionando logado para fora de `(auth)`
- [x] Refresh de sessão no middleware
- [x] Recuperação e redefinição de senha funcionando
- [x] Logout
- [x] Usuário real substitui o mock no menu da sidebar

**Commit final:** `feat: autenticação com Supabase Auth e proteção de rotas`

**Decisões de segurança:**

- Mensagem **única** no login para credencial errada, e-mail inexistente e conta
  não confirmada. Distinguir os casos permitiria enumerar quais e-mails têm
  conta — mesma razão da resposta sempre positiva no "esqueci a senha"
- Middleware usa `getUser()`, não `getSession()`: o primeiro valida o JWT contra
  o servidor do Auth, o segundo só lê o cookie, que o cliente pode forjar
- `/callback` e `/reset-password` ficam fora das duas listas de rota: quem clica
  no link de redefinição chega **com** sessão, e tratá-las como rota de auth
  mandaria a pessoa ao dashboard, tornando impossível redefinir a senha
- `safeNext()` barra open redirect no callback e no pós-login, inclusive
  `//host` e `/\host`, que o navegador lê como URL absoluta apesar da barra

⚠️ **Não exercitado de ponta a ponta:** o fluxo de **confirmação de e-mail** e o
de **redefinição de senha** dependem de e-mail real chegando. A confirmação está
desligada no painel, então o signup loga direto; o código trata os dois casos
(`data.session` ausente → mensagem "confira seu e-mail"), mas o caminho com link
real nunca foi percorrido. Vale testar antes do M15.

---

### M10 · Workspaces e convites

**Branch:** `feat/m10-workspaces`

**Objetivo:** multi-empresa funcionando ponta a ponta, com convite por e-mail.

- [x] Criar workspace (torna o criador admin) no fluxo de onboarding
- [x] Workspace ativo persistido em cookie; switcher trocando o contexto de verdade
- [~] Todas as funções de `lib/data/` passam a filtrar pelo workspace ativo —
      `getWorkspaces`, `getCurrentWorkspace`, `getCurrentMember` e `getMembers`
      já leem do banco; leads, deals e activities continuam em fixtures até
      M11/M12, mas já respeitam o workspace ativo e o caso "sem workspace"
- [ ] Convite: gera token, grava em `invites`, envia e-mail com Resend
- [ ] Template do e-mail de convite com a identidade visual
- [ ] Rota `/invite/[token]`: aceitar convite, com e sem conta prévia
- [ ] Gestão de membros: alterar papel, remover — restrito a admin no servidor
- [ ] Autorização por papel checada na Server Action, não só na UI

**Commit final:** `feat: workspaces, troca de contexto e convites por e-mail`

**O admin não é criado pela Server Action:** quem insere o vínculo é o trigger
`handle_new_workspace` do M8. Fazê-lo na action seria impossível — a policy de
insert em `workspace_members` exige ser admin, e no instante da criação ainda
não existe admin algum.

**`/onboarding` fica fora do route group `(app)`.** O layout de `(app)`
redireciona para lá quem não tem workspace; se a página vivesse dentro, o layout
rodaria antes dela e o redirect entraria em loop. Em compensação ela entra
explicitamente na lista de rotas protegidas do middleware.

**Bug encontrado ao testar:** o insert de workspace **não pode encadear
`.select()`**. O PostgREST gera `INSERT ... RETURNING`, e o `RETURNING` passa
pela policy de SELECT (`is_workspace_member`), que ainda é falsa nesse instante
— o vínculo só nasce no trigger, depois da linha existir. O insert gravava e a
leitura de volta falhava com `42501`: o usuário via "não foi possível criar" um
workspace que **tinha sido criado**. Só apareceu rodando; compilava sem erro.

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

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
   `supabase migration repair --status applied 20260817120000 20260817120100 20260817120200 20260817130000 20260817140000 20260817140100`.

   As duas do M11/M12/M13 (`20260817140000`, `20260817140100`) entram na mesma
   lista: foram aplicadas por `supabase db query --linked --file`, que executa o
   SQL mas também não registra nada no histórico. A dívida não cresceu em
   natureza, só em número de arquivos.

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
- [x] Convite: gera token, grava em `invites`, envia e-mail com Resend
- [x] Template do e-mail de convite com a identidade visual
- [x] Rota `/invite/[token]`: aceitar convite, com e sem conta prévia
- [x] Gestão de membros: alterar papel, remover — restrito a admin no servidor
- [x] Autorização por papel checada na Server Action, não só na UI
- [x] Limite de 2 pessoas do plano Free contando convites pendentes, checado
      no convite e de novo no aceite

**Commit final:** `feat: workspaces, troca de contexto e convites por e-mail`

**A metade da colaboração saiu em `feat/collaboration`.** O M10 foi entregue em
duas partes: `feat/m10-workspaces` fechou o contexto (criar workspace, cookie,
switcher) e `feat/collaboration` fechou convites e gestão de membros, sobre a
tabela `invites` que já existia desde o M8 — sem tabela nova.

**A tabela de convites não é `workspace_invites`.** O M8 já criou `invites`, com
`token` unique, `expires_at` de 7 dias, o índice parcial `invites_pending_unique`
e as quatro policies restritas a admin. Criar uma tabela nova duplicaria tudo
isso; a implementação usa a que existe.

**`/invite/[token]` é o segundo uso legítimo da service-role** (o primeiro será
o webhook do Stripe). A policy `invites_select_admin` restringe a leitura a
admins do workspace, e quem clica no link é exatamente quem ainda não é membro —
abrir o select para `anon` transformaria a tabela num meio de enumerar convites.
A chave secreta lê por token no servidor; o vínculo só é criado para o usuário
da sessão, e o e-mail da sessão precisa bater com o do convite, senão o link
encaminhado por engano viraria acesso.

**Convite inexistente e convite já usado devolvem a mesma tela.** Distinguir os
dois confirmaria a um estranho com token aleatório que ele acertou um token
real — mesma razão da mensagem única no login do M9.

**O limite do Free conta convites pendentes, não só membros.** Contando apenas
membros, um admin convidaria dez pessoas e o limite só apareceria no aceite —
tarde demais, com gente já convidada recebendo "não há vaga". A conta é
refeita no aceite porque é ele que de fato ocupa o assento.

**Falha de e-mail não desfaz o convite.** `sendInviteEmail()` devolve
`delivered: false` em vez de lançar, e a UI mostra o link para o admin repassar.
Sem isso, "o Resend não está configurado" viraria "não é possível convidar" — e
o fluxo ficaria intestável até o domínio de envio existir. `RESEND_API_KEY` é
opcional em `lib/env.ts` pela mesma razão.

**Verificado contra Resend e Supabase reais.** O envio saiu de verdade
(`delivered` no dashboard do Resend, com o link, o CTA e o accent da marca no
corpo entregue); o aceite com sessão criou o vínculo em `workspace_members` e
marcou o convite como `accepted`; a remoção por admin tirou o acesso na hora,
confirmado sob RLS. Também exercitados: limite do Free em 2/2, membro comum
recusado por papel, `protect_workspace_owner` barrando rebaixar/remover o dono
inclusive vindo de outro admin, convite duplicado, "já é membro" e link
encaminhado para a conta errada.

Três defeitos apareceram só nesse teste, todos corrigidos: revoke/remove/role
devolviam `ok: true` para id de outro workspace (zero linhas afetadas não é
erro no PostgREST — os dados estavam protegidos, mas a UI mostraria sucesso
falso); o preview conferia membership antes do e-mail, escondendo que o link
era de outra pessoa; e `invalid_type_error` não alcança `invalid_enum_value`
num `z.enum`, vazando a mensagem do Zod em inglês.

⚠️ **Envio para terceiros ainda não funciona.** O remetente é o sandbox
`onboarding@resend.dev`, que entrega apenas para o dono da conta Resend —
convite para outro endereço volta com `emailDelivered: false` e usa o link
manual. Depende de domínio verificado; está no M15, junto com a URL pública.

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

**Branch:** `feat/leads-data` (o plano previa `feat/m11-leads-backend`; M11, M12 e
M13 saíram juntos na mesma branch — ver nota no fim do M13)

**Objetivo:** telas do M4 escrevendo e lendo do Postgres.

- [x] Server Actions de criar, editar e excluir lead, com Zod e `revalidatePath`
- [x] Listagem com busca, filtros e paginação executados no banco
- [x] Índice de busca textual em nome, e-mail e empresa
- [x] Detalhe do lead carregando de query real
- [x] Server Action de criar atividade; timeline lendo do banco
- [x] Limite de 50 leads do plano Free verificado no servidor antes do insert
- [x] Tratamento de erro com toast e mensagens por campo

**Commit final:** `feat: CRUD de leads e atividades persistido no Supabase`

**Colunas geradas para a busca** (`20260817140000`). Os índices do M8 foram
criados sobre *expressões* — `pipeflow_normalize(name || company || email)` e
`regexp_replace(phone, '\D', '', 'g')`. O PostgREST, porém, só filtra por
**coluna**: não há como referenciar uma expressão dentro de um `.or()`. Os
índices existiam e eram inalcançáveis a partir do cliente, e a busca teria de
voltar para o Node — trazendo a tabela inteira a cada tecla digitada. `leads`
ganhou duas colunas `generated always as (...) stored`, `search_text` e
`phone_digits`, com os índices GIN recriados sobre elas.

As duas ficam **fora do tipo `Lead`** (`Omit<Tables<"leads">, …>`): são plumbing
de busca, não dado de domínio, e expô-las obrigaria todo lugar que monta um lead
a inventar valor para coluna que o banco calcula sozinho.

**Fixtures retipados pelos tipos gerados** — a dívida que o M8 deixou aberta.
`types/index.ts` agora deriva de `types/database.ts` (`Tables<"leads">`) em vez
de repetir o shape à mão. A divergência virou erro de compilação na hora, como o
PLAN.md previa, e apareceram três: `Lead` e `Deal` sem `updated_at`, `Activity`
sem `created_at`, e **`Activity.author_id` declarado como `string` sendo
nullable no banco** (`on delete set null`). O terceiro era bug de verdade: a
timeline de um lead cujo autor saiu da equipe quebraria em
`authors.get(activity.author_id)`.

**A checagem de limite tem de estar na action, e está.** Verificado contra o
banco: com o workspace em 50 leads, um insert direto pelo PostgREST é
**aceito** — o teto do plano Free é regra de produto, não de RLS. Quem o aplica
é `createLeadAction`, antes do insert. Esconder o botão na UI é conveniência.

**Bug encontrado testando: curinga vazando na busca.** Dentro de um `.or()` o
curinga do PostgREST é o **asterisco**, não o `%` do LIKE. A primeira versão
escapava `%` e `_` — a sintaxe errada — e deixava o `*` passar: buscar `*`
devolvia a tabela inteira, e "a*a" casava "Alfa" por wildcard. Só apareceu
exercitando a busca contra o banco com termos hostis; compilava e passava nos
casos normais. `escapeSearchTerm()` converte `*` e `%` num `%` escapado, e
nenhum dos dois volta a agir como curinga.

---

### M12 · Pipeline persistido

**Branch:** `feat/leads-data`

**Objetivo:** drag-and-drop do M5 gravando no banco.

- [x] Server Actions de criar, editar e excluir negócio
- [x] Mover negócio grava `stage` e `position`; reordenação dentro da coluna persiste
- [x] Update otimista com rollback em caso de erro
- [x] Negócios carregados por workspace com o lead e o responsável em join
- [x] Vincular negócio a lead existente no formulário
- [x] Negócios do lead na página de detalhe vindo do banco

**Commit final:** `feat: persistência do pipeline e reordenação de negócios`

**`move_deal` é função do Postgres, não uma sequência de updates.** Reordenar
mexe em várias linhas: tirar o card da origem fecha o buraco que ele deixou,
colocá-lo no destino abre espaço. Numa sequência de updates soltos, uma falha no
meio deixa a coluna com posições duplicadas — e o board seguinte carrega numa
ordem que ninguém pediu. Dentro da função é uma transação só.

Ela **não é `security definer`**, ao contrário das funções de apoio do M8: roda
com os privilégios de quem chama e portanto sob RLS, então não alcança negócio
de outro workspace. Marcar como definer contornaria justamente o isolamento que
o M8 construiu, sem necessidade — a função não precisa de privilégio extra.

`for update` na linha do card serializa dois arrastes simultâneos, e a posição
recebida do cliente é fixada no intervalo válido (`greatest(0, least(…))`):
posição forjada ou defasada — outra pessoa mexeu na coluna no meio do gesto —
cai no fim da coluna em vez de abrir buraco. Verificado com `position: 999`.

**`moveDealAction` não revalida `/pipeline`**, de propósito: o `revalidatePath`
descartaria o estado otimista e o card voltaria visualmente à posição antiga por
um instante. Revalida `/dashboard`, esse sim — mover para Ganho/Perdido muda a
conversão e o valor do pipeline, e aquela tela não tem estado otimista a
preservar.

**Posição do card novo vem do banco** (`next_deal_position`): ler o maior
`position` no Node e inserir com ele + 1 abriria corrida entre dois usuários
criando ao mesmo tempo.

---

### M13 · Dashboard com dados reais

**Branch:** `feat/leads-data`

**Objetivo:** métricas calculadas no banco, não no cliente.

- [x] Queries agregadas (views ou funções Postgres) para as 4 métricas
- [x] Dados do funil agregados por etapa
- [x] Negócios com prazo próximo filtrados por usuário logado e janela de dias
- [x] Métricas escopadas ao workspace ativo e respeitando RLS
- [x] Streaming com Suspense por card, mantendo os skeletons do M6

**Commit final:** `feat: métricas do dashboard calculadas no Postgres`

**Uma função para os quatro cards, não quatro** (`dashboard_metrics`): os
números saem do mesmo conjunto de linhas, e separá-los faria o Postgres varrer
`deals` três vezes para responder a uma tela só. `count(*) filter (where …)`
resolve tudo numa passada.

**O funil usa `left join` contra a lista de etapas**, para etapa vazia devolver
linha com zero em vez de sumir do gráfico — etapa vazia é informação. Ganho e
Perdido continuam fora, pela decisão registrada no M6.

**"Prazo próximo" traz responsável e lead em join**, em vez de buscar a lista de
membros e a de leads inteiras para casar dois ids em memória: eram dois
conjuntos completos transferidos para exibir seis linhas.

**Sobre `numeric` e `bigint`:** o roteiro previa que o PostgREST os entregasse
como string. Verificado contra o banco (Postgres 17 / PostgREST 14) — chegam
como `number`. As conversões com `Number()` ficaram como rede de segurança e os
comentários dizem isso, em vez de afirmar um problema que não se confirmou.

---

**Nota sobre a branch única.** M11, M12 e M13 saíram juntos em `feat/leads-data`.
Os três mexem na mesma camada (`lib/data/` + Server Actions) e negócio referencia
lead: separá-los criaria uma janela em que o board lê fixture e a página do lead
lê banco, com ids que não casam. O PLAN.md os mantém como milestones distintos
porque a divisão continua descrevendo o produto; o que mudou foi a entrega.

**`lib/mock/` continua no repositório**, embora nenhuma função de leitura o
importe mais. Ele é a fonte de `npm run db:seed`, o único caminho para popular um
banco de desenvolvimento — o remoto está marcado `PRODUCTION` e nunca recebeu o
seed. Os fixtures foram retipados junto com o resto e compilam contra o schema
real; apagá-los é decisão para quando o seed tiver outra origem.

---

### M14 · Stripe

**Branch:** `feat/billing` (o plano previa `feat/m14-stripe`)

**Objetivo:** monetização ativa — upgrade, downgrade e limites aplicados.

- [x] Produtos e preços criados no Stripe (Pro, R$ 50/mês — ver nota sobre o preço)
- [x] Server Action de checkout criando a Checkout Session com `workspace_id` no metadata
- [x] `app/api/stripe/webhook/route.ts` com verificação de assinatura e handler idempotente
- [x] Eventos tratados: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [x] Tabela `subscriptions` atualizada pelo webhook usando service-role key (único lugar permitido)
- [x] Customer Portal para gerenciar/cancelar assinatura
- [x] Limites do Free aplicados no servidor; Pro sem limite
- [x] Testado com Stripe CLI (`stripe listen`) e cartões de teste

**Commits.** Saiu em dois, e não no único que o plano previa. A integração com
o Stripe e a unificação da fonte do plano são mudanças de natureza diferente —
a segunda corrige uma divergência que já existia, em código que o Stripe não
toca —, e um commit só esconderia as duas:

1. `feat: checkout do Stripe e webhook de assinaturas`
2. `refactor: subscriptions como fonte única do plano`

Dois arquivos (`settings/actions.ts` e `settings/page.tsx`) tinham as duas
mudanças no mesmo diff. Cada um entrou no primeiro commit numa versão
intermediária — já com `requireAdmin()` extraído e a UI de billing, mas ainda
lendo `workspace.plan` —, para que o commit compile sozinho. Verificado
exportando a árvore staged (`git checkout-index`) e rodando `tsc` isolado.

**Fonte única do plano.** Até o M13 o plano era lido de duas colunas
diferentes: `subscription.plan` na criação de lead e `workspaces.plan` no
convite e na tela de settings. As duas concordavam só porque nada escrevia em
`subscriptions` — tudo era Free. Com o webhook gravando, a divergência viraria
bug de cobrança nos dois sentidos: um assinante Pro seguiria barrado de
convidar, e um ex-assinante (`plan = 'pro'`, `status = 'canceled'`) continuaria
criando leads sem limite, porque a leitura crua da coluna ignora o status.

`subscriptions` passou a ser a fonte da verdade, com a regra concentrada em
`resolvePlan()` (`lib/stripe/plan.ts`) e exposta por `getEffectivePlan()`.
`workspaces.plan` continua existindo como cache denormalizado, sincronizado
pelo webhook na mesma escrita. Os três pontos de checagem de limite passaram a
usar a fonte única; o aceite de convite lê pelo cliente admin, porque quem
aceita ainda não é membro e a policy recusaria a leitura com a sessão dele.

**`past_due` não rebaixa.** `active`, `trialing` e `past_due` liberam o Pro;
só `canceled` encerra. Derrubar alguém no primeiro retry falho de cobrança
apagaria acesso a dados por um cartão que vence amanhã — quem decide o fim é o
dunning do Stripe, e a tela de billing avisa que o cartão precisa de atenção.

**Preço: R$ 50, não R$ 49.** O `STRIPE_PRICE_ID_PRO` do `.env.local` apontava
para um **product** (`prod_…`) em vez de um **price** (`price_…`) — o checkout
teria falhado na primeira tentativa. O preço real cadastrado no Stripe é de
R$ 50,00/mês, e a UI foi alinhada a ele: o número virou
`PRO_PLAN_PRICE_BRL` em `lib/constants.ts`, porque estava cravado tanto na
landing quanto na tela de billing e já havia divergido do Stripe uma vez.

**`current_period_end` mora nos items.** Na API `2026-07-29.dahlia` o campo
saiu da Subscription e passou para os subscription items, que podem ter ciclos
diferentes. `periodEnd()` pega o menor. A `apiVersion` fica fixada no cliente
justamente para essa classe de mudança não chegar por um `npm update`.

**Verificado rodando**, com `stripe listen` encaminhando para o dev server: 15
eventos entregues, todos 200; assinatura paga promoveu `subscriptions` e
`workspaces` a `pro` com `current_period_end` correto; a reentrega do mesmo
evento atualizou a linha existente sem duplicar (mesmo `id`, só `updated_at`
avançou); o cancelamento rebaixou as duas tabelas para `free`. Os dados de
teste foram removidos do Stripe e do banco depois.

**O que o M14 deixa em aberto.**

- ~~**Checkout real nunca foi percorrido pelo navegador.**~~ Percorrido em
  18/08/2026 — ver M14.1 abaixo.

- **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` está no `.env.example` e não é usada
  por nada.** O Checkout hospedado dispensa Stripe.js no cliente. Mantida por
  decisão explícita do dono do projeto; segue sem consumidor e fora do schema
  Zod de `lib/env.ts`, então quem for usar o Payment Element no M15 precisa
  adicioná-la lá antes.

- ~~**Sem proteção explícita contra replay de eventos antigos.**~~ Fechado na
  `feat/billing-nextjs` — ver M14.1 abaixo.

- ~~**Banner de upgrade não aparece nas telas de leads e membros.**~~ Fechado na
  `feat/billing-nextjs` — ver M14.1 abaixo.

---

### M14.1 · Pendências do M14

**Branch:** `feat/billing-nextjs`

Fecha duas das quatro pendências que o M14 deixou. A terceira (checkout pelo
navegador) segue aberta e continua no M15; a quarta
(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) foi mantida por decisão explícita.

- [x] Tabela `stripe_events` registrando `event.id` processado
- [x] Guarda de antiguidade descartando evento fora de ordem
- [x] `UpgradePrompt` nas telas de leads e de membros

**Idempotência deixou de ser uma propriedade acidental.** Até aqui ela vinha
inteira do `on conflict (workspace_id)` do upsert: reentregar o mesmo evento
reescrevia a mesma linha com os mesmos valores. Isso é verdade enquanto *todo*
handler for idempotente por construção — uma propriedade que ninguém declarava
e que o próximo handler poderia quebrar sem que nada acusasse. `stripe_events`
move a garantia para a porta de entrada: o `insert` do `event.id` é a própria
checagem (a PK faz a segunda tentativa falhar com `23505`), e um evento já
visto sai antes do switch. O upsert continua lá — as duas garantias são
independentes de propósito.

**O registro vem antes do handler.** Gravar depois deixaria a janela em que a
escrita em `subscriptions` já aconteceu mas o evento ainda não consta como
visto, e o retry reexecutaria o handler. O custo da escolha é o inverso: morrer
entre o registro e a escrita faz o retry ser descartado e o evento se perder.
Esse lado é preferível porque os handlers seguem idempotentes por conta
própria, então reexecutar custa zero e perder custa de verdade. Pelo mesmo
motivo, falha de infraestrutura no registro **não** bloqueia o evento — recusar
uma assinatura porque o log de auditoria caiu seria trocar um risco inexistente
por uma promoção que não acontece.

**Evento fora de ordem.** O Stripe não garante ordem de entrega, e o upsert cru
não se importa com ela: um `customer.subscription.updated` atrasado chegando
depois do `.deleted` que veio a seguir reporia `active` por cima de um
cancelamento já gravado — um workspace cancelado voltaria a Pro sem ninguém
pagar. A guarda compara `event.created` (relógio do Stripe) com o `updated_at`
da linha e descarta o mais velho. Empate passa: dois eventos no mesmo segundo
são o caso comum de uma mudança única, e reprocessar é inofensivo.

**`revoke` explícito, e não ausência de `grant`.** A primeira versão da
migration só omitia o grant, apostando no `auto_expose_new_tables` do
`config.toml`. Verificado rodando: sem o `revoke`, uma leitura com a chave anon
devolve `[]` com 200 em vez de erro — a RLS barra as linhas, mas a tabela
responde na Data API, porque o projeto cloud ainda auto-expõe entidades novas
criadas por `postgres`. A escrita já estava barrada nos dois casos (`42501`);
o revoke tira também a existência da tabela do alcance de quem não tem nada a
ver com ela.

**O banner respeita quem pode cobrar.** `UpgradePrompt` recebe `canUpgrade` e
esconde o botão de quem não é admin — `createCheckoutSession()` recusaria a
chamada via `requireAdmin()`, e oferecer um botão que leva a uma recusa é pior
do que não oferecer nenhum. Para membro comum o texto aponta o administrador,
como o aceite de convite já fazia. Na tela de leads a contagem vem de
`countLeads()`, sem filtros: o limite vale sobre o workspace inteiro, e usar o
`total` da página mostraria um número menor que o real com qualquer filtro
ativo.

**`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` fica.** Decisão do usuário. A variável
segue no `.env.example` e sem nenhum consumidor — o Checkout hospedado dispensa
Stripe.js no cliente. Ela não está nem no schema Zod de `lib/env.ts`, então
nada valida a presença dela; quem for usar o Payment Element no M15 precisa
adicioná-la lá antes.

**Histórico de migrations estava dessincronizado.** `20260817140000` e
`20260817140100` (M12/M13) estavam aplicadas no banco remoto mas não
registradas — um `db push --include-all` tentava reaplicá-las e falhava com
`relation "leads_search_text_idx" already exists`. Reparado com
`supabase migration repair --status applied` antes de aplicar a deste
milestone. Não era problema causado aqui, mas bloqueava qualquer push.

**Verificado rodando**, contra o banco remoto: primeiro `insert` do evento
passa; a reentrega do mesmo `id` falha com `23505` e é detectada como
duplicada; a leitura com chave anon é recusada com `42501`; a escrita por anon
é recusada pela RLS; e a tabela fica com exatamente uma linha. A guarda de
antiguidade foi exercitada nos três casos sobre uma linha real — evento mais
velho descartado, mais novo aplicado, empate aplicado. Os dados de teste foram
removidos depois. `tsc`, `next lint` e `next build` limpos.

**Checkout percorrido pelo navegador — fechado.** Era a última pendência do
M14, aberta desde então porque exigia interação manual com a tela hospedada do
Stripe. Percorrido em 18/08/2026 às 21:55: clique em "Assinar Pro", cartão
digitado na tela do Stripe, retorno em `?checkout=success` e o webhook
promovendo o workspace — `plan = pro`, `status = active`,
`stripe_subscription_id = sub_1U5uyX…`, `current_period_end` em 18/09/2026. O
Customer Portal também foi aberto às 22:03
(`billing_portal.session.created`).

O tráfego real confirmou de passagem o que o M14.1 só tinha exercitado em
teste: **15 eventos gravados em `stripe_events`**, cada um com id próprio, o
`checkout.session.completed` entre eles. A idempotência está valendo sobre
eventos de verdade, não só sobre inserts sintéticos.

---

### M14.2 · Alerta de cobrança recusada

**Branch:** `feat/billing-nextjs`

Quando um pagamento falhava, o app não avisava ninguém. O webhook recebia
`invoice.payment_failed`, refletia o status e parava por aí; o único sinal era
um aviso em `/settings`, tela que ninguém abre sem motivo. Como `past_due` não
rebaixa o plano (decisão do M14, e a certa), o produto ficava silencioso do
primeiro retry falho até o cancelamento — quando o acesso some sem nenhum aviso
prévio vindo de nós.

- [x] E-mail aos admins do workspace no `handlePaymentFailed`
- [x] Tabela `payment_alerts` com guarda de reenvio por fatura
- [x] `PastDueBanner` em toda a área logada, no slot `banner` do `AppShell`

**A guarda é por fatura, não por evento.** O dunning do Stripe emite
`invoice.payment_failed` a cada tentativa — a configuração padrão tenta quatro
vezes ao longo de duas semanas. `stripe_events` não resolve isso: ela deduplica
reentrega do *mesmo* evento, e cada retry é um evento novo e legítimo, com id
próprio. O que se repete é a fatura, então a PK de `payment_alerts` é o
`invoice_id`. Uma fatura nova, no mês seguinte, avisa de novo — que é o
comportamento desejado.

**A reserva vem antes do envio**, mesmo trade-off de `stripe_events`: o insert
é a própria checagem (23505 na segunda tentativa), e uma falha de entrega
depois da reserva não é reenviada. Preferimos não avisar a avisar quatro
vezes — o banner na UI continua lá, e o Stripe manda o próprio aviso ao titular
do cartão. Um `select` seguido de `insert` teria uma janela em que dois retries
simultâneos mandariam dois e-mails.

**O e-mail vai aos admins, não ao titular do cartão.** O Stripe já escreve para
o e-mail do customer quando a cobrança automática está ligada no painel. Quem
pode agir do nosso lado é quem administra o workspace, e nem sempre é a mesma
pessoa que cadastrou o cartão. A leitura dos destinatários usa o cliente admin
porque não há sessão num webhook — a policy de `workspace_members` recusaria a
consulta sem `auth.uid()`.

**Envio não-fatal, como o convite.** O estado no banco é o que importa para a
cobrança; devolver 500 ao Stripe por causa de e-mail faria o evento ser
reentregue e o sync rodar de novo à toa. O `try/catch` em volta da chamada
existe para isso.

**O banner ganhou slot próprio no `AppShell`.** Passá-lo dentro de `children`
o deixaria sob o padding do `<main>`, e o que se quer é uma faixa encostada nas
bordas logo abaixo da topbar. O `AppShell` é componente cliente, então recebe o
nó já renderizado no servidor. Para membro comum o banner informa sem oferecer
"atualizar cartão" — a action do portal recusaria a chamada dele.

**Verificado rodando**, contra o banco remoto: primeira reserva da fatura
passa; o retry da mesma fatura falha com `23505` e vira `already_sent`; uma
fatura de id diferente reserva normalmente; a leitura com chave anon é recusada
com `42501`; e o join que busca os admins resolveu um destinatário real. Dados
de teste removidos e os três workspaces conferidos de volta em `free/active`
depois. `tsc`, `next lint` e `next build` limpos.

**Não verificado:** o `PastDueBanner` nunca foi visto renderizado. Ele só
aparece com `status = past_due`, e a assinatura real nasceu `active` — forçar o
status no banco exibiria o banner, mas mexeria numa assinatura viva. Falta
também olhar em conta de membro comum, já que o link "Atualizar cartão" só
aparece para admin. E não houve envio real pelo Resend: `RESEND_FROM_EMAIL` usa
domínio não verificado, a mesma pendência que o M15 já registra — em dev o
envio devolve `not_configured` e segue sem erro, por desenho. `payment_alerts`
segue vazia, o que é o esperado: nenhuma cobrança falhou.

---

---

### M14.3 · Limites de plano e página de cobrança

**Branch:** `feat/billing-nextjs`

- [x] `lib/limits.ts` com `canAddLead()`, `canAddMember()` e `canAcceptInvite()`
- [x] Rota `/settings/billing` com plano, medidores de uso e comparação
- [x] `PlanComparison` compartilhada entre `/settings` e `/settings/billing`

**A regra estava certa e espalhada.** Os limites do Free já eram checados no
servidor nos três pontos de escrita — criar lead, convidar, aceitar convite —,
mas remontados à mão em cinco lugares, cada um repetindo "lê o plano, conta,
compara" e reescrevendo a mensagem de recusa. Cinco cópias de uma regra de
cobrança são cinco chances de uma divergir, e a que divergisse viraria bug de
receita. A consolidação tirou 64 linhas a mais do que acrescentou.

**Objeto, não booleano.** Quem chama nunca quer só "pode?": a action precisa da
mensagem de recusa e a tela precisa do número para o medidor. Com booleano os
dois contariam de novo — duas queries onde há uma, e a segunda podendo
discordar da primeira. É união discriminada para `message` ser `string` depois
de `if (!allowed)`, sem fallback em cinco chamadas.

**`canAcceptInvite()` à parte.** O aceite é o único ponto sem sessão do lado de
dentro: quem aceita ainda não é membro, a policy `subscriptions_select_member`
recusaria a leitura e não há workspace no cookie. Conta só membros, sem os
pendentes — o convite de quem está aceitando é um deles, e somá-lo faria a
pessoa contar duas vezes, barrando o último assento livre.

**Um bug de cache apareceu no caminho.** O card de plano da sidebar lia
`activeWorkspace.plan`, o cache denormalizado, e não `getEffectivePlan()`. É a
mesma divergência que o M14 corrigiu nos outros pontos e que este passou
batido: com o cache fora de sincronia, um assinante Pro veria "fazer upgrade".
Passou a receber o plano efetivo do layout.

**A comparação é um componente, não JSX duplicado.** Nasceu inline em
`/settings/billing` e foi extraída para `PlanComparison` quando passou a
aparecer também em `/settings`. Duas cópias divergiriam no dia em que um
recurso entrasse na lista, e a tela desatualizada estaria prometendo errado
sobre o que o cliente paga. A lista de recursos mora dentro do componente e não
vem por prop — não há caso em que as duas telas devam comparar coisas
diferentes.

**Verificado rodando:** a aritmética dos limites conferida contra os três
workspaces reais, incluindo o caso de 1 membro + 1 convite pendente = 2
assentos com `canAddMember = false` — assentos comprometidos, não só ocupados.
As duas rotas compilam e respondem no dev server. `tsc`, `next lint` e
`next build` limpos.

**Não verificado:** as telas não foram vistas em conta de membro comum, onde os
botões de cobrança somem e o texto muda para "peça a um administrador".

---

### M15 · Polimento e deploy

**Branch:** `feat/m15-deploy`

**Objetivo:** aplicação em produção, estável e acessível.

- [ ] Revisão de todos os empty states, loadings e mensagens de erro
- [x] `error.tsx`, `not-found.tsx` e `loading.tsx` nas rotas principais — feito
      na branch `feat/deploy`. `app/(app)/error.tsx` cobre a área autenticada
      inteira, para o shell continuar de pé quando uma tela falha;
      `app/not-found.tsx` responde à URL sem rota, fora dos grupos, porque quem
      chega a um link quebrado não está necessariamente logado; `loading.tsx`
      em `dashboard`, `pipeline` e `settings`. **Não** em `leads/`: de lá o
      boundary envolveria `leads/[id]` e o `notFound()` responderia 200 — a
      razão já estava escrita em `leads-table-skeleton.tsx` e continua valendo
- [ ] Acessibilidade: foco visível, navegação por teclado no Kanban, labels e contraste
      — **parcial.** Corrigido o que escondia controle no toque: a alça de
      arraste e o menu "⋯" do card eram `opacity-0` revelado por hover, então
      num telefone o único caminho não-arrasto para mover um card era invisível.
      Agora o `opacity-0` vale só sob `@media (hover: hover)`. Falta a
      varredura de contraste e o teste com leitor de tela
- [ ] Revisão responsiva completa em mobile — **parcial.** Três defeitos reais
      corrigidos: a tabela de "Prazos próximos" tinha células `whitespace-nowrap`
      sem container de rolagem e empurrava a página inteira para o scroll
      horizontal; o `YAxis` do funil era fixo em 132px e comia metade da largura
      num viewport de 360px, reduzindo as barras a tocos; e a topbar carregava
      um campo de busca desabilitado desde antes de a busca existir — virou
      link para `/leads`, que é onde ela de fato mora. Falta a passada em
      aparelho real: tudo aqui foi conferido por leitura e build, não em tela
- [x] Auditoria de segurança: RLS em todas as tabelas, nenhuma service-role key
      exposta ao cliente — feita na branch `feat/deploy`. Achou e corrigiu uma
      escalada de acesso no aceite de convite (e-mail conferido por string, sem
      `email_confirmed_at`, com `enable_confirmations = false` no Auth) e a
      ausência de headers de segurança. O que sobrou dela virou o M16
- [ ] Variáveis de ambiente configuradas na Vercel (preview e production)
- [ ] Migrations aplicadas no Supabase de produção; webhook do Stripe apontando para a URL final
- [ ] Domínio verificado no Resend e `RESEND_FROM_EMAIL` apontando para ele —
      ver nota abaixo
- [ ] Deploy, smoke test do fluxo completo (cadastro → workspace → lead → negócio → upgrade)
      — o upgrade aqui precisa ser o checkout percorrido pelo **navegador**, com
      cartão de teste na tela do Stripe: é o único trecho do M14 que a
      verificação por API não cobriu
- [ ] Decidir sobre `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: usar (Payment Element)
      ou remover do `.env.example` — hoje está documentada e inerte
- [ ] Levar o botão de upgrade às telas de leads e membros ao bater o teto do
      Free; hoje o caminho para assinar existe só em `/settings`
- [ ] README final com setup, variáveis e comandos

**Commit final:** `chore: polimento final e deploy em produção`

**Pendência herdada do M10 — envio de convite para terceiros.** O fluxo de
convite funciona ponta a ponta, mas hoje o remetente é o sandbox
`onboarding@resend.dev`, que entrega **apenas** para o e-mail dono da conta
Resend. Convite para qualquer outro endereço volta com `emailDelivered: false`
e cai no fluxo do link manual (a tela mostra o link para o admin repassar) —
verificado rodando.

Destravar exige um domínio próprio verificado em resend.com/domains (SPF +
DKIM no DNS) e o `RESEND_FROM_EMAIL` apontando para um endereço dele. Cabe
aqui, e não antes, porque o `NEXT_PUBLIC_SITE_URL` muda no mesmo momento: os
links dentro do e-mail de convite hoje apontam para `localhost:3000` e só
passam a valer para outra pessoa quando houver URL pública. Configurar DNS
antes disso seria fazer o trabalho duas vezes.

`localhost` não pode ser usado como remetente — o provedor do destinatário
valida SPF/DKIM por DNS público, que não existe para localhost. As duas
variáveis são independentes: o app pode seguir em localhost enquanto o
remetente é um domínio real.

---

### M16 · Next 16 e React 19

**Branch:** `chore/next-16`

**Objetivo:** sair do `next@14.2.35`, que é o fim da linha 14.x e acumula
advisories sem correção dentro do major.

Aberto pela auditoria do `feat/deploy`. **Depois do M15, não dentro dele**: a
auditoria entregou uma correção de escalada de acesso, e empilhar um major do
framework na mesma janela de deploy tornaria indiagnosticável qual dos dois
quebrou, se algo quebrar. Separar é o que mantém cada mudança rastreável.

- [ ] `npx @next/codemod@canary upgrade latest` — cobre a maior parte do mecânico
- [ ] `cookies()` vira async em **6 call-sites**: `app/(app)/layout.tsx:37`,
      `app/(app)/workspaces/actions.ts:115` e `:150`,
      `app/invite/[token]/actions.ts:243`, `lib/data/workspaces.ts:58`,
      `lib/supabase/server.ts:21`
- [ ] `params` / `searchParams` viram Promise em **5 páginas**: `leads`,
      `leads/[id]`, `login`, `signup`, `invite/[token]`
- [ ] Resolver `next-themes` — ver nota abaixo
- [ ] Subir `@types/react` / `@types/react-dom` para `^19` e `eslint-config-next`
      para a versão par do Next
- [ ] Reteste dirigido: troca de workspace, aceite de convite e toggle de tema
      (os três caminhos que tocam cookie), mais o webhook do Stripe
- [ ] `npm audit --omit=dev` limpo ao final

**Commit final:** `chore: next 16 e react 19`

**O bloqueio real é o React 19, não o Next.** O Next 16 o exige, e
`next-themes@0.3` declara peer `^16.8 || ^17 || ^18` — sem 19. Ou sobe a
biblioteca (se houver versão compatível na época), ou troca por outra, ou
instala com `--legacy-peer-deps` aceitando que o peer está mentindo. As demais
já declaram 19: `recharts`, `sonner`, `react-hook-form` e `@dnd-kit` foram
conferidos. O toggle de tema é requisito do brand guide, então "remover" não é
saída.

**Metade da migração de `cookies()` já foi paga.** `lib/supabase/server.ts` é
`async` desde o M8 exatamente por isso — a nota lá em cima já dizia "chamar com
`await` desde já evita ter de tocar em toda call-site no upgrade". Os 6
call-sites acima são o resto.

**Urgência real: baixa.** Os 11 advisories do `next@14.2.35` foram revisados
contra este código na auditoria — os de maior severidade exigem i18n no Pages
Router, custom server ou rewrites com host dinâmico, e nenhum existe aqui.
Sobram cache poisoning de RSC e exposição de Server Functions, reais mas de
impacto bem menor que o furo de convite já corrigido. É dívida técnica
agendada, não incidente.

---

## Ordem de dependências

```
M0 → M1 → M2 → M3 → M4 ─┐
                M3 → M5 ─┼→ M8 → M9 → M10 → M11 → M12 → M13 → M14 → M15 → M16
                M3 → M6 ─┤
                M3 → M7 ─┘
```

M4, M5, M6 e M7 dependem só do M3 e podem ser feitos em paralelo. Toda a Fase 2 é sequencial: M8 é pré-requisito de tudo, e M10 (workspace ativo) precisa existir antes de M11–M13, que dependem do escopo por workspace.

O M16 é o único milestone que não entrega produto: é manutenção de dependência,
aberta pela auditoria de segurança do `feat/deploy`. Fica depois do M15 de
propósito — ver a justificativa na seção dele.

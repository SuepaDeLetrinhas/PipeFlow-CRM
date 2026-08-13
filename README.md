# PipeFlow CRM

CRM multi-empresa para pequenas equipes de vendas: leads, pipeline Kanban de negócios,
timeline de atividades, dashboard de métricas e assinaturas via Stripe.

- Briefing técnico e convenções: [CLAUDE.md](CLAUDE.md)
- Produto (fonte de verdade): [docs/PRD.md](docs/PRD.md)
- Plano de execução em 16 milestones: [docs/PLAN.md](docs/PLAN.md)

## Stack

Next.js 14 (App Router) · React 18 · TypeScript 5 · Tailwind CSS · shadcn/ui ·
Supabase (Postgres + RLS + Auth) · Stripe · Resend · @dnd-kit · Recharts · Zod.

## Requisitos

- Node.js 18.17 ou superior
- npm 9 ou superior

## Setup

```bash
npm install
cp .env.example .env.local   # preencha conforme os milestones forem avançando
npm run dev
```

A aplicação sobe em <http://localhost:3000>.

Nenhuma variável de ambiente é necessária para rodar a fase de interface (M0–M7):
as telas leem fixtures de `lib/mock/` através de `lib/data/`. As chaves do Supabase,
Stripe e Resend só passam a ser exigidas a partir do M8.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run start` | serve o build de produção |
| `npm run lint` | ESLint (`next lint`) |
| `npm run typecheck` | checagem de tipos sem emitir |

## Design system

- Primária índigo, neutros slate, semânticas verde/vermelho/âmbar — todas como
  CSS variables em [app/globals.css](app/globals.css), consumidas pelo
  [tailwind.config.ts](tailwind.config.ts).
- Dark mode via `next-themes` (`attribute="class"`), com toggle em
  `components/layout/theme-toggle.tsx`.
- Fonte Inter carregada com `next/font`; use a utilitária `.text-metric` em
  métricas e valores para ativar números tabulares.
- `formatCurrency()` (BRL) e `formatDate()` (pt-BR) vivem em [lib/utils.ts](lib/utils.ts).

### Adicionando componentes shadcn/ui

O `npx shadcn` falha neste ambiente: o npm 12 rejeita a config `allow-scripts`
herdada por variável de ambiente ao rodar um install aninhado. Use o binário local:

```bash
node node_modules/shadcn/dist/index.js add <componente>
```

Os arquivos gerados ficam em `components/ui/` e não devem ser editados à mão.

## Estrutura

```
app/          rotas — (marketing), (auth), (app) e api/
components/   ui/ (shadcn) + leads/ pipeline/ dashboard/ layout/
lib/          data/ mock/ supabase/ stripe/ validations/ utils.ts
types/        database.ts (gerado pelo Supabase, a partir do M8)
supabase/     migrations/
docs/         PRD.md e PLAN.md
```

## Estado atual

M0 concluído: projeto configurado com o design system aplicado. A rota `/` exibe
uma página de verificação do tema, que o M1 substitui pela landing page em
`app/(marketing)/page.tsx`.

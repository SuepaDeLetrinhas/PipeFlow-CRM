# Aplicar o schema pelo Supabase Studio

Alternativa à CLI (`npm run db:push`), para quando não há Docker na máquina.
Os arquivos aqui são **gerados** a partir de `supabase/migrations/` — não edite
nenhum dos dois `.sql` à mão; edite a migration e rode `npm run db:studio-sql`.

## Ordem

**1. Aplicar o schema.** Studio → SQL Editor → New query. Cole
[`apply_all.sql`](apply_all.sql) inteiro e execute.

O script é reexecutável: enums, policies e triggers estão protegidos, então
rodar de novo depois de corrigir algo não quebra. O que ele **não** faz é
migrar dado existente — se as tabelas já existirem com outro shape, derrube o
schema antes em vez de esperar que ele concilie.

**2. Verificar o isolamento.** Nova query, cole
[`verify_rls.sql`](verify_rls.sql) e execute.

Este é o passo que não dá para pular. Ele responde à pergunta que importa —
"um workspace consegue ver ou escrever dados de outro?" — em vez de deixar a
resposta por conta da leitura do SQL. São 6 seções; procure por `FALHA` no
resultado de cada uma. As seções 4 e 5 rodam dentro de transações com
`rollback` e não deixam resíduo.

A seção 5 é a mais importante e a menos óbvia: leitura isolada e escrita
aberta é uma combinação que passa despercebida, porque a tela parece correta.
Ela tenta, como Diego (Vertex), gravar um lead na Lumiar, se promover a Pro
sem pagar e vincular um negócio a um lead de outra empresa. Os três devem ser
bloqueados.

> A seção 4 e a 5 dependem do seed (`supabase/seed.sql`), que cria Marina,
> Diego e os dois workspaces. Sem ele, os contadores dão zero e o resultado
> não significa nada — zero linhas visíveis passa no teste tanto por
> isolamento correto quanto por banco vazio.

**3. Gerar os tipos.** Depois de as tabelas existirem:

```bash
npx supabase login          # abre o navegador, gera o token de acesso
npm run db:link             # vincula ao projeto bbfsoszmwkymiwuxzgfe
npm run db:types            # sobrescreve types/database.ts
```

Os tipos são **gerados, nunca escritos à mão** (CLAUDE.md). Enquanto este passo
não roda, [`types/database.ts`](../../types/database.ts) segue com o placeholder
vazio, e os clientes em `lib/supabase/` continuam tipados como
`SupabaseClient<Database>` sem colunas conhecidas — compila, mas sem
autocompletar nem checagem de coluna.

## Seed

`supabase/seed.sql` é carregado automaticamente pela CLI em `db:reset`. No
Studio, cole o arquivo manualmente — e **só num banco de desenvolvimento**: ele
cria usuários com senha conhecida (`pipeflow123`) e presume banco vazio.

Ele é gerado a partir de `lib/mock/` por `npm run db:seed`; editar à mão faria
seed e fixtures divergirem em silêncio.

-- =============================================================================
-- Corrige `invites.invited_by`: anulavel no schema, obrigatoria na policy
--
-- A policy `invites_insert_admin` exige `invited_by = auth.uid()`, mas a coluna
-- nascera anulavel. Um insert que omitisse o autor seria recusado pela RLS com
-- "new row violates row-level security policy" — mensagem que nao aponta para a
-- coluna faltante e custa caro para diagnosticar no M10.
--
-- `on delete set null` tinha o mesmo defeito na outra ponta: apagar a conta de
-- quem convidou deixaria convites pendentes num estado que nenhuma policy
-- aceita. Vira `restrict`, coerente com o tratamento de `owner_id`.
--
-- A migration anterior tambem foi corrigida, para que um banco criado do zero
-- ja nasca certo. Esta existe para os bancos onde o schema JA foi aplicado.
-- =============================================================================

-- Convites orfaos so podem existir se o schema foi aplicado antes desta
-- correcao. Sao removidos: um convite pendente sem autor nao satisfaz a policy
-- de update, entao ja estava inutilizavel — nem aceitar nem revogar.
delete from public.invites where invited_by is null;

alter table public.invites
  alter column invited_by set not null;

alter table public.invites
  drop constraint if exists invites_invited_by_fkey;

alter table public.invites
  add constraint invites_invited_by_fkey
  foreign key (invited_by) references public.profiles (id) on delete restrict;

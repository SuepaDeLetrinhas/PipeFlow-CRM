-- =============================================================================
-- Seed de desenvolvimento — espelha os fixtures de `lib/mock/`
--
-- Mesmos uuids dos fixtures, de propósito: uma URL aberta com dados falsos
-- continua válida depois da virada para o banco, e comparar tela antiga com
-- tela nova vira um diff visual direto.
--
-- Dois workspaces com donos diferentes, que é o que torna possível testar o
-- isolamento. Marina (users[0]) é admin da Lumiar E membro da Vertex — o caso
-- interessante: ela vê os dois, Diego vê só um.
--
-- Roda apenas em `supabase db reset` (local). Nunca em produção.
-- =============================================================================

-- Senha única para todos os usuários de desenvolvimento: `pipeflow123`.
-- O hash é bcrypt e vale só aqui.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'marina@lumiar.com.br',
   extensions.crypt('pipeflow123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Marina Duarte"}', '2026-02-10T13:00:00Z', now()),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'rafael@lumiar.com.br',
   extensions.crypt('pipeflow123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Rafael Nogueira"}', '2026-02-18T11:20:00Z', now()),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000003',
   'authenticated', 'authenticated', 'camila@lumiar.com.br',
   extensions.crypt('pipeflow123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Camila Souza"}', '2026-03-04T09:45:00Z', now()),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000004',
   'authenticated', 'authenticated', 'diego@vertex.com.br',
   extensions.crypt('pipeflow123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Diego Ferraz"}', '2026-05-22T17:30:00Z', now());

-- Identidade de e-mail: sem ela o login por senha não encontra o usuário.
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at,
  created_at, updated_at
)
select
  extensions.gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users as u
where u.email in (
  'marina@lumiar.com.br', 'rafael@lumiar.com.br',
  'camila@lumiar.com.br', 'diego@vertex.com.br'
);

-- Os perfis já existem: o trigger `on_auth_user_created` os criou nos inserts
-- acima. Aqui só se completa o que o trigger não tinha como saber.
update public.profiles set avatar_url = null;

-- -----------------------------------------------------------------------------
-- Workspaces
--
-- O trigger `on_workspace_created` cria, para cada um: a linha de subscriptions
-- e o vínculo do dono como admin. Por isso os inserts abaixo não repetem nada
-- disso — e se repetissem, o `on conflict do nothing` do trigger absorveria.
-- -----------------------------------------------------------------------------

insert into public.workspaces (id, name, slug, owner_id, plan, created_at)
values
  ('b0000000-0000-4000-8000-000000000001', 'Lumiar Digital', 'lumiar-digital',
   'a0000000-0000-4000-8000-000000000001', 'pro', '2026-02-10T13:00:00Z'),
  ('b0000000-0000-4000-8000-000000000002', 'Vertex Consultoria', 'vertex-consultoria',
   'a0000000-0000-4000-8000-000000000004', 'free', '2026-05-22T17:30:00Z');

-- Membros além dos donos (que o trigger já vinculou).
insert into public.workspace_members (id, workspace_id, user_id, role, created_at)
values
  ('f0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000002', 'member', '2026-02-18T11:20:00Z'),
  ('f0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000003', 'member', '2026-03-04T09:45:00Z'),
  -- Marina colabora na Vertex: é o que dá o que trocar no switcher.
  ('f0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000002',
   'a0000000-0000-4000-8000-000000000001', 'member', '2026-06-01T14:00:00Z')
on conflict (workspace_id, user_id) do nothing;

-- A Lumiar é Pro: reflete o fixture de subscriptions, incluindo os ids do
-- Stripe. A linha já existe (trigger), então é update.
update public.subscriptions
set stripe_customer_id = 'cus_mock_lumiar',
    stripe_subscription_id = 'sub_mock_lumiar',
    status = 'active',
    plan = 'pro',
    current_period_end = '2026-09-10T13:00:00Z'
where workspace_id = 'b0000000-0000-4000-8000-000000000001';

-- =============================================================================
-- Dados de domínio
--
-- Carregados a partir dos fixtures de `lib/mock/` pelo script
-- `scripts/seed-from-fixtures.mjs`, que reemite esta seção. Editar à mão aqui
-- faria o seed divergir dos fixtures em silêncio.
-- =============================================================================

-- <<< FIXTURES:START >>>
-- Gerado por scripts/seed-from-fixtures.mjs — nao editar a mao.
-- 22 leads, 21 negocios, 12 atividades.

insert into public.leads (id, workspace_id, name, email, phone, company, job_title, status, owner_id, created_at)
values
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Beatriz Amaral', 'beatriz.amaral@nortelog.com.br', '(11) 98812-4410', 'Norte Logística', 'Diretora de Operações', 'qualificado', 'a0000000-0000-4000-8000-000000000001', '2026-06-02T12:15:00.000Z'),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Henrique Salles', 'henrique@construtorapiave.com.br', '(11) 99640-2277', 'Construtora Piave', 'Gerente Comercial', 'contatado', 'a0000000-0000-4000-8000-000000000002', '2026-06-09T14:40:00.000Z'),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'Larissa Prado', 'larissa.prado@clinicavitta.com.br', '(21) 98120-9931', 'Clínica Vitta', 'Sócia-fundadora', 'cliente', 'a0000000-0000-4000-8000-000000000001', '2026-04-18T10:05:00.000Z'),
  ('c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'Otávio Bezerra', 'otavio@agrofonte.com.br', '(62) 99177-4502', 'Agro Fonte', 'Head de Vendas', 'novo', 'a0000000-0000-4000-8000-000000000003', '2026-08-03T19:20:00.000Z'),
  ('c0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', 'Priscila Fontes', 'priscila@estudiomarco.com.br', '(11) 97744-1288', 'Estúdio Marco', 'Diretora de Arte', 'contatado', 'a0000000-0000-4000-8000-000000000003', '2026-07-21T16:00:00.000Z'),
  ('c0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000001', 'Gustavo Rangel', 'gustavo.rangel@meridianotech.com', '(48) 99013-7745', 'Meridiano Tech', 'CTO', 'qualificado', 'a0000000-0000-4000-8000-000000000002', '2026-07-08T13:10:00.000Z'),
  ('c0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000001', 'Aline Castro', 'aline@doceponto.com.br', '(31) 98455-6620', 'Doce Ponto', 'Proprietária', 'perdido', 'a0000000-0000-4000-8000-000000000001', '2026-05-14T11:35:00.000Z'),
  ('c0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000001', 'Fernando Lisboa', 'fernando@transvia.com.br', '(41) 99622-8130', 'Transvia', 'Diretor Financeiro', 'contatado', 'a0000000-0000-4000-8000-000000000002', '2026-07-30T15:25:00.000Z'),
  ('c0000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000001', 'Juliana Peixoto', 'juliana@institutoaurora.org.br', '(85) 98290-3317', 'Instituto Aurora', 'Coordenadora', 'novo', 'a0000000-0000-4000-8000-000000000003', '2026-08-10T18:45:00.000Z'),
  ('c0000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000001', 'Marcelo Tavares', 'marcelo@ferrolarparts.com.br', '(11) 96733-5541', 'Ferrolar Parts', 'Gerente de Compras', 'qualificado', 'a0000000-0000-4000-8000-000000000001', '2026-06-25T09:50:00.000Z'),
  ('c0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000001', 'Renata Vasques', 'renata@belaformaacademia.com.br', '(19) 99381-2204', 'Bela Forma Academia', 'Sócia', 'cliente', 'a0000000-0000-4000-8000-000000000003', '2026-03-27T14:15:00.000Z'),
  ('c0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000001', 'Thiago Menezes', 'thiago@pontualcontabil.com.br', '(51) 98166-9078', 'Pontual Contábil', 'Sócio-diretor', 'contatado', 'a0000000-0000-4000-8000-000000000002', '2026-07-15T12:30:00.000Z'),
  ('c0000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000001', 'Sabrina Coelho', 'sabrina@modacapital.com.br', '(11) 98007-4432', 'Moda Capital', 'Gerente de Marketing', 'novo', 'a0000000-0000-4000-8000-000000000001', '2026-08-11T13:05:00.000Z'),
  ('c0000000-0000-4000-8000-000000000014', 'b0000000-0000-4000-8000-000000000001', 'Eduardo Bastos', 'eduardo@rotaviva.com.br', '(71) 99544-1190', 'Rota Viva Turismo', 'Diretor', 'qualificado', 'a0000000-0000-4000-8000-000000000003', '2026-06-30T17:40:00.000Z'),
  ('c0000000-0000-4000-8000-000000000015', 'b0000000-0000-4000-8000-000000000001', 'Patrícia Lemos', 'patricia@verdecampoalimentos.com.br', '(16) 99722-6684', 'Verde Campo Alimentos', 'Gerente Regional', 'contatado', 'a0000000-0000-4000-8000-000000000001', '2026-07-02T11:55:00.000Z'),
  ('c0000000-0000-4000-8000-000000000016', 'b0000000-0000-4000-8000-000000000001', 'Vinícius Barroso', 'vinicius@laboratoriomicron.com.br', '(11) 97120-3345', 'Laboratório Micron', 'Diretor Técnico', 'perdido', 'a0000000-0000-4000-8000-000000000002', '2026-05-06T10:20:00.000Z'),
  ('c0000000-0000-4000-8000-000000000017', 'b0000000-0000-4000-8000-000000000001', 'Carolina Nunes', 'carolina@escolasementes.com.br', '(11) 98466-7712', 'Escola Sementes', 'Diretora Pedagógica', 'novo', 'a0000000-0000-4000-8000-000000000003', '2026-08-12T14:10:00.000Z'),
  ('c0000000-0000-4000-8000-000000000018', 'b0000000-0000-4000-8000-000000000001', 'Leandro Pacheco', 'leandro@oficinatorque.com.br', '(11) 99088-2251', 'Oficina Torque', 'Proprietário', 'contatado', 'a0000000-0000-4000-8000-000000000002', '2026-07-24T09:15:00.000Z'),
  ('c0000000-0000-4000-8000-000000000019', 'b0000000-0000-4000-8000-000000000001', 'Isabela Moraes', 'isabela@casanovadecor.com.br', '(11) 97655-8823', 'Casa Nova Decor', 'Gerente de Loja', 'qualificado', 'a0000000-0000-4000-8000-000000000001', '2026-06-17T15:35:00.000Z'),
  ('c0000000-0000-4000-8000-000000000020', 'b0000000-0000-4000-8000-000000000001', 'Rodrigo Alcântara', 'rodrigo@seguraredes.com.br', '(11) 96420-7719', 'Segura Redes', 'Sócio-fundador', 'cliente', 'a0000000-0000-4000-8000-000000000003', '2026-04-09T13:45:00.000Z'),
  ('c0000000-0000-4000-8000-000000000021', 'b0000000-0000-4000-8000-000000000002', 'Cláudia Regina', 'claudia@grupoatlas.com.br', '(11) 98330-1102', 'Grupo Atlas', 'Diretora de RH', 'contatado', 'a0000000-0000-4000-8000-000000000004', '2026-06-11T16:25:00.000Z'),
  ('c0000000-0000-4000-8000-000000000022', 'b0000000-0000-4000-8000-000000000002', 'Paulo Ivan', 'paulo@metalfortesa.com.br', '(11) 97012-4488', 'Metal Forte SA', 'Gerente Industrial', 'novo', 'a0000000-0000-4000-8000-000000000004', '2026-08-05T10:00:00.000Z');

insert into public.deals (id, workspace_id, title, value, stage, position, due_date, lead_id, owner_id, created_at)
values
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Implantação de CRM — Agro Fonte', 18500, 'novo_lead', 0, '2026-08-28', 'c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000003', '2026-08-03T19:30:00.000Z'),
  ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Site institucional — Escola Sementes', 9200, 'novo_lead', 1, '2026-09-04', 'c0000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000003', '2026-08-12T14:20:00.000Z'),
  ('d0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'Campanha de lançamento — Moda Capital', 24000, 'novo_lead', 2, null, 'c0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000001', '2026-08-11T13:15:00.000Z'),
  ('d0000000-0000-4000-8000-000000000018', 'b0000000-0000-4000-8000-000000000001', 'Portal de matrículas — Instituto Aurora', 15400, 'novo_lead', 3, '2026-09-12', 'c0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000002', '2026-08-13T10:05:00.000Z'),
  ('d0000000-0000-4000-8000-000000000019', 'b0000000-0000-4000-8000-000000000001', 'Controle de OS — Oficina Torque', 8700, 'novo_lead', 4, null, 'c0000000-0000-4000-8000-000000000018', 'a0000000-0000-4000-8000-000000000003', '2026-08-13T16:40:00.000Z'),
  ('d0000000-0000-4000-8000-000000000020', 'b0000000-0000-4000-8000-000000000001', 'Dashboard fiscal — Pontual Contábil', 19800, 'novo_lead', 5, '2026-09-25', 'c0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001', '2026-08-10T09:50:00.000Z'),
  ('d0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'Automação de propostas — Construtora Piave', 31500, 'contato_realizado', 0, '2026-08-15', 'c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', '2026-06-10T09:00:00.000Z'),
  ('d0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', 'Rebranding — Estúdio Marco', 12800, 'contato_realizado', 1, '2026-08-19', 'c0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000003', '2026-07-22T10:30:00.000Z'),
  ('d0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000001', 'Portal do cliente — Transvia', 46000, 'contato_realizado', 2, '2026-09-10', 'c0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000002', '2026-07-31T11:10:00.000Z'),
  ('d0000000-0000-4000-8000-000000000021', 'b0000000-0000-4000-8000-000000000001', 'Rastreio de safra — Verde Campo Alimentos', 21300, 'contato_realizado', 3, '2026-08-22', 'c0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000001', '2026-07-28T08:45:00.000Z'),
  ('d0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000001', 'Integração ERP — Norte Logística', 68000, 'proposta_enviada', 0, '2026-08-14', 'c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '2026-06-20T13:40:00.000Z'),
  ('d0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000001', 'App de agendamento — Bela Forma', 22400, 'proposta_enviada', 1, '2026-08-21', 'c0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000003', '2026-07-05T15:00:00.000Z'),
  ('d0000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000001', 'Consultoria de dados — Meridiano Tech', 54000, 'proposta_enviada', 2, '2026-09-02', 'c0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000002', '2026-07-12T09:25:00.000Z'),
  ('d0000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000001', 'Catálogo digital — Ferrolar Parts', 37500, 'negociacao', 0, '2026-08-16', 'c0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000001', '2026-06-28T16:50:00.000Z'),
  ('d0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000001', 'Plataforma de reservas — Rota Viva', 59900, 'negociacao', 1, '2026-08-25', 'c0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000003', '2026-07-03T14:05:00.000Z'),
  ('d0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000001', 'E-commerce — Casa Nova Decor', 41200, 'fechado_ganho', 2, '2026-07-28', 'c0000000-0000-4000-8000-000000000019', 'a0000000-0000-4000-8000-000000000001', '2026-06-19T10:45:00.000Z'),
  ('d0000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000001', 'Prontuário digital — Clínica Vitta', 72000, 'fechado_ganho', 0, '2026-06-30', 'c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', '2026-04-20T12:00:00.000Z'),
  ('d0000000-0000-4000-8000-000000000014', 'b0000000-0000-4000-8000-000000000001', 'Monitoramento 24h — Segura Redes', 28800, 'fechado_ganho', 1, '2026-07-10', 'c0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000003', '2026-04-12T09:30:00.000Z'),
  ('d0000000-0000-4000-8000-000000000015', 'b0000000-0000-4000-8000-000000000001', 'Delivery próprio — Doce Ponto', 15600, 'fechado_perdido', 0, '2026-06-05', 'c0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', '2026-05-15T13:20:00.000Z'),
  ('d0000000-0000-4000-8000-000000000016', 'b0000000-0000-4000-8000-000000000001', 'Gestão de amostras — Laboratório Micron', 33000, 'fechado_perdido', 1, '2026-06-12', 'c0000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000002', '2026-05-08T15:10:00.000Z'),
  ('d0000000-0000-4000-8000-000000000017', 'b0000000-0000-4000-8000-000000000002', 'Diagnóstico de processos — Grupo Atlas', 26000, 'contato_realizado', 0, '2026-08-27', 'c0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000004', '2026-06-12T10:15:00.000Z');

insert into public.activities (id, workspace_id, lead_id, type, description, author_id, occurred_at)
values
  ('e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'call', 'Ligação de descoberta: Beatriz confirmou orçamento aprovado para o segundo semestre.', 'a0000000-0000-4000-8000-000000000001', '2026-06-04T14:00:00.000Z'),
  ('e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'email', 'Enviada apresentação institucional e cases de logística.', 'a0000000-0000-4000-8000-000000000001', '2026-06-05T11:30:00.000Z'),
  ('e0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'meeting', 'Reunião técnica com o time de TI para mapear a integração com o ERP atual.', 'a0000000-0000-4000-8000-000000000002', '2026-06-18T16:00:00.000Z'),
  ('e0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'note', 'Decisão final depende do conselho, que se reúne na segunda quinzena de agosto.', 'a0000000-0000-4000-8000-000000000001', '2026-07-29T09:15:00.000Z'),
  ('e0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', 'call', 'Primeiro contato. Henrique pediu retorno em duas semanas.', 'a0000000-0000-4000-8000-000000000002', '2026-06-11T10:20:00.000Z'),
  ('e0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002', 'email', 'Follow-up com proposta de escopo reduzido para piloto.', 'a0000000-0000-4000-8000-000000000002', '2026-06-26T15:45:00.000Z'),
  ('e0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000006', 'meeting', 'Demo do produto para o time de engenharia. Boa recepção, dúvidas sobre SSO.', 'a0000000-0000-4000-8000-000000000002', '2026-07-10T13:00:00.000Z'),
  ('e0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000006', 'note', 'Gustavo é o decisor técnico; a compra passa pelo financeiro.', 'a0000000-0000-4000-8000-000000000002', '2026-07-11T09:05:00.000Z'),
  ('e0000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000003', 'meeting', 'Kickoff do projeto de prontuário digital.', 'a0000000-0000-4000-8000-000000000001', '2026-05-05T14:30:00.000Z'),
  ('e0000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000011', 'call', 'Renata pediu proposta com prazo de implantação de 45 dias.', 'a0000000-0000-4000-8000-000000000003', '2026-07-06T17:10:00.000Z'),
  ('e0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000010', 'email', 'Enviada revisão da proposta com desconto por volume.', 'a0000000-0000-4000-8000-000000000001', '2026-08-06T12:40:00.000Z'),
  ('e0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000014', 'note', 'Concorrente direto apresentou proposta 15% mais barata — reforçar diferencial de suporte.', 'a0000000-0000-4000-8000-000000000003', '2026-08-07T18:25:00.000Z');

-- <<< FIXTURES:END >>>

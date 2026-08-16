# Arquitetura de informação — Portal da Agência

Status: **estrutura aprovada em 2026-08-12, detalhada em 2026-08-12, todas as seções implementadas em 2026-08-13**. Sidebar (`components/layout/Sidebar.tsx`) implementada nos dois layouts. Este documento é a fonte da verdade de navegação — toda nova página entra numa dessas seções, não cria seção nova sem atualizar isto primeiro.

Navegação: sidebar esquerda (troca o menu horizontal atual dos dois portais — agência e cliente, mesmo padrão visual). Cliente mantém as seções que já tem (Dashboard, Aprovações, Insights), só muda de horizontal pra sidebar.

Legenda usada abaixo: **[EXISTE]** já implementado e funcionando · **[NOVA]** precisa ser criada do zero · **[PARCIAL]** dado existe no banco, falta a tela.

---

## 1. Dashboard
Rota: `/agency-dashboard` (agência) — **[NOVA]**. Renomeada de `/dashboard` em 2026-08-12: colidia com `(client-portal)/dashboard`, que já ocupa esse path no Next.js (duas rotas não podem resolver para o mesmo caminho). Não confundir com `(client-portal)/dashboard`, que é um dashboard separado e mais simples, do cliente.

Acesso: `agencia`, `admin`.

### 1.1 Visão geral
KPIs em cards no topo:
- Clientes ativos (`count(clients where status='active')`)
- Peças aguardando aprovação (`count(content_items where status='in_review')`)
- Prospects em aberto (`count(prospects where stage not in ('fechado','perdido'))`)
- Cliques em links no mês (`sum(link_clicks) where clicked_at >= início do mês`)

Todos os dados já existem nas tabelas atuais — é só uma query de agregação nova, sem schema novo.

### 1.2 Atividade recente
Feed cronológico cross-cliente, últimos N dias, mesclando várias fontes:
- Mudanças de status de conteúdo (`feedback_history`)
- Prospects mudando de estágio (precisa de uma tabela de histórico de `prospects.stage`, que **não existe ainda** — hoje só `activities` registra interações manuais, não mudança de estágio automaticamente)
- Cliques agregados (`link_clicks`)
- Execuções do agente (`agent_runs`)

**Decisão pendente**: cada fonte tem seu próprio "quando aconteceu" — juntar num feed único exige uma view SQL ou merge no backend. Vale perguntar: você quer um feed granular (todo evento aparece) ou resumido (agrupado por tipo/dia)?

### 1.3 Pendências (ação humana necessária)
- Peças em `in_review` há mais de N dias sem mudança (definir N — sugestão: 3 dias)
- Prospects sem `activities` registrada há mais de N dias (mesmo problema do `StaleIndicator` do Pipeline, que hoje usa `created_at` como aproximação por falta de `stage_updated_at`)
- Anomalias já detectadas pelo agente (`agent_runs` com `outcome='sugerido_para_revisao'` e `confidence` alto) que ainda não foram vistas/tratadas por ninguém

---

## 2. CRM

### 2.1 Pipeline — `/pipeline` **[EXISTE]**
Já funcional: board por `stage` (novo/contatado/proposta/fechado/perdido), criação de prospect, conversão em cliente. Só precisa entrar na sidebar em vez do nav atual.

### 2.2 Clientes — `/clients` **[EXISTE]** implementado em 2026-08-13

**Lista** (`/clients`, `components/clients/ClientsBoard.tsx`):
- Colunas: nome, status (`active`/`paused`/`archived`), quantidade de contas sociais conectadas, data de criação
- Ação "Novo cliente" (`ClientForm.tsx`) só aparece para `role=admin`, porque `POST /api/clients` é restrito a admin — decisão: não afrouxar a API pra manter a criação de cliente sob controle de admin.
- Filtro por status (todos/ativos/pausados/arquivados)

**Perfil individual** (`/clients/[id]`):
- Dados do cliente (nome, status, slug do link na bio, com link pra `/b/[slug]`)
- Contas sociais conectadas
- Timeline de atividades (reaproveita `ActivityTimeline`, genérico pra `client_id`)
- Resumo de conteúdo: últimas 5 peças com status
- Links UTM ativos desse cliente
- Usuários vinculados (quem tem login com esse `client_id`)
- Resumo de insights (métricas recentes) ficou fora desta primeira versão — a tela já está grande; entra numa iteração futura se fizer falta.

**Decidido em 2026-08-13**: conversão de prospect (`POST /api/prospects/[id]/convert`) agora redireciona direto pra `/clients/[id]` do cliente recém-criado (`ConvertToClientButton.tsx`).

**Achado importante durante a implementação**: as políticas de RLS de `clients`, `content_items`, `social_accounts`, `insights_snapshots`, `video_feedback` e `carousel_feedback` só liberavam leitura cross-cliente para `is_admin()` — um usuário `role=agencia` (não-admin) via zero linhas nessas tabelas, porque staff de agência normalmente tem `client_id=null`. Corrigido na migration `016_agencia_cross_client_read.sql` (aplicada ao projeto), seguindo o mesmo padrão já usado em `prospects`/`activities` (`013_sales_crm.sql`). Isso também destrava os KPIs da seção 1 pra contas `agencia` não-admin.

### 2.3 Atividades — `/activities` **[EXISTE]** implementado em 2026-08-13
Log cross-entidade (`ActivitiesLog.tsx`): junta as últimas 200 `activities` de todos os prospects e clientes numa lista só, com filtro por tipo (email/ligação/nota/reunião) e busca por nome de cliente/prospect. Cada linha linka pro perfil do cliente (`/clients/[id]`) ou do prospect (`/pipeline/[id]`) e mostra quem registrou (`users.email`).

**Achado durante a implementação**: mesma lacuna de RLS da seção 2.2, agora em `activities` — as policies de `select`/`update`/`delete` só liberavam leitura de activities com `client_id` preenchido (timeline pós-conversão) pra `is_admin()`; `agencia` não-admin não via activities de nenhum cliente. Corrigido na migration `017_agencia_activities_client_read.sql` (aplicada ao projeto), mesmo padrão de `016`.

---

## 3. Conteúdo

### 3.1 Kanban de produção — `/kanban` **[EXISTE]**
Migra pra dentro da seção "Conteúdo" na sidebar, sem mudança funcional.

### 3.2 Calendário editorial — `/content/calendar` **[EXISTE]** implementado em 2026-08-13
Grid mensal (`EditorialCalendar.tsx`) por `scheduled_at`/`published_at` de `content_items`, cross-cliente, com navegação anterior/próximo mês por query string (`?year=&month=`). Cada dia mostra as peças daquele dia com cliente + status; dias vazios já revelam buracos na programação visualmente, sem indicador extra.

### 3.3 Biblioteca de mídia — `/content/library` **[EXISTE]** implementado em 2026-08-13
**Decidido em 2026-08-13**: listar direto do Storage, sem tabela nova (`media_assets` fica pra depois, só se tags/histórico de uso virarem necessidade real). `GET /api/content-media?client_id=` lista os objetos do bucket `content-media` por cliente (path `{client_id}/{content_item_id}/{filename}`, ver `005_storage.sql`) e gera signed URLs de 1h pra preview. Tela exige selecionar um cliente (`MediaLibrary.tsx`) antes de listar.

**Achado durante a implementação**: mesma lacuna de RLS das seções anteriores, agora na policy de `select` de `storage.objects` do bucket `content-media` — só liberava leitura cross-cliente pra `is_admin()`. Corrigido na migration `018_agencia_storage_read.sql` (aplicada ao projeto).

---

## 4. Links

### 4.1 Gerador de UTM — `/links` **[EXISTE]**
Migra pra dentro da seção, sem mudança funcional.

### 4.2 Link na Bio — `/links/bio` **[EXISTE]** implementado em 2026-08-13
`BioLinksManager.tsx`: seleciona um cliente, lista os links dele ordenados por `display_order` (coluna nova, migration `020_utm_links_display_order.sql`, com backfill pela ordem de criação), reordena com botões ▲▼ que fazem swap de `display_order` via `PATCH /api/utm-links/[id]`, e mostra um link de preview pra página pública `/b/[slug]` (que agora também ordena por `display_order`). Upload de foto de capa/avatar do cliente ficou fora — `clients` ainda não tem campo pra isso; entra numa iteração futura se virar necessidade real.

### 4.3 Relatório de cliques — `/links/clicks` **[EXISTE]** implementado em 2026-08-13
**Decidido em 2026-08-13**: tela própria (`LinkClicksReport.tsx`), reaproveitando o `UtmClicksPanel` já usado em `/insights` (que ganhou um prop `clientId` opcional) em vez de duplicar a lógica de agregação — só adiciona um seletor de cliente pra visão cross-cliente da agência.

**Achado durante a implementação**: mesma lacuna de RLS das seções anteriores, agora em `utm_links` (select/insert/update/delete) e `link_clicks` (select) — afetava até a tela `/links` que já estava em produção pra contas `agencia` não-admin. Corrigido na migration `019_agencia_utm_links_read.sql` (aplicada ao projeto).

---

## 5. Agentes de IA

### 5.1 Atividade — `/agents` **[EXISTE]** implementado em 2026-08-13
`AgentActivityPanel.tsx`: lista todas as `agent_tasks`/`agent_runs` de todos os clientes, filtro por tipo (`sugerir_legenda`/`checar_anomalia_insight`/`pesquisar_prospect`) e por status, reaproveitando `AgentTaskCard` (mesmo padrão visual de confiança/outcome já usado em `AgentReasoningPanel`).

**Achado durante a implementação**: mesma lacuna de RLS das seções anteriores, agora em `agent_tasks`/`agent_runs` (select). Corrigido na migration `021_agencia_agent_tasks_read.sql` (aplicada ao projeto).

### 5.2 Integrações — `/agents/integrations` **[EXISTE]** implementado em 2026-08-13
**Decidido em 2026-08-13**: link fixo, sem health-check real (GensBot não expõe status de saúde hoje). URL configurável via `NEXT_PUBLIC_GENSBOT_URL` (`.env.example`) — card mostra "configure a env var" se ela não estiver setada, em vez de linkar pra algo inventado.

### 5.3 Configurações — `/agents/settings` **[EXISTE]** implementado em 2026-08-13 (somente leitura)
**Decidido em 2026-08-13**: não vale o esforço de UI configurável agora — sem evidência de que os parâmetros (`ANOMALY_DROP_THRESHOLD = 0.3`, `ANOMALY_LOOKBACK_DAYS = 7` em `app/api/agent-worker/route.ts`) precisem mudar por cliente ou com frequência. Tela mostra os valores atuais em modo leitura, sem tabela nova. Se virar necessidade real, aí sim criar `agent_settings`.

---

## 6. Relatórios

### 6.1 Relatórios mensais — `/reports` **[EXISTE]** implementado em 2026-08-13
**Decidido em 2026-08-13**: continua gerando sob demanda sempre, sem salvar PDFs no Storage — sem evidência de que a regeração seja um problema real de custo/latência. Tela reaproveita `MonthlyReportDownload.tsx` (já usado em `/insights`), com seletor de cliente pra `agencia`/`admin`.

### 6.2 Insights agregados — `/reports/insights` **[EXISTE]** implementado em 2026-08-13
`InsightsOverview.tsx`: tabela comparando todos os clientes ativos lado a lado (alcance, impressões, engajamento, seguidores), últimos 30 dias, agregando `insights_snapshots` de todas as `social_accounts` por `client_id`.

---

## 7. Configurações

### 7.1 Usuários da agência — `/settings/users` **[EXISTE]** implementado em 2026-08-13, admin-only
`UsersManager.tsx`: lista usuários (email, role, status), convite por e-mail (`POST /api/users/invite`, cria via `auth.admin.inviteUserByEmail` — o trigger `handle_new_user` já popula `public.users` a partir de `raw_user_meta_data`), edição de role/cliente vinculado (`PATCH /api/users/[id]`, usa admin client quando é admin editando outro usuário), e ativar/desativar conta (`PATCH /api/users/[id]/ban`, usa `ban_duration` do Supabase Auth — sem coluna nova). Tela só é útil pra `role=admin` (as ações são admin-only na API), então staff `agencia` não-admin vê uma mensagem em vez do formulário.

**Achado durante a implementação**: mesma lacuna de RLS das seções anteriores, agora em `users` (select) — também já afetava silenciosamente a seção "usuários vinculados" de `/clients/[id]` (seção 2.2). Corrigido na migration `022_agencia_users_read.sql` (aplicada ao projeto).

### 7.2 Meu perfil — `/settings/profile` **[EXISTE]** implementado em 2026-08-13
`ProfileSettings.tsx`: troca de senha via `supabase.auth.updateUser({ password })` (client SDK) e dados somente-leitura (email, role, nome do cliente vinculado).

---

## Perguntas em aberto (preciso da sua decisão antes de detalhar mais)

1. ~~**Feed de atividade recente** (1.2): granular ou resumido por dia?~~ **Decidido em 2026-08-13: granular**, últimos 20 eventos dos últimos 14 dias, mesclando `feedback_history` + `activities` + `agent_runs` (outcome `aplicado`/`sugerido_para_revisao`) + cliques agregados por dia. Implementado em `app/(agency-portal)/agency-dashboard/page.tsx`. Pendências (1.3) também implementadas com limiar de 3 dias (mesmo valor do `StaleIndicator` do Pipeline) e anomalias = `outcome='sugerido_para_revisao'` com `confidence >= 0.7` nos últimos 7 dias — sem flag de "visto" no schema, então a lista é só "recentes", não "não vistas ainda".
2. **Conversão de prospect** (2.2): redirecionar pro perfil do cliente recém-criado?
3. **Biblioteca de mídia** (3.3): lista simples do Storage, ou tabela própria com metadados/tags?
4. **Link na Bio** (4.2): vale a pena upload de foto de capa por cliente, ou fica só texto/links por enquanto?
5. **Relatório de cliques** (4.3): tela própria ou fica dentro de Insights?
6. **Status de conexão do GensBot** (5.2): health-check de verdade (exige API nova do lado do GensBot) ou só um link fixo?
7. **Configurações do agente** (5.3): vale o esforço de tornar configurável pela UI agora, ou fica hardcoded até virar um problema real?
8. **PDFs de relatório** (6.1): salvar no Storage (histórico permanente) ou gerar sob demanda sempre?

## Notas de implementação (pra quando formos construir)

- Sidebar é um componente novo (`components/layout/Sidebar.tsx` ou similar) que substitui o `<nav>` horizontal hoje embutido direto em `app/(agency-portal)/layout.tsx` e `app/(client-portal)/layout.tsx`.
- Seções com subseções (CRM, Conteúdo, Links, Agentes de IA, Relatórios, Configurações) precisam de um padrão de sidebar expansível (grupo com subitens) — não existe hoje nenhum componente assim no design system, é novo.
- Muita rota nova aqui ainda não tem página nem API — construir em fases, não tudo de uma vez (ver `design/IMPLEMENTATION_PLAN.md` como referência de como fases anteriores foram fatiadas).
- Várias subseções dependem de colunas/tabelas novas no schema (marcadas acima) — vale mapear essas migrations antes de começar o frontend, senão os subagentes de Frontend vão ter que inventar contrato de API sem schema real por baixo.

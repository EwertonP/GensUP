# Arquitetura de informação — Portal da Agência

Status: **estrutura aprovada em 2026-08-12, detalhada em 2026-08-12**. Sidebar (`components/layout/Sidebar.tsx`) implementada em 2026-08-12 nos dois layouts, com todos os grupos/subitens abaixo — rotas **[NOVA]** apontam para páginas placeholder (`ComingSoon`) até serem construídas de fato. Este documento é a fonte da verdade de navegação — toda nova página entra numa dessas seções, não cria seção nova sem atualizar isto primeiro.

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

### 2.3 Atividades — `/activities` **[NOVA]**
Log cross-entidade: junta `activities` de todos os prospects e clientes numa lista só, com filtro por tipo (email/ligação/nota/reunião) e por cliente/prospect. Útil pra "o que a equipe fez essa semana" sem entrar em cada perfil.

---

## 3. Conteúdo

### 3.1 Kanban de produção — `/kanban` **[EXISTE]**
Migra pra dentro da seção "Conteúdo" na sidebar, sem mudança funcional.

### 3.2 Calendário editorial — `/content/calendar` **[NOVA]**
Visão por data (`scheduled_at`/`published_at` de `content_items`) em vez de por status — um calendário mensal/semanal mostrando o que está agendado pra sair quando. Útil pra ver buracos na programação (dias sem nada agendado).

### 3.3 Biblioteca de mídia — `/content/library` **[NOVA]**
Lista de arquivos já no bucket `content-media` do Storage, com preview, pra reaproveitar mídia entre peças sem re-upload. Precisa decidir: listar direto do Storage (sem tabela nova) ou criar uma tabela `media_assets` com metadados (tags, quem enviou, em quais `content_items` já foi usado)?

---

## 4. Links

### 4.1 Gerador de UTM — `/links` **[EXISTE]**
Migra pra dentro da seção, sem mudança funcional.

### 4.2 Link na Bio — `/links/bio` **[PARCIAL]**
Hoje a página pública (`/b/[clientSlug]`) já lista os `utm_links` ativos daquele cliente, na ordem de criação. Falta uma tela de **gestão** por cliente: reordenar os links (precisa de coluna `display_order` em `utm_links`, não existe ainda), preview ao vivo da página pública, upload de foto de capa/avatar do cliente (não existe campo pra isso em `clients` hoje).

### 4.3 Relatório de cliques — `/links/clicks` **[PARCIAL]**
Dado já existe (`link_clicks`) e já tem um gráfico dentro de `/insights` (`UtmClicksPanel`). Decisão pendente: vira tela própria aqui, ou fica linkado/reaproveitado de dentro de Insights pra não duplicar?

---

## 5. Agentes de IA

### 5.1 Atividade — `/agents` **[PARCIAL]**
Dado já existe (`agent_tasks`/`agent_runs`), painel hoje só existe por `content_item` individual (`AgentReasoningPanel`). Tela nova precisa: listar todas as tasks de todos os clientes, filtro por tipo (`sugerir_legenda`/`checar_anomalia_insight`/`pesquisar_prospect`) e por status, com o mesmo padrão visual de confiança/outcome já usado.

### 5.2 Integrações — `/agents/integrations` **[NOVA]**
Card mostrando: GensBot conectado (sim/não — como medir isso? precisa de um health-check ou só mostrar o link fixo pro painel dele), link direto pro painel do GensBot. Não requer nova tabela — é praticamente uma página estática com um link, a menos que você queira status de saúde de verdade (aí precisaria de uma chamada de API pro GensBot, que hoje não expõe isso).

### 5.3 Configurações — `/agents/settings` **[NOVA]**
Hoje os parâmetros do agente estão hardcoded no código (`ANOMALY_DROP_THRESHOLD = 0.3`, `ANOMALY_LOOKBACK_DAYS = 7` em `app/api/agent-worker/route.ts`). Pra virar configurável pela UI, precisa de uma tabela nova (`agent_settings` ou similar, por `client_id` ou global) e o worker passa a ler de lá em vez de constante fixa.

---

## 6. Relatórios

### 6.1 Relatórios mensais — `/reports` **[PARCIAL]**
Geração já existe (`GET /api/reports/monthly?client_id=&month=`), retorna PDF sob demanda. Falta: tela de listagem por cliente/mês, e decidir se os PDFs gerados ficam salvos (Storage) pra não precisar regerar toda vez, ou se continua gerando na hora sempre que pedido.

### 6.2 Insights agregados — `/reports/insights` **[NOVA]**
Visão cross-cliente das métricas (hoje `/insights` é sempre de um cliente por vez). Útil pra agência comparar performance entre clientes, ver quem está crescendo/caindo.

---

## 7. Configurações

### 7.1 Usuários da agência — `/settings/users` **[PARCIAL]**
API já existe (`/api/users`), sem tela. Precisa: lista de usuários (nome, email, role, cliente vinculado se for `cliente`), criar/editar/desativar conta pela UI em vez de eu mexer direto no Supabase.

### 7.2 Meu perfil — `/settings/profile` **[NOVA]**
Trocar senha, ver o próprio role/cliente vinculado. Hoje não existe absolutamente nada disso — nem trocar senha é possível pela UI.

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

# Arquitetura de informação — Portal da Agência

Status: **estrutura aprovada em 2026-08-12**, ainda não implementada (sidebar atual do portal é um menu horizontal simples com 3 links). Este documento é a fonte da verdade de navegação — toda nova página entra numa dessas seções, não cria seção nova sem atualizar isto primeiro.

Navegação: sidebar esquerda (troca o menu horizontal atual dos dois portais — agência e cliente, mesmo padrão visual). Cliente mantém as seções que já tem (Dashboard, Aprovações, Insights), só muda de horizontal pra sidebar.

## 1. Dashboard
Rota: `/dashboard` (agência — hoje não existe; existe só a versão do cliente em `(client-portal)/dashboard`, que é outro dashboard, mais simples)

- **Visão geral** — KPIs: clientes ativos, aprovações pendentes, prospects em aberto, cliques no mês
- **Atividade recente** — feed cronológico cross-cliente: aprovações, prospects movidos de estágio, cliques em links, execuções do agente
- **Pendências** — o que precisa de ação humana agora: peças paradas há X dias, prospects sem contato recente, anomalias de insight detectadas pelo agente

## 2. CRM
- **Pipeline** — `/pipeline` (já existe) — prospects por estágio, kanban
- **Clientes** — `/clients` (nova) — lista de clientes ativos → `/clients/[id]` (perfil: dados, contas sociais conectadas, timeline de atividades via `ActivityTimeline` já genérico, resumo de conteúdo/insights daquele cliente)
- **Atividades** — `/activities` (nova) — log unificado de todas as interações (prospects + clientes juntos), visão "o que aconteceu essa semana" sem entrar cliente por cliente

## 3. Conteúdo
- **Kanban de produção** — `/kanban` (já existe, migra pra dentro desta seção na sidebar)
- **Calendário editorial** — `/content/calendar` (nova) — visão por data em vez de por status
- **Biblioteca de mídia** — `/content/library` (nova) — arquivos já enviados ao Storage, reutilizáveis entre peças

## 4. Links
- **Gerador de UTM** — `/links` (já existe, migra pra dentro desta seção)
- **Link na Bio** — `/links/bio` (nova) — gestão de quais links aparecem na página pública `/b/[clientSlug]` de cada cliente, em que ordem (hoje só existe a página pública em si, sem tela de gestão dedicada — a criação de link já cobre isso parcialmente via `is_active`, mas falta reordenação/preview)
- **Relatório de cliques** — `/links/clicks` (nova, ou mantém dentro de Insights — decidir na implementação) — hoje é um gráfico dentro de `/insights`

## 5. Agentes de IA
- **Atividade** — `/agents` (nova) — painel consolidado de `agent_tasks`/`agent_runs` de todos os clientes (hoje só existe por `content_item` individual)
- **Integrações** — `/agents/integrations` (nova) — status de conexão do GensBot (externo, ver `plataforma_agencia_meta_scope` na memória do projeto — GensBot cuida de automação de Direct/mensagens), link de acesso
- **Configurações** — `/agents/settings` (nova) — quais tipos de `agent_tasks.type` estão ativos, thresholds de anomalia (hoje hardcoded em `app/api/agent-worker/route.ts`: `ANOMALY_DROP_THRESHOLD = 0.3`, `ANOMALY_LOOKBACK_DAYS = 7`)

## 6. Relatórios
- **Relatórios mensais** — `/reports` (nova tela de listagem/histórico — a geração de PDF já existe via `GET /api/reports/monthly`, falta a tela)
- **Insights agregados** — `/reports/insights` (nova) — visão cross-cliente, hoje `/insights` é sempre por cliente individual

## 7. Configurações
- **Usuários da agência** — `/settings/users` (nova) — criar/editar contas (hoje só via API `/api/users`, sem tela — contas são criadas manualmente no Supabase pelo Claude Code)
- **Meu perfil** — `/settings/profile` (nova)

## Notas de implementação (pra quando formos construir)

- Sidebar é um componente novo (`components/layout/Sidebar.tsx` ou similar) que substitui o `<nav>` horizontal hoje embutido direto em `app/(agency-portal)/layout.tsx` e `app/(client-portal)/layout.tsx`.
- Seções com subseções (CRM, Conteúdo, Links, Agentes de IA, Relatórios, Configurações) precisam de um padrão de sidebar expansível (grupo com subitens) — não existe hoje nenhum componente assim no design system, é novo.
- Muita rota nova aqui ainda não tem página nem API — construir em fases, não tudo de uma vez (ver `design/IMPLEMENTATION_PLAN.md` como referência de como fases anteriores foram fatiadas).

-- 013_agent_worker_hardening.sql
--
-- Defesa em profundidade para a fila do agente autônomo (Fase 5), preparada
-- de forma independente da migration 013_sales_crm.sql (subagente de Backend,
-- rodando em paralelo neste mesmo momento). Se ambas as migrations acabarem
-- numeradas 013_ após o merge, renomeie uma delas (ex: esta para
-- 014_agent_worker_hardening.sql) mantendo a ordem: RLS/constraints aditivos
-- não dependem de nenhuma tabela nova do CRM, só de agent_tasks (já existente
-- desde 001_schema.sql / 002_rls_policies.sql).
--
-- Motivação: hoje agent_tasks tem apenas uma policy de SELECT
-- ("agent_tasks_same_client_or_admin", ver 002_rls_policies.sql). Sem policy
-- de INSERT, o comportamento padrão do RLS já bloqueia inserts de qualquer
-- role autenticado via JWT (anon/authenticated) — mas isso também bloquearia
-- a própria "agencia" de criar tasks legitimamente quando o endpoint
-- app/api/agent-tasks (Fase 5, Backend) usar o client autenticado do usuário
-- em vez do service_role. Esta migration formaliza a intenção: só
-- agencia/admin podem inserir, nunca cliente.

-- =========================================================
-- agent_tasks: policy de INSERT restrita a agencia/admin
-- =========================================================
drop policy if exists "agent_tasks_insert_agencia_or_admin" on agent_tasks;

create policy "agent_tasks_insert_agencia_or_admin" on agent_tasks
  for insert
  with check (
    auth_role() in ('agencia', 'admin')
    and (client_id is null or client_id = auth_client_id() or is_admin())
  );

-- =========================================================
-- agent_tasks.type: allowlist de tipos conhecidos
--
-- Hoje é `text` livre — qualquer string passa. Se o worker
-- (app/api/agent-worker/route.ts, Fase 5) usar `type` para decidir qual
-- handler chamar sem validação de aplicação, uma string arbitrária pode virar
-- superfície de risco (ex: dispatch dinâmico, injeção de comportamento
-- inesperado). Trava no banco como defesa em profundidade, independente da
-- validação que o Backend deve fazer também na API.
--
-- Ajuste esta lista se o Backend introduzir tipos adicionais — o objetivo é
-- ser uma allowlist explícita, não um bloqueio definitivo.
-- =========================================================
alter table agent_tasks
  add constraint agent_tasks_type_allowlist
  check (type in ('sugerir_legenda', 'checar_anomalia_insight', 'pesquisar_prospect'));

-- =========================================================
-- agent_tasks.payload: limite de tamanho
--
-- Evita abuso (payloads gigantes inflando custo/tempo do worker, ou tentando
-- estourar limites de contexto do LLM chamado por lib/llm/index.ts). 10KB é
-- generoso para o payload estruturado esperado (ids, textos curtos) sem abrir
-- espaço para anexar blobs grandes via jsonb.
-- =========================================================
alter table agent_tasks
  add constraint agent_tasks_payload_size_limit
  check (pg_column_size(payload) < 10000);

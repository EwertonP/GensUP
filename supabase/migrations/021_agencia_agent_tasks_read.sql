-- 021_agencia_agent_tasks_read.sql
-- Mesmo problema corrigido em 016/017/018/019, agora em agent_tasks/agent_runs
-- -- select só liberava leitura cross-cliente pra is_admin(). Necessário pra
-- tela /agents (design/INFORMATION_ARCHITECTURE.md seção 5.1), que lista
-- tasks de todos os clientes pra contas agencia não-admin.

drop policy if exists "agent_tasks_same_client_or_admin" on agent_tasks;
create policy "agent_tasks_same_client_or_admin" on agent_tasks
  for select using (client_id = auth_client_id() or is_admin() or auth_role() = 'agencia');

drop policy if exists "agent_runs_same_client_or_admin" on agent_runs;
create policy "agent_runs_same_client_or_admin" on agent_runs
  for select using (
    is_admin() or auth_role() = 'agencia' or exists (
      select 1 from agent_tasks at_
      where at_.id = agent_runs.agent_task_id
      and at_.client_id = auth_client_id()
    )
  );

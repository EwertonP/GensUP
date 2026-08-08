-- 002_rls_policies.sql
-- RLS: isolamento por client_id via JWT (app_metadata.client_id / app_metadata.role)

alter table clients enable row level security;
alter table users enable row level security;
alter table social_accounts enable row level security;
alter table content_items enable row level security;
alter table video_feedback enable row level security;
alter table carousel_feedback enable row level security;
alter table insights_snapshots enable row level security;
alter table agent_tasks enable row level security;
alter table agent_runs enable row level security;

-- =========================================================
-- Helpers (lidos do JWT emitido pelo Supabase Auth)
-- =========================================================
create or replace function auth_client_id() returns uuid
language sql stable as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'client_id', '')::uuid
$$;

create or replace function auth_role() returns text
language sql stable as $$
  select auth.jwt() -> 'app_metadata' ->> 'role'
$$;

create or replace function is_admin() returns boolean
language sql stable as $$
  select auth_role() = 'admin'
$$;

-- service_role (edge functions) ignora RLS por padrão no Supabase,
-- então as políticas abaixo cobrem apenas roles autenticados via JWT.

-- =========================================================
-- clients
-- =========================================================
create policy "clients_select_own_or_admin" on clients
  for select using (id = auth_client_id() or is_admin());

create policy "clients_admin_write" on clients
  for all using (is_admin()) with check (is_admin());

-- =========================================================
-- users
-- =========================================================
create policy "users_select_same_client_or_admin" on users
  for select using (client_id = auth_client_id() or is_admin());

create policy "users_update_self" on users
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "users_admin_write" on users
  for insert with check (is_admin());

create policy "users_admin_delete" on users
  for delete using (is_admin());

-- =========================================================
-- social_accounts
-- =========================================================
create policy "social_accounts_same_client_or_admin" on social_accounts
  for select using (client_id = auth_client_id() or is_admin());

create policy "social_accounts_agencia_write" on social_accounts
  for all using (client_id = auth_client_id() and auth_role() in ('agencia', 'admin'))
  with check (client_id = auth_client_id() and auth_role() in ('agencia', 'admin'));

-- =========================================================
-- content_items
-- =========================================================
create policy "content_items_same_client_or_admin" on content_items
  for select using (client_id = auth_client_id() or is_admin());

create policy "content_items_write_same_client" on content_items
  for insert with check (client_id = auth_client_id());

create policy "content_items_update_same_client" on content_items
  for update using (client_id = auth_client_id() or is_admin())
  with check (client_id = auth_client_id() or is_admin());

-- =========================================================
-- video_feedback / carousel_feedback (via content_items.client_id)
-- =========================================================
create policy "video_feedback_same_client_or_admin" on video_feedback
  for select using (
    is_admin() or exists (
      select 1 from content_items ci
      where ci.id = video_feedback.content_item_id
      and ci.client_id = auth_client_id()
    )
  );

create policy "video_feedback_write_same_client" on video_feedback
  for insert with check (
    exists (
      select 1 from content_items ci
      where ci.id = content_item_id
      and ci.client_id = auth_client_id()
    )
  );

create policy "carousel_feedback_same_client_or_admin" on carousel_feedback
  for select using (
    is_admin() or exists (
      select 1 from content_items ci
      where ci.id = carousel_feedback.content_item_id
      and ci.client_id = auth_client_id()
    )
  );

create policy "carousel_feedback_write_same_client" on carousel_feedback
  for insert with check (
    exists (
      select 1 from content_items ci
      where ci.id = content_item_id
      and ci.client_id = auth_client_id()
    )
  );

-- =========================================================
-- insights_snapshots (via social_accounts.client_id)
-- =========================================================
create policy "insights_snapshots_same_client_or_admin" on insights_snapshots
  for select using (
    is_admin() or exists (
      select 1 from social_accounts sa
      where sa.id = insights_snapshots.social_account_id
      and sa.client_id = auth_client_id()
    )
  );

-- =========================================================
-- agent_tasks / agent_runs
-- =========================================================
create policy "agent_tasks_same_client_or_admin" on agent_tasks
  for select using (client_id = auth_client_id() or is_admin());

create policy "agent_runs_same_client_or_admin" on agent_runs
  for select using (
    is_admin() or exists (
      select 1 from agent_tasks at_
      where at_.id = agent_runs.agent_task_id
      and at_.client_id = auth_client_id()
    )
  );

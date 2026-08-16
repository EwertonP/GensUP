-- 016_agencia_cross_client_read.sql
-- Corrige lacuna de RLS: role='agencia' (staff de agência, client_id costuma
-- ser null pois não pertence a um cliente específico) não conseguia ler
-- clients/content_items/social_accounts/insights_snapshots/video_feedback/
-- carousel_feedback de nenhum cliente -- as políticas de 002_rls_policies.sql
-- só liberavam acesso cross-cliente para is_admin(). 013_sales_crm.sql já
-- tinha corrigido o mesmo problema para prospects/activities; esta migration
-- aplica o mesmo padrão (auth_role() in ('agencia','admin')) às tabelas
-- restantes usadas pelo portal da agência (dashboard, kanban, telas de
-- clientes). Escopo: apenas policies de SELECT -- não altera INSERT/UPDATE/DELETE.

drop policy if exists "clients_select_own_or_admin" on clients;
create policy "clients_select_own_or_admin" on clients
  for select using (id = auth_client_id() or is_admin() or auth_role() = 'agencia');

drop policy if exists "content_items_same_client_or_admin" on content_items;
create policy "content_items_same_client_or_admin" on content_items
  for select using (client_id = auth_client_id() or is_admin() or auth_role() = 'agencia');

drop policy if exists "social_accounts_same_client_or_admin" on social_accounts;
create policy "social_accounts_same_client_or_admin" on social_accounts
  for select using (client_id = auth_client_id() or is_admin() or auth_role() = 'agencia');

drop policy if exists "insights_snapshots_same_client_or_admin" on insights_snapshots;
create policy "insights_snapshots_same_client_or_admin" on insights_snapshots
  for select using (
    is_admin() or auth_role() = 'agencia' or exists (
      select 1 from social_accounts sa
      where sa.id = insights_snapshots.social_account_id
      and sa.client_id = auth_client_id()
    )
  );

drop policy if exists "video_feedback_same_client_or_admin" on video_feedback;
create policy "video_feedback_same_client_or_admin" on video_feedback
  for select using (
    is_admin() or auth_role() = 'agencia' or exists (
      select 1 from content_items ci
      where ci.id = video_feedback.content_item_id
      and ci.client_id = auth_client_id()
    )
  );

drop policy if exists "carousel_feedback_same_client_or_admin" on carousel_feedback;
create policy "carousel_feedback_same_client_or_admin" on carousel_feedback
  for select using (
    is_admin() or auth_role() = 'agencia' or exists (
      select 1 from content_items ci
      where ci.id = carousel_feedback.content_item_id
      and ci.client_id = auth_client_id()
    )
  );

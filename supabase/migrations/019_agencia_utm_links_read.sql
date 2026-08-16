-- 019_agencia_utm_links_read.sql
-- Mesmo problema corrigido em 016/017/018, agora em utm_links e link_clicks.
-- Essas policies só liberavam acesso cross-cliente pra is_admin() -- afetava
-- inclusive a tela /links já em produção pra qualquer conta role=agencia
-- não-admin (client_id costuma ser null pra staff de agência).

drop policy if exists "utm_links_select_same_client_or_admin" on utm_links;
create policy "utm_links_select_same_client_or_admin" on utm_links
  for select using (client_id = auth_client_id() or is_admin() or auth_role() = 'agencia');

drop policy if exists "utm_links_insert_same_client" on utm_links;
create policy "utm_links_insert_same_client" on utm_links
  for insert with check (
    (client_id = auth_client_id() or is_admin() or auth_role() = 'agencia')
    and auth_role() in ('agencia', 'admin')
  );

drop policy if exists "utm_links_update_same_client" on utm_links;
create policy "utm_links_update_same_client" on utm_links
  for update using (
    (client_id = auth_client_id() or is_admin() or auth_role() = 'agencia')
    and auth_role() in ('agencia', 'admin')
  )
  with check (
    (client_id = auth_client_id() or is_admin() or auth_role() = 'agencia')
    and auth_role() in ('agencia', 'admin')
  );

drop policy if exists "utm_links_delete_same_client" on utm_links;
create policy "utm_links_delete_same_client" on utm_links
  for delete using (
    (client_id = auth_client_id() or is_admin() or auth_role() = 'agencia')
    and auth_role() in ('agencia', 'admin')
  );

drop policy if exists "link_clicks_select_same_client_or_admin" on link_clicks;
create policy "link_clicks_select_same_client_or_admin" on link_clicks
  for select using (
    is_admin() or auth_role() = 'agencia' or exists (
      select 1 from utm_links ul
      where ul.id = link_clicks.utm_link_id
      and ul.client_id = auth_client_id()
    )
  );

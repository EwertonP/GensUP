-- 022_agencia_users_read.sql
-- Mesmo problema corrigido em 016/017/018/019/021, agora em users -- select
-- só liberava leitura cross-cliente pra is_admin(). Necessário pra tela
-- /settings/users (design/INFORMATION_ARCHITECTURE.md seção 7.1) e também já
-- afetava silenciosamente a seção "usuários vinculados" de /clients/[id].

drop policy if exists "users_select_same_client_or_admin" on users;
create policy "users_select_same_client_or_admin" on users
  for select using (client_id = auth_client_id() or is_admin() or auth_role() = 'agencia');

-- 017_agencia_activities_client_read.sql
-- Mesmo problema corrigido em 016_agencia_cross_client_read.sql, encontrado
-- agora em activities: a policy de select/update/delete só liberava leitura
-- de activities com client_id preenchido (timeline pós-conversão) pra
-- is_admin() -- role=agencia não-admin não via activities de clientes que
-- não fossem o seu (client_id costuma ser null pra staff de agência).
-- activities_insert já liberava agencia pra esse ramo; só select/update/delete
-- ficaram pra trás.

drop policy if exists "activities_select" on activities;
create policy "activities_select" on activities
  for select using (
    (client_id is not null and (client_id = auth_client_id() or is_admin() or auth_role() = 'agencia'))
    or (prospect_id is not null and auth_role() in ('agencia', 'admin'))
  );

drop policy if exists "activities_update_delete" on activities;
create policy "activities_update_delete" on activities
  for update using (
    (client_id is not null and (client_id = auth_client_id() or is_admin() or auth_role() = 'agencia'))
    or (prospect_id is not null and auth_role() in ('agencia', 'admin'))
  );

drop policy if exists "activities_delete" on activities;
create policy "activities_delete" on activities
  for delete using (
    (client_id is not null and (client_id = auth_client_id() or is_admin() or auth_role() = 'agencia'))
    or (prospect_id is not null and auth_role() in ('agencia', 'admin'))
  );

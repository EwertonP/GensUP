-- 007_insights_sync.sql
-- Suporte ao sync real de insights via Instagram Graph API:
--   1. social_accounts precisa guardar o ID da conta na plataforma externa
--      (ex: Instagram Business Account ID) — é isso que fetchAccountInsights
--      usa para chamar a Graph API, e não dá pra derivar de social_accounts.id.
--   2. insights_snapshots precisa de uma constraint unique para permitir upsert
--      idempotente por (social_account_id, snapshot_date, metric) — sem isso,
--      rodar o sync duas vezes no mesmo dia duplicava snapshots.

alter table social_accounts add column if not exists platform_account_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'insights_snapshots_unique_snapshot'
  ) then
    alter table insights_snapshots
      add constraint insights_snapshots_unique_snapshot
      unique (social_account_id, snapshot_date, metric);
  end if;
end $$;

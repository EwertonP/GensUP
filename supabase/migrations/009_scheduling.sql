-- 009_scheduling.sql
-- Publicacao automatica (Fase 3) — ver app/api/publish/route.ts e
-- lib/meta-api/index.ts (publishToInstagram). Adiciona agendamento e o
-- carimbo de quando a peca foi efetivamente publicada no Instagram.

alter table content_items add column if not exists scheduled_at timestamptz;
alter table content_items add column if not exists published_at timestamptz;

-- Acelera a query do job de publicacao: status='approved' and scheduled_at <= now().
create index if not exists idx_content_items_scheduled_at
  on content_items(scheduled_at)
  where status = 'approved' and published_at is null;

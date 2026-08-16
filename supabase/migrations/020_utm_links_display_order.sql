-- 020_utm_links_display_order.sql
-- Coluna pra reordenação manual do Link na Bio (design/INFORMATION_ARCHITECTURE.md
-- seção 4.2) -- hoje a página pública /b/[slug] lista por created_at desc,
-- sem controle de ordem pelo usuário.

alter table utm_links add column if not exists display_order integer not null default 0;

-- Backfill: ordem atual (created_at asc) vira a ordem inicial, por cliente.
with ordered as (
  select id, row_number() over (partition by client_id order by created_at asc) - 1 as rn
  from utm_links
)
update utm_links
set display_order = ordered.rn
from ordered
where utm_links.id = ordered.id;

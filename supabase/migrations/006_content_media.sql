-- =========================================================
-- content_items: metadados e midia (title/caption/media_url)
-- =========================================================
alter table content_items add column if not exists title text;
alter table content_items add column if not exists caption text;
alter table content_items add column if not exists media_url text;

-- =========================================================
-- content_pages: paginas de carrossel (1 linha por pagina/imagem)
-- =========================================================
create table if not exists content_pages (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references content_items(id) on delete cascade,
  page_number int not null,
  media_url text not null,
  is_cta boolean not null default false,
  created_at timestamptz not null default now(),
  unique (content_item_id, page_number)
);

alter table content_pages enable row level security;

create policy "content_pages_same_client_or_admin" on content_pages
  for select using (
    is_admin() or exists (
      select 1 from content_items ci
      where ci.id = content_pages.content_item_id
      and ci.client_id = auth_client_id()
    )
  );

create policy "content_pages_write_same_client" on content_pages
  for insert with check (
    exists (
      select 1 from content_items ci
      where ci.id = content_item_id
      and ci.client_id = auth_client_id()
    )
  );

create policy "content_pages_update_same_client" on content_pages
  for update using (
    is_admin() or exists (
      select 1 from content_items ci
      where ci.id = content_pages.content_item_id
      and ci.client_id = auth_client_id()
    )
  )
  with check (
    is_admin() or exists (
      select 1 from content_items ci
      where ci.id = content_pages.content_item_id
      and ci.client_id = auth_client_id()
    )
  );

create policy "content_pages_delete_same_client" on content_pages
  for delete using (
    is_admin() or exists (
      select 1 from content_items ci
      where ci.id = content_pages.content_item_id
      and ci.client_id = auth_client_id()
    )
  );

-- 008_utm_links.sql
-- Gerador de Link UTM + Link na Bio (Fase 3) — ver secao correspondente em
-- plataforma-agencia-arquitetura.md. utm_links.slug e global (rota publica
-- /l/[slug] nao conhece client_id); clients.slug e o "linktree" publico em /b/[slug].

alter table clients add column if not exists slug text unique;

create table if not exists utm_links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  slug text not null unique,
  title text not null,
  destination_url text not null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  is_active boolean not null default true,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists utm_links_client_id_idx on utm_links(client_id);

create table if not exists link_clicks (
  id uuid primary key default gen_random_uuid(),
  utm_link_id uuid not null references utm_links(id) on delete cascade,
  clicked_at timestamptz not null default now(),
  referrer text,
  user_agent text,
  country text
);

create index if not exists link_clicks_utm_link_id_idx on link_clicks(utm_link_id);

alter table utm_links enable row level security;
alter table link_clicks enable row level security;

-- =========================================================
-- utm_links: leitura/escrita restrita ao client_id do usuario (mesmo padrao
-- de content_items). A leitura publica da lista ativa (para /b/[slug]) e a
-- escrita do clique em link_clicks acontecem via service_role na rota de
-- redirect (app/l/[slug]/route.ts), que ignora RLS — nao precisa de policy
-- publica aqui.
-- =========================================================
create policy "utm_links_select_same_client_or_admin" on utm_links
  for select using (client_id = auth_client_id() or is_admin());

create policy "utm_links_insert_same_client" on utm_links
  for insert with check (
    (client_id = auth_client_id() or is_admin())
    and auth_role() in ('agencia', 'admin')
  );

create policy "utm_links_update_same_client" on utm_links
  for update using (
    (client_id = auth_client_id() or is_admin())
    and auth_role() in ('agencia', 'admin')
  )
  with check (
    (client_id = auth_client_id() or is_admin())
    and auth_role() in ('agencia', 'admin')
  );

create policy "utm_links_delete_same_client" on utm_links
  for delete using (
    (client_id = auth_client_id() or is_admin())
    and auth_role() in ('agencia', 'admin')
  );

-- link_clicks: so leitura autenticada (dashboard de insights), pelo client
-- dono do link. Escrita e feita via service_role (bypassa RLS) na rota publica
-- de redirect.
create policy "link_clicks_select_same_client_or_admin" on link_clicks
  for select using (
    is_admin() or exists (
      select 1 from utm_links ul
      where ul.id = link_clicks.utm_link_id
      and ul.client_id = auth_client_id()
    )
  );

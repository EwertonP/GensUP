-- 003_storage.sql
-- Bucket privado para mídia de content_items (vídeos, imagens de carrossel)
-- Isolamento por client_id: todo objeto vive em `{client_id}/{content_item_id}/{filename}`
-- e as políticas de storage validam o primeiro segmento do path contra o
-- client_id do usuário autenticado (mesmo padrão de auth_client_id()/auth_role()
-- usado em 002_rls_policies.sql).

insert into storage.buckets (id, name, public, file_size_limit)
values ('content-media', 'content-media', false, 524288000) -- 500MB por objeto
on conflict (id) do nothing;

-- =========================================================
-- Helper: primeiro segmento do path do objeto = client_id
-- =========================================================
create or replace function storage_object_client_id(object_name text) returns uuid
language sql immutable as $$
  select nullif((storage.foldername(object_name))[1], '')::uuid
$$;

-- =========================================================
-- Policies em storage.objects, restritas ao bucket content-media
-- =========================================================

-- Leitura: qualquer usuário autenticado do mesmo client_id (ou admin)
create policy "content_media_select_same_client_or_admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'content-media'
    and (storage_object_client_id(name) = public.auth_client_id() or public.is_admin())
  );

-- Upload: apenas agência/admin do mesmo client_id do path
create policy "content_media_insert_agencia_or_admin" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'content-media'
    and storage_object_client_id(name) = public.auth_client_id()
    and public.auth_role() in ('agencia', 'admin')
  );

-- Update (ex: upsert de re-upload): mesma regra do insert
create policy "content_media_update_agencia_or_admin" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'content-media'
    and storage_object_client_id(name) = public.auth_client_id()
    and public.auth_role() in ('agencia', 'admin')
  )
  with check (
    bucket_id = 'content-media'
    and storage_object_client_id(name) = public.auth_client_id()
    and public.auth_role() in ('agencia', 'admin')
  );

-- Delete: apenas agência/admin do mesmo client_id do path
create policy "content_media_delete_agencia_or_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'content-media'
    and storage_object_client_id(name) = public.auth_client_id()
    and public.auth_role() in ('agencia', 'admin')
  );

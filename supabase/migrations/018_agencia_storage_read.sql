-- 018_agencia_storage_read.sql
-- Mesmo problema corrigido em 016/017, agora em storage.objects (bucket
-- content-media): a policy de select só liberava leitura cross-cliente pra
-- is_admin(); role=agencia não-admin (client_id costuma ser null) não
-- conseguia listar/baixar mídia de nenhum cliente. Necessário para a
-- Biblioteca de mídia (design/INFORMATION_ARCHITECTURE.md seção 3.3), que
-- lista objetos direto do bucket.

drop policy if exists "content_media_select_same_client_or_admin" on storage.objects;
create policy "content_media_select_same_client_or_admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'content-media'
    and (
      storage_object_client_id(name) = public.auth_client_id()
      or public.is_admin()
      or public.auth_role() = 'agencia'
    )
  );

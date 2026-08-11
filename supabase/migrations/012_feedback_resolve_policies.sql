-- 011_feedback_resolve_policies.sql
-- Achado BAIXO (docs/security/REVIEW_FASE1.md, item 3): video_feedback/carousel_feedback
-- so tinham policies de select/insert -- ninguem conseguia marcar um feedback como
-- resolved via RLS (nem o autor, nem agencia, nem admin via JWT de usuario), so via
-- service_role. Esta migration adiciona policies de update/delete no mesmo padrao ja
-- usado para content_pages (006_content_media.sql): qualquer usuario do mesmo client_id
-- do content_item pai (cliente ou agencia) pode atualizar/remover o feedback -- e o
-- mesmo escopo que ja vale para leitura (video_feedback_same_client_or_admin) e insercao
-- (video_feedback_write_same_client).
--
-- Decisao de produto (documentada para revisao humana): quem resolve feedback nao e
-- restrito por role dentro do client_id (cliente pode ter deixado o comentario e a
-- agencia quem resolve, ou vice-versa) -- segue o mesmo modelo de content_pages, que
-- tambem nao restringe por role, so por tenant. Se o produto quiser restringir so a
-- agencia/admin resolver feedback, trocar `client_id = auth_client_id()` por
-- `client_id = auth_client_id() and auth_role() in ('agencia', 'admin')` abaixo.

create policy "video_feedback_update_same_client" on video_feedback
  for update using (
    is_admin() or exists (
      select 1 from content_items ci
      where ci.id = video_feedback.content_item_id
      and ci.client_id = auth_client_id()
    )
  )
  with check (
    is_admin() or exists (
      select 1 from content_items ci
      where ci.id = video_feedback.content_item_id
      and ci.client_id = auth_client_id()
    )
  );

create policy "video_feedback_delete_same_client" on video_feedback
  for delete using (
    is_admin() or exists (
      select 1 from content_items ci
      where ci.id = video_feedback.content_item_id
      and ci.client_id = auth_client_id()
    )
  );

create policy "carousel_feedback_update_same_client" on carousel_feedback
  for update using (
    is_admin() or exists (
      select 1 from content_items ci
      where ci.id = carousel_feedback.content_item_id
      and ci.client_id = auth_client_id()
    )
  )
  with check (
    is_admin() or exists (
      select 1 from content_items ci
      where ci.id = carousel_feedback.content_item_id
      and ci.client_id = auth_client_id()
    )
  );

create policy "carousel_feedback_delete_same_client" on carousel_feedback
  for delete using (
    is_admin() or exists (
      select 1 from content_items ci
      where ci.id = carousel_feedback.content_item_id
      and ci.client_id = auth_client_id()
    )
  );

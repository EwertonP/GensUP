-- 010_audit.sql
-- Fase 4: auditoria de mudanças de status em content_items.
--
-- feedback_history registra cada transição de status (draft -> in_review -> ...)
-- para dar visibilidade de "quem aprovou/pediu mudanças e quando" — complementar
-- a video_feedback/carousel_feedback (que guardam o comentário em si, não o
-- histórico de status do item como um todo).

create table if not exists feedback_history (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references content_items(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references users(id),
  changed_at timestamptz not null default now()
);

create index if not exists feedback_history_content_item_id_idx
  on feedback_history(content_item_id);

alter table feedback_history enable row level security;

-- Mesmo padrão de content_pages (006): select restrito a quem enxerga o
-- content_item correspondente via client_id (ou admin).
create policy "feedback_history_same_client_or_admin" on feedback_history
  for select using (
    is_admin() or exists (
      select 1 from content_items ci
      where ci.id = feedback_history.content_item_id
      and ci.client_id = auth_client_id()
    )
  );

-- Sem policy de insert: as linhas só são criadas pelo trigger abaixo
-- (security definer), nunca diretamente por um client autenticado.

-- =========================================================
-- Trigger: registra automaticamente toda mudança de status
-- =========================================================
create or replace function log_content_item_status_change() returns trigger
language plpgsql security definer as $$
begin
  if new.status is distinct from old.status then
    insert into feedback_history (content_item_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists on_content_item_status_change on content_items;
create trigger on_content_item_status_change
  after update of status on content_items
  for each row execute function log_content_item_status_change();

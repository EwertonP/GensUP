-- 004_triggers.sql
-- Trigger: cria profile em public.users ao registrar em auth.users
-- Trigger: sincroniza client_id/role para app_metadata do JWT

create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.users (id, client_id, email, role)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'client_id', '')::uuid,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'cliente')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Mantém app_metadata.client_id / app_metadata.role em sincronia com public.users
-- (necessário porque as policies de RLS leem do JWT, não da tabela users)
create or replace function sync_user_app_metadata() returns trigger
language plpgsql security definer as $$
begin
  update auth.users
  set raw_app_meta_data = raw_app_meta_data
    || jsonb_build_object('client_id', new.client_id, 'role', new.role)
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_public_user_upsert on public.users;
create trigger on_public_user_upsert
  after insert or update of client_id, role on public.users
  for each row execute function sync_user_app_metadata();

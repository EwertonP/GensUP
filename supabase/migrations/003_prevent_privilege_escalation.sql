-- 003_prevent_privilege_escalation.sql
-- Achado CRÍTICO (revisão de segurança Fase 1): a policy "users_update_self" (002_rls_policies.sql)
-- permite que o próprio usuário faça UPDATE em qualquer coluna da sua linha em public.users,
-- incluindo `role` e `client_id`. O trigger sync_user_app_metadata (004_triggers.sql) propaga
-- essas colunas para auth.users.raw_app_meta_data, que é exatamente o que as policies de RLS
-- usam (auth_client_id() / auth_role() / is_admin()) para decidir acesso.
--
-- Sem esta guarda, um usuário `cliente` poderia:
--   update public.users set role = 'admin' where id = auth.uid();
-- e, após o próximo refresh de sessão, ganhar acesso admin (cross-tenant total) — ou trocar
-- client_id para o de outro cliente e assumir a identidade de um tenant diferente.
--
-- Esta migration adiciona uma trigger BEFORE UPDATE que bloqueia mudanças de role/client_id
-- feitas pelo próprio usuário autenticado (mantendo permitido para chamadas admin ou via
-- service_role, que não têm auth.uid() de sessão de usuário).

create or replace function prevent_self_privilege_escalation() returns trigger
language plpgsql security definer as $$
begin
  -- auth.uid() é null em chamadas via service_role (edge functions, jobs internos) ou
  -- funções SECURITY DEFINER sem contexto de sessão — essas continuam permitidas.
  if auth.uid() is null then
    return new;
  end if;

  -- admins podem alterar role/client_id de qualquer usuário (ex: console admin).
  if auth_role() = 'admin' then
    return new;
  end if;

  if new.role is distinct from old.role or new.client_id is distinct from old.client_id then
    raise exception 'Não é permitido alterar role ou client_id da própria conta';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_self_privilege_escalation on public.users;
create trigger trg_prevent_self_privilege_escalation
  before update on public.users
  for each row execute function prevent_self_privilege_escalation();

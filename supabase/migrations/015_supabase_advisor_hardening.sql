-- 015_supabase_advisor_hardening.sql
-- Correções encontradas pelo Security Advisor do Supabase ao provisionar o
-- projeto real (aplicadas primeiro diretamente no banco durante o setup,
-- trazidas aqui para ficarem versionadas e reprodutíveis em outros ambientes).
--
-- 1) function_search_path_mutable: funções SECURITY DEFINER / helpers de RLS
--    sem search_path fixo são vulneráveis a search_path hijacking (um objeto
--    malicioso criado num schema anterior no path poderia ser resolvido no
--    lugar do pretendido). Trava search_path = public em todas.
--
-- 2) anon/authenticated_security_definer_function_executable: por padrão o
--    Postgres concede EXECUTE a PUBLIC em funções novas. Isso deixava
--    claim_next_agent_task() (que roda com privilégios elevados e ignora RLS
--    de propósito, para reivindicar tasks com FOR UPDATE SKIP LOCKED)
--    chamável por QUALQUER usuário anônimo via /rest/v1/rpc/claim_next_agent_task
--    -- um visitante não-autenticado conseguiria reivindicar agent_tasks de
--    qualquer client_id. Revoga de PUBLIC e concede só a service_role (o
--    worker em app/api/agent-worker/route.ts usa lib/supabase/admin.ts).
--    As demais funções revogadas são triggers (chamadas só pelo Postgres em
--    contexto de trigger) -- não precisam ficar expostas via PostgREST RPC.

alter function public.auth_client_id() set search_path = public;
alter function public.auth_role() set search_path = public;
alter function public.is_admin() set search_path = public;
alter function public.prevent_self_privilege_escalation() set search_path = public;
alter function public.handle_new_user() set search_path = public;
alter function public.sync_user_app_metadata() set search_path = public;
alter function public.storage_object_client_id(text) set search_path = public;
alter function public.log_content_item_status_change() set search_path = public;
alter function public.validate_content_status_transition() set search_path = public;

revoke execute on function public.claim_next_agent_task() from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.sync_user_app_metadata() from public;
revoke execute on function public.log_content_item_status_change() from public;
revoke execute on function public.prevent_self_privilege_escalation() from public;

grant execute on function public.claim_next_agent_task() to service_role;

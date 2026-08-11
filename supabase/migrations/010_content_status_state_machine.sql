-- 010_content_status_state_machine.sql
-- Achado MEDIO (docs/security/REVIEW_FASE1.md, item 2): PATCH /api/content-items/[id]
-- aceita `status` livre no body, contornando as transicoes validadas em
-- app/api/content-items/[id]/status/route.ts (unico endpoint "oficial" para trocar status).
-- A validacao em app/ e so a primeira camada -- qualquer chamada direta ao Supabase
-- (service_role, script, bug futuro) contornaria essa regra de negocio sem uma rede de
-- seguranca no banco. Esta migration adiciona essa rede: uma trigger BEFORE UPDATE que
-- so permite transicoes validas de content_items.status, independente de quem/como o
-- UPDATE foi feito (RLS de usuario ou service_role).
--
-- Transicoes permitidas (espelham TRANSITIONS em app/api/content-items/[id]/status/route.ts,
-- com uma excecao documentada abaixo):
--   draft              -> in_review
--   in_review          -> changes_requested
--   in_review          -> approved
--   changes_requested  -> in_review
--   approved           -> scheduled
--   scheduled          -> published
--   approved           -> published   (job de publicacao pode publicar na hora, sem
--                                       passar por 'scheduled', quando scheduled_at <= now())
--
-- Nao valida "quem" pode fazer a transicao (isso e responsabilidade de role, ja feito na
-- rota de app + RLS de content_items) -- so "de onde para onde" e permitido.

create or replace function validate_content_status_transition() returns trigger
language plpgsql as $$
begin
  -- Sem mudanca de status, nada a validar aqui (outros campos do UPDATE seguem livres,
  -- sujeitos as demais policies/regras).
  if new.status is not distinct from old.status then
    return new;
  end if;

  if (old.status, new.status) in (
    ('draft', 'in_review'),
    ('in_review', 'changes_requested'),
    ('in_review', 'approved'),
    ('changes_requested', 'in_review'),
    ('approved', 'scheduled'),
    ('scheduled', 'published'),
    ('approved', 'published')
  ) then
    return new;
  end if;

  raise exception 'Transicao de status invalida: % -> %', old.status, new.status;
end;
$$;

drop trigger if exists trg_validate_content_status_transition on public.content_items;
create trigger trg_validate_content_status_transition
  before update of status on public.content_items
  for each row execute function validate_content_status_transition();

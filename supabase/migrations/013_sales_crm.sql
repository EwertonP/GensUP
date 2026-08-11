-- 013_sales_crm.sql
-- Fase 5: CRM de vendas (prospects/activities) + fila de trabalho autônoma do agente.
--
-- Prospects sao leads pre-venda (ainda nao sao clients da agencia) -- visibilidade
-- restrita a agencia/admin (cliente nunca ve prospects). Activities e a timeline
-- compartilhada entre prospect (pre-venda) e client (pos-venda): exatamente uma das
-- duas FKs deve estar preenchida.
--
-- Tambem adiciona: claim_next_agent_task() (RPC security definer para reivindicar
-- uma agent_task pendente com FOR UPDATE SKIP LOCKED, ja que supabase-js nao expoe
-- isso diretamente) e content_items.suggested_caption (campo separado da caption
-- humana, preenchido pelo worker 'sugerir_legenda' sem nunca sobrescrever texto
-- ja escrito por humano).

-- =========================================================
-- prospects
-- =========================================================
create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  stage text not null default 'novo' check (stage in ('novo', 'contatado', 'proposta', 'fechado', 'perdido')),
  owner_user_id uuid references users(id),
  source text,
  -- Rastreia a conversao prospect -> client para tornar /convert idempotente
  -- (nunca cria um client duplicado se o prospect ja foi convertido antes).
  converted_client_id uuid references clients(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_prospects_stage on prospects(stage);

-- =========================================================
-- activities
-- =========================================================
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references prospects(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  type text not null check (type in ('email', 'ligacao', 'nota', 'reuniao')),
  body text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  constraint activities_exactly_one_parent check (
    ((prospect_id is not null)::int + (client_id is not null)::int) = 1
  )
);

create index if not exists idx_activities_prospect_id on activities(prospect_id);
create index if not exists idx_activities_client_id on activities(client_id);

-- =========================================================
-- content_items.suggested_caption (worker 'sugerir_legenda')
-- =========================================================
alter table content_items add column if not exists suggested_caption text;

-- =========================================================
-- RLS
-- =========================================================
alter table prospects enable row level security;
alter table activities enable row level security;

-- prospects: visivel e editavel apenas por agencia/admin (cliente nunca ve leads).
create policy "prospects_agencia_admin_only" on prospects
  for all using (auth_role() in ('agencia', 'admin'))
  with check (auth_role() in ('agencia', 'admin'));

-- activities: se client_id preenchido, mesma regra de client_id = auth_client_id() ou admin
-- (cliente pode ler/escrever seu proprio timeline pos-venda). Se prospect_id preenchido,
-- restrito a agencia/admin (mesma visibilidade de prospects).
create policy "activities_select" on activities
  for select using (
    (client_id is not null and (client_id = auth_client_id() or is_admin()))
    or (prospect_id is not null and auth_role() in ('agencia', 'admin'))
  );

create policy "activities_insert" on activities
  for insert with check (
    (client_id is not null and (client_id = auth_client_id() or auth_role() in ('agencia', 'admin')))
    or (prospect_id is not null and auth_role() in ('agencia', 'admin'))
  );

create policy "activities_update_delete" on activities
  for update using (
    (client_id is not null and (client_id = auth_client_id() or is_admin()))
    or (prospect_id is not null and auth_role() in ('agencia', 'admin'))
  );

create policy "activities_delete" on activities
  for delete using (
    (client_id is not null and (client_id = auth_client_id() or is_admin()))
    or (prospect_id is not null and auth_role() in ('agencia', 'admin'))
  );

-- =========================================================
-- claim_next_agent_task(): reivindica UMA agent_task pendente via
-- FOR UPDATE SKIP LOCKED (nao exposto diretamente pelo supabase-js).
-- security definer pois o worker roda com o client admin (service_role),
-- mas mesmo assim isolamos a logica numa funcao para concorrencia segura
-- entre multiplas execucoes simultaneas do worker.
-- =========================================================
create or replace function claim_next_agent_task()
returns setof agent_tasks
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    update agent_tasks
    set status = 'running'
    where id = (
      select id from agent_tasks
      where status = 'pending'
      order by created_at
      limit 1
      for update skip locked
    )
    returning *;
end;
$$;

-- 001_schema.sql
-- Fundação do schema multi-tenant da Plataforma de Aprovação de Conteúdo
-- Isolamento por client_id em todas as tabelas relevantes

create extension if not exists "pgcrypto";

-- =========================================================
-- clients
-- =========================================================
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now()
);

-- =========================================================
-- users (perfil vinculado a auth.users)
-- =========================================================
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('cliente', 'agencia', 'admin')),
  created_at timestamptz not null default now()
);

create index if not exists idx_users_client_id on users(client_id);

-- =========================================================
-- social_accounts
-- =========================================================
create table if not exists social_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook', 'tiktok', 'linkedin', 'youtube')),
  access_token text,
  last_sync timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_social_accounts_client_id on social_accounts(client_id);

-- =========================================================
-- content_items
-- =========================================================
create table if not exists content_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  type text not null check (type in ('image', 'video', 'carousel', 'reel', 'story')),
  status text not null default 'draft' check (status in ('draft', 'in_review', 'changes_requested', 'approved', 'scheduled', 'published')),
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_content_items_client_id on content_items(client_id);
create index if not exists idx_content_items_status on content_items(status);

-- =========================================================
-- video_feedback
-- =========================================================
create table if not exists video_feedback (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references content_items(id) on delete cascade,
  timestamp_seconds numeric not null,
  comment text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_video_feedback_content_item_id on video_feedback(content_item_id);

-- =========================================================
-- carousel_feedback
-- =========================================================
create table if not exists carousel_feedback (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references content_items(id) on delete cascade,
  page_number int not null,
  is_cta boolean not null default false,
  comment text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_carousel_feedback_content_item_id on carousel_feedback(content_item_id);

-- =========================================================
-- insights_snapshots
-- =========================================================
create table if not exists insights_snapshots (
  id uuid primary key default gen_random_uuid(),
  social_account_id uuid not null references social_accounts(id) on delete cascade,
  snapshot_date date not null,
  metric text not null,
  value numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_insights_snapshots_social_account_id on insights_snapshots(social_account_id);

-- =========================================================
-- agent_tasks
-- =========================================================
create table if not exists agent_tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  type text not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_tasks_client_id on agent_tasks(client_id);
create index if not exists idx_agent_tasks_status on agent_tasks(status);

-- =========================================================
-- agent_runs
-- =========================================================
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_task_id uuid not null references agent_tasks(id) on delete cascade,
  confidence numeric,
  reasoning text,
  outcome text,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_runs_agent_task_id on agent_runs(agent_task_id);

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  tracking_id uuid not null unique,
  workflow_run_id text unique,
  eval_slug text not null,
  dry_run boolean not null default false,
  repo_url text,
  base_branch text not null default 'main',
  pr_base_branch text not null default 'main',
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'partial')),
  started_at timestamptz,
  completed_at timestamptz,
  elapsed_ms bigint,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_run_jobs (
  id uuid primary key default gen_random_uuid(),
  tracking_id uuid not null references public.agent_runs(tracking_id) on delete cascade,
  workflow_run_id text,
  eval_slug text not null,
  harness text not null,
  model text not null,
  solution_slug text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'dry-run', 'success', 'failed', 'timed-out')),
  sandbox_id text,
  command_id text,
  branch_name text,
  pull_request_url text,
  pull_request_number integer,
  files jsonb not null default '[]'::jsonb,
  usage jsonb not null default '{}'::jsonb,
  cost_usd numeric(12, 6),
  agent_started_at timestamptz,
  agent_completed_at timestamptz,
  elapsed_ms bigint,
  exit_code integer,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tracking_id, solution_slug)
);

create index if not exists agent_runs_workflow_run_id_idx
  on public.agent_runs (workflow_run_id);

create index if not exists agent_runs_eval_slug_idx
  on public.agent_runs (eval_slug);

create index if not exists agent_runs_status_created_at_idx
  on public.agent_runs (status, created_at desc);

create index if not exists agent_run_jobs_tracking_id_idx
  on public.agent_run_jobs (tracking_id);

create index if not exists agent_run_jobs_eval_harness_model_idx
  on public.agent_run_jobs (eval_slug, harness, model);

create index if not exists agent_run_jobs_status_created_at_idx
  on public.agent_run_jobs (status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_agent_runs_updated_at on public.agent_runs;
create trigger set_agent_runs_updated_at
before update on public.agent_runs
for each row execute function public.set_updated_at();

drop trigger if exists set_agent_run_jobs_updated_at on public.agent_run_jobs;
create trigger set_agent_run_jobs_updated_at
before update on public.agent_run_jobs
for each row execute function public.set_updated_at();

alter table public.agent_runs enable row level security;
alter table public.agent_run_jobs enable row level security;

revoke all on table public.agent_runs from anon, authenticated;
revoke all on table public.agent_run_jobs from anon, authenticated;

grant select, insert, update, delete on table public.agent_runs to service_role;
grant select, insert, update, delete on table public.agent_run_jobs to service_role;

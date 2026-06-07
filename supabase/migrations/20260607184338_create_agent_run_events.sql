create table if not exists public.agent_run_events (
  id bigint generated always as identity primary key,
  tracking_id uuid not null references public.agent_runs(tracking_id) on delete cascade,
  workflow_run_id text,
  eval_slug text not null,
  solution_slug text,
  event_type text not null,
  stream text check (stream in ('stdout', 'stderr')),
  message text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agent_run_events_tracking_id_created_at_idx
  on public.agent_run_events (tracking_id, created_at, id);

create index if not exists agent_run_events_eval_slug_created_at_idx
  on public.agent_run_events (eval_slug, created_at desc);

create index if not exists agent_run_events_solution_slug_created_at_idx
  on public.agent_run_events (tracking_id, solution_slug, created_at, id)
  where solution_slug is not null;

alter table public.agent_run_events enable row level security;

revoke all on table public.agent_run_events from anon, authenticated;

grant select, insert, update, delete on table public.agent_run_events to service_role;
grant usage, select on sequence public.agent_run_events_id_seq to service_role;

-- Run this once in Supabase → SQL Editor

create table if not exists public.jobs (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  url           text not null,
  method        text not null default 'GET',
  headers       jsonb not null default '{}'::jsonb,
  body          text,
  schedule      text not null,                       -- cron expression, e.g. */5 * * * *
  timezone      text not null default 'Asia/Manila',
  enabled       boolean not null default true,
  timeout_ms    int not null default 15000,
  next_run_at   timestamptz,
  last_run_at   timestamptz,
  last_status   int,
  last_ok       boolean,
  created_at    timestamptz not null default now()
);

create table if not exists public.job_runs (
  id                bigint generated always as identity primary key,
  job_id            uuid not null references public.jobs(id) on delete cascade,
  started_at        timestamptz not null,
  duration_ms       int,
  status_code       int,
  ok                boolean not null default false,
  error             text,
  response_snippet  text
);

create index if not exists jobs_due_idx on public.jobs (next_run_at) where enabled = true;
create index if not exists job_runs_job_idx on public.job_runs (job_id, started_at desc);

-- Lock the tables: only the server (service role key) can touch them.
alter table public.jobs enable row level security;
alter table public.job_runs enable row level security;

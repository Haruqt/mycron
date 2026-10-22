-- mycron: multi-user upgrade. Run this ONCE in Supabase -> SQL Editor.

-- 1) People. The very first person to sign in becomes admin; everyone after is a normal user.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  avatar_url text,
  provider text,
  role text not null default 'user' check (role in ('user', 'admin')),
  max_jobs int not null default 10,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);
alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, avatar_url, provider, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_app_meta_data->>'provider',
    case when exists (select 1 from public.profiles) then 'user' else 'admin' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) Every job belongs to someone. Every run records how late it started (jitter).
alter table public.jobs add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists jobs_user_idx on public.jobs(user_id);
alter table public.job_runs add column if not exists jitter_ms int;

-- 3) Tiny hourly totals, so charts keep working even though old runs are deleted (only 50 runs kept per job).
create table if not exists public.stats_hourly (
  user_id uuid not null references auth.users(id) on delete cascade,
  hour timestamptz not null,
  runs int not null default 0,
  ok int not null default 0,
  fail int not null default 0,
  sum_ms bigint not null default 0,
  n_ms int not null default 0,
  sum_jitter bigint not null default 0,
  n_jitter int not null default 0,
  primary key (user_id, hour)
);
alter table public.stats_hourly enable row level security;

create or replace function public.record_run(p_user uuid, p_ok boolean, p_ms int, p_jitter int)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.stats_hourly as s (user_id, hour, runs, ok, fail, sum_ms, n_ms, sum_jitter, n_jitter)
  values (
    p_user, date_trunc('hour', now()), 1,
    case when p_ok then 1 else 0 end,
    case when p_ok then 0 else 1 end,
    coalesce(p_ms, 0), case when p_ms is null then 0 else 1 end,
    coalesce(p_jitter, 0), case when p_jitter is null then 0 else 1 end
  )
  on conflict (user_id, hour) do update set
    runs = s.runs + 1,
    ok = s.ok + excluded.ok,
    fail = s.fail + excluded.fail,
    sum_ms = s.sum_ms + excluded.sum_ms,
    n_ms = s.n_ms + excluded.n_ms,
    sum_jitter = s.sum_jitter + excluded.sum_jitter,
    n_jitter = s.n_jitter + excluded.n_jitter;
$$;

-- Only the server (service key) may call it, never a browser.
revoke execute on function public.record_run(uuid, boolean, int, int) from public, anon, authenticated;
grant execute on function public.record_run(uuid, boolean, int, int) to service_role;

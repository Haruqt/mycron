export type Job = {
  id: string;
  title: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  schedule: string;
  timezone: string;
  enabled: boolean;
  timeout_ms: number;
  next_run_at: string | null;
  last_run_at: string | null;
  last_status: number | null;
  last_ok: boolean | null;
  created_at: string;
  user_id: string | null;
};

// A job plus the scheduled moment just before its next run (drives the progress line).
export type JobWithTiming = Job & { prev_run_at: string | null };

export type JobRun = {
  id: number;
  job_id: string;
  started_at: string;
  duration_ms: number | null;
  status_code: number | null;
  ok: boolean;
  error: string | null;
  response_snippet: string | null;
  jitter_ms: number | null;
};

export type JobInput = {
  title: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  schedule: string;
  timezone: string;
  enabled: boolean;
  timeout_ms: number;
};

export type Spark = {
  started_at: string;
  ok: boolean;
  status_code: number | null;
  duration_ms: number | null;
  jitter_ms: number | null;
};

export type Hour = { t: string; ok: number; fail: number; avgMs: number | null; avgJitterMs: number | null };

export type Overview = {
  jobs: JobWithTiming[];
  stats: { runs24h: number; ok24h: number; avgMs: number | null };
  sparks: Record<string, Spark[]>;
  recent: JobRun[];
  hourly: Hour[];
  me: { name: string | null; email: string | null; avatar_url: string | null; role: "user" | "admin"; max_jobs: number };
};

export type AdminUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  provider: string | null;
  role: "user" | "admin";
  max_jobs: number;
  created_at: string;
  last_seen_at: string | null;
  jobs: number;
  online: boolean;
};

export type AdminOverview = {
  tiles: { users: number; online: number; jobs: number; activeJobs: number; runs24h: number };
  hourly: Hour[];
  users: AdminUser[];
};

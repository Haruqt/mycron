import { NextResponse, connection } from "next/server";
import { db } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import { prevRun } from "@/lib/cron";
import { fillHours, sinceIso, type StatRow } from "@/lib/stats";
import { KEEP_RUNS } from "@/lib/runner";
import type { Job, JobRun, Spark } from "@/lib/types";

// One request that powers the whole dashboard: your jobs, 24h stats, per-job history, recent activity.
export async function GET() {
  await connection();
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const me = gate.me;

  const client = db();
  const [jobsRes, statsRes] = await Promise.all([
    client.from("jobs").select("*").eq("user_id", me.id).order("created_at", { ascending: true }),
    client.from("stats_hourly").select("*").eq("user_id", me.id).gte("hour", sinceIso()),
  ]);
  if (jobsRes.error) return NextResponse.json({ error: jobsRes.error.message }, { status: 500 });

  const jobs = ((jobsRes.data ?? []) as Job[]).map((job) => ({
    ...job,
    prev_run_at:
      job.enabled && job.next_run_at
        ? (prevRun(job.schedule, job.timezone, new Date(job.next_run_at))?.toISOString() ?? null)
        : null,
  }));
  const ids = jobs.map((j) => j.id);

  // Newest runs per job (oldest first), for the strip and the per-job chart.
  const sparkEntries = await Promise.all(
    jobs.map(async (job) => {
      const { data } = await client
        .from("job_runs")
        .select("started_at, ok, status_code, duration_ms, jitter_ms")
        .eq("job_id", job.id)
        .order("started_at", { ascending: false })
        .limit(KEEP_RUNS);
      return [job.id, ((data ?? []) as Spark[]).reverse()] as const;
    })
  );

  const recentRes = ids.length
    ? await client.from("job_runs").select("*").in("job_id", ids).order("started_at", { ascending: false }).limit(60)
    : { data: [] };

  const hourly = fillHours((statsRes.data ?? []) as StatRow[]);
  const runs24h = hourly.reduce((n, h) => n + h.ok + h.fail, 0);
  const ok24h = hourly.reduce((n, h) => n + h.ok, 0);
  const timed = hourly.filter((h) => h.avgMs !== null);
  const totalMsRuns = (statsRes.data ?? []).reduce((n: number, r: StatRow) => n + r.n_ms, 0);
  const totalMs = (statsRes.data ?? []).reduce((n: number, r: StatRow) => n + Number(r.sum_ms), 0);
  const avgMs = timed.length && totalMsRuns ? Math.round(totalMs / totalMsRuns) : null;

  return NextResponse.json({
    jobs,
    stats: { runs24h, ok24h, avgMs },
    sparks: Object.fromEntries(sparkEntries),
    recent: (recentRes.data ?? []) as JobRun[],
    hourly,
    me: { name: me.name, email: me.email, avatar_url: me.avatar_url, role: me.role, max_jobs: me.max_jobs },
  });
}

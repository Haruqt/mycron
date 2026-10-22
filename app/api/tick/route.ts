import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { nextRun } from "@/lib/cron";
import { executeJob } from "@/lib/runner";
import type { Job } from "@/lib/types";

export const maxDuration = 60;

// Supabase (pg_cron) calls this every minute. It finds due jobs and runs them.
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const { data: due, error } = await db()
    .from("jobs")
    .select("*")
    .eq("enabled", true)
    .lte("next_run_at", now.toISOString())
    .order("next_run_at", { ascending: true })
    .limit(25);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = await Promise.allSettled(
    (due as Job[]).map(async (job) => {
      // Claim the job first: move next_run_at forward, but only if nobody else did already.
      // This stops a slow job from being run twice by overlapping ticks.
      let upcoming: string | null = null;
      try {
        upcoming = nextRun(job.schedule, job.timezone, now).toISOString();
      } catch {
        // Broken schedule: pause the job instead of retrying forever.
        await db().from("jobs").update({ enabled: false, next_run_at: null }).eq("id", job.id);
        return { id: job.id, skipped: "invalid schedule, paused" };
      }

      const { data: claimed } = await db()
        .from("jobs")
        .update({ next_run_at: upcoming })
        .eq("id", job.id)
        .eq("next_run_at", job.next_run_at)
        .select("id");

      if (!claimed || claimed.length === 0) return { id: job.id, skipped: "already claimed" };

      const result = await executeJob(job, job.next_run_at);
      return { id: job.id, ...result };
    })
  );

  // Housekeeping (once an hour): hourly statistics older than 7 days aren't needed.
  // Run history itself is trimmed to the newest 50 per job inside executeJob.
  if (now.getUTCMinutes() === 0) {
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await db().from("stats_hourly").delete().lt("hour", cutoff);
  }

  return NextResponse.json({
    checked: due?.length ?? 0,
    results: results.map((r) => (r.status === "fulfilled" ? r.value : { error: String(r.reason) })),
  });
}

export const GET = handle;
export const POST = handle;

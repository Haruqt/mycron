import { db } from "./supabase";
import { assertPublicUrl } from "./netguard";
import type { Job } from "./types";

export const KEEP_RUNS = 50; // newest runs kept per job; older ones are deleted
const MAX_REDIRECTS = 5;

// Fires the HTTP request for one job, stores the result, updates the job's "last_*" fields,
// adds to the hourly statistics and trims old history. It does NOT touch next_run_at.
// scheduledFor: when the run was supposed to start (used to measure "jitter", how late it started).
export async function executeJob(job: Job, scheduledFor: string | null = null) {
  const startedAt = new Date();
  let statusCode: number | null = null;
  let error: string | null = null;
  let snippet: string | null = null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), job.timeout_ms);

  try {
    let url = job.url;
    let method = job.method;
    let body: string | undefined = method !== "GET" && method !== "HEAD" && job.body ? job.body : undefined;

    // Follow redirects by hand so every hop is checked against the private-address guard.
    for (let hop = 0; ; hop++) {
      await assertPublicUrl(url);
      const res = await fetch(url, {
        method,
        headers: job.headers ?? {},
        body,
        signal: controller.signal,
        redirect: "manual",
        cache: "no-store",
      });
      const loc = res.headers.get("location");
      if ([301, 302, 303, 307, 308].includes(res.status) && loc && hop < MAX_REDIRECTS) {
        url = new URL(loc, url).toString();
        if (res.status === 303 || ((res.status === 301 || res.status === 302) && method !== "GET" && method !== "HEAD")) {
          method = "GET";
          body = undefined;
        }
        continue;
      }
      statusCode = res.status;
      snippet = (await res.text()).slice(0, 500);
      break;
    }
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      error = `Timed out after ${job.timeout_ms} ms`;
    } else {
      error = e instanceof Error ? e.message : String(e);
    }
  } finally {
    clearTimeout(timer);
  }

  const ok = statusCode !== null && statusCode >= 200 && statusCode < 300;
  const durationMs = Date.now() - startedAt.getTime();
  const jitterMs = scheduledFor ? Math.max(0, startedAt.getTime() - new Date(scheduledFor).getTime()) : null;

  await db().from("job_runs").insert({
    job_id: job.id,
    started_at: startedAt.toISOString(),
    duration_ms: durationMs,
    status_code: statusCode,
    ok,
    error,
    response_snippet: snippet,
    jitter_ms: jitterMs,
  });

  await db()
    .from("jobs")
    .update({ last_run_at: startedAt.toISOString(), last_status: statusCode, last_ok: ok })
    .eq("id", job.id);

  if (job.user_id) {
    await db().rpc("record_run", { p_user: job.user_id, p_ok: ok, p_ms: durationMs, p_jitter: jitterMs });
  }

  // Keep only the newest KEEP_RUNS runs for this job.
  const { data: old } = await db()
    .from("job_runs")
    .select("id")
    .eq("job_id", job.id)
    .order("started_at", { ascending: false })
    .range(KEEP_RUNS, KEEP_RUNS + 200);
  if (old && old.length > 0) {
    await db()
      .from("job_runs")
      .delete()
      .in(
        "id",
        old.map((r: { id: number }) => r.id)
      );
  }

  return { ok, statusCode, error, durationMs, jitterMs };
}

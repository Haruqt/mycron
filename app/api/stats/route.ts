import { NextResponse, connection } from "next/server";
import { db } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import { fillHours, sinceIso, type StatRow } from "@/lib/stats";

// Platform-wide numbers for the Statistics tab. Any signed-in person may read it,
// so it only returns totals (no names, emails or job details).
export async function GET() {
  await connection();
  const gate = await requireUser();
  if (gate.error) return gate.error;

  const [users, jobs, active, stats] = await Promise.all([
    db().from("profiles").select("id", { count: "exact", head: true }),
    db().from("jobs").select("id", { count: "exact", head: true }),
    db().from("jobs").select("id", { count: "exact", head: true }).eq("enabled", true),
    db().from("stats_hourly").select("*").gte("hour", sinceIso()),
  ]);

  const hourly = fillHours((stats.data ?? []) as StatRow[]);
  return NextResponse.json({
    tiles: {
      users: users.count ?? 0,
      jobs: jobs.count ?? 0,
      activeJobs: active.count ?? 0,
      runs24h: hourly.reduce((n, h) => n + h.ok + h.fail, 0),
    },
    hourly,
  });
}
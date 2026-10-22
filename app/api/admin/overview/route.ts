import { NextResponse, connection } from "next/server";
import { db } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import { fillHours, sinceIso, type StatRow } from "@/lib/stats";
import type { AdminUser } from "@/lib/types";

const ONLINE_MS = 2 * 60 * 1000;

export async function GET() {
  await connection();
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const [profilesRes, jobsRes, statsRes] = await Promise.all([
    db().from("profiles").select("id, email, name, avatar_url, provider, role, max_jobs, created_at, last_seen_at").order("created_at", { ascending: true }),
    db().from("jobs").select("user_id, enabled"),
    db().from("stats_hourly").select("*").gte("hour", sinceIso()),
  ]);
  if (profilesRes.error) return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });

  const jobRows = (jobsRes.data ?? []) as { user_id: string | null; enabled: boolean }[];
  const perUser: Record<string, number> = {};
  for (const j of jobRows) if (j.user_id) perUser[j.user_id] = (perUser[j.user_id] ?? 0) + 1;

  const now = Date.now();
  const users: AdminUser[] = (profilesRes.data ?? []).map((p: Omit<AdminUser, "jobs" | "online">) => ({
    ...p,
    jobs: perUser[p.id] ?? 0,
    online: !!p.last_seen_at && now - new Date(p.last_seen_at).getTime() < ONLINE_MS,
  }));

  const hourly = fillHours((statsRes.data ?? []) as StatRow[]);

  return NextResponse.json({
    tiles: {
      users: users.length,
      online: users.filter((u) => u.online).length,
      jobs: jobRows.length,
      activeJobs: jobRows.filter((j) => j.enabled).length,
      runs24h: hourly.reduce((n, h) => n + h.ok + h.fail, 0),
    },
    hourly,
    users,
  });
}

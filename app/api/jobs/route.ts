import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import { nextRun } from "@/lib/cron";
import { parseJobInput } from "@/lib/validate";

export async function GET() {
  const gate = await requireUser();
  if (gate.error) return gate.error;

  const { data, error } = await db().from("jobs").select("*").eq("user_id", gate.me.id).order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: data });
}

export async function POST(req: Request) {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const me = gate.me;

  const parsed = parseJobInput(await req.json().catch(() => null));
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // Admins have no limit; everyone else gets max_jobs (10).
  if (me.role !== "admin") {
    const { count } = await db().from("jobs").select("id", { count: "exact", head: true }).eq("user_id", me.id);
    if ((count ?? 0) >= me.max_jobs) {
      return NextResponse.json(
        { error: `You've reached your limit of ${me.max_jobs} jobs. Delete one to add another.` },
        { status: 403 }
      );
    }
  }

  const job = parsed.data;
  const next_run_at = job.enabled ? nextRun(job.schedule, job.timezone).toISOString() : null;

  const { data, error } = await db().from("jobs").insert({ ...job, next_run_at, user_id: me.id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data }, { status: 201 });
}

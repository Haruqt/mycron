import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { findOwnedJob, requireUser } from "@/lib/auth";
import { nextRun } from "@/lib/cron";
import { parseJobInput } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const { id } = await params;

  const existing = await findOwnedJob(id, gate.me);
  if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const changes = await req.json().catch(() => null);
  if (typeof changes !== "object" || changes === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Merge the changes over the current job, then validate the whole thing.
  const parsed = parseJobInput({ ...existing, ...changes });
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const job = parsed.data;
  const next_run_at = job.enabled ? nextRun(job.schedule, job.timezone).toISOString() : null;

  const { data, error } = await db().from("jobs").update({ ...job, next_run_at }).eq("id", id).eq("user_id", gate.me.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const { id } = await params;

  const existing = await findOwnedJob(id, gate.me);
  if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { error } = await db().from("jobs").delete().eq("id", id).eq("user_id", gate.me.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

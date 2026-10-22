import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { findOwnedJob, requireUser } from "@/lib/auth";
import { KEEP_RUNS } from "@/lib/runner";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const { id } = await params;

  if (!(await findOwnedJob(id, gate.me))) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { data, error } = await db()
    .from("job_runs")
    .select("*")
    .eq("job_id", id)
    .order("started_at", { ascending: false })
    .limit(KEEP_RUNS);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ runs: data });
}

import { NextResponse } from "next/server";
import { findOwnedJob, requireUser } from "@/lib/auth";
import { executeJob } from "@/lib/runner";

export const maxDuration = 60;

// "Run now" button. Doesn't change the schedule.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  const { id } = await params;

  const job = await findOwnedJob(id, gate.me);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const result = await executeJob(job);
  return NextResponse.json({ result });
}

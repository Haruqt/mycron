import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { nextRuns } from "@/lib/cron";

// Used by the form to show "next 5 runs" while you type a cron expression.
export async function GET(req: Request) {
  const gate = await requireUser();
  if (gate.error) return gate.error;

  const { searchParams } = new URL(req.url);
  const schedule = searchParams.get("schedule") ?? "";
  const tz = searchParams.get("tz") || "Asia/Manila";

  try {
    const runs = nextRuns(schedule, tz, 5).map((d) => d.toISOString());
    return NextResponse.json({ runs });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid cron expression" }, { status: 400 });
  }
}

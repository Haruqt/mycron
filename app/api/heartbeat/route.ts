import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";

// The open dashboard pings this about once a minute; the admin page uses it to show who is online.
export async function POST() {
  const gate = await requireUser();
  if (gate.error) return gate.error;
  await db().from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", gate.me.id);
  return NextResponse.json({ ok: true });
}

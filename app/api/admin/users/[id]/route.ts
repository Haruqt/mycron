import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

// Promote a user to admin, or turn an admin back into a normal user.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as { role?: string };
  if (body.role !== "admin" && body.role !== "user") {
    return NextResponse.json({ error: "role must be 'admin' or 'user'" }, { status: 400 });
  }

  const { data: target } = await db().from("profiles").select("id, role").eq("id", id).maybeSingle();
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (target.role === "admin" && body.role === "user") {
    const { count } = await db().from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) <= 1) return NextResponse.json({ error: "There must be at least one admin." }, { status: 400 });
  }

  const { error } = await db().from("profiles").update({ role: body.role }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

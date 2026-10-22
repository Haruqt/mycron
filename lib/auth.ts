import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { db } from "./supabase";
import { createSessionClient } from "./supabase/server";
import type { Job } from "./types";

export type Me = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  max_jobs: number;
};

const COLS = "id, email, name, avatar_url, role, max_jobs";

async function loadProfile(user: User): Promise<Me> {
  const { data } = await db().from("profiles").select(COLS).eq("id", user.id).maybeSingle();
  if (data) return data as Me;

  // The sign-up trigger normally creates this row. This is only a safety net.
  const { count } = await db().from("profiles").select("id", { count: "exact", head: true });
  const meta = user.user_metadata ?? {};
  const row = {
    id: user.id,
    email: user.email ?? null,
    name: (meta.full_name as string) ?? (meta.name as string) ?? user.email?.split("@")[0] ?? null,
    avatar_url: (meta.avatar_url as string) ?? null,
    provider: (user.app_metadata?.provider as string) ?? null,
    role: (count ?? 0) === 0 ? "admin" : "user",
  };
  await db().from("profiles").upsert(row, { onConflict: "id", ignoreDuplicates: true });
  const { data: again } = await db().from("profiles").select(COLS).eq("id", user.id).single();
  return again as Me;
}

export async function getMe(): Promise<Me | null> {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return loadProfile(user);
}

type Gate = { me: Me; error?: undefined } | { me?: undefined; error: NextResponse };

export async function requireUser(): Promise<Gate> {
  const me = await getMe();
  if (!me) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  return { me };
}

export async function requireAdmin(): Promise<Gate> {
  const gate = await requireUser();
  if (gate.error) return gate;
  if (gate.me.role !== "admin") return { error: NextResponse.json({ error: "Admins only" }, { status: 403 }) };
  return gate;
}

// A job, but only if it belongs to this person.
export async function findOwnedJob(id: string, me: Me): Promise<Job | null> {
  const { data } = await db().from("jobs").select("*").eq("id", id).eq("user_id", me.id).maybeSingle();
  return (data as Job) ?? null;
}

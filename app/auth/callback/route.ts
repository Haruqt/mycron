import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

// Google/GitHub send people back here with a one-time code; we swap it for a login cookie.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/", url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=1", url.origin));
}

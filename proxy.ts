import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// Gatekeeper: every page and API call needs a signed-in user (Google or GitHub).
// Excluded below: /api/tick (has its own secret, called by Supabase's timer) and static files.
export async function proxy(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return new NextResponse("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set", { status: 500 });
  }

  let response = NextResponse.next({ request: req });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        response = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Also refreshes the login cookie when it's about to expire.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;
  const open = pathname === "/login" || pathname.startsWith("/auth/");

  if (user) {
    if (pathname === "/login") return NextResponse.redirect(new URL("/", req.url));
    return response;
  }
  if (open) return response;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!api/tick|_next/static|_next/image|favicon.ico).*)"],
};

"use client";

import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Provider = "google" | "github";

export default function LoginPage() {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error")) {
      setError("Sign-in didn't finish. Try again.");
    }
  }, []);

  async function signIn(provider: Provider) {
    setBusy(provider);
    setError(null);
    const { error: err } = await createBrowserSupabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) {
      setError(err.message);
      setBusy(null);
    }
  }

  return (
    <main className="login">
      <div className="login-theme">
        <ThemeToggle />
      </div>
      <div className="login-card">
        <span className="brand-mark big" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.5 2" />
          </svg>
        </span>
        <h1>Sign in to mycron</h1>
        <p className="login-sub">Schedule URL calls that keep running while you're away.</p>

        <button className="btn login-btn provider" disabled={busy !== null} onClick={() => signIn("google")}>
          {busy === "google" ? "Opening Google…" : "Continue with Google"}
        </button>
        <button className="btn login-btn provider" disabled={busy !== null} onClick={() => signIn("github")}>
          {busy === "github" ? "Opening GitHub…" : "Continue with GitHub"}
        </button>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <p className="login-fine">Free to use, up to 10 jobs per person.</p>
      </div>
    </main>
  );
}

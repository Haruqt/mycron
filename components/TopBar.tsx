"use client";

import { useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";

export type View = "jobs" | "activity" | "stats" | "admin";
type Me = { name: string | null; email: string | null; avatar_url: string | null; role: "user" | "admin" } | null;

export default function TopBar({ view, onView, failing, me }: { view: View; onView: (v: View) => void; failing: number; me: Me }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function signOut() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const letter = (me?.name ?? me?.email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <header className="topbar">
      <div className="topbar-in">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3.5 2" />
            </svg>
          </span>
          <span className="brand-name">mycron</span>
        </div>

        <nav className="tabs" aria-label="Sections">
          <button className={`tab ${view === "jobs" ? "active" : ""}`} onClick={() => onView("jobs")}>
            Jobs
          </button>
          <button className={`tab ${view === "activity" ? "active" : ""}`} onClick={() => onView("activity")}>
            Activity
            {failing > 0 && (
              <span className="tab-badge" title={`${failing} failing`}>
                {failing}
              </span>
            )}
          </button>
          <button className={`tab ${view === "stats" ? "active" : ""}`} onClick={() => onView("stats")}>
            Statistics
          </button>
          {me?.role === "admin" && (
            <button className={`tab ${view === "admin" ? "active" : ""}`} onClick={() => onView("admin")}>
              Admin
            </button>
          )}
        </nav>

        <div className="topbar-right">
          <ThemeToggle />
          <div className="usermenu" ref={box}>
            <button className="avatar-btn" onClick={() => setOpen((o) => !o)} aria-label="Account menu" aria-expanded={open}>
              {me?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="avatar img" src={me.avatar_url} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span className="avatar">{letter}</span>
              )}
            </button>
            {open && me && (
              <div className="menu-pop" role="menu">
                <div className="menu-who">
                  <strong>{me.name ?? "Signed in"}</strong>
                  <span>{me.email}</span>
                  <em className={`role-pill ${me.role}`}>{me.role === "admin" ? "Admin" : "User"}</em>
                </div>
                <button role="menuitem" onClick={signOut}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
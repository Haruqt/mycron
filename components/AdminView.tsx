"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminOverview, AdminUser } from "@/lib/types";
import { relTime } from "@/lib/format";

function Avatar({ u }: { u: Pick<AdminUser, "avatar_url" | "name" | "email"> }) {
  const letter = (u.name ?? u.email ?? "?").trim().charAt(0).toUpperCase();
  // eslint-disable-next-line @next/next/no-img-element
  return u.avatar_url ? <img className="avatar img" src={u.avatar_url} alt="" referrerPolicy="no-referrer" /> : <span className="avatar">{letter}</span>;
}

export default function AdminView({ meEmail, onToast }: { meEmail: string | null; onToast: (kind: "ok" | "fail" | "info", text: string) => void }) {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/overview");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the admin page");
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  async function setRole(u: AdminUser, role: "admin" | "user") {
    const label = u.name ?? u.email ?? "this person";
    if (!confirm(role === "admin" ? `Make ${label} an admin? They'll see everyone's usage and can change roles.` : `Turn ${label} back into a normal user?`)) return;
    setBusy(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not change the role");
      onToast("ok", role === "admin" ? `${label} is now an admin` : `${label} is now a normal user`);
      await load();
    } catch (e) {
      onToast("fail", e instanceof Error ? e.message : "Could not change the role");
    } finally {
      setBusy(null);
    }
  }

  if (error && !data) {
    return (
      <div className="notice fail" role="alert">
        <div>
          <strong>Can&apos;t load the admin page</strong>
          <p>{error}</p>
        </div>
        <button className="btn sm" onClick={load}>
          Try again
        </button>
      </div>
    );
  }
  if (!data) return <div className="skeleton row-skel" />;

  const t = data.tiles;
  const tiles: [string, number, string?][] = [
    ["people signed up", t.users],
    ["online now", t.online],
    ["jobs", t.jobs, `${t.activeJobs} active`],
    ["runs in the last 24 hours", t.runs24h],
  ];

  return (
    <>
      <div className="toolbar solo">
        <h1 className="page-title">Admin</h1>
        <span className="muted">People, roles and who is online</span>
      </div>

      <div className="tiles">
        {tiles.map(([label, n, sub]) => (
          <div key={label} className="tile">
            <strong>{n.toLocaleString()}</strong>
            <span>{label}</span>
            {sub && <em>{sub}</em>}
          </div>
        ))}
      </div>

      <div className="toolbar solo">
        <h2 className="page-title sm">People</h2>
        <span className="muted">
          {t.online} online of {t.users}
        </span>
      </div>
      <div className="users">
        <div className="users-head" aria-hidden="true">
          <span>Person</span>
          <span>Status</span>
          <span>Jobs</span>
          <span>Joined</span>
          <span>Role</span>
        </div>
        {data.users.map((u) => {
          const isMe = !!meEmail && u.email === meEmail;
          return (
            <div key={u.id} className="user-row">
              <div className="u-person">
                <Avatar u={u} />
                <div>
                  <strong>{u.name ?? "Unnamed"}</strong>
                  <span>{u.email}</span>
                </div>
              </div>
              <div className="u-status">
                <i className={`dot ${u.online ? "on" : ""}`} />
                {u.online ? "Online" : u.last_seen_at ? `Seen ${relTime(u.last_seen_at)}` : "Never opened"}
              </div>
              <div className="u-jobs">
                {u.jobs}
                {u.role === "admin" ? " / no limit" : ` / ${u.max_jobs}`}
              </div>
              <div className="u-joined">{new Date(u.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</div>
              <div className="u-role">
                <span className={`role-pill ${u.role}`}>{u.role === "admin" ? "Admin" : "User"}</span>
                <button className="btn sm" disabled={busy === u.id} onClick={() => setRole(u, u.role === "admin" ? "user" : "admin")}>
                  {u.role === "admin" ? (isMe ? "Step down" : "Make user") : "Make admin"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
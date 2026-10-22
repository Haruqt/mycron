"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Job, JobWithTiming, Overview } from "@/lib/types";
import { fmtDuration } from "@/lib/format";
import TopBar, { type View } from "@/components/TopBar";
import Hero from "@/components/Hero";
import HourlyCharts from "@/components/HourlyCharts";
import JobRow from "@/components/JobRow";
import JobDrawer from "@/components/JobDrawer";
import JobForm from "@/components/JobForm";
import ActivityFeed from "@/components/ActivityFeed";
import AdminView from "@/components/AdminView";
import StatsView from "@/components/StatsView";
import { Icon } from "@/components/Icons";

type Filter = "all" | "active" | "paused" | "failing";
type Toast = { id: number; kind: "ok" | "fail" | "info"; text: string };
type FormState = { job: Job | null; initial?: Partial<Job> };

const EXAMPLE: Partial<Job> = {
  title: "Ping example",
  url: "https://httpbin.org/get",
  method: "GET",
  schedule: "*/5 * * * *",
};

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json;
}

export default function Home() {
  const [data, setData] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>("jobs");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [now, setNow] = useState(0);

  // ---------- data ----------
  const load = useCallback(async () => {
    try {
      const json = (await api("/api/overview")) as Overview;
      setData(json);
      setLoadError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load your jobs";
      if (msg === "Not signed in") {
        window.location.href = "/login";
        return;
      }
      setLoadError(msg);
    }
  }, []);

  // Tell the server we're here (about once a minute) so the admin page can show who is online.
  useEffect(() => {
    const beat = () => fetch("/api/heartbeat", { method: "POST" }).catch(() => {});
    beat();
    const t = setInterval(beat, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  // One clock for every countdown on the page.
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const pushToast = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, kind, text }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4500);
  }, []);

  // ---------- derived ----------
  const jobs = useMemo(() => data?.jobs ?? [], [data]);
  const jobsById = useMemo(() => Object.fromEntries(jobs.map((j) => [j.id, j])) as Record<string, JobWithTiming>, [jobs]);
  const drawerJob = drawerId ? (jobsById[drawerId] ?? null) : null;

  const counts = useMemo(
    () => ({
      all: jobs.length,
      active: jobs.filter((j) => j.enabled).length,
      paused: jobs.filter((j) => !j.enabled).length,
      failing: jobs.filter((j) => j.enabled && j.last_ok === false).length,
    }),
    [jobs]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (filter === "active" && !j.enabled) return false;
      if (filter === "paused" && j.enabled) return false;
      if (filter === "failing" && !(j.enabled && j.last_ok === false)) return false;
      if (q && !(j.title.toLowerCase().includes(q) || j.url.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [jobs, filter, query]);

  const limit = data?.me.role === "admin" ? null : (data?.me.max_jobs ?? 10);
  const atLimit = limit !== null && jobs.length >= limit;
  function newJob(initial?: Partial<Job>) {
    if (atLimit) {
      pushToast("fail", `You've reached your limit of ${limit} jobs. Delete one to add another.`);
      return;
    }
    setForm({ job: null, initial });
  }

  const isLocal = typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

  // When the next run is due, look again a few seconds later so the countdown resets by itself.
  const nextDue = useMemo(() => {
    const times = jobs.filter((j) => j.enabled && j.next_run_at).map((j) => new Date(j.next_run_at as string).getTime());
    return times.length ? Math.min(...times) : null;
  }, [jobs]);

  useEffect(() => {
    if (nextDue === null) return;
    const wait = Math.max(0, nextDue - Date.now());
    const t1 = setTimeout(load, wait + 3000);
    const t2 = setTimeout(load, wait + 8000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [nextDue, load]);

  // ---------- keyboard and menu ----------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (e.key === "Escape") {
        if (form) setForm(null);
        else if (drawerId) setDrawerId(null);
        else setMenuId(null);
        return;
      }
      if (!typing && !form && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        newJob();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [form, drawerId, atLimit]);

  useEffect(() => {
    if (!menuId) return;
    const close = () => setMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuId]);

  // ---------- actions ----------
  async function runNow(job: JobWithTiming) {
    setBusyId(job.id);
    try {
      const { result } = await api(`/api/jobs/${job.id}/run`, { method: "POST" });
      if (result.ok) {
        pushToast("ok", `Ran ${job.title}: ${result.statusCode} in ${fmtDuration(result.durationMs)}`);
      } else {
        pushToast("fail", `${job.title} failed: ${result.error ?? `HTTP ${result.statusCode}`}`);
      }
      setHistoryKey((k) => k + 1);
      await load();
    } catch (e) {
      pushToast("fail", e instanceof Error ? e.message : "Could not run the job");
    } finally {
      setBusyId(null);
    }
  }

  async function toggle(job: JobWithTiming) {
    setBusyId(job.id);
    try {
      await api(`/api/jobs/${job.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !job.enabled }) });
      pushToast("info", job.enabled ? `${job.title} paused` : `${job.title} resumed`);
      await load();
    } catch (e) {
      pushToast("fail", e instanceof Error ? e.message : "Could not update the job");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(job: JobWithTiming) {
    setMenuId(null);
    if (!confirm(`Delete "${job.title}" and its run history?`)) return;
    try {
      await api(`/api/jobs/${job.id}`, { method: "DELETE" });
      if (drawerId === job.id) setDrawerId(null);
      pushToast("info", `${job.title} deleted`);
      await load();
    } catch (e) {
      pushToast("fail", e instanceof Error ? e.message : "Could not delete the job");
    }
  }

  async function copyUrl(job: JobWithTiming) {
    try {
      await navigator.clipboard.writeText(job.url);
      pushToast("info", "URL copied");
    } catch {
      pushToast("fail", "Could not copy. Select the URL and copy it by hand.");
    }
  }

  function edit(job: JobWithTiming) {
    setMenuId(null);
    setForm({ job });
  }

  // ---------- summary sentence ----------
  function summary() {
    if (!data || jobs.length === 0) return null;
    const stats = data.stats;
    const first = `${counts.active} of ${jobs.length} ${jobs.length === 1 ? "job is" : "jobs are"} active.`;
    if (stats.runs24h === 0) return <>{first} No runs in the last 24 hours yet.</>;
    const rate = (stats.ok24h / stats.runs24h) * 100;
    const rateText = rate === 100 ? "All" : `${rate.toFixed(rate >= 99 ? 1 : 0)}% of`;
    return (
      <>
        {first} {rateText} {stats.runs24h.toLocaleString()} {stats.runs24h === 1 ? "run" : "runs"} succeeded in the last 24 hours
        {stats.avgMs !== null ? `, averaging ${fmtDuration(stats.avgMs)}` : ""}.
        {counts.failing > 0 && <span className="fail-text"> {counts.failing} {counts.failing === 1 ? "job is" : "jobs are"} failing.</span>}
      </>
    );
  }

  const loading = data === null && loadError === null;

  return (
    <>
      <TopBar view={view} onView={setView} failing={counts.failing} me={data?.me ?? null} />

      <main className="page">
        {loadError && data === null && (
          <div className="notice fail" role="alert">
            <Icon name="alert" size={18} />
            <div>
              <strong>Can&apos;t load your jobs</strong>
              <p>{loadError}. Check your connection and try again.</p>
            </div>
            <button className="btn sm" onClick={load}>
              Try again
            </button>
          </div>
        )}

        {loading && (
          <div className="skeleton-page" aria-label="Loading">
            <div className="skeleton hero-skel" />
            <div className="skeleton line-skel" />
            <div className="skeleton row-skel" />
            <div className="skeleton row-skel" />
            <div className="skeleton row-skel" />
          </div>
        )}

        {data && view === "jobs" && (
          <>
            {jobs.length > 0 && (
              <>
                <Hero jobs={jobs} now={now} isLocal={isLocal} onOpen={setDrawerId} />
                <p className="summary">{summary()}</p>
                {data.hourly && data.stats.runs24h > 0 && <HourlyCharts hours={data.hourly} />}
              </>
            )}

            <div className="toolbar">
              <h1 className="page-title">Jobs</h1>
              {jobs.length > 0 && (
                <div className="filters" role="group" aria-label="Filter jobs">
                  {(
                    [
                      ["all", "All"],
                      ["active", "Active"],
                      ["paused", "Paused"],
                      ["failing", "Failing"],
                    ] as [Filter, string][]
                  ).map(([key, label]) => (
                    <button key={key} className={`filter ${filter === key ? "active" : ""}`} onClick={() => setFilter(key)}>
                      {label} <span className="count">{counts[key]}</span>
                    </button>
                  ))}
                </div>
              )}
              <span className="spacer" />
              {jobs.length > 0 && (
                <label className="search">
                  <Icon name="search" size={15} />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search jobs" aria-label="Search jobs" />
                </label>
              )}
              {limit !== null && (
                <span className={`quota ${atLimit ? "full" : ""}`} title="Jobs you can have">
                  {jobs.length} / {limit} jobs
                </span>
              )}
              <button className="btn primary" disabled={atLimit} onClick={() => newJob()}>
                <Icon name="plus" size={16} /> New job <kbd>N</kbd>
              </button>
            </div>

            {jobs.length === 0 ? (
              <div className="empty-panel big">
                <span className="empty-mark" aria-hidden="true">
                  <Icon name="clock" size={26} />
                </span>
                <h3>No jobs yet</h3>
                <p>Add a URL and a schedule, and mycron will call it for you on time.</p>
                <div className="empty-actions">
                  <button className="btn primary" onClick={() => newJob()}>
                    Create a job
                  </button>
                  <button className="btn" onClick={() => newJob(EXAMPLE)}>
                    Start from an example
                  </button>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-panel">
                <h3>No matching jobs</h3>
                <p>Try a different filter or search.</p>
              </div>
            ) : (
              <div className="list">
                <div className="list-head" aria-hidden="true">
                  <span className="h-main">Job</span>
                  <span className="h-spark">Last 30 runs</span>
                  <span className="h-sched">Schedule</span>
                  <span className="h-next">Next run</span>
                  <span className="h-last">Last run</span>
                  <span className="h-actions" />
                </div>
                {filtered.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    spark={data.sparks[job.id] ?? []}
                    now={now}
                    busy={busyId === job.id}
                    menuOpen={menuId === job.id}
                    onOpen={() => setDrawerId(job.id)}
                    onRun={() => runNow(job)}
                    onToggle={() => toggle(job)}
                    onEdit={() => edit(job)}
                    onDelete={() => remove(job)}
                    onMenu={() => setMenuId(menuId === job.id ? null : job.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {data && view === "stats" && <StatsView />}

        {data && view === "admin" && data.me.role === "admin" && <AdminView meEmail={data.me.email} onToast={pushToast} />}

        {data && view === "activity" && (
          <>
            <div className="toolbar solo">
              <h1 className="page-title">Activity</h1>
              <span className="muted">Your latest 60 runs</span>
            </div>
            <ActivityFeed
              runs={data.recent}
              jobsById={jobsById}
              onOpenJob={(id) => {
                setView("jobs");
                setDrawerId(id);
              }}
            />
          </>
        )}
      </main>

      {drawerJob && data && (
        <JobDrawer
          job={drawerJob}
          spark={data.sparks[drawerJob.id] ?? []}
          now={now}
          busy={busyId === drawerJob.id}
          historyKey={historyKey}
          onClose={() => setDrawerId(null)}
          onRun={() => runNow(drawerJob)}
          onToggle={() => toggle(drawerJob)}
          onEdit={() => edit(drawerJob)}
          onDelete={() => remove(drawerJob)}
          onCopy={() => copyUrl(drawerJob)}
        />
      )}

      {form && (
        <JobForm
          job={form.job}
          initial={form.initial}
          onClose={() => setForm(null)}
          onSaved={(kind) => {
            setForm(null);
            pushToast("ok", kind === "created" ? "Job created" : "Changes saved");
            load();
          }}
        />
      )}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <Icon name={t.kind === "ok" ? "check" : t.kind === "fail" ? "alert" : "clock"} size={16} />
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </>
  );
}
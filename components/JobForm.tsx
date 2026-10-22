"use client";

import { useEffect, useState } from "react";
import type { Job } from "@/lib/types";
import { describeCron, fmtDate, relTime } from "@/lib/format";
import { Icon } from "./Icons";
import Switch from "./Switch";

const PRESETS = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Hourly", value: "0 * * * *" },
  { label: "Daily at 9 AM", value: "0 9 * * *" },
  { label: "Weekdays at 8 AM", value: "0 8 * * 1-5" },
  { label: "Mondays at 9 AM", value: "0 9 * * 1" },
  { label: "Monthly on the 1st", value: "0 9 1 * *" },
];

const TIMEZONES = [
  "Asia/Manila",
  "UTC",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Hong_Kong",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
];

function headersToText(h: Record<string, string> | undefined) {
  return Object.entries(h ?? {})
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

function textToHeaders(text: string) {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

export default function JobForm({
  job,
  initial,
  onClose,
  onSaved,
}: {
  job: Job | null;
  initial?: Partial<Job>;
  onClose: () => void;
  onSaved: (kind: "created" | "saved") => void;
}) {
  const base: Partial<Job> = job ?? initial ?? {};

  const [title, setTitle] = useState(base.title ?? "");
  const [url, setUrl] = useState(base.url ?? "");
  const [method, setMethod] = useState(base.method ?? "GET");
  const [schedule, setSchedule] = useState(base.schedule ?? "*/5 * * * *");
  const [timezone, setTimezone] = useState(base.timezone ?? "Asia/Manila");
  const [headersText, setHeadersText] = useState(headersToText(base.headers));
  const [body, setBody] = useState(base.body ?? "");
  const [timeoutMs, setTimeoutMs] = useState(base.timeout_ms ?? 15000);
  const [enabled, setEnabled] = useState(base.enabled ?? true);

  const [preview, setPreview] = useState<string[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shows the next runs while you type a schedule (waits 300 ms after you stop typing).
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/preview?schedule=${encodeURIComponent(schedule)}&tz=${encodeURIComponent(timezone)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setPreview(json.runs);
        setPreviewError(null);
      } catch (e) {
        setPreview([]);
        setPreviewError(e instanceof Error ? e.message : "This schedule isn't valid");
      }
    }, 300);
    return () => clearTimeout(t);
  }, [schedule, timezone]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(job ? `/api/jobs/${job.id}` : "/api/jobs", {
        method: job ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          url,
          method,
          schedule,
          timezone,
          headers: textToHeaders(headersText),
          body,
          timeout_ms: timeoutMs,
          enabled,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save the job");
      onSaved(job ? "saved" : "created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the job");
    } finally {
      setSaving(false);
    }
  }

  const showBody = method !== "GET" && method !== "HEAD";

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit}>
        <div className="modal-head">
          <h2>{job ? "Edit job" : "New job"}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={17} />
          </button>
        </div>

        <div className="modal-body">
          <label className="field">
            <span className="lbl">Name</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Keep Supabase awake" required autoFocus />
          </label>

          <div className="row">
            <label className="field grow">
              <span className="lbl">URL</span>
              <input className="input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/api/ping" required />
            </label>
            <label className="field method-field">
              <span className="lbl">Method</span>
              <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
                {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="field">
            <span className="lbl">Schedule</span>
            <div className="chips">
              {PRESETS.map((p) => (
                <button type="button" key={p.value} className={`chip ${schedule === p.value ? "active" : ""}`} onClick={() => setSchedule(p.value)}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="row">
              <input
                className="input mono grow"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="minute hour day month weekday"
                aria-label="Cron expression"
                required
              />
              <input className="input tz-field" list="tz-list" value={timezone} onChange={(e) => setTimezone(e.target.value)} aria-label="Time zone" />
              <datalist id="tz-list">
                {TIMEZONES.map((z) => (
                  <option key={z} value={z} />
                ))}
              </datalist>
            </div>
            {previewError ? (
              <p className="hint error">{previewError}</p>
            ) : (
              <div className="preview">
                <p className="hint">
                  {describeCron(schedule)}
                  {preview[0] ? `. Next run ${relTime(preview[0])}.` : "."}
                </p>
                <ul>
                  {preview.slice(0, 4).map((p) => (
                    <li key={p}>{fmtDate(p, timezone)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <label className="field">
            <span className="lbl">
              Headers <span className="sub">one per line, like Authorization: Bearer abc123</span>
            </span>
            <textarea className="input mono" rows={3} value={headersText} onChange={(e) => setHeadersText(e.target.value)} placeholder={"Authorization: Bearer abc123\nContent-Type: application/json"} />
          </label>

          {showBody && (
            <label className="field">
              <span className="lbl">Body</span>
              <textarea className="input mono" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder='{"hello":"world"}' />
            </label>
          )}

          <div className="row end">
            <label className="field grow">
              <span className="lbl">Timeout in milliseconds</span>
              <input className="input" type="number" min={1000} max={30000} step={500} value={timeoutMs} onChange={(e) => setTimeoutMs(Number(e.target.value))} />
            </label>
            <div className="field enable-field">
              <span className="lbl">{enabled ? "Enabled" : "Paused"}</span>
              <Switch checked={enabled} onChange={setEnabled} label="Enable job" />
            </div>
          </div>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "Saving…" : job ? "Save changes" : "Create job"}
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import type { JobWithTiming, Spark } from "@/lib/types";
import { statusOf, STATUS_LABEL } from "@/lib/status";
import { describeCron, fmtCountdown, fmtDate } from "@/lib/format";
import { Icon } from "./Icons";
import Switch from "./Switch";
import UptimeBar from "./UptimeBar";
import RunHistory from "./RunHistory";
import ResponseChart from "./ResponseChart";

type Props = {
  job: JobWithTiming;
  spark: Spark[];
  now: number;
  busy: boolean;
  historyKey: number;
  onClose: () => void;
  onRun: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
};

export default function JobDrawer({ job, spark, now, busy, historyKey, onClose, onRun, onToggle, onEdit, onDelete, onCopy }: Props) {
  const status = statusOf(job);
  const okCount = spark.slice(-30).filter((r) => r.ok).length;
  const headerCount = Object.keys(job.headers ?? {}).length;
  const msLeft = job.next_run_at ? new Date(job.next_run_at).getTime() - now : null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={job.title}>
        <div className="drawer-head">
          <div className="drawer-title">
            <span className={`mark ${status}`} aria-hidden="true" />
            <h2>{job.title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={17} />
          </button>
        </div>
        <p className="drawer-status">{STATUS_LABEL[status]}</p>

        <div className="drawer-actions">
          <button className="btn primary sm" disabled={busy} onClick={onRun}>
            {busy ? <span className="spinner on-dark" /> : <Icon name="play" size={13} />} Run now
          </button>
          <button className="btn sm" onClick={onEdit}>
            <Icon name="edit" size={14} /> Edit
          </button>
          <button className="btn sm danger" onClick={onDelete}>
            <Icon name="trash" size={14} /> Delete
          </button>
          <span className="spacer" />
          <span className="switch-label">{job.enabled ? "Enabled" : "Paused"}</span>
          <Switch checked={job.enabled} onChange={onToggle} disabled={busy} label={job.enabled ? "Pause job" : "Resume job"} />
        </div>

        <dl className="facts">
          <div>
            <dt>Request</dt>
            <dd>
              <span className="method">{job.method}</span>
              <span className="fact-url">{job.url}</span>
              <button className="icon-btn small" onClick={onCopy} title="Copy URL" aria-label="Copy URL">
                <Icon name="copy" size={14} />
              </button>
            </dd>
          </div>
          <div>
            <dt>Schedule</dt>
            <dd>
              <strong>{describeCron(job.schedule)}</strong>
              <code>{job.schedule}</code>
              <span className="muted">{job.timezone}</span>
            </dd>
          </div>
          <div>
            <dt>Next run</dt>
            <dd>
              {job.enabled && job.next_run_at ? (
                <>
                  <strong className="numeric">{msLeft !== null && msLeft > 0 ? `in ${fmtCountdown(msLeft)}` : "due now"}</strong>
                  <span className="muted">{fmtDate(job.next_run_at, job.timezone)}</span>
                </>
              ) : (
                <span className="muted">Paused</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Details</dt>
            <dd>
              <span>
                {headerCount} {headerCount === 1 ? "header" : "headers"}
              </span>
              <span>{job.body ? "has body" : "no body"}</span>
              <span>{job.timeout_ms / 1000}s timeout</span>
            </dd>
          </div>
        </dl>

        <section className="drawer-section">
          <div className="section-head">
            <h3>Recent runs</h3>
            <span className="muted">{spark.length ? `${okCount} of ${Math.min(30, spark.length)} succeeded` : "No runs yet"}</span>
          </div>
          <UptimeBar runs={spark} timezone={job.timezone} large />
        </section>

        <section className="drawer-section">
          <ResponseChart runs={spark} timezone={job.timezone} />
        </section>

        <section className="drawer-section">
          <div className="section-head">
            <h3>Run history</h3>
            <span className="muted">Select a run to see the response</span>
          </div>
          <RunHistory jobId={job.id} timezone={job.timezone} refreshKey={historyKey} />
        </section>
      </aside>
    </>
  );
}

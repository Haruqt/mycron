"use client";

import type { JobWithTiming, Spark } from "@/lib/types";
import { statusOf, STATUS_LABEL } from "@/lib/status";
import { describeCron, fmtCountdown, fmtDate, hostPath, relTime } from "@/lib/format";
import { Icon } from "./Icons";
import Switch from "./Switch";
import UptimeBar from "./UptimeBar";

type Props = {
  job: JobWithTiming;
  spark: Spark[];
  now: number;
  busy: boolean;
  menuOpen: boolean;
  onOpen: () => void;
  onRun: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMenu: () => void;
};

export default function JobRow({ job, spark, now, busy, menuOpen, onOpen, onRun, onToggle, onEdit, onDelete, onMenu }: Props) {
  const status = statusOf(job);

  const next = job.next_run_at ? new Date(job.next_run_at).getTime() : null;
  const prev = job.prev_run_at ? new Date(job.prev_run_at).getTime() : null;
  const msLeft = next === null ? null : next - now;

  let nextLabel = "Paused";
  if (job.enabled && msLeft !== null) {
    nextLabel = msLeft < -5000 ? "Overdue" : msLeft <= 0 ? "Running" : fmtCountdown(msLeft);
  }

  // How far we are between the previous scheduled run and the next one.
  let progress = 0;
  if (job.enabled && next !== null && prev !== null && next > prev) {
    progress = Math.min(100, Math.max(0, ((now - prev) / (next - prev)) * 100));
  }

  return (
    <div className={`job-row ${status}`} onClick={onOpen}>
      <button className="cell-main">
        <span className={`mark ${status}`} aria-hidden="true" />
        <span className="sr">{STATUS_LABEL[status]}.</span>
        <span className="job-text">
          <span className="job-title">{job.title}</span>
          <span className="job-url">
            <span className="method">{job.method}</span>
            <span className="url-text" title={job.url}>
              {hostPath(job.url)}
            </span>
          </span>
        </span>
      </button>

      <div className="cell cell-spark">
        <UptimeBar runs={spark} timezone={job.timezone} />
      </div>

      <div className="cell cell-sched">
        <span className="sched-human">{describeCron(job.schedule)}</span>
        <code className="sched-cron">{job.schedule}</code>
      </div>

      <div className="cell cell-next" title={job.next_run_at && job.enabled ? fmtDate(job.next_run_at, job.timezone) : undefined}>
        <span className={`countdown ${nextLabel === "Paused" || nextLabel === "Overdue" ? "dim" : ""}`}>{nextLabel}</span>
      </div>

      <div className="cell cell-last">
        <span className="last-when">{relTime(job.last_run_at)}</span>
        {job.last_run_at && <span className={`badge ${job.last_ok ? "ok" : "fail"}`}>{job.last_status ?? "ERR"}</span>}
      </div>

      <div className="cell cell-actions" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn" title="Run now" aria-label={`Run ${job.title} now`} disabled={busy} onClick={onRun}>
          {busy ? <span className="spinner" /> : <Icon name="play" size={15} />}
        </button>
        <Switch checked={job.enabled} onChange={onToggle} disabled={busy} label={job.enabled ? `Pause ${job.title}` : `Resume ${job.title}`} />
        <div className="menu-wrap">
          <button className="icon-btn" aria-label="More actions" aria-expanded={menuOpen} onClick={onMenu}>
            <Icon name="more" size={16} />
          </button>
          {menuOpen && (
            <div className="menu" role="menu">
              <button role="menuitem" onClick={onEdit}>
                <Icon name="edit" size={14} /> Edit
              </button>
              <button role="menuitem" className="danger" onClick={onDelete}>
                <Icon name="trash" size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {job.enabled && (
        <span className="row-progress" aria-hidden="true">
          <span className="row-progress-fill" style={{ width: `${progress}%` }} />
        </span>
      )}
    </div>
  );
}

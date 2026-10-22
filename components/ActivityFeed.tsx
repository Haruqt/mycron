"use client";

import { useState } from "react";
import type { JobRun, JobWithTiming } from "@/lib/types";
import { fmtDate, fmtDuration, hostPath, relTime } from "@/lib/format";

export default function ActivityFeed({
  runs,
  jobsById,
  onOpenJob,
}: {
  runs: JobRun[];
  jobsById: Record<string, JobWithTiming>;
  onOpenJob: (id: string) => void;
}) {
  const [onlyFailed, setOnlyFailed] = useState(false);
  const rows = onlyFailed ? runs.filter((r) => !r.ok) : runs;
  const failedCount = runs.filter((r) => !r.ok).length;

  return (
    <>
      <div className="toolbar">
        <div className="filters" role="group" aria-label="Filter runs">
          <button className={`filter ${!onlyFailed ? "active" : ""}`} onClick={() => setOnlyFailed(false)}>
            All runs <span className="count">{runs.length}</span>
          </button>
          <button className={`filter ${onlyFailed ? "active" : ""}`} onClick={() => setOnlyFailed(true)}>
            Failed <span className="count">{failedCount}</span>
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty-panel">
          <h3>{onlyFailed ? "No failed runs" : "No runs yet"}</h3>
          <p>{onlyFailed ? "Everything in the latest 60 runs succeeded." : "Runs show up here as soon as a job fires."}</p>
        </div>
      ) : (
        <ul className="activity">
          {rows.map((r) => {
            const job = jobsById[r.job_id];
            return (
              <li key={r.id}>
                <details>
                  <summary>
                    <span className={`badge ${r.ok ? "ok" : "fail"}`}>{r.status_code ?? "ERR"}</span>
                    <span className="act-job">
                      <span className="act-title">{job ? job.title : "Deleted job"}</span>
                      {job && <span className="act-url">{hostPath(job.url)}</span>}
                    </span>
                    <span className="act-when" title={fmtDate(r.started_at, job?.timezone)}>
                      {relTime(r.started_at)}
                    </span>
                    <span className="act-dur">{r.duration_ms != null ? fmtDuration(r.duration_ms) : "no response"}</span>
                  </summary>
                  <div className="act-body">
                    <pre className="run-body">{r.error ?? (r.response_snippet || "Empty response")}</pre>
                    {job && (
                      <button className="btn sm" onClick={() => onOpenJob(job.id)}>
                        Open job
                      </button>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

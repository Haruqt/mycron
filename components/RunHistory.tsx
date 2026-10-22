"use client";

import { useCallback, useEffect, useState } from "react";
import type { JobRun } from "@/lib/types";
import { fmtDate, fmtDuration } from "@/lib/format";

export default function RunHistory({ jobId, timezone, refreshKey }: { jobId: string; timezone: string; refreshKey: number }) {
  const [runs, setRuns] = useState<JobRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/runs`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load run history");
      setRuns(json.runs);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load run history");
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (error) return <p className="empty-line">{error}</p>;
  if (!runs) return <div className="skeleton-block" aria-label="Loading runs" />;
  if (runs.length === 0) return <p className="empty-line">No runs yet. Use Run now, or wait for the schedule.</p>;

  return (
    <ul className="runs">
      {runs.map((r) => (
        <li key={r.id}>
          <details>
            <summary>
              <span className={`badge ${r.ok ? "ok" : "fail"}`}>{r.status_code ?? "ERR"}</span>
              <span className="run-time">{fmtDate(r.started_at, timezone)}</span>
              <span className="run-dur">{r.duration_ms != null ? fmtDuration(r.duration_ms) : "no response"}</span>
            </summary>
            <pre className="run-body">{r.error ?? (r.response_snippet || "Empty response")}</pre>
          </details>
        </li>
      ))}
    </ul>
  );
}

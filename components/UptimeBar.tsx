import type { Spark } from "@/lib/types";
import { fmtDate } from "@/lib/format";

const SLOTS = 30;

// One bar per run, oldest on the left. Empty slots stay as faint placeholders.
export default function UptimeBar({ runs: all, timezone, large }: { runs: Spark[]; timezone: string; large?: boolean }) {
  const runs = all.slice(-SLOTS);
  const empty = Math.max(0, SLOTS - runs.length);
  return (
    <div className={`uptime ${large ? "large" : ""}`} role="img" aria-label={`Last ${runs.length} runs`}>
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`empty-${i}`} className="bar empty" />
      ))}
      {runs.map((r, i) => (
        <span
          key={`${r.started_at}-${i}`}
          className={`bar ${r.ok ? "ok" : "fail"}`}
          title={`${fmtDate(r.started_at, timezone)}, ${r.status_code ?? "no response"}${
            r.duration_ms != null ? `, ${r.duration_ms} ms` : ""
          }`}
        />
      ))}
    </div>
  );
}

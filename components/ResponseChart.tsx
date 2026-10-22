"use client";

import type { Spark } from "@/lib/types";
import { fmtDate, fmtDuration } from "@/lib/format";
import TimeChart, { type Datum } from "./charts/TimeChart";
import ChartCard from "./charts/ChartCard";

function shortTime(iso: string, tz: string) {
  try {
    return new Date(iso).toLocaleString([], { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return new Date(iso).toLocaleString();
  }
}

// One bar per run (newest on the right). Bar height = how long the target took to answer.
export default function ResponseChart({ runs, timezone }: { runs: Spark[]; timezone: string }) {
  const timed = runs.filter((r) => r.duration_ms != null);
  const avg = timed.length ? timed.reduce((a, r) => a + (r.duration_ms ?? 0), 0) / timed.length : null;

  const data: Datum[] = runs.map((r) => ({
    x: shortTime(r.started_at, timezone),
    title: fmtDate(r.started_at, timezone),
    subtitle: r.ok ? "Succeeded" : "Failed",
    values: [r.duration_ms ?? 0],
    color: r.ok ? "var(--ok)" : "var(--fail)",
    rows: [
      { label: "Status", value: r.status_code !== null ? String(r.status_code) : "No response", color: r.ok ? "var(--ok)" : "var(--fail)" },
      { label: "Response time", value: r.duration_ms != null ? fmtDuration(r.duration_ms) : "n/a" },
      ...(r.jitter_ms != null ? [{ label: "Started late by", value: fmtDuration(r.jitter_ms) }] : [{ label: "Started", value: "Run now" }]),
    ],
  }));

  return (
    <ChartCard bare title="Response time" subtitle={`Each bar is one run, newest on the right. The dashed line is the average of the last ${runs.length || 50}.`}>
      <TimeChart
        kind="bar"
        data={data}
        slots={50}
        colors={["var(--ok)"]}
        height={200}
        unit="response time"
        yFormat={(n) => (n === 0 ? "0" : fmtDuration(n))}
        avg={avg !== null ? { value: avg, label: `Average ${fmtDuration(Math.round(avg))}` } : null}
        legend={[
          { name: "Succeeded", color: "var(--ok)" },
          { name: "Failed", color: "var(--fail)" },
          { name: "Average", color: "var(--ink-3)", dashed: true },
        ]}
        ariaLabel="Response time of the last runs"
        empty="Response times show up here after the first run."
      />
    </ChartCard>
  );
}

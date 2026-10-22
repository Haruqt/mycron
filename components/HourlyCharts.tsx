"use client";

import type { Hour } from "@/lib/types";
import { fmtDuration } from "@/lib/format";
import TimeChart, { type Datum } from "./charts/TimeChart";
import ChartCard from "./charts/ChartCard";

const h12 = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric" });
const day = (iso: string) => new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
const hourTitle = (iso: string) => {
  const end = new Date(new Date(iso).getTime() + 3600_000).toISOString();
  return `${day(iso)}, ${h12(iso)} to ${h12(end)}`;
};
const xLabel = (hours: Hour[], i: number) => (i === hours.length - 1 ? "Now" : h12(hours[i].t));

export function RunsPerHour({ hours, scope = "" }: { hours: Hour[]; scope?: string }) {
  const total = hours.reduce((n, h) => n + h.ok + h.fail, 0);
  const failed = hours.reduce((n, h) => n + h.fail, 0);
  const data: Datum[] = hours.map((h, i) => {
    const n = h.ok + h.fail;
    return {
      x: xLabel(hours, i),
      title: hourTitle(h.t),
      subtitle: n === 0 ? "No runs" : `${n} ${n === 1 ? "run" : "runs"}`,
      values: [h.ok, h.fail],
      rows:
        n === 0
          ? [{ label: "Runs", value: "0" }]
          : [
              { label: "Succeeded", value: String(h.ok), color: "var(--ok)" },
              { label: "Failed", value: String(h.fail), color: "var(--fail)" },
              { label: "Success rate", value: `${Math.round((h.ok / n) * 100)}%` },
              ...(h.avgMs !== null ? [{ label: "Avg response", value: fmtDuration(h.avgMs) }] : []),
            ],
    };
  });
  return (
    <ChartCard
      title="Runs per hour"
      subtitle={`Each bar is one hour${scope}. ${total.toLocaleString()} ${total === 1 ? "run" : "runs"} in the last 24 hours${failed ? `, ${failed.toLocaleString()} failed` : ""}.`}
    >
      <TimeChart
        kind="stack"
        data={data}
        colors={["var(--ok)", "var(--fail)"]}
        unit="runs per hour"
        integer
        yFormat={(n) => n.toLocaleString()}
        legend={[
          { name: "Succeeded", color: "var(--ok)" },
          { name: "Failed", color: "var(--fail)" },
        ]}
        ariaLabel="Runs per hour, last 24 hours"
      />
    </ChartCard>
  );
}

function hourLine(hours: Hour[], pick: (h: Hour) => number | null, name: string, runsNoun: string): Datum[] {
  return hours.map((h, i) => {
    const v = pick(h);
    const n = h.ok + h.fail;
    return {
      x: xLabel(hours, i),
      title: hourTitle(h.t),
      subtitle: n === 0 ? "No runs" : `${n} ${n === 1 ? runsNoun : runsNoun + "s"}`,
      values: [v],
      rows: [{ label: name, value: v !== null ? fmtDuration(v) : "n/a", color: "var(--accent)" }],
    };
  });
}

export function ResponseByHour({ hours }: { hours: Hour[] }) {
  const vals = hours.map((h) => h.avgMs).filter((v): v is number => v !== null);
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  return (
    <ChartCard title="Response time" subtitle="Average time the target took to answer, per hour. Lower is better.">
      <TimeChart
        kind="line"
        data={hourLine(hours, (h) => h.avgMs, "Avg response", "run")}
        colors={["var(--accent)"]}
        unit="average response"
        yFormat={(n) => (n === 0 ? "0" : fmtDuration(n))}
        avg={avg !== null ? { value: avg, label: `24h average ${fmtDuration(Math.round(avg))}` } : null}
        legend={[
          { name: "Average per hour", color: "var(--accent)" },
          { name: "24h average", color: "var(--ink-3)", dashed: true },
        ]}
        ariaLabel="Average response time per hour"
      />
    </ChartCard>
  );
}

export function DelayByHour({ hours }: { hours: Hour[] }) {
  return (
    <ChartCard title="Start delay" subtitle="How long after its scheduled time a run actually started (jitter), per hour. Lower means more on time.">
      <TimeChart
        kind="line"
        data={hourLine(hours, (h) => h.avgJitterMs, "Avg delay", "run")}
        colors={["var(--ink-2)"]}
        unit="average delay"
        yFormat={(n) => (n === 0 ? "0" : fmtDuration(n))}
        legend={[{ name: "Average delay per hour", color: "var(--ink-2)" }]}
        ariaLabel="Average start delay per hour"
      />
    </ChartCard>
  );
}

export default function HourlyCharts({ hours }: { hours: Hour[] }) {
  return (
    <section className="hcharts" aria-label="Last 24 hours">
      <RunsPerHour hours={hours} />
      <ResponseByHour hours={hours} />
    </section>
  );
}

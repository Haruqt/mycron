"use client";

import { useCallback, useEffect, useState } from "react";
import type { Hour } from "@/lib/types";
import { DelayByHour, ResponseByHour, RunsPerHour } from "./HourlyCharts";

type Stats = {
  tiles: { users: number; jobs: number; activeJobs: number; runs24h: number };
  hourly: Hour[];
};

export default function StatsView() {
  const [data, setData] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load statistics");
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  if (error && !data) {
    return (
      <div className="notice fail" role="alert">
        <div>
          <strong>Can&apos;t load statistics</strong>
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
    ["users", t.users],
    ["cron jobs", t.jobs, `${t.activeJobs} active`],
    ["executions in the last 24 hours", t.runs24h],
  ];

  return (
    <>
      <div className="toolbar solo">
        <h1 className="page-title">Statistics</h1>
        <span className="muted">All of mycron, last 24 hours</span>
      </div>

      <div className="tiles three-tiles">
        {tiles.map(([label, n, sub]) => (
          <div key={label} className="tile">
            <strong>{n.toLocaleString()}</strong>
            <span>{label}</span>
            {sub && <em>{sub}</em>}
          </div>
        ))}
      </div>

      <section className="hcharts three" aria-label="Usage in the last 24 hours">
        <div className="wide">
          <RunsPerHour hours={data.hourly} scope=", all people" />
        </div>
        <ResponseByHour hours={data.hourly} />
        <DelayByHour hours={data.hourly} />
      </section>
    </>
  );
}
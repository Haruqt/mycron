"use client";

import type { JobWithTiming } from "@/lib/types";
import { describeCron, fmtCountdown, hostPath } from "@/lib/format";

// The one big thing on the page: a live countdown to whichever job runs next.
export default function Hero({
  jobs,
  now,
  isLocal,
  onOpen,
}: {
  jobs: JobWithTiming[];
  now: number;
  isLocal: boolean;
  onOpen: (id: string) => void;
}) {
  if (jobs.length === 0) return null;

  const upcoming = jobs
    .filter((j) => j.enabled && j.next_run_at)
    .sort((a, b) => new Date(a.next_run_at as string).getTime() - new Date(b.next_run_at as string).getTime());
  const next = upcoming[0];

  if (!next) {
    return (
      <section className="hero">
        <div className="hero-clock dim">Paused</div>
        <div className="hero-text">
          <h2>Nothing is scheduled</h2>
          <p>Every job is paused. Turn one back on and its countdown will show up here.</p>
        </div>
      </section>
    );
  }

  const ms = new Date(next.next_run_at as string).getTime() - now;
  const running = ms <= 0 && ms >= -5000;
  const overdue = ms < -5000;

  let text: string;
  if (overdue) {
    text = isLocal
      ? "Scheduled runs don't fire on localhost. They start once the app is deployed and supabase/schedule.sql has run. Run now still works."
      : "The scheduler hasn't picked this up yet. Check that the Supabase ping to /api/tick is running.";
  } else if (running) {
    text = "Running now.";
  } else {
    text = `Runs next: ${next.method} ${hostPath(next.url)}, ${describeCron(next.schedule).toLowerCase()}.`;
  }

  return (
    <section className="hero">
      <button
        className={`hero-clock ${overdue ? "dim" : ""} ${running ? "pulse" : ""}`}
        onClick={() => onOpen(next.id)}
        aria-label={`Next run: ${next.title}`}
      >
        {overdue ? "Overdue" : running ? "Now" : fmtCountdown(ms)}
      </button>
      <div className="hero-text">
        <h2>{next.title}</h2>
        <p>{text}</p>
      </div>
    </section>
  );
}

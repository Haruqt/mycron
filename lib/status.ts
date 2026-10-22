import type { Job } from "./types";

export type Status = "paused" | "idle" | "ok" | "fail";

export function statusOf(job: Job): Status {
  if (!job.enabled) return "paused";
  if (job.last_ok === null || job.last_ok === undefined) return "idle";
  return job.last_ok ? "ok" : "fail";
}

export const STATUS_LABEL: Record<Status, string> = {
  paused: "Paused",
  idle: "Waiting for first run",
  ok: "Healthy",
  fail: "Failing",
};

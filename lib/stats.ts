import type { Hour } from "./types";

const HOUR = 60 * 60 * 1000;

export type StatRow = {
  hour: string;
  runs: number;
  ok: number;
  fail: number;
  sum_ms: number;
  n_ms: number;
  sum_jitter: number;
  n_jitter: number;
};

// Turns raw hourly rows (possibly several people's) into exactly 24 buckets, oldest first.
export function fillHours(rows: StatRow[]): Hour[] {
  const end = Math.floor(Date.now() / HOUR) * HOUR;
  const acc = Array.from({ length: 24 }, (_, i) => ({ t: end - (23 - i) * HOUR, ok: 0, fail: 0, sms: 0, nms: 0, sj: 0, nj: 0 }));
  for (const r of rows) {
    const idx = 23 - Math.round((end - new Date(r.hour).getTime()) / HOUR);
    const b = acc[idx];
    if (!b) continue;
    b.ok += r.ok;
    b.fail += r.fail;
    b.sms += Number(r.sum_ms);
    b.nms += r.n_ms;
    b.sj += Number(r.sum_jitter);
    b.nj += r.n_jitter;
  }
  return acc.map((b) => ({
    t: new Date(b.t).toISOString(),
    ok: b.ok,
    fail: b.fail,
    avgMs: b.nms ? Math.round(b.sms / b.nms) : null,
    avgJitterMs: b.nj ? Math.round(b.sj / b.nj) : null,
  }));
}

export function sinceIso() {
  return new Date(Math.floor(Date.now() / HOUR) * HOUR - 23 * HOUR).toISOString();
}

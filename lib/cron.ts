import { parseExpression } from "cron-parser";

export function nextRun(expr: string, tz: string, from: Date = new Date()): Date {
  const it = parseExpression(expr, { currentDate: from, tz });
  return it.next().toDate();
}

// The scheduled moment right before `from` (used for the progress line under each job).
export function prevRun(expr: string, tz: string, from: Date): Date | null {
  try {
    return parseExpression(expr, { currentDate: from, tz }).prev().toDate();
  } catch {
    return null;
  }
}

export function nextRuns(expr: string, tz: string, count = 5): Date[] {
  const it = parseExpression(expr, { currentDate: new Date(), tz });
  const out: Date[] = [];
  for (let i = 0; i < count; i++) out.push(it.next().toDate());
  return out;
}

// Returns null when valid, or a readable error message.
export function validateSchedule(expr: string, tz: string): string | null {
  try {
    nextRun(expr, tz);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid cron expression";
  }
}

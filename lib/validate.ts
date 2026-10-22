import { validateSchedule } from "./cron";
import { checkHostname } from "./netguard";
import type { JobInput } from "./types";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"];

type Result = { data: JobInput; error?: undefined } | { data?: undefined; error: string };

export function parseJobInput(raw: unknown): Result {
  if (typeof raw !== "object" || raw === null) return { error: "Invalid request body" };
  const b = raw as Record<string, unknown>;

  const title = String(b.title ?? "").trim();
  if (!title) return { error: "Title is required" };

  let url: string;
  try {
    const u = new URL(String(b.url ?? "").trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
    url = u.toString();
  } catch {
    return { error: "URL must be a valid http(s) address" };
  }

  const blocked = checkHostname(url);
  if (blocked) return { error: blocked };

  const method = String(b.method ?? "GET").toUpperCase();
  if (!METHODS.includes(method)) return { error: `Method must be one of ${METHODS.join(", ")}` };

  const headers: Record<string, string> = {};
  if (b.headers !== undefined && b.headers !== null) {
    if (typeof b.headers !== "object" || Array.isArray(b.headers)) {
      return { error: "Headers must be an object" };
    }
    for (const [k, v] of Object.entries(b.headers as Record<string, unknown>)) {
      if (typeof v !== "string") return { error: `Header "${k}" must be a string` };
      headers[k] = v;
    }
  }

  const body = typeof b.body === "string" && b.body.length > 0 ? b.body : null;
  const timezone = String(b.timezone ?? "Asia/Manila").trim() || "Asia/Manila";
  const schedule = String(b.schedule ?? "").trim();
  if (!schedule) return { error: "Schedule is required" };

  const scheduleError = validateSchedule(schedule, timezone);
  if (scheduleError) return { error: `Schedule: ${scheduleError}` };

  const enabled = b.enabled === undefined ? true : Boolean(b.enabled);
  const timeoutRaw = Number(b.timeout_ms ?? 15000);
  const timeout_ms = Math.min(30000, Math.max(1000, Number.isFinite(timeoutRaw) ? timeoutRaw : 15000));

  return {
    data: { title: title.slice(0, 120), url, method, headers, body, schedule, timezone, enabled, timeout_ms },
  };
}

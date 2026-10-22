export function relTime(iso: string | null): string {
  if (!iso) return "never";
  const diff = new Date(iso).getTime() - Date.now();
  const s = Math.round(Math.abs(diff) / 1000);

  let text: string;
  if (s < 60) text = `${s}s`;
  else if (s < 3600) text = `${Math.round(s / 60)}m`;
  else if (s < 86400) text = `${Math.round(s / 3600)}h`;
  else text = `${Math.round(s / 86400)}d`;

  return diff >= 0 ? `in ${text}` : `${text} ago`;
}

export function fmtDate(iso: string, tz?: string): string {
  try {
    return new Date(iso).toLocaleString("en-PH", {
      timeZone: tz,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export function fmtDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)} s`;
}

// 02:41 under an hour, 1h 05m under a day, 2d 4h beyond that.
export function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function hostPath(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function clock(h: number, m: number): string {
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

// Turns the common cron patterns into plain words. Anything unusual falls back to the raw expression.
export function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;
  const [min, hour, dom, mon, dow] = parts;
  const isNum = (s: string) => /^\d+$/.test(s);

  if (parts.join(" ") === "* * * * *") return "Every minute";

  const everyMin = min.match(/^\*\/(\d+)$/);
  if (everyMin && hour === "*" && dom === "*" && mon === "*" && dow === "*") {
    return everyMin[1] === "1" ? "Every minute" : `Every ${everyMin[1]} minutes`;
  }

  if (isNum(min) && hour === "*" && dom === "*" && mon === "*" && dow === "*") {
    return min === "0" ? "Every hour" : `Every hour at :${min.padStart(2, "0")}`;
  }

  const everyHour = hour.match(/^\*\/(\d+)$/);
  if (isNum(min) && everyHour && dom === "*" && mon === "*" && dow === "*") {
    return everyHour[1] === "1" ? "Every hour" : `Every ${everyHour[1]} hours`;
  }

  if (isNum(min) && isNum(hour) && mon === "*") {
    const t = clock(Number(hour), Number(min));
    if (dom === "*" && dow === "*") return `Every day at ${t}`;
    if (dom === "*" && dow === "1-5") return `Weekdays at ${t}`;
    if (dom === "*" && isNum(dow)) return `${DAYS[Number(dow) % 7]}s at ${t}`;
    if (isNum(dom) && dow === "*") return `Monthly on day ${dom} at ${t}`;
  }

  return expr;
}

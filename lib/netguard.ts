import { lookup } from "node:dns/promises";
import net from "node:net";

// Stops jobs from calling private/internal addresses (your own network, cloud metadata, localhost).
// Without this, any signed-in user could use the server to probe things only the server can reach.

function privateV4(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function privateV6(ip: string) {
  const x = ip.toLowerCase();
  if (x === "::" || x === "::1") return true;
  if (x.startsWith("::ffff:")) {
    const v4 = x.slice(7);
    return net.isIPv4(v4) ? privateV4(v4) : true;
  }
  return x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe8") || x.startsWith("fe9") || x.startsWith("fea") || x.startsWith("feb");
}

export function isPrivateIp(ip: string) {
  if (net.isIPv4(ip)) return privateV4(ip);
  if (net.isIPv6(ip)) return privateV6(ip);
  return true;
}

const BLOCKED = "That address points to a private or internal network, which isn't allowed.";

// Fast check on the text of the URL (no network). Used when saving a job.
export function checkHostname(rawUrl: string): string | null {
  let host: string;
  try {
    host = new URL(rawUrl).hostname.toLowerCase().replace(/^\[|\]$/g, "");
  } catch {
    return "URL must be a valid http(s) address";
  }
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return BLOCKED;
  if (net.isIP(host) && isPrivateIp(host)) return BLOCKED;
  return null;
}

// Full check right before calling: also resolves the name and looks at every address it points to.
export async function assertPublicUrl(rawUrl: string): Promise<void> {
  const early = checkHostname(rawUrl);
  if (early) throw new Error(early);
  const host = new URL(rawUrl).hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) return;
  const addrs = await lookup(host, { all: true });
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) throw new Error(BLOCKED);
}

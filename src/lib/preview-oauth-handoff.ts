/**
 * Phone Google sign-in opens a second browser that does not have the preview
 * cookie, so the broker's return never reaches this app. Mint a short-lived
 * preview cookie and remember the broker URL under the attempt id. The other
 * browser hits the preview auth path first (cookie is set), then continues to
 * the broker.
 */

import { createHmac, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { env } from "./env.server";

const ATTEMPT = /^[0-9a-f]{32}$/;
const TTL_MS = 3 * 60_000;
const FILE = path.join(process.cwd(), ".data", "oauth-jumps.json");

type Jump = { url: string; exp: number };

function jumps(): Map<string, Jump> {
  const g = globalThis as typeof globalThis & { __oauthJumpStore?: Map<string, Jump> };
  if (!g.__oauthJumpStore) g.__oauthJumpStore = new Map();
  return g.__oauthJumpStore;
}

function disk(): Record<string, Jump> {
  try {
    const parsed = JSON.parse(readFileSync(FILE, "utf8")) as Record<string, Jump>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeDisk(attempt: string, row: Jump) {
  try {
    mkdirSync(path.dirname(FILE), { recursive: true });
    const all = disk();
    const now = Date.now();
    for (const key of Object.keys(all)) {
      if (!all[key] || all[key].exp < now) delete all[key];
    }
    all[attempt] = row;
    writeFileSync(FILE, JSON.stringify(all), { encoding: "utf8", mode: 0o600 });
  } catch {
    /* memory still serves this process */
  }
}

export function previewHostFrom(request: Request): string | null {
  const raw =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim() ||
    "";
  const host = raw.replace(/:\d+$/, "").toLowerCase();
  if (!host.endsWith(".grok-sandbox.com")) return null;
  return host;
}

/** HS256 preview cookie the proxy accepts on `/__grok-preview/auth?token=`. */
export function mintPreviewToken(host: string): string | null {
  const key = env("GROK_SERVER_KEY");
  const sid = env("GROK_SESSION_ID");
  if (!key || !sid || !host.endsWith(".grok-sandbox.com")) return null;
  const portId = host.split(".")[0] ?? "";
  if (portId.length < 8 || portId.length > 80) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: "owner",
      sid,
      port_id: portId,
      aud: host,
      iat: now,
      exp: now + 180,
      jti: randomBytes(8).toString("hex"),
    }),
  ).toString("base64url");
  const sig = createHmac("sha256", key).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

export function isBrokerAuthorizeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "auth.grok.me" && parsed.pathname.startsWith("/api/auth/");
  } catch {
    return false;
  }
}

export function saveOAuthJump(attempt: string, url: string) {
  if (!ATTEMPT.test(attempt) || !isBrokerAuthorizeUrl(url) || url.length > 8000) return;
  const row = { url, exp: Date.now() + TTL_MS };
  jumps().set(attempt, row);
  writeDisk(attempt, row);
}

export function readOAuthJump(attempt: string): string | null {
  if (!ATTEMPT.test(attempt)) return null;
  const hot = jumps().get(attempt);
  if (hot && hot.exp >= Date.now()) return hot.url;
  const row = disk()[attempt];
  if (!row || row.exp < Date.now() || !isBrokerAuthorizeUrl(row.url)) return null;
  jumps().set(attempt, row);
  return row.url;
}

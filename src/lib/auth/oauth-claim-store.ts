/**
 * Bridge for Google sign-in on a phone.
 *
 * iOS opens the broker in a separate browser. The session cookie lands there,
 * not in the app. The callback stores the session token under a random attempt
 * id; the still-open login screen claims it. The copy on disk (and in the
 * database) survives a reload of this module, which an in-memory map does not.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ATTEMPT = /^[0-9a-f]{32}$/;
const TTL_MS = 3 * 60_000;
const FILE = path.join(process.cwd(), ".data", "oauth-claims.json");

type Row = { status: "ok" | "error"; token: string | null; exp: number };
type Stored = { status: "ok"; token: string } | { status: "error" };

function claims(): Map<string, Row> {
  const g = globalThis as typeof globalThis & { __oauthClaimStore?: Map<string, Row> };
  if (!g.__oauthClaimStore) g.__oauthClaimStore = new Map();
  return g.__oauthClaimStore;
}

function diskMap(): Record<string, Row> {
  try {
    const parsed = JSON.parse(readFileSync(FILE, "utf8")) as Record<string, Row>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeDisk(attempt: string, row: Row) {
  try {
    mkdirSync(path.dirname(FILE), { recursive: true });
    const all = diskMap();
    const now = Date.now();
    for (const key of Object.keys(all)) {
      if (!all[key] || all[key].exp < now) delete all[key];
    }
    all[attempt] = row;
    writeFileSync(FILE, JSON.stringify(all), { encoding: "utf8", mode: 0o600 });
  } catch {
    /* read-only disk — memory still serves this process */
  }
}

function remember(attempt: string, row: Row) {
  claims().set(attempt, row);
  writeDisk(attempt, row);
}

export function saveOAuthClaim(attempt: string, result: Stored) {
  if (!ATTEMPT.test(attempt)) return;
  if (result.status === "ok" && (result.token.length < 8 || result.token.length > 8000)) return;
  remember(attempt, {
    status: result.status,
    token: result.status === "ok" ? result.token : null,
    exp: Date.now() + TTL_MS,
  });
}

function toResult(row: Row | undefined): { status: "pending" } | Stored {
  if (!row) return { status: "pending" };
  if (row.exp < Date.now()) return { status: "pending" };
  if (row.status === "ok" && row.token) return { status: "ok", token: row.token };
  return { status: "error" };
}

export function readOAuthClaim(attempt: string): { status: "pending" } | Stored {
  if (!ATTEMPT.test(attempt)) return { status: "error" };
  const row = claims().get(attempt);
  if (row && row.exp < Date.now()) {
    claims().delete(attempt);
    return { status: "pending" };
  }
  return toResult(row);
}

/** Memory first, then the file written by the callback — possibly in another module instance. */
export function readOAuthClaimFresh(attempt: string): { status: "pending" } | Stored {
  const hot = readOAuthClaim(attempt);
  if (hot.status !== "pending") return hot;
  if (!ATTEMPT.test(attempt)) return { status: "error" };
  const row = diskMap()[attempt];
  if (!row || row.exp < Date.now()) return { status: "pending" };
  claims().set(attempt, row);
  return toResult(row);
}

let dbReady: Promise<import("../db").Sql | null> | null = null;

function database() {
  if (!dbReady) {
    dbReady = (async () => {
      const { getSql } = await import("../db");
      const sql = await getSql();
      await sql.query(
        `create table if not exists oauth_claim (
          attempt text primary key,
          status text not null,
          token text,
          exp text not null
        )`,
      );
      return sql;
    })().catch(() => {
      dbReady = null;
      return null;
    });
  }
  return dbReady;
}

/** Awaited by the callback so a second server instance can still hand the session back. */
export async function persistOAuthClaim(attempt: string, result: Stored) {
  saveOAuthClaim(attempt, result);
  if (!ATTEMPT.test(attempt)) return;
  try {
    const sql = await database();
    if (!sql) return;
    const row = claims().get(attempt);
    if (!row) return;
    await sql.query(
      `insert into oauth_claim (attempt, status, token, exp)
       values ($1, $2, $3, $4)
       on conflict (attempt) do update set status = excluded.status, token = excluded.token, exp = excluded.exp`,
      [attempt, row.status, row.token, String(row.exp)],
    );
  } catch {
    /* the file copy still serves this process */
  }
}

export async function readStoredOAuthClaim(attempt: string): Promise<{ status: "pending" } | Stored> {
  const fresh = readOAuthClaimFresh(attempt);
  if (fresh.status !== "pending") return fresh;
  if (!ATTEMPT.test(attempt)) return { status: "error" };
  try {
    const sql = await database();
    if (!sql) return { status: "pending" };
    const rows = await sql.query<{ status: string; token: string | null; exp: string | number }>(
      "select status, token, exp from oauth_claim where attempt = $1",
      [attempt],
    );
    const row = rows[0];
    if (!row) return { status: "pending" };
    const exp = Number(row.exp);
    if (!Number.isFinite(exp) || exp < Date.now()) return { status: "pending" };
    if (row.status === "ok" && row.token) {
      saveOAuthClaim(attempt, { status: "ok", token: row.token });
      return { status: "ok", token: row.token };
    }
    if (row.status === "error") {
      saveOAuthClaim(attempt, { status: "error" });
      return { status: "error" };
    }
  } catch {
    /* fall through */
  }
  return { status: "pending" };
}

/** Pull the session token out of Better Auth's Set-Cookie lines. */
export function sessionTokenFromSetCookie(lines: string[], cookieName: string): string | null {
  const blob = lines.join("\n");
  if (!blob) return null;
  for (const part of blob.split(/\n|,(?=\s*[^;,\s]+=)/)) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    if (name !== cookieName) continue;
    let value = part.slice(eq + 1).split(";")[0]?.trim() ?? "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    try {
      value = decodeURIComponent(value);
    } catch {
      /* already decoded */
    }
    if (value) return value;
  }
  return null;
}

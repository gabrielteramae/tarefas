/** Client half of the phone Google handoff. The attempt id never leaves this browser except as a query param. */

const ATTEMPT_KEY = "grok-auth.oauth-attempt";
const ATTEMPT_AT = "grok-auth.oauth-attempt-at";
const ATTEMPT = /^[0-9a-f]{32}$/;

let memoryAttempt: string | null = null;
let memoryAt = 0;

function remember(id: string, at: number) {
  memoryAttempt = id;
  memoryAt = at;
  try {
    window.localStorage.setItem(ATTEMPT_KEY, id);
    window.localStorage.setItem(ATTEMPT_AT, String(at));
  } catch {
    /* private mode or a framed webview that blocks storage */
  }
  try {
    window.sessionStorage.setItem(ATTEMPT_KEY, id);
    window.sessionStorage.setItem(ATTEMPT_AT, String(at));
  } catch {
    /* ignore */
  }
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `grok-oauth-attempt=${id}; Path=/; Max-Age=180; SameSite=Lax${secure}`;
  } catch {
    /* ignore */
  }
}

export function beginOAuthAttempt(): string | null {
  if (typeof window === "undefined") return null;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const id = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  remember(id, Date.now());
  try {
    const here = new URL(window.location.href);
    here.searchParams.set("attempt", id);
    window.history.replaceState(null, "", `${here.pathname}${here.search}${here.hash}`);
  } catch {
    /* the id still lives in memory */
  }
  return id;
}

function readStoredAttempt(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("attempt");
    if (fromUrl && ATTEMPT.test(fromUrl)) return fromUrl;
  } catch {
    /* ignore */
  }
  try {
    const saved = window.localStorage.getItem(ATTEMPT_KEY) ?? window.sessionStorage.getItem(ATTEMPT_KEY);
    if (saved && ATTEMPT.test(saved)) return saved;
  } catch {
    /* ignore */
  }
  return fromCookie();
}

function fromCookie(): string | null {
  try {
    const match = document.cookie.match(/(?:^|; )grok-oauth-attempt=([0-9a-f]{32})(?:;|$)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function storedAt(): number {
  try {
    const n = Number(window.localStorage.getItem(ATTEMPT_AT) ?? window.sessionStorage.getItem(ATTEMPT_AT));
    if (Number.isFinite(n) && n > 0) return n;
  } catch {
    /* ignore */
  }
  return 0;
}

export function peekOAuthAttempt(): string | null {
  if (typeof window === "undefined") return null;
  const id = memoryAttempt && ATTEMPT.test(memoryAttempt) ? memoryAttempt : readStoredAttempt();
  if (!id) return null;
  const at = memoryAt || storedAt();
  if (at && Date.now() - at > 180_000) {
    clearOAuthAttempt();
    return null;
  }
  memoryAttempt = id;
  if (!memoryAt) memoryAt = at || Date.now();
  return id;
}

export function clearOAuthAttempt() {
  memoryAttempt = null;
  memoryAt = 0;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ATTEMPT_KEY);
    window.localStorage.removeItem(ATTEMPT_AT);
  } catch {
    /* storage unavailable */
  }
  try {
    window.sessionStorage.removeItem(ATTEMPT_KEY);
    window.sessionStorage.removeItem(ATTEMPT_AT);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = "grok-oauth-attempt=; Path=/; Max-Age=0; SameSite=Lax";
  } catch {
    /* ignore */
  }
  try {
    const here = new URL(window.location.href);
    if (!here.searchParams.has("attempt")) return;
    here.searchParams.delete("attempt");
    window.history.replaceState(null, "", `${here.pathname}${here.search}${here.hash}`);
  } catch {
    /* ignore */
  }
}

export function callbackWithAttempt(path: string, attempt: string): string {
  const dest = new URL(path, window.location.origin);
  dest.searchParams.set("attempt", attempt);
  return `${dest.pathname}${dest.search}${dest.hash}`;
}

export async function pullOAuthAttempt(): Promise<
  { status: "pending" } | { status: "ok"; token: string } | { status: "error" }
> {
  const id = peekOAuthAttempt();
  if (!id) return { status: "pending" };
  const res = await fetch(`/api/auth/oauth-claim?attempt=${encodeURIComponent(id)}`, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });
  if (res.status === 204) return { status: "pending" };
  const body = (await res.json().catch(() => null)) as { status?: string; token?: string } | null;
  if (body?.status === "ok" && body.token) {
    clearOAuthAttempt();
    return { status: "ok", token: body.token };
  }
  if (body?.status === "error") {
    clearOAuthAttempt();
    return { status: "error" };
  }
  return { status: "pending" };
}

import { createFileRoute } from "@tanstack/react-router";
import { auth, SESSION_TOKEN_COOKIE } from "@/lib/auth/server";
import {
  persistOAuthClaim,
  readStoredOAuthClaim,
  sessionTokenFromSetCookie,
} from "@/lib/auth/oauth-claim-store";
import {
  isBrokerAuthorizeUrl,
  mintPreviewToken,
  previewHostFrom,
  readOAuthJump,
  saveOAuthJump,
} from "@/lib/preview-oauth-handoff";
import { strongPassword, attemptCount, tooManyAttempts, validEmail } from "@/lib/security";

function refused(message: string, status: number) {
  return Response.json({ message }, { status, headers: { "cache-control": "no-store" } });
}

function readRequestCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq) !== name) continue;
    const raw = trimmed.slice(eq + 1);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

async function guardAuth(request: Request) {
  const path = new URL(request.url).pathname;
  const signingUp = path.endsWith("/sign-up/email");
  const signingIn = path.endsWith("/sign-in/email");
  if (request.method !== "POST" || (!signingUp && !signingIn)) return auth.handler(request);

  const size = Number(request.headers.get("content-length") || 0);
  if (size > 8_000) return refused("Requisição recusada.", 413);

  const body = (await request.clone().json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!validEmail(email)) return refused("Não foi possível entrar.", 400);
  if (signingUp && !strongPassword(password)) return refused("Senha fraca.", 400);
  if (signingIn && (password.length < 8 || password.length > 128)) return refused("Não foi possível entrar.", 400);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `${signingUp ? "up" : "in"}:${ip}:${email}`;
  const max = signingUp ? 8 : 20;
  const windowMs = 10 * 60_000;
  // Count only failures. A successful login used to burn the same budget, so
  // opening the app a few times locked the right password out.
  if (attemptCount(key, windowMs) >= max) {
    return refused("Muitas tentativas. Espere um pouco.", 429);
  }
  const response = await auth.handler(request);
  if (response.status === 401 || response.status === 403) tooManyAttempts(key, max, windowMs);
  return response;
}

function sessionTokenFrom(response: Response): string | null {
  const header = response.headers.get("set-auth-token")?.trim();
  if (header) return header;
  const lines =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie") ?? ""];
  return sessionTokenFromSetCookie(lines, SESSION_TOKEN_COOKIE);
}

function isClaimPath(request: Request) {
  return new URL(request.url).pathname.replace(/\/+$/, "") === "/api/auth/oauth-claim";
}

function pathOf(request: Request) {
  return new URL(request.url).pathname.replace(/\/+$/, "");
}

function previewTokenResponse(request: Request) {
  const host = previewHostFrom(request);
  const token = host ? mintPreviewToken(host) : null;
  if (!token) return new Response(null, { status: 404, headers: { "cache-control": "no-store" } });
  return Response.json({ token }, { headers: { "cache-control": "no-store" } });
}

async function jumpResponse(request: Request) {
  const attempt = new URL(request.url).searchParams.get("attempt") ?? "";
  if (!/^[0-9a-f]{32}$/.test(attempt)) {
    return new Response(null, {
      status: 302,
      headers: { location: "/login?erro=google", "cache-control": "no-store" },
    });
  }
  // The phone opens this URL before the broker address is saved. Wait for it
  // instead of failing the attempt on that race.
  const deadline = Date.now() + 20_000;
  let url = readOAuthJump(attempt);
  while (!url && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    url = readOAuthJump(attempt);
  }
  if (!url) {
    await persistOAuthClaim(attempt, { status: "error" });
    return new Response(null, {
      status: 302,
      headers: { location: "/login?erro=google", "cache-control": "no-store" },
    });
  }
  return new Response(null, {
    status: 302,
    headers: { location: url, "cache-control": "no-store" },
  });
}

async function attemptFromOAuthBody(request: Request): Promise<string | null> {
  if (!pathOf(request).endsWith("/sign-in/oauth2")) return null;
  try {
    const body = (await request.clone().json()) as { callbackURL?: unknown; errorCallbackURL?: unknown };
    for (const raw of [body.callbackURL, body.errorCallbackURL]) {
      if (typeof raw !== "string") continue;
      const attempt = new URL(raw, "http://local").searchParams.get("attempt");
      if (attempt && /^[0-9a-f]{32}$/.test(attempt)) return attempt;
    }
  } catch {
    return null;
  }
  return null;
}

async function rememberJump(attempt: string | null, response: Response) {
  if (!attempt) return;
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("json")) return;
  try {
    const data = (await response.clone().json()) as { url?: unknown };
    if (typeof data.url === "string" && isBrokerAuthorizeUrl(data.url)) saveOAuthJump(attempt, data.url);
  } catch {
    /* sign-in did not return a broker URL */
  }
}

async function claimResponse(request: Request) {
  const attempt = new URL(request.url).searchParams.get("attempt") ?? "";
  const result = await readStoredOAuthClaim(attempt);
  if (result.status === "pending") {
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  }
  return Response.json(result, { headers: { "cache-control": "no-store" } });
}

/** The sheet that finished Google still has the session cookie. Publish it for the app. */
async function publishClaim(request: Request) {
  const attempt = new URL(request.url).searchParams.get("attempt") ?? "";
  const token = readRequestCookie(request, SESSION_TOKEN_COOKIE);
  if (attempt && token) await persistOAuthClaim(attempt, { status: "ok", token });
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

function copyResponseHeaders(response: Response) {
  const headers = new Headers();
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    headers.set(key, value);
  });
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return headers;
}

function isLoopback(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

async function attemptForState(state: string | null): Promise<string | null> {
  if (!state || state.length < 8 || state.length > 200) return null;
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql.query<{ value: string }>("select value from verification where identifier = $1", [state]);
    const raw = rows[0]?.value;
    if (!raw) return null;
    const data = JSON.parse(raw) as { callbackURL?: string; errorURL?: string };
    const attempt = new URL(data.callbackURL || data.errorURL || "/", "http://local").searchParams.get("attempt");
    return attempt && /^[0-9a-f]{32}$/.test(attempt) ? attempt : null;
  } catch {
    return null;
  }
}

async function handOffSession(request: Request, response: Response, knownAttempt: string | null = null) {
  const token = sessionTokenFrom(response);
  const location = response.headers.get("location");
  if (!location || response.status < 300 || response.status >= 400) return response;
  let next: URL;
  try {
    next = new URL(location, request.url);
  } catch {
    return response;
  }

  const attempt = next.searchParams.get("attempt") || knownAttempt;
  if (attempt && !next.searchParams.get("attempt")) next.searchParams.set("attempt", attempt);
  const callback = new URL(request.url).pathname.includes("/oauth2/callback/");
  const failed = next.pathname.endsWith("/error") || next.searchParams.has("error") || next.searchParams.has("erro");
  if (callback && failed && next.pathname !== "/login") {
    next.pathname = "/login";
    next.searchParams.set("erro", "google");
    if (attempt) next.searchParams.set("attempt", attempt);
  }

  if (attempt && token) await persistOAuthClaim(attempt, { status: "ok", token });
  else if (attempt && failed) await persistOAuthClaim(attempt, { status: "error" });

  const here = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const publicOrigin = forwardedHost ? `${forwardedProto || "https"}://${forwardedHost}` : here.origin;
  const loopback = isLoopback(next.hostname);
  if (!loopback && next.origin !== here.origin && next.origin !== publicOrigin) return response;
  if (!token && !attempt && !callback) return response;

  if (token && !failed) next.searchParams.set("token", token);
  const headers = copyResponseHeaders(response);
  headers.set("location", `${next.pathname}${next.search}${next.hash}`);
  headers.set("cache-control", "no-store");
  return new Response(response.body, { status: response.status, headers });
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (isClaimPath(request)) return claimResponse(request);
        if (pathOf(request) === "/api/auth/preview-token") return previewTokenResponse(request);
        if (pathOf(request) === "/api/auth/oauth-jump") return jumpResponse(request);
        const callback = new URL(request.url).pathname.includes("/oauth2/callback/");
        const knownAttempt = callback ? await attemptForState(new URL(request.url).searchParams.get("state")) : null;
        return handOffSession(request, await auth.handler(request), knownAttempt);
      },
      POST: async ({ request }) => {
        if (isClaimPath(request)) return publishClaim(request);
        const jumpAttempt = await attemptFromOAuthBody(request);
        const response = await guardAuth(request);
        await rememberJump(jumpAttempt, response);
        return handOffSession(request, response);
      },
    },
  },
});

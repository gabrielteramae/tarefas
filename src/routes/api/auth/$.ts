import { createFileRoute } from "@tanstack/react-router";
import { auth, SESSION_TOKEN_COOKIE } from "@/lib/auth/server";
import {
  persistOAuthClaim,
  readStoredOAuthClaim,
  sessionTokenFromSetCookie,
} from "@/lib/auth/oauth-claim-store";
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

async function handOffSession(request: Request, response: Response) {
  const token = sessionTokenFrom(response);
  const location = response.headers.get("location");
  if (!location || response.status < 300 || response.status >= 400) return response;
  let next: URL;
  try {
    next = new URL(location, request.url);
  } catch {
    return response;
  }

  const attempt = next.searchParams.get("attempt");
  if (attempt && token) await persistOAuthClaim(attempt, { status: "ok", token });
  else if (attempt && (next.searchParams.has("erro") || next.searchParams.has("error"))) {
    await persistOAuthClaim(attempt, { status: "error" });
  }

  const here = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const publicOrigin = forwardedHost ? `${forwardedProto || "https"}://${forwardedHost}` : here.origin;
  if (next.origin !== here.origin && next.origin !== publicOrigin) return response;
  if (!token && !attempt) return response;

  if (token) next.searchParams.set("token", token);
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
        return handOffSession(request, await auth.handler(request));
      },
      POST: async ({ request }) => {
        if (isClaimPath(request)) return publishClaim(request);
        const response = await guardAuth(request);
        return handOffSession(request, response);
      },
    },
  },
});

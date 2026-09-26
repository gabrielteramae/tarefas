import assert from "node:assert/strict";
import test from "node:test";
import { readOAuthClaim, saveOAuthClaim, sessionTokenFromSetCookie } from "./oauth-claim-store.ts";

const ATTEMPT = "a".repeat(32);

test("claim stays pending until the callback stores a token", () => {
  assert.deepEqual(readOAuthClaim(ATTEMPT), { status: "pending" });
  saveOAuthClaim(ATTEMPT, { status: "ok", token: "session.token.value" });
  assert.deepEqual(readOAuthClaim(ATTEMPT), { status: "ok", token: "session.token.value" });
});

test("a failed callback is readable as an error", () => {
  const id = "b".repeat(32);
  saveOAuthClaim(id, { status: "error" });
  assert.deepEqual(readOAuthClaim(id), { status: "error" });
});

test("claims are saved on disk for the other browser", async () => {
  const id = "c".repeat(32);
  saveOAuthClaim(id, { status: "ok", token: "disk-token-1" });
  const { readFileSync } = await import("node:fs");
  const raw = readFileSync(".data/oauth-claims.json", "utf8");
  assert.match(raw, /disk-token-1/);
});

test("session cookie is read from a joined Set-Cookie header", () => {
  const lines = [
    "other=1; Path=/",
    "__Host-grok-auth.session_token=abc.def%2Bghi; Path=/; Secure; HttpOnly",
  ];
  assert.equal(sessionTokenFromSetCookie(lines, "__Host-grok-auth.session_token"), "abc.def+ghi");
});

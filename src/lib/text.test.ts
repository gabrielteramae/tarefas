import assert from "node:assert/strict";
import test from "node:test";
import { plainText, safeHref } from "./text.ts";

test("texto de tarefa não vira HTML", () => {
  assert.equal(plainText("<img src=x onerror=alert(1)> comprar pão"), "comprar pão");
  assert.equal(plainText("<script>alert(1)</script>"), "alert(1)");
  assert.equal(plainText("<<script>script>alert(1)</script>").includes("<"), false);
  assert.equal(plainText("<<script>script>alert(1)</script>").includes(">"), false);
  assert.equal(plainText("  linha\n\nnova  ", 80), "linha nova");
  assert.equal(plainText("a".repeat(200), 80).length, 80);
  assert.equal(plainText("a".repeat(500), 80).length, 80);
});

test("link javascript: e data: não passam", () => {
  assert.equal(safeHref("javascript:alert(1)"), null);
  assert.equal(safeHref("JavaScript:alert(1)"), null);
  assert.equal(safeHref("data:text/html,<script>"), null);
  assert.equal(safeHref("vbscript:msg"), null);
  assert.equal(safeHref("//evil.example"), null);
  assert.equal(safeHref("https://calendar.google.com/calendar/render?q=1"), "https://calendar.google.com/calendar/render?q=1");
  assert.equal(safeHref("/api/agenda?text=oi"), "/api/agenda?text=oi");
});

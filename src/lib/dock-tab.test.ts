import assert from "node:assert/strict";
import test from "node:test";
import { homePath, homeSearch, parseDockTab } from "./dock-tab.ts";

test("aba desconhecida volta para a lista", () => {
  assert.equal(parseDockTab(null), "tarefas");
  assert.equal(parseDockTab("perfil"), "tarefas");
  assert.equal(parseDockTab("mais"), "mais");
  assert.equal(parseDockTab("hoje"), "hoje");
});

test("o caminho de volta carrega a aba aberta", () => {
  assert.deepEqual(homeSearch("tarefas"), {});
  assert.deepEqual(homeSearch("mais"), { aba: "mais" });
  assert.equal(homePath("feitas"), "/?aba=feitas");
  assert.equal(homePath("tarefas"), "/");
});

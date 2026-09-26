import { chromium } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:8080";
const tasks = 24;

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on("pageerror", (error) => fail(`erro na página: ${error}`));

try {
  const email = `perf-${Date.now()}@example.com`;
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  try {
    await page.getByRole("button", { name: "Só o necessário" }).click({ timeout: 4000 });
  } catch {
    /* banner already dismissed */
  }
  await page.getByRole("button", { name: "Criar uma" }).click();
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("Teste123!");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nova tarefa").waitFor({ timeout: 15000 });

  for (let index = 0; index < tasks; index += 1) {
    await page.getByLabel("Nova tarefa").fill(`Item ${String(index + 1).padStart(2, "0")}`);
    await page.getByRole("button", { name: "Adicionar tarefa" }).click();
    await page.locator("[data-task-id]").nth(index).waitFor({ timeout: 8000 });
  }

  const closed = await measure(page);
  const openTarget = page.locator("[data-task-id]").first();
  await openTarget.getByRole("button", { name: /Editar período/ }).click();
  const opened = await measure(page);
  await openTarget.getByRole("button", { name: /Editar período/ }).click();
  const reclosed = await measure(page);

  const report = { closed, opened, reclosed };
  console.log(JSON.stringify(report, null, 2));

  if (closed.dates !== 0 || closed.times !== 0) fail(`lista fechada montou datas: ${closed.dates}/${closed.times}`);
  if (opened.dates !== 2 || opened.times !== 0) {
    fail(`um cartão sem dia deveria ter 2 datas e nenhuma hora, veio ${opened.dates}/${opened.times}`);
  }
  if (reclosed.dates !== 0 || reclosed.times !== 0) fail("fechar o período deixou campos montados");
  if (closed.cards < tasks) fail(`só ${closed.cards} cartões de ${tasks}`);
  if (closed.overflow || opened.overflow) fail("a lista passa da largura do celular");
  if (closed.p95 > 50) fail(`rolagem lenta no celular: p95 ${closed.p95}ms`);
  if (closed.scrollRoom < 200 || closed.traveled < 200) {
    fail(`a lista não rolou de verdade (espaço ${closed.scrollRoom}px, andou ${closed.traveled}px)`);
  }
  if (!process.exitCode) console.log("mobile-perf ok");
} catch (error) {
  fail(error instanceof Error ? error.stack ?? error.message : String(error));
} finally {
  await browser.close();
}

async function measure(page) {
  return page.evaluate(async () => {
    const scroller = document.querySelector(".phone-scroll");
    if (!(scroller instanceof HTMLElement)) throw new Error("lista não encontrada");
    scroller.scrollTop = 0;
    const frames = [];
    let prev = performance.now();
    await new Promise((resolve) => {
      const start = performance.now();
      const step = (now) => {
        frames.push(now - prev);
        prev = now;
        const max = scroller.scrollHeight - scroller.clientHeight;
        scroller.scrollTop = Math.min(max, scroller.scrollTop + Math.max(28, max / 18));
        if (now - start < 720) requestAnimationFrame(step);
        else resolve(null);
      };
      requestAnimationFrame(step);
    });
    const sorted = [...frames].sort((a, b) => a - b);
    const at = (ratio) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] ?? 0;
    const max = scroller.scrollHeight - scroller.clientHeight;
    return {
      dates: document.querySelectorAll('input[type="date"]').length,
      times: document.querySelectorAll('input[type="time"]').length,
      cards: document.querySelectorAll("[data-task-id]").length,
      nodes: scroller.querySelectorAll("*").length,
      frames: frames.length,
      p50: Math.round(at(0.5) * 10) / 10,
      p95: Math.round(at(0.95) * 10) / 10,
      maxFrame: Math.round((sorted.at(-1) ?? 0) * 10) / 10,
      scrollRoom: Math.round(max),
      traveled: Math.round(scroller.scrollTop),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });
}

if (process.exitCode) process.exit(process.exitCode);

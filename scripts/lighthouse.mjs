import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import { chromium } from "playwright";

const base = (process.argv[2] ?? "http://127.0.0.1:8081").replace(/\/$/, "");
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) {
  console.error("Use o endereço local do app.");
  process.exit(1);
}

const chromePath = chromium.executablePath();
if (!existsSync(chromePath)) {
  console.error("O Chrome do teste não está instalado.");
  process.exit(1);
}

const FLOORS = {
  performance: 80,
  accessibility: 90,
  "best-practices": 75,
  seo: 80,
};

const METRICS = [
  ["first-contentful-paint", "Primeira pintura"],
  ["largest-contentful-paint", "Maior elemento"],
  ["total-blocking-time", "Tempo bloqueado"],
  ["cumulative-layout-shift", "Pulo de layout"],
  ["speed-index", "Índice de velocidade"],
];

function scoreOf(lhr, id) {
  const score = lhr.categories[id]?.score;
  return score == null ? null : Math.round(score * 100);
}

function summarize(name, lhr) {
  const scores = Object.fromEntries(
    Object.keys(FLOORS).map((id) => [id, scoreOf(lhr, id)]),
  );
  const metrics = Object.fromEntries(
    METRICS.map(([id, label]) => [
      label,
      lhr.audits[id]?.displayValue ?? null,
    ]),
  );
  const opportunities = Object.values(lhr.audits)
    .filter((audit) => audit.details?.type === "opportunity" && (audit.numericValue ?? 0) > 100)
    .sort((a, b) => (b.numericValue ?? 0) - (a.numericValue ?? 0))
    .slice(0, 3)
    .map((audit) => ({ title: audit.title, savingsMs: Math.round(audit.numericValue ?? 0) }));
  return {
    name,
    url: lhr.finalDisplayedUrl || lhr.requestedUrl,
    scores,
    metrics,
    opportunities,
    error: lhr.runtimeError?.code ?? null,
  };
}

function failed(report) {
  if (report.error) return true;
  const score = report.scores.performance;
  return score == null || score < FLOORS.performance;
}

async function openChrome() {
  return launch({
    chromePath,
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });
}

async function audit(url, port, disableStorageReset) {
  const result = await lighthouse(url, {
    port,
    output: "json",
    logLevel: "error",
    onlyCategories: Object.keys(FLOORS),
    disableStorageReset,
  });
  if (!result?.lhr) throw new Error("O Lighthouse não devolveu resultado.");
  return result.lhr;
}

async function prepareList(port) {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const page = await browser.contexts()[0].newPage();
  const email = `light-${Date.now()}@example.com`;
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  const cookies = page.getByRole("button", { name: "Só o necessário" });
  try {
    await cookies.click({ timeout: 4000 });
  } catch {
    /* banner already dismissed */
  }
  await page.getByRole("button", { name: "Criar uma" }).click();
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("Teste123!");
  await page.getByRole("button", { name: "Criar conta" }).click();
  const input = page.getByLabel("Nova tarefa");
  await input.waitFor({ timeout: 15000 });
  for (const title of ["Comprar café", "Estudar prova", "Ligar para o banco"]) {
    await input.fill(title);
    await page.getByRole("button", { name: "Adicionar tarefa" }).click();
    await page.getByText(title).waitFor();
  }
  const client = await page.context().newCDPSession(page);
  await client.send("Network.clearBrowserCache");
  await page.goto("about:blank");
  await page.close();
}

mkdirSync("/workspace/screenshots", { recursive: true });

const reports = [];
const loginChrome = await openChrome();
try {
  reports.push(summarize("Entrar", await audit(`${base}/login`, loginChrome.port, false)));
} finally {
  await loginChrome.kill();
}
writeFileSync("/workspace/screenshots/lighthouse-mobile.json", JSON.stringify(reports, null, 2));

const listChrome = await openChrome();
try {
  await prepareList(listChrome.port);
  reports.push(summarize("Lista", await audit(`${base}/`, listChrome.port, true)));
} finally {
  await listChrome.kill();
}
writeFileSync("/workspace/screenshots/lighthouse-mobile.json", JSON.stringify(reports, null, 2));
console.log(JSON.stringify(reports, null, 2));

if (reports.some(failed)) process.exit(1);

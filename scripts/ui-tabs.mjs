import { chromium } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:8080";

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));

try {
  const email = `ui-${Date.now()}@example.com`;
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
  await page.getByLabel("Nova tarefa").waitFor({ timeout: 15000 });

  async function assertFits(label) {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    if (overflow) fail(`${label}: a tela passa da largura do celular`);
    const dock = await page.getByRole("navigation", { name: "Seções" }).boundingBox();
    if (!dock) fail(`${label}: barra de baixo sumiu`);
    else if (dock.y + dock.height > 846) fail(`${label}: barra de baixo saiu da tela`);
  }

  await page.getByLabel("Nova tarefa").fill("estudar prova");
  await page.getByRole("button", { name: "Adicionar tarefa" }).click();
  const card = page.locator("[data-task-id]").first();
  await card.waitFor();
  await card.getByRole("button", { name: "Editar período de estudar prova" }).click();
  const start = card.locator('input[type="date"]').first();
  const end = card.locator('input[type="date"]').nth(1);
  await start.fill("2026-10-02");
  await end.fill("2026-10-04");
  await page.waitForTimeout(300);
  if ((await start.inputValue()) !== "2026-10-02") fail("a data de começo mudou sozinha");
  if ((await end.inputValue()) !== "2026-10-04") fail("a data de fim mudou sozinha");
  const cardBox = await card.boundingBox();
  for (const input of [start, end]) {
    const box = await input.boundingBox();
    if (!cardBox || !box) fail("não mediu o cartão da tarefa");
    else if (box.x < cardBox.x - 1 || box.x + box.width > cardBox.x + cardBox.width + 1) {
      fail("o campo de data sai do cartão");
    }
  }
  const agenda = card.getByRole("link", { name: "Google Agenda" });
  await agenda.waitFor();
  const href = await agenda.getAttribute("href");
  if (!href?.includes("calendar.google.com") || (!href.includes("20261002%2F20261005") && !href.includes("20261002/20261005"))) {
    fail(`link da agenda inesperado: ${href}`);
  }
  const phone = await card.getByRole("link", { name: "Calendário" }).getAttribute("href");
  if (!phone?.startsWith("/api/agenda?")) fail(`link do calendário inesperado: ${phone}`);
  const file = await page.request.get(`${base}${phone}`);
  if (!file.headers()["content-type"]?.includes("text/calendar")) fail("o calendário não devolveu o evento");
  await assertFits("Lista");

  await page.getByRole("button", { name: "Calendário" }).click();
  await page.getByRole("button", { name: "Próximo mês" }).click();
  await page.getByRole("button", { name: "2", exact: true }).click();
  await page.getByText("estudar prova").waitFor();
  await assertFits("Calendário");

  await page.getByRole("button", { name: "Feitas" }).click();
  await page.getByText("Feitas").first().waitFor();
  await assertFits("Feitas");

  await page.getByRole("button", { name: "Lista" }).click();
  await page.getByText("estudar prova").waitFor();
  await assertFits("Lista de novo");

  if (errors.length) fail(`erros na página: ${errors.join(" | ")}`);
  if (!process.exitCode) console.log("ui-tabs ok");
} catch (error) {
  fail(error instanceof Error ? error.stack ?? error.message : String(error));
} finally {
  await browser.close();
}

if (process.exitCode) process.exit(process.exitCode);

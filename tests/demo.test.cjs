const { before, after, test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { chromium } = require("playwright");

const baseUrl = "http://127.0.0.1:4173";
let server;
let browser;

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("El servidor de prueba no inició.");
}

async function newPage({ tutorialComplete = true, viewport = { width: 1440, height: 1000 } } = {}) {
  const context = await browser.newContext({ viewport });
  if (tutorialComplete) {
    await context.addInitScript(() => localStorage.setItem("asgardDemoTutorialCompletedV1", "true"));
  }
  const page = await context.newPage();
  const apiRequests = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url());
  });
  await page.goto(`${baseUrl}/#inicio`);
  return { context, page, apiRequests };
}

before(async () => {
  server = spawn(process.execPath, ["tests/static-server.cjs"], { cwd: require("node:path").resolve(__dirname, ".."), stdio: "ignore" });
  await waitForServer();
  const options = process.env.ASGARD_TEST_BROWSER ? { channel: process.env.ASGARD_TEST_BROWSER } : { channel: "msedge" };
  try {
    browser = await chromium.launch({ ...options, headless: true });
  } catch {
    browser = await chromium.launch({ headless: true });
  }
});

after(async () => {
  await browser?.close();
  server?.kill();
});

test("abre como sitio estático y conserva acciones en la sesión", async () => {
  const { context, page, apiRequests } = await newPage();
  await page.getByRole("heading", { name: "Inicio", exact: true }).waitFor();
  assert.equal(await page.locator("body").getAttribute("data-theme"), "light");

  await page.getByRole("link", { name: "Ejecuciones" }).click();
  await page.locator('[data-requeue="EX-2407"]').click();
  await page.getByRole("button", { name: "Confirmar y reencolar" }).click();
  await page.locator('#executionRows .status', { hasText: "Reencolada" }).waitFor();
  assert.ok(await page.evaluate(() => sessionStorage.getItem("asgardDemoStateV1")?.includes("REQUEUED")));

  await page.reload();
  await page.locator('#executionRows .status', { hasText: "Reencolada" }).waitFor();
  await page.locator("#notificationButton").click();
  await page.getByText("Ejecución reencolada", { exact: true }).waitFor();
  assert.deepEqual(apiRequests, []);
  await context.close();
});

test("completa el tutorial interactivo de ocho pasos", async () => {
  const { context, page } = await newPage();
  await page.locator("#tutorialButton").click();
  await page.getByRole("heading", { name: "Conoce Asgard" }).waitFor();
  await page.getByText("Asgard centraliza la programación, ejecución y monitoreo", { exact: false }).waitFor();
  await page.getByText("¿Deseas realizar una visita guiada?", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Iniciar visita" }).click();
  await page.getByRole("heading", { name: "Este es Asgard" }).waitFor();
  assert.equal(await page.locator("#tourLayer").getAttribute("class"), "tour-layer tour-preview");
  assert.equal(await page.locator(".tour-shade").evaluate(element => getComputedStyle(element).backgroundColor), "rgba(0, 0, 0, 0)");
  await page.locator("#tourNext").click();
  await page.getByText("Paso 1 de 8", { exact: true }).waitFor();
  await page.locator("#tourNext").click();
  await page.locator("#tourNext").click();
  await page.locator('[data-requeue="EX-2407"]').click();
  await page.getByRole("button", { name: "Confirmar y reencolar" }).click();
  await page.locator('[data-execution-row="EX-2407"] .status', { hasText: "Reencolando…" }).waitFor();
  await page.getByText("Paso 3 de 8", { exact: true }).waitFor();
  await page.locator('[data-execution-row="EX-2407"] .status', { hasText: "Reencolada" }).waitFor();
  await page.waitForTimeout(2200);
  assert.equal(await page.locator("#tourProgress").textContent(), "Paso 3 de 8");
  assert.equal(await page.locator("#tourNext").isEnabled(), true);
  await page.locator("#tourNext").click();
  await page.getByText("Paso 4 de 8", { exact: true }).waitFor();
  assert.equal(await page.locator("#notificationPanel").getAttribute("aria-hidden"), "true");
  assert.ok((await page.locator("#notificationButton").getAttribute("class")).includes("tour-target"));
  await page.locator("#notificationButton").click();
  const requeueNotification = page.locator('#notificationList [data-notification-title="Ejecución reencolada"]');
  await requeueNotification.waitFor();
  assert.ok((await requeueNotification.getAttribute("class")).includes("tour-target"));
  assert.equal(await page.locator("#tourNext").isEnabled(), true);
  assert.equal(await page.locator("#tourNext").evaluate(element => getComputedStyle(element).opacity), "1");
  assert.equal(await page.evaluate(() => {
    const card = document.querySelector("#tourCard");
    const rect = card.getBoundingClientRect();
    return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.closest("#tourCard") === card;
  }), true);
  const notificationPosition = await page.evaluate(() => {
    const button = document.querySelector("#notificationButton").getBoundingClientRect();
    const panel = document.querySelector("#notificationPanel").getBoundingClientRect();
    return { buttonBottom: button.bottom, buttonRight: button.right, panelTop: panel.top, panelRight: panel.right };
  });
  assert.ok(notificationPosition.panelTop >= notificationPosition.buttonBottom);
  assert.ok(notificationPosition.panelTop < 180);
  assert.ok(Math.abs(notificationPosition.panelRight - notificationPosition.buttonRight) <= 2);
  await page.locator("#closeNotifications").click();
  await page.locator("#notificationPanel.open").waitFor({ state: "hidden" });
  await page.locator("#notificationButton.tour-target").waitFor();
  assert.ok((await page.locator("#notificationButton").getAttribute("class")).includes("tour-target"));
  assert.equal(await page.locator("#tourNext").isEnabled(), false);
  await page.locator("#notificationButton").click();
  await page.locator('#notificationList [data-notification-title="Ejecución reencolada"].tour-target').waitFor();
  assert.ok((await requeueNotification.getAttribute("class")).includes("tour-target"));
  assert.equal(await page.locator("#tourNext").isEnabled(), true);
  await requeueNotification.click();
  await page.getByText("Paso 4 de 8", { exact: true }).waitFor();
  await page.waitForTimeout(2200);
  assert.equal(await page.locator("#tourCard").isHidden(), true);
  assert.equal(await page.locator("#tourLayer").isHidden(), true);
  assert.equal(await page.locator(".tour-target").count(), 0);
  assert.equal(await page.locator("#dialogBackdrop").isHidden(), true);
  await page.waitForTimeout(1400);
  assert.equal(await page.locator("#tourCard").isHidden(), true);
  await page.getByRole("heading", { name: "Página Migraciones" }).waitFor();
  const migrationLink = page.getByRole("link", { name: "Migraciones" });
  assert.ok((await migrationLink.getAttribute("class")).includes("tour-target"));
  assert.ok((await page.locator("#tourLayer").getAttribute("class")).includes("tour-navigation"));
  assert.equal(await page.locator(".tour-shade").evaluate(element => getComputedStyle(element).backgroundColor), "rgba(0, 0, 0, 0)");
  assert.notEqual(
    await migrationLink.evaluate(element => getComputedStyle(element).backgroundColor),
    await page.getByRole("link", { name: "Ejecuciones" }).evaluate(element => getComputedStyle(element).backgroundColor),
  );
  await page.locator("#tourNext").click();
  await page.getByRole("heading", { name: "Esta es la página Migraciones" }).waitFor();
  assert.equal(await page.locator(".tour-shade").evaluate(element => getComputedStyle(element).backgroundColor), "rgba(0, 0, 0, 0)");
  await page.locator("#tourNext").click();
  await page.getByText("Paso 5 de 8", { exact: true }).waitFor();
  assert.equal(await page.locator("#tourLayer").getAttribute("class"), "tour-layer");
  assert.notEqual(await page.locator(".tour-shade").evaluate(element => getComputedStyle(element).backgroundColor), "rgba(0, 0, 0, 0)");
  await page.locator("#createMigrationConfirm").click();
  await page.getByText("Paso 6 de 8", { exact: true }).waitFor();
  await page.locator("#tourNext").click();
  await page.getByText("Paso 7 de 8", { exact: true }).waitFor();
  await page.locator("#reportTutorialTarget").click();
  await page.getByText("Paso 8 de 8", { exact: true }).waitFor();
  await page.locator("#tourNext").click();
  await page.getByText("Tutorial completado", { exact: false }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem("asgardDemoTutorialCompletedV1")), "true");
  await context.close();
});

test("permite omitir la visita guiada desde la introducción", async () => {
  const { context, page } = await newPage({ tutorialComplete: false });
  await page.getByRole("heading", { name: "Conoce Asgard" }).waitFor();
  await page.getByRole("button", { name: "Ahora no" }).click();
  await page.locator("#tourLayer").waitFor({ state: "hidden" });
  assert.equal(await page.evaluate(() => localStorage.getItem("asgardDemoTutorialCompletedV1")), "true");
  await context.close();
});

test("mantiene abierto el tutorial al hacer clic fuera del cuadro", async () => {
  const { context, page } = await newPage();
  await page.locator("#tutorialButton").click();
  await page.getByRole("heading", { name: "Conoce Asgard" }).waitFor();

  await page.locator(".tour-shade").click({ position: { x: 24, y: 24 } });

  assert.equal(await page.locator("#tourLayer").isVisible(), true);
  await page.getByRole("heading", { name: "Conoce Asgard" }).waitFor();
  await context.close();
});

test("crea migraciones, actualiza reportes, cambia tema y reinicia", async () => {
  const { context, page } = await newPage({ viewport: { width: 1024, height: 900 } });
  await page.getByRole("link", { name: "Migraciones" }).click();
  await page.locator("#newMigrationButton").click();
  await page.locator("#createMigrationConfirm").click();
  await page.getByText("MIG-319", { exact: true }).waitFor();

  await page.getByRole("link", { name: "Report Server" }).click();
  await page.locator('[data-report-refresh="REP-02"]').click();
  await page.getByText("Inventario operativo se actualizó correctamente.", { exact: true }).waitFor();
  await page.locator("#themeButton").click();
  assert.equal(await page.locator("body").getAttribute("data-theme"), "blue");

  await page.locator("#resetButton").click();
  await page.getByRole("button", { name: "Reiniciar demo" }).last().click();
  await page.getByRole("heading", { name: "Inicio", exact: true }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem("asgardDemoTutorialCompletedV1")), "true");
  assert.ok(!(await page.evaluate(() => sessionStorage.getItem("asgardDemoStateV1")))?.includes("MIG-319"));
  await context.close();
});

test("conserva la estructura operativa del dashboard en migraciones, SQL y Report Server", async () => {
  const { context, page } = await newPage();

  await page.getByRole("link", { name: "Migraciones" }).click();
  await page.getByRole("button", { name: "Historial" }).click();
  await page.getByRole("heading", { name: "Historial", exact: true }).waitFor();
  assert.equal(await page.locator("#migrationActiveView").isHidden(), true);

  await page.getByRole("link", { name: "Monitoreo SQL" }).click();
  assert.equal(await page.locator(".kpi-grid .kpi").count(), 4);
  assert.equal(await page.locator(".sql-activity-table thead th").count(), 16);
  await page.locator("#hideAsgardQueries").check();
  assert.equal(await page.locator("#sqlRows tr").count(), 2);

  await page.getByRole("link", { name: "Report Server" }).click();
  await page.getByRole("button", { name: "Accesos" }).click();
  await page.getByText("Carpetas y reportes", { exact: true }).waitFor();
  assert.equal(await page.locator("#reportServerReportsPanel").isHidden(), true);

  await page.locator("#notificationButton").click();
  assert.equal(await page.locator("#notificationTools").isHidden(), true);
  await page.locator("#toggleNotificationFilters").click();
  assert.equal(await page.locator("#notificationTools").isVisible(), true);
  await context.close();
});

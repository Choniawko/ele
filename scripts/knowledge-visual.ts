import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
await page.goto("http://127.0.0.1:5173/#knowledge");
await page.locator(".knowledge-cards").waitFor();
await page.screenshot({ path: "docs/qa/knowledge-home.png" });
await page.goto("http://127.0.0.1:5173/#knowledge/circuit/start-stop");
await page.locator(".knowledge-demo").waitFor();
await page
  .locator(".knowledge-views")
  .evaluate((e) => e.scrollIntoView({ block: "center" }));
await page.screenshot({ path: "docs/qa/knowledge-1366.png" });
await page
  .locator(".knowledge-functional svg")
  .screenshot({ path: "docs/qa/knowledge-start-stop-schematic.png" });
await page.getByRole("button", { name: "Powiększ rysunek" }).click();
await page.screenshot({ path: "docs/qa/knowledge-zoom.png" });
await page.keyboard.press("Escape");
await page.setViewportSize({ width: 390, height: 844 });
await page
  .locator(".knowledge-views")
  .evaluate((e) => e.scrollIntoView({ block: "center" }));
await page.screenshot({ path: "docs/qa/knowledge-mobile.png" });
await page
  .getByRole("button", { name: "Tablica fizyczna", exact: true })
  .click();
await page.screenshot({ path: "docs/qa/knowledge-mobile-physical.png" });
await page.setViewportSize({ width: 1366, height: 768 });
for (const id of [
  "lampa",
  "schodowy",
  "bistabilny",
  "start-stop",
  "dwa-miejsca",
  "prawo-lewo",
]) {
  await page.goto(`http://127.0.0.1:5173/#knowledge/circuit/${id}`);
  await page.locator(".knowledge-demo").waitFor();
  await page
    .locator(".knowledge-functional svg")
    .screenshot({ path: `docs/qa/knowledge-${id}-schematic.png` });
  const power = page.getByRole("button", { name: "Tor mocy", exact: true });
  if (await power.count()) {
    await power.click();
    await page
      .locator(".knowledge-functional svg")
      .screenshot({ path: `docs/qa/knowledge-${id}-power.png` });
  }
}
await browser.close();

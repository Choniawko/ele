import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
await mkdir("docs/qa", { recursive: true });
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
  headless: true,
});
const errors: string[] = [];
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:5173");
await page.getByText("Zapisano lokalnie", { exact: true }).waitFor();
await page.screenshot({ path: "docs/qa/lamp-1366.png" });
await page.setViewportSize({ width: 1920, height: 1080 });
await page.screenshot({ path: "docs/qa/lamp-1920.png" });
await page
  .getByRole("button", { name: "Włącz zasilanie", exact: true })
  .click();
const actionMs: number[] = [];
for (let sample = 0; sample < 6; sample++) {
  await page.evaluate(() => {
    const element = document.querySelector(
      '[data-testid="board-physical"] [data-device="H1"]',
    )!;
    const before = element.getAttribute("data-powered");
    const observedWindow = window as typeof window & {
      actionDuration?: number;
    };
    observedWindow.actionDuration = undefined;
    let start = performance.now();
    document.addEventListener(
      "click",
      () => {
        start = performance.now();
      },
      { once: true, capture: true },
    );
    const observer = new MutationObserver(() => {
      if (element.getAttribute("data-powered") !== before) {
        observedWindow.actionDuration = performance.now() - start;
        observer.disconnect();
      }
    });
    observer.observe(element, {
      attributes: true,
      attributeFilter: ["data-powered"],
    });
  });
  await page.getByRole("button", { name: "Przełącz S1", exact: true }).click();
  await page.waitForFunction(
    () =>
      (window as typeof window & { actionDuration?: number }).actionDuration !==
      undefined,
  );
  actionMs.push(
    await page.evaluate(
      () =>
        (window as typeof window & { actionDuration: number }).actionDuration,
    ),
  );
}
await page.getByLabel("Tryb pracy").selectOption("measure");
await page.locator('[data-terminal="H1:L"] circle').first().click();
await page.locator('[data-terminal="H1:N"] circle').first().click();
await page.getByRole("button", { name: "Wykonaj i zapisz pomiar" }).click();
await page.getByText("● WYNIK OBLICZONY", { exact: true }).waitFor();
await page.screenshot({ path: "docs/qa/measurement-1920.png" });
await page.getByRole("button", { name: "Przykłady", exact: true }).click();
await page.getByRole("button", { name: /Trzy fazy i termik/ }).click();
await page
  .getByRole("button", { name: "Włącz zasilanie", exact: true })
  .click();
await page.getByRole("button", { name: "Przytrzymaj S1", exact: true }).focus();
await page.keyboard.press("Space");
await page.screenshot({ path: "docs/qa/motor-1920.png" });
await page.getByRole("button", { name: "Schemat", exact: true }).click();
await page.screenshot({ path: "docs/qa/schematic-1920.png" });
await page.getByRole("button", { name: "Eksport", exact: true }).click();
const download = page.waitForEvent("download");
await page.getByRole("button", { name: /Schemat SVG/ }).click();
await (await download).saveAs("docs/qa/schematic.svg");
await page.pdf({
  path: "docs/qa/report.pdf",
  format: "A4",
  printBackground: true,
});
await page.getByRole("button", { name: "Zamknij", exact: true }).click();
await page.getByRole("button", { name: "Tablica", exact: true }).click();
await page.setViewportSize({ width: 1366, height: 768 });
await page.screenshot({ path: "docs/qa/motor-1366.png" });
await page.getByRole("button", { name: "Dzielony", exact: true }).click();
await page.screenshot({ path: "docs/qa/split-1366.png" });
await page.setViewportSize({ width: 768, height: 1024 });
for (const name of ["Pokaż lub ukryj katalog", "Pokaż lub ukryj inspektor"]) {
  const button = page.getByRole("button", { name, exact: true });
  if ((await button.getAttribute("aria-pressed")) === "true")
    await button.click();
}
await page.screenshot({ path: "docs/qa/tablet-768.png" });
await page.setViewportSize({ width: 1920, height: 1080 });
const start = performance.now();
await page.getByRole("button", { name: "Tablica", exact: true }).click();
await page
  .getByLabel("Import projektu", { exact: true })
  .setInputFiles("docs/qa/benchmark-project.json");
await page
  .getByTestId("board-physical")
  .locator("[data-device]")
  .nth(99)
  .waitFor({ timeout: 60000 });
const importRenderMs = performance.now() - start;
await page
  .getByRole("button", { name: "Włącz zasilanie", exact: true })
  .click();
await page
  .getByTestId("board-physical")
  .locator('[data-device="H1"][data-powered="true"]')
  .waitFor({ timeout: 30000 });
const frames = await page.evaluate(async () => {
  const values: number[] = [];
  let last = performance.now();
  for (let i = 0; i < 60; i++) {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    const now = performance.now();
    values.push(now - last);
    last = now;
  }
  return values;
});
frames.sort((a, b) => a - b);
await page
  .getByRole("button", { name: "Przesuwanie tablicy", exact: true })
  .click();
await page.evaluate(`(() => {
  window.panFrames = []; window.panRecording = true;
  let last = performance.now();
  function sample() {
    const now = performance.now(); window.panFrames.push(now - last); last = now;
    if (window.panRecording) requestAnimationFrame(sample);
  }
  requestAnimationFrame(sample);
})()`);
const bounds = await page.getByTestId("board-physical").boundingBox();
await page.mouse.move(bounds!.x + 30, bounds!.y + 30);
await page.mouse.down();
for (let i = 1; i <= 40; i++)
  await page.mouse.move(bounds!.x + 30 + i * 4, bounds!.y + 30 + i * 2);
await page.mouse.up();
const panFrames = await page.evaluate(() => {
  const w = window as typeof window & {
    panFrames: number[];
    panRecording: boolean;
  };
  w.panRecording = false;
  return w.panFrames;
});
panFrames.sort((a, b) => a - b);
const result = {
  browser: browser.version(),
  viewport: "1920×1080",
  devices: 100,
  wires: 300,
  importRenderMs,
  frameMedianMs: frames[30],
  frameP95Ms: frames[57],
  simpleActionMs: actionMs,
  panFrameMedianMs: panFrames[Math.floor(panFrames.length * 0.5)],
  panFrameP95Ms: panFrames[Math.floor(panFrames.length * 0.95)],
  errors,
};
await page.screenshot({ path: "docs/qa/benchmark-1920.png" });
await writeFile(
  "docs/qa/browser-benchmark.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(result);
await browser.close();
if (errors.length) process.exitCode = 1;

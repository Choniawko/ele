import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { wireGeometry } from "../tests/e2e/wire-geometry";

await mkdir("docs/qa", { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const errors: string[] = [],
  metrics = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:5173");
  await page
    .getByTestId("board-physical")
    .locator('[data-device="G1"]')
    .waitFor();
  for (const [title, file] of [
    ["Lampa i łącznik", "lamp"],
    ["Mała rozdzielnica", "distribution"],
    ["Trzy fazy i termik", "motor"],
    ["Sterowanie 24 V DC", "dc"],
  ]) {
    await page.getByRole("button", { name: "Przykłady", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: new RegExp(title) })
      .click();
    const project = await page.evaluate(async () => {
      const path = performance
        .getEntriesByType("resource")
        .map((e) => e.name)
        .find((url) => new URL(url).pathname === "/apps/web/src/store.ts")!;
      const { useApp } = await import(path);
      return useApp.getState().project;
    });
    await expect(
      page.getByTestId("board-physical").locator("[data-wire]"),
    ).toHaveCount(project.circuit.conductors.length);
    const geometry = await wireGeometry(page, project);
    expect(geometry.intrusions).toEqual([]);
    expect(geometry.detached).toEqual([]);
    metrics.push({ title, ...geometry });
    await page.screenshot({ path: `docs/qa/routing-${file}-after.png` });
  }
  if (errors.length) throw new Error(errors.join("\n"));
  await writeFile(
    "docs/qa/routing-metrics.json",
    JSON.stringify(
      { browser: await browser.version(), metrics, errors },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify(metrics));
} finally {
  await browser.close();
}

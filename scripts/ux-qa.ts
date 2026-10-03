import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

await mkdir("docs/qa", { recursive: true });
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
  headless: true,
});
const metrics = [];
const errors: string[] = [];
try {
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [1024, 768],
    [390, 844],
    [844, 390],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:5173");
    await page
      .getByText("Zapisano lokalnie", { exact: true })
      .waitFor({ state: "attached" });
    const board = page.getByTestId("board-physical");
    await expect(board.locator('[data-device="G1"]')).toBeVisible();
    const box = (await board.boundingBox())!;
    metrics.push({
      width,
      height,
      board: box,
      areaShare: Number(
        ((box.width * box.height) / (width * height)).toFixed(3),
      ),
      zoom: await page.locator(".zoom-label").innerText(),
      overflow: await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    });
    await page.screenshot({ path: `docs/qa/ux-${width}x${height}.png` });
    if (width === 1366) {
      await page
        .getByRole("button", { name: "Włącz zasilanie", exact: true })
        .click();
      await expect(board.locator('[data-device="H1"]')).toHaveAttribute(
        "data-powered",
        "true",
      );
      await page.screenshot({ path: "docs/qa/ux-lamp-working.png" });
      await page
        .getByRole("button", { name: "Skup się na tablicy", exact: true })
        .click();
      const focus = (await board.boundingBox())!;
      metrics.push({
        width,
        height,
        focus: true,
        board: focus,
        areaShare: Number(
          ((focus.width * focus.height) / (width * height)).toFixed(3),
        ),
      });
      await page.screenshot({ path: "docs/qa/ux-focus.png" });
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", { name: "Pokaż lub ukryj inspektor" })
        .click();
      await page
        .getByLabel("Wybierz przewód instalacji")
        .selectOption({ index: 1 });
      await page
        .getByRole("button", { name: "Zamknij właściwości", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Edytuj trasę", exact: true })
        .click();
      await board.click({ position: { x: 860, y: 340 } });
      await page.screenshot({ path: "docs/qa/ux-wire-route.png" });
      await page.keyboard.press("Escape");
      const example = async (name: RegExp) => {
        await page
          .getByRole("button", { name: "Przykłady", exact: true })
          .click();
        await page.getByRole("button", { name }).click();
        await page
          .getByRole("button", { name: "Włącz zasilanie", exact: true })
          .click();
      };
      await example(/Mała rozdzielnica/);
      await page
        .getByRole("button", { name: "Dodaj szynę DIN", exact: true })
        .click();
      const rcdBody = (await board
        .locator('[data-device-body="FI1"]')
        .boundingBox())!;
      await page.mouse.click(
        rcdBody.x + rcdBody.width * 0.08,
        rcdBody.y + rcdBody.height * 0.35,
      );
      await page
        .getByLabel("Przenieś zaznaczone na szynę")
        .selectOption({ label: "Szyna 3" });
      await expect(board.locator("[data-rail]")).toHaveCount(3);
      await page.screenshot({ path: "docs/qa/ux-third-rail.png" });
      await example(/Gniazdo i tor ochronny/);
      await expect(
        board.locator('[data-device="R1"] [data-load-state]'),
      ).toContainText("GRZEJE");
      await page.screenshot({ path: "docs/qa/ux-heater-working.png" });
      await example(/Wentylator i łącznik/);
      await expect(
        board.locator('[data-device="M1"] [data-rotor]'),
      ).toHaveAttribute("data-rotor", "running");
      await page.screenshot({ path: "docs/qa/ux-fan-working.png" });
      await example(/Trzy fazy i termik/);
      await page
        .getByRole("button", { name: "Przytrzymaj S1", exact: true })
        .focus();
      await page.keyboard.press("Space");
      await expect(board.locator('[data-device="M1"]')).toHaveAttribute(
        "data-powered",
        "true",
      );
      await expect(board.locator(".motor-rotor.running")).toHaveCount(1);
      await page.screenshot({ path: "docs/qa/ux-motor-working.png" });
      await page.emulateMedia({ reducedMotion: "reduce" });
      expect(
        await board
          .locator(".motor-rotor")
          .evaluate((element) => getComputedStyle(element).animationName),
      ).toBe("none");
      await page.getByRole("button", { name: "Schemat", exact: true }).click();
      await expect(
        page
          .getByTestId("board-schematic")
          .locator('[data-device="M1"] [data-load-state]'),
      ).toContainText("PRACA");
      await page.screenshot({ path: "docs/qa/ux-schematic-working.png" });
    }
    await page.close();
  }
  if (errors.length) throw new Error(errors.join("\n"));
  await writeFile(
    "docs/qa/ux-metrics.json",
    JSON.stringify(
      {
        date: "2026-10-03",
        browser: await browser.version(),
        baseline1366: { width: 824, height: 403 },
        metrics,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(metrics));
} finally {
  await browser.close();
}

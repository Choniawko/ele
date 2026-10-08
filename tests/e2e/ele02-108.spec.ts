import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { wireGeometry } from "./wire-geometry";
const text = await readFile(
  "examples/physical/ELE02_108_stanowisko.json",
  "utf8",
);
const name = JSON.parse(text).name as string;
const board = (page: Page) => page.getByTestId("board-physical");
const device = (page: Page, name: string) =>
  board(page).locator(`[data-device="${name}"]`);
async function press(page: Page, name: string, run: boolean) {
  await page
    .getByRole("button", { name: `Przytrzymaj ${name}`, exact: true })
    .focus();
  await page.keyboard.down("Space");
  await expect(device(page, "M")).toHaveAttribute("data-powered", String(run));
  await page.keyboard.up("Space");
}
test("ELE.02-108: import, niezależne START/STOP, Q2, dwa kierunki i zapis", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.goto("./");
  await expect(page.locator(".save-state")).toHaveText("Zapisano lokalnie");
  await page.locator(".project-title").click();
  await page
    .getByRole("button", { name: "Importuj JSON", exact: true })
    .click();
  await page.getByLabel("Treść JSON").fill(text);
  await page
    .getByRole("button", { name: "Sprawdź import", exact: true })
    .click();
  await expect(page.locator(".import-summary")).toBeVisible();
  await page
    .getByRole("button", { name: "Importuj jako nowe", exact: true })
    .click();
  const card = page
    .locator(".project-card")
    .filter({ has: page.locator(".saved-project strong", { hasText: name }) })
    .first();
  await card.locator(".saved-project").click();
  await page
    .getByRole("button", { name: "Otwórz w edytorze", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Skup się na tablicy", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Dopasuj widok", exact: true })
    .click();
  await expect(device(page, "Q2")).toContainText("4.35 A");
  await expect(device(page, "Q2.AUX")).toContainText("13–14");
  for (const id of ["S1", "S3"]) {
    await expect(
      page.getByRole("button", {
        name: `Przytrzymaj ${id} START`,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: `Przytrzymaj ${id} STOP`, exact: true }),
    ).toBeVisible();
  }
  await page.screenshot({ path: info.outputPath("ele108-off.png") });
  for (const label of [
    "S1 START",
    "S1 STOP",
    "S2",
    "S3 START",
    "S3 STOP",
    "S4",
  ]) {
    const control = page.getByRole("button", {
      name: `Przytrzymaj ${label}`,
      exact: true,
    });
    await control.focus();
    await page.keyboard.down("Space");
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.up("Space");
    await expect(control).toHaveAttribute("aria-pressed", "false");
  }
  const dial = page.getByRole("button", {
    name: "Nastawa Q2 [A]",
    exact: true,
  });
  await dial.click();
  await expect(device(page, "Q2")).toContainText("4.45 A");
  await dial.focus();
  await page.keyboard.press("ArrowDown");
  await expect(device(page, "Q2")).toContainText("4.35 A");
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await expect(device(page, "M")).toHaveAttribute("data-powered", "false");
  for (const start of ["S1", "S3"]) {
    for (const stop of ["S1", "S3"]) {
      await press(page, `${start} START`, true);
      await expect(device(page, "M")).toHaveAttribute("data-direction", "123");
      await expect(device(page, "M")).toHaveAttribute("data-powered", "true");
      await press(page, `${stop} STOP`, false);
      await expect(device(page, "M")).toHaveAttribute("data-powered", "false");
    }
  }
  await press(page, "S1 START", true);
  await page.screenshot({ path: info.outputPath("ele108-right.png") });
  await page.getByRole("button", { name: "Przełącz Q2", exact: true }).click();
  await expect(device(page, "M")).toHaveAttribute("data-powered", "false");
  await expect(device(page, "Q2.AUX")).toHaveAttribute(
    "data-mechanism",
    "false",
  );
  await page.getByRole("button", { name: "Przełącz Q2", exact: true }).click();
  await expect(device(page, "Q2.AUX")).toHaveAttribute(
    "data-mechanism",
    "true",
  );
  await expect(device(page, "M")).toHaveAttribute("data-powered", "false");
  for (const left of ["S2", "S4"]) {
    await page
      .getByRole("button", { name: `Przytrzymaj ${left}`, exact: true })
      .focus();
    await page.keyboard.down("Space");
    await expect(device(page, "M")).toHaveAttribute("data-direction", "132");
    await expect(device(page, "K1")).toHaveAttribute("data-mechanism", "false");
    await expect(device(page, "M")).toHaveAttribute("data-powered", "true");
    if (left === "S4")
      await page.screenshot({ path: info.outputPath("ele108-left.png") });
    await page.keyboard.up("Space");
    await expect(device(page, "M")).toHaveAttribute("data-powered", "false");
  }
  await page
    .getByRole("button", { name: "Widok połączeń", exact: true })
    .click();
  await expect(board(page).locator('[data-terminal="Q2:1"]')).toBeVisible();
  await expect(board(page).locator('[data-terminal="S3:1"]')).toBeVisible();
  await expect(board(page).locator('[data-terminal="S3:3"]')).toBeVisible();
  const geometry = await wireGeometry(page, JSON.parse(text));
  expect(geometry.checked).toBe(37);
  expect(geometry.detached).toEqual([]);
  expect(geometry.intrusions).toEqual([]);
  await page.screenshot({ path: info.outputPath("ele108-connections.png") });
  await expect(page.locator(".save-state")).toHaveText("Zapisano lokalnie");
  await page.reload();
  await expect(device(page, "Q2")).toContainText("4.35 A");
  await expect(device(page, "M")).toHaveAttribute("data-powered", "false");
});

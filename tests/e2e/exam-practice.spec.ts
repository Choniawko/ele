import { importLegacy } from "./legacy-project";
import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
const board = (page: Page) => page.getByTestId("board-physical");
const device = (page: Page, name: string) =>
  board(page).locator(`[data-device="${name}"]`);
async function openPractice(
  page: Page,
  id: string,
  variant = "reference",
  diagnosticCase = 0,
) {
  await importLegacy(page, id, true, variant, diagnosticCase);
}
async function press(page: Page, name: string) {
  await page
    .getByRole("button", { name: `Przytrzymaj ${name}`, exact: true })
    .focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(250);
  await page.keyboard.up("Space");
}
async function measurePe(page: Page, a: string, b: string) {
  await page.getByLabel("Tryb pracy").selectOption("measure");
  await page.getByLabel("Funkcja miernika").selectOption("continuity");
  await page.getByRole("button", { name: /SONDA CZERWONA/ }).click();
  await board(page)
    .locator(`[data-terminal="${a}"]`)
    .locator("circle")
    .first()
    .click();
  await board(page)
    .locator(`[data-terminal="${b}"]`)
    .locator("circle")
    .first()
    .click();
  await page.getByRole("button", { name: "Wykonaj i zapisz pomiar" }).click();
  await expect(page.getByTestId("meter-value")).not.toContainText("—");
}
test.beforeEach(async ({ page }) => {
  // These compatibility cases now include a complete JSON import and reload,
  // rather than selecting a retired card in the app.
  test.setTimeout(90000);
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.goto("./");
  await expect(
    page.getByText("Zapisano lokalnie", { exact: true }),
  ).toBeVisible();
});
test("zgodność starszego zapisu — bistabilny: dwa przyciski, RCD, pomiary PE i pełna ocena na produkcji", async ({
  page,
}, info) => {
  await openPractice(page, "exam-bistable");
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await press(page, "S1");
  await expect(device(page, "H1")).toHaveAttribute("data-powered", "true");
  await press(page, "S2");
  await expect(device(page, "H1")).toHaveAttribute("data-powered", "false");
  await press(page, "S2");
  await expect(device(page, "H1").locator("[data-light]")).toBeVisible();
  await page.getByRole("button", { name: "TEST FI1", exact: true }).click();
  await expect(device(page, "FI1")).toContainText("WYZWOLONY");
  await expect(device(page, "H1")).toHaveAttribute("data-powered", "false");
  await page.getByRole("button", { name: "Zasilanie ON", exact: true }).click();
  for (const [a, b] of [
    ["G1:PE", "XPE1:1"],
    ["XPE1:2", "H1:PE"],
    ["XPE1:3", "X1:PE"],
  ]) {
    await measurePe(page, a, b);
    await expect(page.getByTestId("meter-value")).not.toContainText("OL");
  }
  await page.getByRole("button", { name: "Sprawdź", exact: true }).click();
  await page.getByRole("button", { name: /Ocena ćwiczenia/ }).click();
  await expect(page.locator("[data-check]")).toHaveCount(7);
  await expect(page.locator('[data-check][data-passed="false"]')).toHaveCount(
    0,
  );
  await page.getByLabel("Tryb pracy").selectOption("training");
  await page.screenshot({
    path: info.outputPath("legacy-exam-bistable.png"),
    fullPage: true,
  });
});
test("silnik: START/STOP, blok pomocniczy, widoczne mostki, autosave i odświeżenie", async ({
  page,
}, info) => {
  await openPractice(page, "exam-start-stop");
  await expect(board(page).locator("[data-bridge]")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await press(page, "S1");
  await expect(device(page, "M1")).toHaveAttribute("data-powered", "true");
  await expect(device(page, "M1")).toHaveAttribute(
    "data-winding-connection",
    "star",
  );
  await expect(device(page, "KA1")).toHaveAttribute("data-mechanism", "true");
  await expect(device(page, "H1").locator("[data-light]")).toBeVisible();
  await expect(device(page, "M1").locator("[data-rotor]")).toHaveAttribute(
    "data-rotor",
    "running",
  );
  await press(page, "S0");
  await expect(device(page, "M1")).toHaveAttribute("data-powered", "false");
  await page.reload();
  await expect(
    page.getByText("Zapisano lokalnie", { exact: true }),
  ).toBeVisible();
  await expect(board(page).locator("[data-bridge]")).toHaveCount(2);
  await expect(device(page, "M1")).toHaveAttribute("data-powered", "false");
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await press(page, "S1");
  await expect(device(page, "M1")).toHaveAttribute("data-powered", "true");
  await page.screenshot({
    path: info.outputPath("legacy-exam-start-stop.png"),
    fullPage: true,
  });
});
test("prawo/lewo: blokada przeciwnego START, STOP i przeciwny kierunek wynikający z faz", async ({
  page,
}, info) => {
  await openPractice(page, "exam-reversing");
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await press(page, "S1");
  await expect(device(page, "M1")).toHaveAttribute("data-direction", "123");
  await press(page, "S2");
  await expect(device(page, "M1")).toHaveAttribute("data-direction", "123");
  await expect(device(page, "K2")).toHaveAttribute("data-mechanism", "false");
  await press(page, "S0");
  await press(page, "S2");
  await expect(device(page, "M1")).toHaveAttribute("data-direction", "132");
  await expect(device(page, "H2")).toHaveAttribute("data-powered", "true");
  await expect(device(page, "H1")).toHaveAttribute("data-powered", "false");
  await page.screenshot({
    path: info.outputPath("legacy-exam-reversing.png"),
    fullPage: true,
  });
});
test("samodzielny montaż: brak połączeń, możliwość przypisania bloku i wstawienia mostków", async ({
  page,
}) => {
  await openPractice(page, "exam-start-stop", "assembly");
  await expect(board(page).locator("[data-wire]")).toHaveCount(0);
  await expect(board(page).locator("[data-bridge]")).toHaveCount(0);
  await board(page)
    .locator('[data-terminal="KA1:53"]')
    .locator("circle")
    .first()
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Tryb pracy")).toHaveValue("build");
  if (!(await page.getByLabel("Mechanizm nadrzędny").isVisible()))
    await page
      .getByRole("button", { name: "Pokaż lub ukryj inspektor" })
      .click();
  await expect(page.getByLabel("Mechanizm nadrzędny")).toBeVisible();
  await page.getByLabel("Mechanizm nadrzędny").selectOption({ label: "K1" });
  await expect(page.getByLabel("Mechanizm nadrzędny")).not.toHaveValue("");
  await board(page)
    .locator('[data-terminal="M1:PE"]')
    .locator("circle")
    .first()
    .click();
  await page.keyboard.press("Escape");
  await page.getByLabel("Mostki zaciskowe silnika").selectOption("star");
  await expect(board(page).locator("[data-bridge]")).toHaveCount(2);
  await page.getByLabel("Mostki zaciskowe silnika").selectOption("delta");
  await expect(board(page).locator("[data-bridge]")).toHaveCount(3);
  await board(page)
    .locator('[data-terminal="G1:L1"]')
    .locator("circle")
    .first()
    .click();
  await board(page)
    .locator('[data-terminal="QF2:1"]')
    .locator("circle")
    .first()
    .click();
  await expect(board(page).locator("[data-wire]")).toHaveCount(1);
  await page.getByRole("button", { name: "Sprawdź", exact: true }).click();
  await page.getByRole("button", { name: /Ocena ćwiczenia/ }).click();
  await expect(page.locator('[data-check="function"]')).toHaveAttribute(
    "data-passed",
    "false",
  );
});
test("diagnoza PE: ukryta przyczyna, bezpieczny eksport, pomiar przed naprawą i retest", async ({
  page,
}) => {
  await openPractice(page, "exam-start-stop", "diagnosis", 2);
  await page.getByRole("button", { name: "Eksport", exact: true }).click();
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Projekt JSON/ }).click(),
  ]);
  const copy = JSON.parse(await readFile((await file.path())!, "utf8"));
  expect(copy.faults).toEqual([]);
  expect(copy.training).toBeUndefined();
  expect(copy.scenarioId).toBeUndefined();
  await page.getByRole("button", { name: "Zamknij", exact: true }).click();
  await measurePe(page, "XPE1:2", "M1:PE");
  await expect(page.getByTestId("meter-value")).toContainText("OL");
  await page.getByLabel("Tryb pracy").selectOption("diagnosis");
  await page
    .getByLabel("Hipoteza diagnozy")
    .fill("Brak ciągłości PE obudowy silnika — sprawdzam przewód ochronny.");
  await page.getByLabel("Hipoteza diagnozy").blur();
  const wires = page.getByLabel("Wybierz przewód instalacji");
  const id = await wires
    .locator("option")
    .filter({ hasText: /→ M1:PE/ })
    .getAttribute("value");
  await wires.selectOption(id!);
  await page
    .getByRole("button", { name: "Napraw zaznaczony element", exact: true })
    .click();
  await measurePe(page, "XPE1:2", "M1:PE");
  await expect(page.getByTestId("meter-value")).not.toContainText("OL");
  await page.getByLabel("Tryb pracy").selectOption("training");
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await press(page, "S1");
  await expect(device(page, "M1")).toHaveAttribute("data-powered", "true");
});

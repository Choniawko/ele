import { test, expect } from "@playwright/test";

test("audit: one apparatus card from SKU search, catalog and legacy addresses", async ({page}) => {
  await page.goto("./#knowledge");
  for (const name of ["Zacznij od podstaw", "Poznaj aparat", "Ćwicz zadanie"]) {
    await expect(page.getByRole("link", {name: new RegExp(name)})).toBeVisible();
  }
  const search = page.getByLabel("Szukaj w materiałach źródłowych");
  await search.fill("LC1D09P7");
  await page.locator(".exam-article-card").filter({has: page.getByRole("heading", {name: "Stycznik", exact: true})}).click();
  await expect(page).toHaveURL(/#\/wiedza\/aparaty\/stycznik$/);
  await expect(page.getByRole("heading", {name: "Co zmienia się po zadziałaniu", exact: true})).toBeVisible();
  await page.goto("./#knowledge/article/stycznik");
  await expect(page).toHaveURL(/#\/wiedza\/aparaty\/stycznik$/);
  await page.goto("./#/wiedza/aparaty");
  await search.fill("XB5AA35");
  await page.locator(".exam-article-card").filter({has: page.getByRole("heading", {name: "Łączniki i przyciski NO/NC", exact: true})}).click();
  await expect(page).toHaveURL(/#\/wiedza\/aparaty\/laczniki$/);
  await page.goto("./#/wiedza/aparaty/ochrona-silnika");
  await expect(page).toHaveURL(/#\/wiedza\/aparaty\/zabezpieczenia-silnikowe$/);
});

test("audit QA-01: selected welded contact, real SVG, compensated continuity and repair agree", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  page.on("pageerror", (e) => {
    throw e;
  });
  await page.goto("./");
  await expect(page.locator(".save-state")).toHaveText("Zapisano lokalnie");
  await page.getByRole("button", { name: "Przykłady", exact: true }).click();
  await page
    .getByRole("button", { name: "Otwórz kopię ELE.02-108", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Pokaż lub ukryj inspektor", exact: true })
    .click();
  await page
    .getByTestId("board-physical")
    .locator('[data-device="K1"]')
    .click();
  await page.getByLabel("Rodzaj usterki").selectOption("welded-contact");
  await page.getByLabel("Styk uszkodzenia").selectOption("pole1");
  await page
    .getByRole("button", { name: "Wprowadź usterkę", exact: true })
    .click();
  await page.getByRole("button", { name: "Schemat", exact: true }).click();
  const svg = page.getByTestId("board-schematic");
  const pole = svg.locator('[data-device="K1"][data-symbol-fragment="pole1"]');
  await expect(pole).toHaveAttribute("data-closed", "true");
  await expect(pole).toHaveAttribute("data-state-view", "continuity");
  await expect(pole.locator('path[d="M40 0L80 0"]')).toHaveCount(1);
  await expect(
    svg.locator('[data-device="K1"][data-symbol-fragment="pole2"]'),
  ).toHaveAttribute("data-closed", "false");
  await page.getByLabel("Tryb pracy").selectOption("measure");
  await page.getByLabel("Funkcja miernika").selectOption("continuity");
  await page.getByLabel("Kompensacja przewodów pomiarowych").check();
  await page.getByRole("button", { name: /SONDA CZERWONA/ }).click();
  await svg.locator('[data-terminal="K1:1L1"]').click();
  await svg.locator('[data-terminal="K1:2T1"]').click();
  await page
    .getByRole("button", { name: "Wykonaj i zapisz pomiar", exact: true })
    .click();
  await expect(page.getByTestId("meter-value")).toContainText("0,005");
  await page.screenshot({
    path: info.outputPath("welded-contact-and-continuity.png"),
  });
  await page.getByLabel("Tryb pracy").selectOption("build");
  const inspector = page.getByRole("button", {
    name: "Pokaż lub ukryj inspektor",
    exact: true,
  });
  if ((await inspector.getAttribute("aria-pressed")) !== "true")
    await inspector.click();
  await page
    .getByRole("button", {
      name: "Usuń usterki zaznaczonego elementu",
      exact: true,
    })
    .click();
  await expect(pole).toHaveAttribute("data-closed", "false");
  await page.getByLabel("Tryb pracy").selectOption("measure");
  await page
    .getByRole("button", { name: "Wykonaj i zapisz pomiar", exact: true })
    .click();
  await expect(page.getByTestId("meter-value")).toContainText("OL");
});

test("audit UX-01: reading-schematics entry and old address reach the active 101 lesson", async ({
  page,
}) => {
  await page.goto("./#/wiedza/czytanie");
  await page
    .getByRole("link", {
      name: "Czytaj schemat i śledź rzeczywiste żyły w ELE.02-101 →",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/#\/wiedza\/uklady\/ele02-101$/);
  await expect(
    page.getByRole("button", { name: "Załącz energię lekcji", exact: true }),
  ).toBeVisible();
  await page.goto("./#knowledge/lesson/linia-i-zyla");
  await expect(page).toHaveURL(/#\/wiedza\/uklady\/ele02-101$/);
  await page
    .getByRole("button", { name: "Załącz energię lekcji", exact: true })
    .click();
  await expect(page.getByText(/OP1: świeci · OP2: świeci/)).toBeVisible();
});

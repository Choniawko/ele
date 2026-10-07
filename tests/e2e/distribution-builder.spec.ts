import { wireGeometry } from "./wire-geometry";
import { readFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import type { SavedProject } from "../../apps/web/src/persistence";
test.setTimeout(90000);
const saved = (page: Page) =>
  expect(page.locator(".save-state")).toHaveText("Zapisano lokalnie");
async function current(page: Page): Promise<SavedProject> {
  return page.evaluate(async () => {
    const req = indexedDB.open("pracownia-elektryczna");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    try {
      return await new Promise<SavedProject>((resolve, reject) => {
        const tx = db.transaction(["projects", "settings"]);
        const active = tx.objectStore("settings").get("last-project");
        active.onerror = () => reject(active.error);
        active.onsuccess = () => {
          const row = tx.objectStore("projects").get(active.result.projectId);
          row.onsuccess = () => resolve(row.result);
          row.onerror = () => reject(row.error);
        };
      });
    } finally {
      db.close();
    }
  });
}
async function empty(page: Page) {
  await page.goto("./");
  await saved(page);
  await page.locator(".project-title").click();
  await page.getByRole("button", { name: "Nowy folder", exact: true }).click();
  await page.getByLabel("Nazwa folderu", { exact: true }).fill("Rozdzielnice");
  await page.getByRole("button", { name: "Zapisz", exact: true }).click();
  await page.getByRole("button", { name: "Nowy projekt", exact: true }).click();
  await page.getByLabel("Nazwa nowego projektu").fill("Moja rozdzielnica");
  await page.getByRole("button", { name: "Zapisz", exact: true }).click();
  await expect(page.locator(".project-title")).toContainText(
    "Moja rozdzielnica",
  );
  await saved(page);
  await expect
    .poll(async () => (await current(page)).name)
    .toBe("Moja rozdzielnica");
}
async function create(page: Page, rows = "2", modules = "12") {
  await page
    .getByRole("button", { name: "+ Rozdzielnica", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Nowa rozdzielnica",
    exact: true,
  });
  await dialog.getByLabel("Liczba rzędów").selectOption(rows);
  await dialog.getByLabel("Moduły w rzędzie").selectOption(modules);
  await dialog.getByLabel("Położenie X").fill("40");
  await dialog.getByLabel("Położenie Y").fill("90");
  await dialog
    .getByRole("button", { name: "Utwórz rozdzielnicę", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await saved(page);
  await page
    .getByRole("button", { name: "Edytuj wnętrze R1", exact: true })
    .click();
}
async function add(page: Page, id: string) {
  await page.getByLabel("Aparat do rozdzielnicy").selectOption(id);
  await page
    .getByRole("button", { name: "Dodaj do wybranego rzędu", exact: true })
    .click();
  await saved(page);
}
async function outside(page: Page, id: string, y: number) {
  await page
    .getByRole("button", {
      name: `Dodaj ${id === "edu-source-ac" ? "Źródło sieciowe · 230 V AC" : "Lampa · 60 W / 230 V"}`,
      exact: true,
    })
    .click();
  const board = page.getByTestId("board-physical"),
    box = await board.boundingBox();
  await board.click({ position: { x: box!.width - 70, y } });
  await saved(page);
  await page
    .getByRole("button", { name: "Dopasuj widok", exact: true })
    .click();
}
test("od pustego projektu: własny rząd, obwód z odbiornikiem, pomiar, praca, rozbudowa i odtworzenie", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await empty(page);
  const initial = await current(page);
  await create(page);
  await add(page, "hager-mbn116e");
  await page.screenshot({ path: info.outputPath("distribution-interior.png") });
  await page.getByRole("button", { name: /Rząd 2 ·/ }).click();
  await page.getByLabel("Pierwsze pole").fill("4");
  await page
    .getByRole("button", { name: "Przenieś zaznaczone na pole", exact: true })
    .click();
  await saved(page);
  await page.getByRole("button", { name: /Przyłącza 1 ·/ }).click();
  await add(page, "edu-bus-n");
  await add(page, "edu-bus-pe");
  const moved = await current(page),
    e = moved.document.physical.enclosures![0],
    id = e.deviceIds[0];
  expect(e.distribution!.placements[id]).toEqual({
    zone: "modules",
    row: 1,
    slot: 3,
  });
  await page
    .getByRole("button", { name: "Wróć do instalacji", exact: true })
    .click();
  if (!(await page.getByLabel("Szukaj w katalogu").isVisible()))
    await page
      .getByRole("button", { name: "Pokaż lub ukryj katalog", exact: true })
      .click();
  await outside(page, "edu-source-ac", 260);
  await outside(page, "edu-lamp", 420);
  await page.getByRole("button", { name: "Schemat", exact: true }).click();
  const board = page.getByTestId("board-schematic");
  const connect = async (a: string, b: string) => {
    for (const ref of [a, b])
      await board.locator(`[data-terminal="${ref}"] circle`).first().click();
  };
  await connect("G1:L", "QF1:1");
  await connect("QF1:2", "H1:L");
  await connect("G1:N", "XN1:1");
  await connect("XN1:2", "H1:N");
  await connect("G1:PE", "XPE1:1");
  await connect("XPE1:2", "H1:PE");
  await saved(page);
  await page.getByLabel("Tryb pracy").selectOption("measure");
  await page.getByLabel("Funkcja miernika").selectOption("continuity");
  await page.getByRole("button", { name: /SONDA CZERWONA/ }).click();
  for (const ref of ["G1:PE", "H1:PE"])
    await board.locator(`[data-terminal="${ref}"] circle`).first().click();
  await page.getByRole("button", { name: "Wykonaj i zapisz pomiar" }).click();
  await expect(page.getByTestId("meter-value")).not.toHaveText("—");
  await saved(page);
  await page.getByRole("button", { name: "Tablica", exact: true }).click();
  const geometry = await wireGeometry(page, (await current(page)).document);
  expect(geometry.checked).toBe(6);
  expect(geometry.detached).toEqual([]);
  expect(geometry.intrusions).toEqual([]);
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await expect(
    page.getByTestId("board-physical").locator('[data-device="H1"]'),
  ).toHaveAttribute("data-powered", "true");
  const before = await current(page);
  await page.getByLabel("Rozdzielnica modułowa").selectOption(e.id);
  await page
    .getByRole("button", { name: "Konfiguracja R1", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Konfiguracja rozdzielnicy",
  });
  await dialog.getByLabel("Liczba rzędów").selectOption("3");
  await dialog
    .getByRole("button", { name: "Zatwierdź konfigurację", exact: true })
    .click();
  await saved(page);
  await expect(
    page.getByTestId("board-physical").locator('[data-device="H1"]'),
  ).toHaveAttribute("data-powered", "true");
  await page
    .getByRole("button", { name: "Załóż maskownicę", exact: true })
    .click();
  await saved(page);
  await page
    .getByRole("button", { name: "Dopasuj widok", exact: true })
    .click();
  await page.screenshot({
    path: info.outputPath("distribution-installation.png"),
  });
  const after = await current(page);
  expect(after.document.circuit).toEqual(before.document.circuit);
  expect(after.folderId).toBe(initial.folderId);
  expect(after.measurements).toHaveLength(1);
  await page.reload();
  await saved(page);
  const restored = await current(page);
  expect(restored.document.physical).toEqual(after.document.physical);
  expect(restored.measurements).toEqual(after.measurements);
  expect(restored.folderId).toBe(initial.folderId);
  await expect(
    page.getByTestId("board-physical").locator('[data-device="H1"]'),
  ).toHaveAttribute("data-powered", "false");
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await expect(
    page.getByTestId("board-physical").locator('[data-device="H1"]'),
  ).toHaveAttribute("data-powered", "true");
  await page.locator(".project-title").click();
  await page
    .locator(".library-sidebar button")
    .filter({ hasText: "Rozdzielnice" })
    .click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Eksportuj folder", exact: true }).click(),
  ]);
  const content = await readFile((await download.path())!, "utf8");
  await page
    .getByRole("button", { name: "Importuj JSON", exact: true })
    .click();
  await page.getByLabel("Treść JSON").fill(content);
  await page
    .getByRole("button", { name: "Sprawdź import", exact: true })
    .click();
  await expect(page.locator(".import-summary")).toBeVisible();
  await page
    .getByRole("button", { name: "Importuj jako nowe", exact: true })
    .click();
  await expect(page.locator(".import-summary")).toHaveCount(0);
  await page.locator(".project-card .saved-project").first().click();
  await page
    .getByRole("button", { name: "Otwórz w edytorze", exact: true })
    .click();
  await saved(page);
  const imported = await current(page);
  expect(imported.id).not.toBe(after.id);
  expect(imported.document.physical).toEqual(after.document.physical);
  expect(imported.measurements).toEqual(after.measurements);
  expect(errors).toEqual([]);
});
test("pełny rząd, przyłącza oraz niedozwolone zmniejszenie nie pozostawiają częściowej edycji", async ({
  page,
}) => {
  await empty(page);
  await create(page, "2", "8");
  await add(page, "edu-rcd");
  for (let i = 0; i < 5; i++) await add(page, "hager-mbn116e");
  const before = await current(page);
  await page
    .getByRole("button", { name: "Dodaj do wybranego rzędu", exact: true })
    .click();
  await expect(page.locator(".distribution-mounting")).toContainText(
    "kolejnych wolnych pól",
  );
  expect((await current(page)).document).toEqual(before.document);
  await page.getByRole("button", { name: /Przyłącza 1 ·/ }).click();
  await add(page, "edu-bus-pe");
  await page.getByRole("button", { name: /Rząd 2 ·/ }).click();
  await add(page, "edu-indicator-green-230");
  const occupied = await current(page);
  await page
    .getByRole("button", { name: "Konfiguracja R1", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Konfiguracja rozdzielnicy",
  });
  await dialog.getByLabel("Liczba rzędów").selectOption("1");
  await expect(dialog.getByRole("alert")).toContainText("nie mieści");
  await expect(
    dialog.getByRole("button", { name: "Zatwierdź konfigurację", exact: true }),
  ).toBeDisabled();
  expect((await current(page)).document).toEqual(occupied.document);
  await dialog.getByRole("button", { name: "Anuluj", exact: true }).click();
});

test("skupienie, undo i schemat pozwalają wrócić do edycji całej instalacji", async ({
  page,
}) => {
  await empty(page);
  await create(page);
  const e = (await current(page)).document.physical.enclosures![0];
  await page.keyboard.press("Control+z");
  await saved(page);
  await expect(
    page.getByRole("button", { name: "Wróć do instalacji", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByTestId("board-physical").locator("[data-enclosure]"),
  ).toHaveCount(0);
  await page.keyboard.press("Control+Shift+z");
  await saved(page);
  await page.getByLabel("Rozdzielnica modułowa").selectOption(e.id);
  await page
    .getByRole("button", { name: "Edytuj wnętrze R1", exact: true })
    .click();
  await page.getByRole("button", { name: "Schemat", exact: true }).click();
  await expect(page.locator(".project-title")).toBeVisible();
  await page.getByRole("button", { name: "Tablica", exact: true }).click();
  await page.getByLabel("Rozdzielnica modułowa").selectOption(e.id);
  await page
    .getByRole("button", { name: "Edytuj wnętrze R1", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /Rząd 2 ·/ }).click();
  expect(
    Number((await page.locator(".zoom-label").innerText()).replace("%", "")),
  ).toBeGreaterThanOrEqual(65);
  await add(page, "hager-mbn116e");
  await expect(
    page.getByTestId("board-physical").locator('[data-device-body="QF1"]'),
  ).toBeVisible();
  const body = await page
    .getByTestId("board-physical")
    .locator('[data-device-body="QF1"]')
    .boundingBox();
  const point = { x: body!.x + 4, y: body!.y + 20 };
  expect(
    await page.evaluate(
      ({ x, y }) =>
        document
          .elementFromPoint(x, y)
          ?.closest("[data-device]")
          ?.getAttribute("data-device"),
      point,
    ),
  ).toBe("QF1");
  await page.mouse.click(point.x, point.y);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Wróć do instalacji", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".project-title")).toBeVisible();
});

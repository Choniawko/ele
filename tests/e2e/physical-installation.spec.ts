import { wireGeometry } from "./wire-geometry";
import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { SavedProject } from "../../apps/web/src/persistence";
test.setTimeout(90000);
const text = await readFile(
  "examples/physical/ELE02_101_stanowisko.json",
  "utf8",
);
const name = JSON.parse(text).name as string;
const board = (page: Page) => page.getByTestId("board-physical");
const saved = (page: Page) =>
  expect(page.locator(".save-state")).toHaveText("Zapisano lokalnie");
async function importProject(page: Page, content: string, projectName: string) {
  await page.locator(".project-title").click();
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
  await page
    .locator(".project-card")
    .filter({
      has: page.locator(".saved-project strong", { hasText: projectName }),
    })
    .first()
    .locator(".saved-project")
    .click();
  await page
    .getByRole("button", { name: "Otwórz w edytorze", exact: true })
    .click();
  await saved(page);
}
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
          if (!active.result?.projectId) {
            reject(new Error("Brak aktywnego projektu"));
            return;
          }
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
test("ELE.02-101: pokrywy, przeniesienie, solver w obu widokach, pomiar, autosave i ponowny import", async ({
  page,
}, info) => {
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.goto("./");
  await saved(page);
  await importProject(page, text, name);
  const before = await current(page);
  await expect(board(page).locator("[data-enclosure]")).toHaveCount(4);
  await expect(board(page).locator('[data-device="P1.N"]')).toHaveCount(0);
  await expect(board(page).locator('[data-device="H1"]')).toBeVisible();
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  for (const id of ["H1", "H2", "OP1", "OP2"])
    await expect(board(page).locator(`[data-device="${id}"]`)).toHaveAttribute(
      "data-powered",
      "true",
    );
  await page
    .getByRole("button", { name: "Skup się na tablicy", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Dopasuj widok", exact: true })
    .click();
  await page.screenshot({ path: info.outputPath("ele101-external.png") });
  await page
    .getByRole("button", { name: "Widok połączeń", exact: true })
    .click();
  await expect(board(page).locator('[data-device="P1.N"]')).toBeVisible();
  for (const id of ["H1", "H2", "OP1", "OP2"])
    await expect(board(page).locator(`[data-device="${id}"]`)).toHaveAttribute(
      "data-powered",
      "true",
    );
  await expect(board(page).locator('[data-terminal="H1:PE"]')).toHaveCount(0);
  const geometry = await wireGeometry(page, (await current(page)).document);
  expect(geometry.checked).toBe(33);
  expect(geometry.detached).toEqual([]);
  expect(geometry.intrusions).toEqual([]);
  await page.screenshot({ path: info.outputPath("ele101-connections.png") });
  const e = await board(page)
    .locator('[data-enclosure-handle="P1"]')
    .boundingBox();
  await page.mouse.move(e!.x + 10, e!.y + 12);
  await page.mouse.down();
  await page.mouse.move(e!.x + 35, e!.y + 22, { steps: 10 });
  await page.mouse.up();
  await saved(page);
  const moved = await current(page);
  expect(moved.document.circuit).toEqual(before.document.circuit);
  expect(
    moved.document.physical.enclosures!.find((e) => e.id === "case-P1")!
      .position,
  ).not.toEqual(
    before.document.physical.enclosures!.find((e) => e.id === "case-P1")!
      .position,
  );
  await page
    .getByRole("button", { name: "Zakończ skupienie na tablicy", exact: true })
    .click();
  await page.getByRole("button", { name: "Zasilanie ON", exact: true }).click();
  await page.getByLabel("Tryb pracy").selectOption("measure");
  await page.getByLabel("Funkcja miernika").selectOption("continuity");
  await page.getByRole("button", { name: /SONDA CZERWONA/ }).click();
  for (const r of ["PZ:PE", "R.PE:1"])
    await board(page).locator(`[data-terminal="${r}"] circle`).first().click();
  await page.getByRole("button", { name: "Wykonaj i zapisz pomiar" }).click();
  await expect(page.getByTestId("meter-value")).not.toContainText("—");
  await saved(page);
  const measured = await current(page);
  expect(measured.measurements.length).toBe(1);
  await page.reload();
  await saved(page);
  expect((await current(page)).document).toEqual(measured.document);
  expect((await current(page)).measurements).toEqual(measured.measurements);
  await expect(
    page.getByRole("button", { name: "Włącz zasilanie", exact: true }),
  ).toBeVisible();
  // Export through the public UI, then import the exact downloaded document.
  await page.getByRole("button", { name: "Eksport", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Projekt JSON/ }).click();
  const download = await downloadPromise,
    file = await download.path();
  const exported = await readFile(file!, "utf8");
  await page.getByRole("button", { name: "Zamknij", exact: true }).click();
  await importProject(page, exported, name);
  const imported = await current(page);
  expect(imported.id).not.toBe(measured.id);
  expect(imported.document.physical).toEqual(measured.document.physical);
  expect(imported.document.circuit.devices).toEqual(
    measured.document.circuit.devices,
  );
  expect(imported.document.circuit.conductors).toEqual(
    measured.document.circuit.conductors,
  );
  // All imported copies retain the same circuit/physical identities, but acquire new project IDs.
  await saved(page);
  await expect(board(page).locator("[data-enclosure]")).toHaveCount(4);
});

test("obudowy: wkładanie, wyjmowanie i korytko z wieloma żyłami", async ({
  page,
}) => {
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.goto("./");
  await saved(page);
  await importProject(page, text, name);
  await page
    .getByRole("button", { name: "Widok połączeń", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Obudowy i korytka", exact: true })
    .click();
  await page.getByLabel("Wybrana obudowa").selectOption("case-P1");
  // Panel does not block this terminal at the right-hand side of the board.
  await board(page).locator('[data-device="P1.N"]').click();
  await page
    .getByRole("button", { name: "Wyjmij zaznaczone", exact: true })
    .click();
  await saved(page);
  expect(
    (await current(page)).document.physical.enclosures!.find(
      (e) => e.id === "case-P1",
    )!.deviceIds,
  ).not.toContain("P1.N");
  await page
    .getByRole("button", { name: "Włóż zaznaczone", exact: true })
    .click();
  await saved(page);
  expect(
    (await current(page)).document.physical.enclosures!.find(
      (e) => e.id === "case-P1",
    )!.deviceIds,
  ).toContain("P1.N");
  await page.getByRole("button", { name: "Zamknij P1", exact: true }).click();
  await expect(board(page).locator('[data-device="P1.N"]')).toHaveCount(0);
  await board(page)
    .getByRole("button", { name: "Otwórz pokrywę P1", exact: true })
    .click();
  await expect(board(page).locator('[data-device="P1.N"]')).toBeVisible();
  await page.getByLabel("Wybrane korytko").selectOption("trunk-main");
  await page
    .getByRole("button", { name: "Zamknij korytko", exact: true })
    .click();
  await expect(
    board(page).locator('[data-trunk="R–P1–P2–GW"]'),
  ).toHaveAttribute("data-closed", "true");
  await saved(page);
  const p = (await current(page)).document;
  expect(p.physical.trunking![0].conductorIds.length).toBeGreaterThan(5);
  expect(p.circuit.conductors).toEqual(JSON.parse(text).circuit.conductors);
});

test("zrzut projektu sprzed poprawki (lokalny materiał użytkownika)", async ({
  page,
}, info) => {
  test.skip(
    !process.env.ELE_BEFORE_PROJECT,
    "Oryginalny materiał użytkownika dostępny tylko przy lokalnym QA",
  );
  const original = await readFile(process.env.ELE_BEFORE_PROJECT!, "utf8");
  await page.goto("./");
  await saved(page);
  await importProject(page, original, JSON.parse(original).name);
  await page
    .getByRole("button", { name: "Skup się na tablicy", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Dopasuj widok", exact: true })
    .click();
  await page.screenshot({ path: info.outputPath("ele101-before.png") });
});

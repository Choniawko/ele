import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { SavedProject } from "../../apps/web/src/persistence";
const minimalText = await readFile(
  "examples/import/minimal-project.json",
  "utf8",
);
const minimal = JSON.parse(minimalText);
async function rows(page: Page): Promise<SavedProject[]> {
  return page.evaluate(async () => {
    const req = indexedDB.open("pracownia-elektryczna");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    try {
      return await new Promise<SavedProject[]>((resolve, reject) => {
        const r = db.transaction("projects").objectStore("projects").getAll();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    } finally {
      db.close();
    }
  });
}
const saved = (page: Page) =>
  expect(page.getByText("Zapisano lokalnie", { exact: true })).toBeVisible();
const library = (page: Page) => page.locator(".project-title").click();
const folderButton = (page: Page, name: string) =>
  page.locator(".library-sidebar button").filter({ hasText: name });
const card = (page: Page, name: string) =>
  page
    .locator(".project-card")
    .filter({ has: page.locator(".saved-project strong", { hasText: name }) });
async function folder(page: Page, name: string) {
  await page.getByRole("button", { name: "Nowy folder", exact: true }).click();
  await page.getByLabel("Nazwa folderu", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Zapisz", exact: true }).click();
  await expect(page.locator(".library-heading h3")).toHaveText(name);
}
async function importText(page: Page, text: string) {
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
  await expect(page.locator(".import-summary")).toHaveCount(0);
}
async function openCard(page: Page, name: string) {
  await card(page, name).locator(".saved-project").click();
  await page
    .getByRole("button", { name: "Otwórz w edytorze", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await saved(page);
}
function watchErrors(page: Page) {
  page.on("pageerror", (e) => {
    throw e;
  });
}

test("folder, kopia przykładu, podgląd bez zmiany, autosave i pomiary po odświeżeniu", async ({
  page,
}) => {
  watchErrors(page);
  await page.goto("./");
  await saved(page);
  await library(page);
  await folder(page, "Projekty do egzaminu");
  await page
    .getByRole("button", { name: "Kopiuj przykład", exact: true })
    .click();
  await page.getByLabel("Nazwa nowego projektu").fill("Moja lampa");
  await page.getByLabel("Przykład", { exact: true }).selectOption("lamp");
  await page.getByRole("button", { name: "Zapisz", exact: true }).click();
  await saved(page);
  const original = (await rows(page)).find((r) => r.name === "Moja lampa")!;
  expect(original.folderId).toBeTruthy();
  expect((await rows(page)).some((r) => r.name === "Lampa i łącznik")).toBe(
    true,
  );
  await page.getByLabel("Tryb pracy").selectOption("measure");
  await page.getByLabel("Funkcja miernika").selectOption("continuity");
  await page.getByRole("button", { name: /SONDA CZERWONA/ }).click();
  for (const ref of ["G1:PE", "H1:PE"])
    await page
      .getByTestId("board-physical")
      .locator(`[data-terminal="${ref}"] circle`)
      .first()
      .click();
  await page.getByRole("button", { name: "Wykonaj i zapisz pomiar" }).click();
  await expect(page.getByTestId("meter-value")).not.toContainText("—");
  await saved(page);
  await library(page);
  await page
    .getByLabel("Nazwa projektu", { exact: true })
    .fill("Moja lampa po edycji");
  await page.getByLabel("Nazwa projektu", { exact: true }).blur();
  await page.getByRole("button", { name: "Zamknij", exact: true }).click();
  await saved(page);
  await page.reload();
  await saved(page);
  const restored = (await rows(page)).find((r) => r.id === original.id)!;
  expect(restored.folderId).toBe(original.folderId);
  expect(restored.measurements).toHaveLength(1);
  expect(restored.name).toBe("Moja lampa po edycji");
  await expect(
    page.getByTestId("board-physical").locator('[data-device="H1"]'),
  ).toHaveAttribute("data-powered", "false");
  await library(page);
  await folderButton(page, "Projekty do egzaminu").click();
  const miniature = card(page, "Moja lampa po edycji").locator(
    "svg.project-miniature",
  );
  expect(
    await miniature.evaluate((svg) => {
      const frame = svg.getBoundingClientRect();
      return [...svg.querySelectorAll("[data-device-body]")].every((body) => {
        const rect = body.getBoundingClientRect();
        return (
          rect.left >= frame.left &&
          rect.right <= frame.right &&
          rect.top >= frame.top &&
          rect.bottom <= frame.bottom
        );
      });
    }),
  ).toBe(true);
  const beforePreview = await rows(page);
  await card(page, "Moja lampa po edycji").locator(".saved-project").click();
  await expect(page.locator(".library-preview")).toContainText(
    "1 zapisanych pomiarów",
  );
  expect(await rows(page)).toEqual(beforePreview);
  await page
    .getByRole("button", { name: "Otwórz w edytorze", exact: true })
    .click();
  await saved(page);
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await expect(
    page.getByTestId("board-physical").locator('[data-device="H1"]'),
  ).toHaveAttribute("data-powered", "true");
});

test("nowy projekt, duplikat, przenoszenie, zmiana nazwy folderu, wyszukiwanie i bezpieczne usuwanie", async ({
  page,
}) => {
  watchErrors(page);
  await page.goto("./");
  await saved(page);
  await library(page);
  await folder(page, "Ostatni egzamin");
  await page.getByRole("button", { name: "Nowy projekt", exact: true }).click();
  await page.getByLabel("Nazwa nowego projektu").fill("Pusta instalacja");
  await page.getByRole("button", { name: "Zapisz", exact: true }).click();
  await saved(page);
  const first = (await rows(page)).find((r) => r.name === "Pusta instalacja")!;
  expect(first.document.circuit.devices).toHaveLength(0);
  await library(page);
  await folderButton(page, "Ostatni egzamin").click();
  await page
    .getByRole("button", { name: "Duplikuj Pusta instalacja", exact: true })
    .click();
  await page.getByLabel("Nazwa nowego projektu").fill("Niezależna kopia");
  await page.getByRole("button", { name: "Zapisz", exact: true }).click();
  await expect(card(page, "Niezależna kopia")).toBeVisible();
  const copy = (await rows(page)).find((r) => r.name === "Niezależna kopia")!;
  expect(copy.id).not.toBe(first.id);
  await page
    .getByLabel("Folder projektu Niezależna kopia", { exact: true })
    .selectOption("none");
  await expect(card(page, "Niezależna kopia")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Zmień nazwę folderu", exact: true })
    .click();
  await page.getByLabel("Nazwa folderu").fill("Egzamin 2026");
  await page.getByRole("button", { name: "Zapisz", exact: true }).click();
  await expect(page.locator(".library-heading h3")).toHaveText("Egzamin 2026");
  await folderButton(page, "Wszystkie projekty").click();
  await page.getByLabel("Szukaj projektów").fill("Niezależna");
  await page.getByLabel("Sortowanie projektów").selectOption("name");
  await expect(page.locator(".project-card")).toHaveCount(1);
  await openCard(page, "Niezależna kopia");
  await library(page);
  await page
    .getByLabel("Nazwa projektu", { exact: true })
    .fill("Kopia zmieniona");
  await page.getByLabel("Nazwa projektu", { exact: true }).blur();
  await page.getByRole("button", { name: "Zamknij", exact: true }).click();
  await saved(page);
  expect((await rows(page)).find((r) => r.id === first.id)!.name).toBe(
    "Pusta instalacja",
  );
  await library(page);
  await folderButton(page, "Egzamin 2026").click();
  await page.getByRole("button", { name: "Usuń folder", exact: true }).click();
  await page
    .getByRole("button", { name: "Potwierdź usunięcie", exact: true })
    .click();
  await expect(card(page, "Pusta instalacja")).toBeVisible();
  expect(
    (await rows(page)).find((r) => r.id === first.id)!.folderId,
  ).toBeNull();
  await page
    .getByRole("button", { name: "Usuń Pusta instalacja", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Potwierdź usunięcie", exact: true })
    .click();
  await expect(card(page, "Pusta instalacja")).toHaveCount(0);
  await page.waitForTimeout(600);
  expect((await rows(page)).find((r) => r.id === first.id)).toBeUndefined();
  await folder(page, "Folder do usunięcia");
  await page.getByRole("button", { name: "Nowy projekt", exact: true }).click();
  await page
    .getByLabel("Nazwa nowego projektu")
    .fill("Kasowany razem z folderem");
  await page.getByRole("button", { name: "Zapisz", exact: true }).click();
  await saved(page);
  const deletedId = (await rows(page)).find(
    (r) => r.name === "Kasowany razem z folderem",
  )!.id;
  await library(page);
  await folderButton(page, "Folder do usunięcia").click();
  await page.getByRole("button", { name: "Usuń folder", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Potwierdzam usunięcie folderu i projektów",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("checkbox", { name: /Usuń także wszystkie projekty/ })
    .check();
  await page
    .getByRole("button", {
      name: "Potwierdzam usunięcie folderu i projektów",
      exact: true,
    })
    .click();
  await expect(folderButton(page, "Folder do usunięcia")).toHaveCount(0);
  await page.waitForTimeout(600);
  expect((await rows(page)).find((r) => r.id === deletedId)).toBeUndefined();
});

test("import pliku i wklejonego JSON: konflikty ID, błędny import bez utraty danych i eksport/import całego folderu", async ({
  page,
}) => {
  watchErrors(page);
  await page.goto("./");
  await saved(page);
  await library(page);
  await folder(page, "Importowane");
  await page
    .getByRole("button", { name: "Importuj JSON", exact: true })
    .click();
  await page
    .getByLabel("Plik JSON")
    .setInputFiles("examples/import/minimal-project.json");
  await expect(page.getByLabel("Treść JSON")).toHaveValue(minimalText);
  await page
    .getByRole("button", { name: "Sprawdź import", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Importuj jako nowe", exact: true })
    .click();
  await expect(page.locator(".import-summary")).toHaveCount(0);
  await importText(page, minimalText);
  await expect(card(page, minimal.name)).toHaveCount(2);
  const originals = (await rows(page)).filter((r) => r.name === minimal.name);
  expect(new Set(originals.map((r) => r.id)).size).toBe(2);
  expect(originals.every((r) => r.id !== minimal.circuit.projectId)).toBe(true);
  await page
    .getByRole("button", { name: "Importuj JSON", exact: true })
    .click();
  const invalid = structuredClone(minimal);
  invalid.circuit.devices[0].productId = "UNKNOWN";
  await page.getByLabel("Treść JSON").fill(JSON.stringify(invalid));
  await page
    .getByRole("button", { name: "Sprawdź import", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("UNKNOWN");
  expect((await rows(page)).filter((r) => r.name === minimal.name)).toEqual(
    originals,
  );
  const invalidPack = {
    format: "ele-folder",
    version: 1,
    folder: { name: "Niekompletny import" },
    projects: [{ document: minimal }, { document: invalid }],
  };
  await page.getByLabel("Treść JSON").fill(JSON.stringify(invalidPack));
  await page
    .getByRole("button", { name: "Sprawdź import", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Projekt 2");
  await expect(
    page.getByRole("button", { name: "Importuj jako nowe", exact: true }),
  ).toHaveCount(0);
  expect((await rows(page)).filter((r) => r.name === minimal.name)).toEqual(
    originals,
  );
  await expect(folderButton(page, "Niekompletny import")).toHaveCount(0);
  await page.getByRole("button", { name: "Anuluj", exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Eksportuj folder", exact: true }).click(),
  ]);
  const json = await readFile((await download.path())!, "utf8");
  const pack = JSON.parse(json);
  expect(pack.format).toBe("ele-folder");
  expect(pack.projects).toHaveLength(2);
  await importText(page, json);
  await expect(folderButton(page, "Importowane")).toHaveCount(2);
  const all = (await rows(page)).filter((r) => r.name === minimal.name);
  expect(all).toHaveLength(4);
  expect(new Set(all.map((r) => r.id)).size).toBe(4);
  await card(page, minimal.name).first().locator(".saved-project").click();
  await page
    .getByRole("button", { name: "Otwórz w edytorze", exact: true })
    .click();
  await saved(page);
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await expect(
    page.getByTestId("board-physical").locator('[data-device="H1"]'),
  ).toHaveAttribute("data-powered", "true");
});

test("produkcyjna migracja IndexedDB v4: dokument, pomiary i zdarzenia trafiają bez zmian do Bez folderu", async ({
  page,
}) => {
  watchErrors(page);
  const legacy = {
    id: minimal.circuit.projectId,
    name: minimal.name,
    updatedAt: "2026-10-01T10:00:00.000Z",
    document: minimal,
    measurements: [],
    events: [
      {
        id: "legacy-event",
        timeMs: 0,
        type: "info",
        message: "Historia przed migracją",
      },
    ],
  };
  await page.addInitScript((legacy) => {
    if (sessionStorage.getItem("legacy-created")) return;
    sessionStorage.setItem("legacy-created", "true");
    const req = indexedDB.open("pracownia-elektryczna", 40);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore("projects", { keyPath: "id" });
      db.createObjectStore("research", { keyPath: "id" });
      db.createObjectStore("snapshots", { keyPath: "id" });
      db.createObjectStore("settings", { keyPath: "id" });
      const s = req.transaction!.objectStore("projects");
      for (const key of ["name", "updatedAt"]) s.createIndex(key, key);
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(["projects", "settings"], "readwrite");
      tx.objectStore("projects").put(legacy);
      tx.objectStore("settings").put({
        id: "last-project",
        projectId: legacy.id,
      });
      tx.oncomplete = () => db.close();
    };
  }, legacy);
  await page.goto("./");
  await saved(page);
  await expect(page.locator(".project-title")).toContainText(minimal.name);
  const migrated = (await rows(page)).find((r) => r.id === legacy.id)!;
  expect(migrated.folderId).toBeNull();
  expect(migrated.document).toEqual(minimal);
  expect(migrated.events).toContainEqual({
    ...legacy.events[0],
    id: "archived-legacy-event",
  });
  await library(page);
  await folderButton(page, "Bez folderu").click();
  await expect(card(page, minimal.name)).toBeVisible();
  await page.getByRole("button", { name: "Zamknij", exact: true }).click();
  await page.reload();
  await saved(page);
  expect((await rows(page)).find((r) => r.id === legacy.id)!.document).toEqual(
    minimal,
  );
});

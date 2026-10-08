import { importLegacy } from "./legacy-project";
import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { SavedProject } from "../../apps/web/src/persistence";

// Native IndexedDB works in production too; no Vite/store imports or test hooks.
async function savedProject(
  page: Page,
  corrupt = false,
): Promise<SavedProject> {
  return page.evaluate(async (corrupt) => {
    const open = indexedDB.open("pracownia-elektryczna");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    try {
      const tx = db.transaction(
        ["settings", "projects"],
        corrupt ? "readwrite" : "readonly",
      );
      const done = new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      const pointer = tx.objectStore("settings").get("last-project");
      const row = await new Promise<SavedProject>((resolve, reject) => {
        pointer.onsuccess = () => {
          const request = tx
            .objectStore("projects")
            .get(pointer.result.projectId);
          request.onsuccess = () => {
            const value = request.result as SavedProject;
            if (corrupt) {
              value.document.name = "N".repeat(121);
              value.name = value.document.name;
              tx.objectStore("projects").put(value);
            }
            resolve(value);
          };
          request.onerror = () => reject(request.error);
        };
        pointer.onerror = () => reject(pointer.error);
      });
      await done;
      return row;
    } finally {
      db.close();
    }
  }, corrupt);
}
test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.goto("./");
  await expect(
    page.getByText("Zapisano lokalnie", { exact: true }),
  ).toBeVisible();
  await importLegacy(page, "lamp");
});
test("formularz odrzuca nazwę 121 znaków; poprawna nazwa i długość przewodu przetrwają autosave i odświeżenie", async ({
  page,
}) => {
  const original = await savedProject(page);
  await page.locator(".project-title").click();
  const dialog = page.getByRole("dialog"),
    name = dialog.getByLabel("Nazwa projektu");
  await name.fill("N".repeat(121));
  await name.blur();
  await expect(name).toHaveValue(original.document.name);
  await expect(dialog.getByRole("status")).toContainText("120");
  expect((await savedProject(page)).document).toEqual(original.document);
  await name.fill("Projekt po walidacji");
  await name.blur();
  await dialog.getByRole("button", { name: "Zamknij", exact: true }).click();
  await page.getByRole("button", { name: "Pokaż lub ukryj inspektor" }).click();
  await page
    .getByLabel("Wybierz przewód instalacji")
    .selectOption({ index: 1 });
  const length = page.getByLabel("Długość elektryczna przewodu");
  await length.fill("10001");
  await length.blur();
  await expect(length).toHaveValue(
    String(original.document.circuit.conductors[0].electricalLengthM),
  );
  await expect(page.locator(".workbench-notice").first()).toContainText(
    "10000",
  );
  await length.fill("3.25");
  await length.blur();
  await page.getByLabel("Opis przewodu").fill("Przewód testowy");
  await page.getByLabel("Opis przewodu").blur();
  await expect(
    page.getByText("Zapisano lokalnie", { exact: true }),
  ).toBeVisible();
  const saved = await savedProject(page);
  expect(saved.document.name).toBe("Projekt po walidacji");
  expect(saved.document.circuit.conductors[0].electricalLengthM).toBe(3.25);
  expect(saved.document.circuit.conductors[0].marking).toBe("Przewód testowy");
  await page.reload();
  await expect(page.locator(".project-title")).toContainText(
    "Projekt po walidacji",
  );
  await expect(
    page.getByText("Zapisano lokalnie", { exact: true }),
  ).toBeVisible();
  expect((await savedProject(page)).document).toEqual(saved.document);
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await expect(
    page.getByTestId("board-physical").locator('[data-device="H1"]'),
  ).toHaveAttribute("data-powered", "true");
});
for (const training of [false, true])
  test(`błąd odczytu zachowuje oryginał i udostępnia kopię ${training ? "bez ukrytych odpowiedzi" : "do odzyskania"}`, async ({
    page,
  }) => {
    if (training) await importLegacy(page, "diagnosis", true);
    const broken = await savedProject(page, true);
    await page.reload();
    const recovery = page.locator(".recovery-notice");
    await expect(recovery).toContainText("Oryginalne dane zachowano");
    await expect(recovery).toContainText("120");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      recovery
        .getByRole("button", { name: "Pobierz kopię do odzyskania" })
        .click(),
    ]);
    const copy = JSON.parse(await readFile((await download.path())!, "utf8"));
    expect(copy.name).toBe(broken.document.name);
    if (training) {
      expect(copy.faults).toEqual([]);
      expect(copy.training).toBeUndefined();
      expect(copy.scenarioId).toBeUndefined();
    } else expect(copy).toEqual(broken.document);
    expect(await savedProject(page)).toEqual(broken);
    // Opening the same failed record through the project list also offers recovery.
    await page.locator(".project-title").click();
    await page
      .getByRole("dialog")
      .locator(".saved-project")
      .filter({ hasText: broken.name })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      recovery.getByRole("button", { name: "Pobierz kopię do odzyskania" }),
    ).toBeVisible();
    expect(await savedProject(page)).toEqual(broken);
  });

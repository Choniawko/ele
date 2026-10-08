import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { ProjectDocument } from "../../packages/circuit-model/index";
const fixtures: Record<string, ProjectDocument> = JSON.parse(
  readFileSync("tests/fixtures/legacy-projects.json", "utf8"),
);

// Exercise real import/backward compatibility; no hidden app hooks or retired UI cards.
export async function importLegacy(
  page: Page,
  id: string,
  training = false,
  variant = "reference",
  diagnosticCase = 0,
) {
  const document = fixtures[`${id}:${training}:${variant}:${diagnosticCase}`];
  if (!document) throw new Error(`Missing compatibility fixture: ${id}`);
  await expect(page.locator(".save-state")).toHaveText("Zapisano lokalnie");
  await page.locator(".project-title").click();
  await page
    .getByRole("button", { name: "Importuj JSON", exact: true })
    .click();
  await page.getByLabel("Treść JSON").fill(JSON.stringify(document));
  await page
    .getByRole("button", { name: "Sprawdź import", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Importuj jako nowe", exact: true })
    .click();
  await page
    .locator(".project-card")
    .filter({
      has: page.locator(".saved-project strong", { hasText: document.name }),
    })
    .first()
    .locator(".saved-project")
    .click();
  await page
    .getByRole("button", { name: "Otwórz w edytorze", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".save-state")).toHaveText("Zapisano lokalnie");
}
export async function importLegacyTitle(
  page: Page,
  title: string,
  training = false,
) {
  const entry = Object.entries(fixtures).find(
    ([key, p]) => p.name === title && key.split(":")[1] === String(training),
  );
  if (!entry) throw new Error(`Missing compatibility fixture: ${title}`);
  await importLegacy(page, entry[0].split(":")[0], training);
}

import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { SavedProject } from "../../apps/web/src/persistence";
import { wireGeometry } from "./wire-geometry";
const fixture = JSON.parse(
  readFileSync("examples/physical/ELE02_101_stanowisko.json", "utf8"),
);
const availability = JSON.parse(
  readFileSync("packages/knowledge/exam-data/availability.json", "utf8"),
);
const ready = availability[0].status === "model-tested";
const readyCount = availability.filter(
  (r: { status: string }) => r.status === "model-tested",
).length;
const saved = (page: Page) =>
  expect(page.locator(".save-state")).toHaveText("Zapisano lokalnie");
async function documents(page: Page): Promise<SavedProject[]> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("pracownia-elektryczna");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
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
async function openModel(page: Page) {
  await page.goto("./#/wiedza/uklady/ele02-101");
  await expect(
    page.getByRole("heading", { level: 1, name: /ELE.02-101/ }),
  ).toBeVisible();
  await saved(page);
  if (ready) {
    await page
      .getByRole("button", {
        name: "Otwórz gotowy układ jako nową kopię",
        exact: true,
      })
      .click();
  } else {
    // During draft QA use the existing import flow, with explicit sidecar identity.
    // No launch button is exposed until production evidence has been collected.
    const p = structuredClone(fixture);
    p.userMetadata.examReference = "ele02-101";
    p.userMetadata.examReferenceRevision = "1";
    await page
      .getByRole("button", { name: "Wróć do mojego układu", exact: true })
      .click();
    await page.locator(".project-title").click();
    await page
      .getByRole("button", { name: "Importuj JSON", exact: true })
      .click();
    await page.getByLabel("Treść JSON").fill(JSON.stringify(p));
    await page
      .getByRole("button", { name: "Sprawdź import", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Importuj jako nowe", exact: true })
      .click();
    const card = page
      .locator(".project-card")
      .filter({
        has: page.locator(".saved-project strong", { hasText: fixture.name }),
      })
      .first();
    await card.locator(".saved-project").click();
    await page
      .getByRole("button", { name: "Otwórz w edytorze", exact: true })
      .click();
  }
  await expect(page.locator(".knowledge-page")).toHaveCount(0);
  await expect(page.locator(".project-title")).toContainText("ELE.02-101");
  await expect
    .poll(
      async () =>
        (await documents(page)).filter(
          (r) => r.document.userMetadata.examReference === "ele02-101",
        ).length,
    )
    .toBe(1);
  await saved(page);
}
test.beforeEach(async ({ page }) => {
  page.on("pageerror", (e) => {
    throw e;
  });
});
test("01a: source card, isolated solver lesson, real wire ends, profiles and unknown-reference failure", async ({
  page,
}) => {
  await page.goto("./#/wiedza/zadania/ele02-101");
  await page
    .getByRole("link", {
      name: ready
        ? "Gotowy układ i lekcja torów"
        : "Obejrzyj opracowanie modelu",
    })
    .click();
  await saved(page);
  const before = await documents(page);
  await page
    .getByRole("button", { name: "Załącz energię lekcji", exact: true })
    .click();
  await expect(page.getByText(/OP1: świeci · OP2: świeci/)).toBeVisible();
  await page
    .getByRole("button", { name: "Przełącz Q1 w lekcji", exact: true })
    .click();
  await expect(
    page.getByText(/OP1: zgaszona · OP2: zgaszona.*H2: świeci/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "TEST RCD w lekcji", exact: true })
    .click();
  await expect(page.getByText(/RCD: wyzwolony/)).toBeVisible();
  await page.getByRole("button", { name: "Reset lekcji", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Załącz energię lekcji", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".reference-connections").first().locator("tbody tr"),
  ).toHaveCount(33);
  await page.getByRole("button", { name: "Śledź W21", exact: true }).click();
  const row = page.locator(".reference-connections tr[aria-selected=true]");
  await expect(row).toContainText("P1.T1:2");
  await expect(row).toContainText("P2.T1:1");
  await expect(page.locator(".physical path[stroke='#b05a10']")).toHaveCount(1);
  await expect(page.locator(".reference-lesson > details")).toHaveCount(12);
  expect(await documents(page)).toEqual(before);
  await page.goto("./#/wiedza/uklady/nie-istnieje");
  await expect(
    page.getByRole("heading", { name: "Nie znaleziono materiału" }),
  ).toBeVisible();
  await expect(page.locator(".reference-lesson")).toHaveCount(0);
});
test("01a: OFF copy/import, context table routes in both views, camera/focus/started wire and reload", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await openModel(page);
  await expect(
    page.getByRole("button", { name: "Włącz zasilanie", exact: true }),
  ).toBeVisible();
  const imported = await documents(page);
  await page
    .getByRole("button", { name: "Pokaż lub ukryj katalog", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pokaż lub ukryj inspektor", exact: true })
    .click();
  await page.getByRole("button", { name: "Dzielony", exact: true }).click();
  await page
    .getByRole("button", { name: "Widok połączeń", exact: true })
    .click();
  const physical = page.getByTestId("board-physical"),
    schematic = page.getByTestId("board-schematic");
  await physical
    .getByRole("button", { name: "Dopasuj widok", exact: true })
    .click();
  await schematic
    .getByRole("button", { name: "Dopasuj widok", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await documents(page)).find(
          (r) => r.document.userMetadata.examReference === "ele02-101",
        )!.document.physical.presentation,
    )
    .toBe("connections");
  const before = await documents(page);
  expect(before.map((r) => r.document.circuit)).toEqual(
    imported.map((r) => r.document.circuit),
  );
  await page.getByLabel("Wybierz przewód instalacji").selectOption("W21");
  const cameras = async () =>
    Promise.all(
      [physical, schematic].map((b) =>
        b.locator(".joint-cells-layer").evaluate((el) => {
          const m = (el as SVGGElement).getScreenCTM()!;
          return [m.a, m.b, m.c, m.d, m.e, m.f];
        }),
      ),
    );
  const camera = await cameras();
  await page
    .getByRole("button", { name: "Wyjaśnij żyłę W21", exact: true })
    .click();
  const panel = page.getByRole("complementary", {
    name: "Pomoc w układzie ELE.02-101",
  });
  await expect(panel.getByRole("heading", { name: "Żyła W21" })).toBeFocused();
  await panel.getByRole("button", { name: "Wskaż końce i trasę W21" }).click();
  await expect(physical.locator('[data-wire="W21"]')).toBeVisible();
  await expect(schematic.locator('[data-wire="W21"]')).toBeVisible();
  await page.screenshot({ path: info.outputPath("101-wire-context.png") });
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Wyjaśnij żyłę W21", exact: true }),
  ).toBeFocused();
  expect(await cameras()).toEqual(camera);
  expect(
    (await documents(page)).map(
      ({ updatedAt: _updatedAt, ...record }) => record,
    ),
  ).toEqual(before.map(({ updatedAt: _updatedAt, ...record }) => record));
  // Start a real conductor gesture in the schematic; help uses a separate button.
  const terminal = schematic.locator('[data-terminal="Q1:1"]');
  if (!(await terminal.isVisible()))
    await schematic
      .getByRole("button", { name: "Zaciski", exact: true })
      .click();
  await terminal.click();
  await expect(schematic.locator(".board-instruction")).toContainText(
    "Wybierz drugi zacisk",
  );
  await page
    .getByRole("button", { name: "Wyjaśnij zacisk Q1:1", exact: true })
    .click();
  await expect(panel.getByRole("heading", { name: "Q1:1" })).toBeVisible();
  await panel.getByRole("button", { name: "Śledź: Korespondencja 1" }).click();
  await expect(physical.locator('[data-wire="W21"]')).toBeVisible();
  await panel.getByRole("button", { name: "Pełny artykuł aparatu" }).click();
  await expect(page.locator(".knowledge-page")).toBeVisible();
  await page
    .getByRole("button", { name: "Wróć do mojego układu", exact: true })
    .click();
  await expect(page.locator(".knowledge-page")).toHaveCount(0);
  await expect(schematic.locator(".board-instruction")).toContainText(
    "Wybierz drugi zacisk",
  );
  // Escape explicitly cancels the retained started wire; no new conductor was added.
  await page.keyboard.press("Escape");
  expect(await cameras()).toEqual(camera);
  expect(
    (await documents(page)).map(
      ({ updatedAt: _updatedAt, ...record }) => record,
    ),
  ).toEqual(before.map(({ updatedAt: _updatedAt, ...record }) => record));
  const geometry = await wireGeometry(
    page,
    before.find((r) => r.document.userMetadata.examReference === "ele02-101")!
      .document,
  );
  expect(geometry.checked).toBe(33);
  expect(geometry.detached).toEqual([]);
  expect(geometry.intrusions).toEqual([]);
  await page.reload();
  await saved(page);
  await expect(page.locator(".project-title")).toContainText("ELE.02-101");
  const after = await documents(page);
  expect(after.map((r) => r.id)).toEqual(before.map((r) => r.id));
  expect(after.map((r) => r.document.circuit)).toEqual(
    before.map((r) => r.document.circuit),
  );
});
test("01a: responsive source/model distinction, native scrolling and gallery at four required viewports", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [390, 844],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("./#/wiedza/uklady/ele02-101");
    await expect(
      page.getByRole("heading", {
        name: "Schemat z projektu — fragmenty jednego obwodu",
      }),
    ).toBeVisible();
    await page
      .getByRole("heading", {
        name: "Schemat z projektu — fragmenty jednego obwodu",
      })
      .scrollIntoViewIfNeeded();
    const overflow = await page
      .locator(".knowledge-page")
      .evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(overflow.scroll).toBeLessThanOrEqual(overflow.client + 1);
    await page.getByLabel("Powiększenie rysunków modelu").selectOption("2");
    expect(
      await page
        .locator(".reference-lesson .reference-scroll")
        .first()
        .evaluate((el) => el.scrollWidth > el.clientWidth),
    ).toBe(true);
    await page.getByLabel("Powiększenie rysunków modelu").selectOption("1");
    await page.screenshot({
      path: info.outputPath(`101-lesson-${width}x${height}.png`),
    });
    if (width === 1366) {
      await page
        .locator(".reference-lesson .knowledge-diagram")
        .nth(1)
        .screenshot({ path: info.outputPath("101-lighting-diagram.png") });
      await page
        .locator(".reference-lesson .knowledge-diagram.physical")
        .screenshot({ path: info.outputPath("101-physical-diagram.png") });
    }
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await openModel(page);
  await page
    .getByRole("button", { name: "Pokaż lub ukryj inspektor", exact: true })
    .click();
  await page.getByLabel("Wybierz przewód instalacji").selectOption("W21");
  await page
    .getByRole("button", { name: "Wyjaśnij żyłę W21", exact: true })
    .click();
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [390, 844],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    const panel = page.getByRole("complementary", {
      name: "Pomoc w układzie ELE.02-101",
    });
    await expect(
      panel.getByRole("button", { name: "Schowaj pomoc", exact: true }),
    ).toBeVisible();
    expect(
      await panel.evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: info.outputPath(`101-help-${width}x${height}.png`),
    });
  }
  await page.keyboard.press("Escape");
  await page.goto("./#/wiedza/uklady");
  await expect(
    page.locator('[aria-label="Gotowe wzorce"] .knowledge-card'),
  ).toHaveCount(readyCount);
  await expect(
    page.getByText(new RegExp(`${readyCount}/17 gotowych układów`)),
  ).toBeVisible();
});
test("01a: two gallery launches preserve earlier projects and canonical template", async ({
  page,
}) => {
  test.skip(
    !ready,
    "Draft deliberately exposes no launch control; production acceptance precedes promotion.",
  );
  await page.goto("./");
  await saved(page);
  const initial = await documents(page);
  await openModel(page);
  const first = await documents(page);
  expect(first.length).toBe(initial.length + 1);
  await page.goto("./#/wiedza/uklady/ele02-101");
  await page
    .getByRole("button", { name: "Kopia z żyłą W21", exact: true })
    .click();
  await expect
    .poll(async () => (await documents(page)).length)
    .toBe(first.length + 1);
  await saved(page);
  const second = await documents(page);
  for (const record of first)
    expect(second.find((r) => r.id === record.id)?.document).toEqual(
      record.document,
    );
  const copies = second.filter(
    (r) => r.document.userMetadata.examReference === "ele02-101",
  );
  expect(copies).toHaveLength(2);
  expect(new Set(copies.map((r) => r.id)).size).toBe(2);
  for (const copy of copies) {
    expect(copy.document.circuit.devices).toEqual(fixture.circuit.devices);
    expect(copy.document.circuit.conductors).toEqual(
      fixture.circuit.conductors,
    );
    expect(copy.id).not.toBe(fixture.circuit.projectId);
  }
  await expect(
    page.getByRole("button", { name: "Włącz zasilanie", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pokaż lub ukryj inspektor", exact: true })
    .click();
  await expect(page.getByLabel("Wybierz przewód instalacji")).toHaveValue(
    "W21",
  );
});

test("01a: context/source reading suspends the clock and editor shortcuts, then resumes the session", async ({
  page,
}) => {
  test.setTimeout(90000);
  await openModel(page);
  await page
    .getByRole("button", { name: "Pokaż lub ukryj inspektor", exact: true })
    .click();
  await page.getByLabel("Wybierz przewód instalacji").selectOption("W21");
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  const time = async () =>
    Number.parseFloat((await page.locator(".clock").textContent())!);
  await expect.poll(time).toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Wyjaśnij żyłę W21", exact: true })
    .click();
  const panel = page.getByRole("complementary", {
    name: "Pomoc w układzie ELE.02-101",
  });
  await expect(panel.getByRole("heading", { name: "Żyła W21" })).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Zasilanie ON", exact: true }),
  ).toBeEnabled();
  const stopped = await time();
  await page.keyboard.press("Delete");
  // Several 200 ms clock intervals must pass without advancing the session.
  await page.waitForTimeout(800);
  expect(await time()).toBe(stopped);
  await expect(
    page.getByLabel("Wybierz przewód instalacji").locator("option"),
  ).toHaveCount(34);
  await panel
    .getByRole("link", { name: "Lekcja i pełna tabela połączeń" })
    .click();
  await expect(page.locator(".knowledge-page")).toBeVisible();
  const stoppedInSource = await time();
  await page.keyboard.press("Delete");
  await page.keyboard.press(" ");
  await page.waitForTimeout(800);
  expect(await time()).toBe(stoppedInSource);
  await page
    .getByRole("button", { name: "Wróć do mojego układu", exact: true })
    .click();
  await expect.poll(time).toBeGreaterThan(stoppedInSource);
  await expect(
    page.getByLabel("Wybierz przewód instalacji").locator("option"),
  ).toHaveCount(34);
  await page.getByRole("button", { name: "Pauza", exact: true }).click();
});

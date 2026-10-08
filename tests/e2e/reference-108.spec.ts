import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { SavedProject } from "../../apps/web/src/persistence";
import { wireGeometry } from "./wire-geometry";
const fixture = JSON.parse(
  readFileSync("examples/physical/ELE02_108_stanowisko.json", "utf8"),
);
const availability = JSON.parse(
  readFileSync("packages/knowledge/exam-data/availability.json", "utf8"),
);
const ready =
  availability.find((r: { taskId: string }) => r.taskId === "ELE.02-108")
    .status === "model-tested";
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
  await page.goto("./#/wiedza/uklady/ele02-108");
  await expect(
    page.getByRole("heading", { level: 1, name: /ELE.02-108/ }),
  ).toBeVisible();
  await saved(page);
  if (ready)
    await page
      .getByRole("button", {
        name: "Otwórz gotowy układ jako nową kopię",
        exact: true,
      })
      .click();
  else {
    const p = structuredClone(fixture);
    p.userMetadata.examReference = "ele02-108";
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
  await expect
    .poll(
      async () =>
        (await documents(page)).filter(
          (r) => r.document.userMetadata.examReference === "ele02-108",
        ).length,
    )
    .toBe(1);
  await saved(page);
}
test.beforeEach(({ page }) => {
  page.on("pageerror", (e) => {
    throw e;
  });
});
test("01b: source, isolated solver, independent START/STOP, NC block and return of power", async ({
  page,
}) => {
  await page.goto("./#/wiedza/zadania");
  await page.getByLabel("Szukaj w materiałach źródłowych").fill("podtrzymanie");
  await page
    .locator(".exam-task-card")
    .filter({ hasText: "ELE.02-108" })
    .click();
  await page
    .getByRole("link", {
      name: ready
        ? "Gotowy układ i lekcja torów"
        : "Obejrzyj opracowanie modelu",
    })
    .click();
  await saved(page);
  const before = await documents(page);
  const control = (name: string) =>
    page.getByRole("button", { name, exact: true });
  const status = page.locator(".reference-lesson > p[role=status]").last();
  await control("Załącz energię lekcji").click();
  for (const start of ["S1", "S3"]) {
    await control(`${start} START — przytrzymaj`).focus();
    await page.keyboard.down("Space");
    await page.keyboard.up("Space");
    await expect(status).toContainText(
      "K1: załączony · K2: wyłączony · M: prawy",
    );
    await control("S2 LEWY — przytrzymaj").focus();
    await page.keyboard.down("Space");
    await expect(status).toContainText("K2: wyłączony");
    await page.keyboard.up("Space");
    await control(`${start === "S1" ? "S3" : "S1"} STOP — przytrzymaj`).focus();
    await page.keyboard.down("Space");
    await page.keyboard.up("Space");
    await expect(status).toContainText("M: stoi");
  }
  for (const left of ["S2", "S4"]) {
    await control(`${left} LEWY — przytrzymaj`).focus();
    await page.keyboard.down("Space");
    await expect(status).toContainText(
      "K1: wyłączony · K2: załączony · M: lewy",
    );
    await page.keyboard.up("Space");
    await expect(status).toContainText("M: stoi");
  }
  await control("S3 START — przytrzymaj").focus();
  await page.keyboard.press("Space");
  await control("Wyłącz energię lekcji").click();
  await control("Załącz energię lekcji").click();
  await expect(status).toContainText("M: stoi");
  await control("S2 LEWY — przytrzymaj").focus();
  await page.keyboard.down("Space");
  await control("Wyłącz energię lekcji").evaluate((el: HTMLButtonElement) =>
    el.click(),
  );
  await control("Załącz energię lekcji").evaluate((el: HTMLButtonElement) =>
    el.click(),
  );
  await expect(status).toContainText("M: lewy");
  await page.keyboard.up("Space");
  await control("Przełącz Q2 w lekcji").click();
  await expect(status).toContainText("Q2.AUX: otwarty");
  await expect(
    page.locator(".reference-connections").first().locator("tbody tr"),
  ).toHaveCount(37);
  await expect(
    page.locator(".reference-connections").nth(1).locator("tbody tr"),
  ).toHaveCount(15);
  await expect(page.locator(".reference-lesson > details")).toHaveCount(11);
  const hiddenBypasses = await page
    .locator(".reference-lesson")
    .evaluate((host) => {
      const hits: string[] = [];
      for (const svg of host.querySelectorAll<SVGSVGElement>(
        "svg.knowledge-diagram:not(.physical)",
      )) {
        const boxes = Array.from(
          svg.querySelectorAll<SVGGElement>(
            "[data-device-id][data-symbol-fragment]",
          ),
        ).map((el) => ({
          name: `${el.dataset.deviceId}/${el.dataset.symbolFragment}`,
          matrix: el.getScreenCTM()!.inverse(),
        }));
        for (const line of svg.querySelectorAll<SVGPathElement>(
          "[data-functional-net] > path:nth-child(2)",
        )) {
          for (
            let distance = 0;
            distance < line.getTotalLength();
            distance += 4
          ) {
            const point = line
              .getPointAtLength(distance)
              .matrixTransform(line.getScreenCTM()!);
            for (const box of boxes) {
              const local = point.matrixTransform(box.matrix);
              if (local.x > 25 && local.x < 95 && local.y > -15 && local.y < 15)
                hits.push(box.name);
            }
          }
        }
      }
      return [...new Set(hits)];
    });
  expect(hiddenBypasses).toEqual([]);
  await control("Śledź W35").click();
  await expect(
    page.locator(".reference-connections tr[aria-selected=true]"),
  ).toContainText("S3:4");
  expect(await documents(page)).toEqual(before);
  await page.goto("./#/wiedza/uklady/ele02-101");
  await expect(control("TEST RCD w lekcji")).toBeVisible();
  await expect(
    page.locator(".reference-connections").first().locator("tbody tr"),
  ).toHaveCount(33);
});
test("01b: OFF copy, expanded native ports, real 37 routes, common mechanism, help and persisted geometry", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await openModel(page);
  await expect(
    page.getByRole("button", { name: "Włącz zasilanie", exact: true }),
  ).toBeVisible();
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
  for (const board of [physical, schematic])
    await board
      .getByRole("button", { name: "Dopasuj widok", exact: true })
      .click();
  await expect(
    schematic.locator('[data-device="K1"][data-symbol-fragment]'),
  ).toHaveCount(6);
  await expect(schematic.locator('[data-terminal="K1:A1"]')).toHaveCount(1);
  await expect(schematic.locator('[data-terminal="K1:13"]')).toHaveCount(1);
  await page.getByLabel("Wybierz przewód instalacji").selectOption("W35");
  await page
    .getByRole("button", { name: "Wyjaśnij żyłę W35", exact: true })
    .click();
  const panel = page.getByRole("complementary", {
    name: "Pomoc w układzie ELE.02-108",
  });
  await expect(panel.getByRole("heading", { name: "Żyła W35" })).toBeFocused();
  await panel.getByRole("button", { name: "Wskaż końce i trasę W35" }).click();
  await expect(physical.locator('[data-wire="W35"]')).toBeVisible();
  await expect(schematic.locator('[data-wire="W35"]')).toBeVisible();
  await page.screenshot({ path: info.outputPath("108-wire-context.png") });
  await page.keyboard.press("Escape");
  const before = (await documents(page)).find(
    (r) => r.document.userMetadata.examReference === "ele02-108",
  )!;
  const geometry = await wireGeometry(page, before.document);
  expect(geometry).toEqual({ checked: 37, detached: [], intrusions: [] });
  const nativeEnds = await schematic.evaluate((host, document) => {
    const pins = new Map(
      Array.from(host.querySelectorAll<SVGGElement>("[data-terminal]")).map(
        (el) => {
          const c = el.querySelector<SVGCircleElement>("circle")!;
          return [
            el.getAttribute("data-terminal")!,
            new DOMPoint(
              c.cx.baseVal.value,
              c.cy.baseVal.value,
            ).matrixTransform(c.getScreenCTM()!),
          ];
        },
      ),
    );
    const bad: string[] = [];
    let checked = 0;
    for (const wire of document.circuit.conductors) {
      const path = host.querySelector<SVGPathElement>(
        `[data-wire="${wire.id}"] path`,
      )!;
      checked++;
      for (const [i, ref] of [wire.from, wire.to].entries()) {
        const designation = document.circuit.devices.find(
          (d) => d.id === ref.deviceId,
        )!.designation;
        const expected = pins.get(`${designation}:${ref.terminalId}`)!;
        const actual = path
          .getPointAtLength(i ? path.getTotalLength() : 0)
          .matrixTransform(path.getScreenCTM()!);
        if (Math.hypot(expected.x - actual.x, expected.y - actual.y) > 1.5)
          bad.push(`${wire.id}:${designation}`);
      }
    }
    return { checked, bad };
  }, before.document);
  expect(nativeEnds).toEqual({ checked: 37, bad: [] });
  await schematic
    .getByRole("button", { name: "Wyjaśnij symbol K1 A1–A2", exact: true })
    .click();
  await expect(panel).toContainText("K1");
  await expect(panel).toContainText("230 V");
  await page.keyboard.press("Escape");
  const cell = schematic.locator(
    '[data-device="K1"][data-symbol-fragment="coil"]',
  );
  const point = await cell
    .locator("text")
    .first()
    .evaluate((el) => {
      const b = el.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    });
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 50, point.y + 25, { steps: 8 });
  await page.mouse.up();
  await saved(page);
  await expect
    .poll(
      async () =>
        (await documents(page)).find((r) => r.id === before.id)!.document
          .schematic.symbolFragments,
    )
    .not.toEqual(before.document.schematic.symbolFragments);
  const moved = (await documents(page)).find((r) => r.id === before.id)!;
  expect(moved.document.circuit).toEqual(before.document.circuit);
  expect(moved.document.physical).toEqual(before.document.physical);
  await schematic.locator('[data-terminal="K1:A1"]').click();
  await expect(schematic.locator(".board-instruction")).toContainText(
    "Wybierz drugi zacisk",
  );
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
  await schematic
    .getByRole("button", { name: "Wyjaśnij symbol K1 A1–A2", exact: true })
    .click();
  await panel.getByRole("button", { name: "Pełny artykuł aparatu" }).click();
  await page
    .getByRole("button", { name: "Wróć do mojego układu", exact: true })
    .click();
  await expect(schematic.locator(".board-instruction")).toContainText(
    "Wybierz drugi zacisk",
  );
  expect(await cameras()).toEqual(camera);
  await page.keyboard.press("Escape");
  await page.reload();
  await saved(page);
  expect(
    (await documents(page)).find((r) => r.id === before.id)!.document.schematic,
  ).toEqual(moved.document.schematic);
  expect(
    (await documents(page)).find((r) => r.id === before.id)!.document.circuit,
  ).toEqual(before.document.circuit);
});
test("01b: source/model distinction, expanded drawing zoom and context at four viewport sizes", async ({
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
    await page.goto("./#/wiedza/uklady/ele02-108");
    const heading = page.getByRole("heading", {
      name: "Schemat z projektu — fragmenty jednego obwodu",
    });
    await heading.scrollIntoViewIfNeeded();
    expect(
      await page
        .locator(".knowledge-page")
        .evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(1);
    await page.getByLabel("Powiększenie rysunków modelu").selectOption("2");
    expect(
      await page
        .locator(".reference-scroll")
        .first()
        .evaluate((el) => el.scrollWidth > el.clientWidth),
    ).toBe(true);
    await page.getByLabel("Powiększenie rysunków modelu").selectOption("1");
    await page.screenshot({
      path: info.outputPath(`108-lesson-${width}x${height}.png`),
    });
    if (width === 1366) {
      // Give the native SVG enough viewport height to capture it without the
      // fixed scroll container clipping the lower branches. Required-size
      // screenshots above remain untouched.
      await page.setViewportSize({ width: 1366, height: 1600 });
      for (const [i, label] of ["power", "control"].entries())
        await page
          .locator(".reference-lesson .knowledge-diagram")
          .nth(i)
          .screenshot({ path: info.outputPath(`108-${label}-diagram.png`) });
      await page.setViewportSize({ width, height });
    }
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await openModel(page);
  await page
    .getByRole("button", { name: "Pokaż lub ukryj inspektor", exact: true })
    .click();
  await page.getByLabel("Wybierz przewód instalacji").selectOption("W35");
  await page
    .getByRole("button", { name: "Wyjaśnij żyłę W35", exact: true })
    .click();
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [390, 844],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    const panel = page.getByRole("complementary", {
      name: "Pomoc w układzie ELE.02-108",
    });
    await expect(
      panel.getByRole("button", { name: "Schowaj pomoc", exact: true }),
    ).toBeVisible();
    expect(
      await panel.evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: info.outputPath(`108-help-${width}x${height}.png`),
    });
  }
  await page.goto("./#/wiedza/uklady");
  await expect(
    page.locator('[aria-label="Gotowe wzorce"] .knowledge-card'),
  ).toHaveCount(readyCount);
});
test("01b: public launches preserve previous projects, source template and OFF energy", async ({
  page,
}) => {
  test.skip(
    !ready,
    "Public copies are gated until production evidence is collected.",
  );
  await page.goto("./");
  await saved(page);
  const initial = await documents(page);
  await openModel(page);
  const first = await documents(page);
  await page.goto("./#/wiedza/uklady/ele02-108");
  await page
    .getByRole("button", { name: "Kopia z żyłą W35", exact: true })
    .click();
  await expect
    .poll(async () => (await documents(page)).length)
    .toBe(initial.length + 2);
  await saved(page);
  const second = await documents(page);
  for (const old of first)
    expect(second.find((r) => r.id === old.id)?.document).toEqual(old.document);
  const copies = second.filter(
    (r) => r.document.userMetadata.examReference === "ele02-108",
  );
  expect(copies).toHaveLength(2);
  for (const copy of copies) {
    expect(copy.document.circuit.devices).toEqual(fixture.circuit.devices);
    expect(copy.document.circuit.conductors).toEqual(
      fixture.circuit.conductors,
    );
    expect(copy.document.schematic.symbolFragments).toEqual(
      fixture.schematic.symbolFragments,
    );
  }
  await expect(
    page.getByRole("button", { name: "Włącz zasilanie", exact: true }),
  ).toBeVisible();
});

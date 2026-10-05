import { test, expect, type Page } from "@playwright/test";
import type { ProjectDocument } from "../../packages/circuit-model/index";
import { wireGeometry } from "./wire-geometry";

async function state(
  page: Page,
): Promise<{ project: ProjectDocument; energized: boolean }> {
  return page.evaluate(async () => {
    // Import the module URL actually used by Vite, including its HMR timestamp.
    const path = performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .find((url) => new URL(url).pathname === "/apps/web/src/store.ts");
    if (!path) throw new Error("Brak załadowanego modułu edytora.");
    const { useApp } = await import(path);
    const s = useApp.getState();
    return { project: s.project, energized: s.runtime.energized };
  });
}
const board = (page: Page) => page.getByTestId("board-physical");
const body = (page: Page, designation: string) =>
  board(page).locator(`[data-device-body="${designation}"]`);
async function bodyPoint(page: Page, designation: string) {
  const box = (await body(page, designation).boundingBox())!;
  return { x: box.x + box.width * 0.08, y: box.y + box.height * 0.35 };
}
async function drag(page: Page, designation: string, dx: number, dy: number) {
  const point = await bodyPoint(page, designation);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + dx, point.y + dy, { steps: 12 });
  await page.mouse.up();
}
test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.goto("./");
  await expect(board(page).locator('[data-device="G1"]')).toBeVisible();
});

test("tablica zajmuje większość okna, skupienie chowa panele, telefon zachowuje czytelne powiększenie", async ({
  page,
}) => {
  let box = await board(page).boundingBox();
  expect(box!.width).toBeGreaterThan(1100);
  expect(box!.height).toBeGreaterThan(540);
  await page
    .getByRole("button", { name: "Skup się na tablicy", exact: true })
    .click();
  box = await board(page).boundingBox();
  expect(box!.width).toBe(1366);
  expect(box!.height).toBeGreaterThan(710);
  await expect(page.locator(".catalog-panel")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Skup się na tablicy", exact: true })
    .click();
  await page.getByRole("button", { name: "Pokaż lub ukryj katalog" }).click();
  await expect(page.locator(".catalog-panel")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Skup się na tablicy", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Zamknij katalog", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(board(page).locator('[data-device="G1"]')).toBeVisible();
  box = await board(page).boundingBox();
  expect(box!.width).toBe(390);
  expect(box!.height).toBeGreaterThan(650);
  await expect(page.locator(".zoom-label")).toContainText("65%");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.getByRole("button", { name: "Pokaż lub ukryj katalog" }).click();
  await expect(page.locator(".catalog-panel")).toBeVisible();
  expect((await board(page).boundingBox())!.width).toBe(390);
  await page
    .getByRole("button", { name: "Zamknij katalog", exact: true })
    .click();
  const oldSource = await board(page)
    .locator('[data-device="G1"]')
    .boundingBox();
  await board(page).hover({ position: { x: 340, y: 580 } });
  await page.mouse.down();
  await page.mouse.move(box!.x + 190, box!.y + 580, { steps: 8 });
  await page.mouse.up();
  expect(
    (await board(page).locator('[data-device="G1"]').boundingBox())!.x,
  ).toBeLessThan(oldSource!.x - 100);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.reload();
  await expect(page.locator(".zoom-label")).toContainText("50%");
  await expect(board(page).locator('[data-device="G1"]')).toBeVisible();
  await page
    .getByRole("button", { name: "Dopasuj widok", exact: true })
    .click();
  await expect(page.locator(".zoom-label")).toContainText("21%");
});

test("RCD można przenieść na trzecią szynę i przeciągać podczas pracy; zajęte miejsce odrzuca gest", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Przykłady", exact: true }).click();
  await page.getByRole("button", { name: /Mała rozdzielnica/ }).click();
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await expect(board(page).locator('[data-device="H1"]')).toHaveAttribute(
    "data-powered",
    "true",
  );
  const before = await state(page),
    rcd = before.project.circuit.devices.find((d) => d.designation === "FI1")!;
  await page
    .getByRole("button", { name: "Dodaj szynę DIN", exact: true })
    .click();
  await expect(board(page).locator("[data-rail]")).toHaveCount(3);
  const rcdPoint = await bodyPoint(page, "FI1");
  await page.mouse.click(rcdPoint.x, rcdPoint.y);
  await page
    .getByLabel("Przenieś zaznaczone na szynę")
    .selectOption({ label: "Szyna 3" });
  await expect
    .poll(async () => (await state(page)).project.physical.devices[rcd.id].y)
    .toBe(680);
  const zoom =
    Number((await page.locator(".zoom-label").innerText()).replace("%", "")) /
    100;
  // Second row is empty at x < 450, so it can receive the RCD.
  await drag(page, "FI1", -180 * zoom, -295 * zoom);
  await expect
    .poll(async () => (await state(page)).project.physical.devices[rcd.id].y)
    .toBe(385);
  const moved = await state(page);
  expect(moved.project.circuit).toEqual(before.project.circuit);
  expect(moved.energized).toBe(true);
  await expect(
    board(page).locator('[data-device="H1"] [data-load-state]'),
  ).toContainText("ŚWIECI");
  // Dropping on the first row's occupied RCD footprint must restore the old position.
  const pos = moved.project.physical.devices[rcd.id];
  const source =
    before.project.physical.devices[
      before.project.circuit.devices.find((d) => d.designation === "G1")!.id
    ];
  await drag(page, "FI1", (source.x - pos.x) * zoom, (90 - pos.y) * zoom);
  expect((await state(page)).project.physical.devices[rcd.id]).toEqual(pos);
  await expect(page.locator(".workbench-notice")).toContainText("zajęte");
  await page.getByRole("button", { name: "Cofnij", exact: true }).click();
  expect((await state(page)).project.physical.devices[rcd.id].y).toBe(680);
  await page.getByRole("button", { name: "Ponów", exact: true }).click();
  await expect(
    page.getByText("Zapisano lokalnie", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(board(page).locator("[data-rail]")).toHaveCount(3);
  const restored = await state(page);
  expect(restored.project.physical.devices[rcd.id]).toEqual(pos);
  expect(restored.energized).toBe(false);
});

test("trasa przewodu ma edytowalne punkty i zachowuje zaciski, rewizję oraz działanie lampy", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await expect(board(page).locator('[data-device="H1"]')).toHaveAttribute(
    "data-powered",
    "true",
  );
  await page.getByRole("button", { name: "Pokaż lub ukryj inspektor" }).click();
  const before = await state(page),
    wire = before.project.circuit.conductors[0];
  await page.getByLabel("Wybierz przewód instalacji").selectOption(wire.id);
  await page
    .getByRole("button", { name: "Zamknij właściwości", exact: true })
    .click();
  await page.getByRole("button", { name: "Edytuj trasę", exact: true }).click();
  await expect(page.locator(".wire-endpoints")).toContainText("G1:L");
  await expect(page.locator(".wire-endpoints")).toContainText("QF1:1");
  await board(page).click({ position: { x: 860, y: 340 } });
  const point = page.locator('[data-route-point="0"]');
  await expect(point).toBeVisible();
  const original = (await state(page)).project.physical.routes[wire.id][0];
  const box = await point.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width / 2 + 70,
    box!.y + box!.height / 2 - 35,
    { steps: 8 },
  );
  await page.mouse.up();
  expect((await state(page)).project.physical.routes[wire.id][0]).not.toEqual(
    original,
  );
  const edited = await state(page);
  expect(edited.project.circuit).toEqual(before.project.circuit);
  expect(edited.energized).toBe(true);
  await expect(board(page).locator('[data-device="H1"]')).toHaveAttribute(
    "data-powered",
    "true",
  );
  await page
    .getByRole("button", { name: "Automatyczna trasa przewodu", exact: true })
    .click();
  await expect(point).toHaveCount(0);
  expect((await state(page)).project.physical.routes[wire.id]).toEqual([]);
});

test("automatyczne przewody omijają obudowy i pozostają przy zaciskach po przesunięciu silnika", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Przykłady", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Trzy fazy i termik/ })
    .click();
  await expect(board(page).locator('[data-device="M1"]')).toBeVisible();
  const before = await state(page),
    motor = before.project.circuit.devices.find((d) => d.designation === "M1")!;
  await expect(board(page).locator("[data-wire]")).toHaveCount(
    before.project.circuit.conductors.length,
  );
  expect(await wireGeometry(page, before.project)).toEqual({
    checked: before.project.circuit.conductors.length,
    intrusions: [],
    detached: [],
  });
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Przytrzymaj S1", exact: true })
    .focus();
  await page.keyboard.press("Space");
  await expect(board(page).locator('[data-device="M1"]')).toHaveAttribute(
    "data-powered",
    "true",
  );
  const zoom =
    Number((await page.locator(".zoom-label").innerText()).replace("%", "")) /
    100;
  await drag(page, "M1", 160 * zoom, 0);
  const moved = await state(page);
  expect(moved.project.physical.devices[motor.id].x).toBeGreaterThan(
    before.project.physical.devices[motor.id].x + 100,
  );
  expect(moved.project.circuit).toEqual(before.project.circuit);
  expect(moved.energized).toBe(true);
  await expect
    .poll(() => wireGeometry(page, moved.project))
    .toEqual({
      checked: before.project.circuit.conductors.length,
      intrusions: [],
      detached: [],
    });
  await expect(board(page).locator('[data-device="M1"]')).toHaveAttribute(
    "data-powered",
    "true",
  );
});

test.describe("obsługa dotykowa", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  test("dotyk przenosi aparat na inną szynę, a przeciągnięcie tła przesuwa widok", async ({
    page,
  }) => {
    const before = await state(page),
      q = before.project.circuit.devices.find((d) => d.designation === "QF1")!;
    const session = await page.context().newCDPSession(page);
    const touch = async (
      from: { x: number; y: number },
      to: { x: number; y: number },
    ) => {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ ...from, id: 1 }],
      });
      for (let i = 1; i <= 12; i++)
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            {
              x: from.x + ((to.x - from.x) * i) / 12,
              y: from.y + ((to.y - from.y) * i) / 12,
              id: 1,
            },
          ],
        });
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    };
    const start = await bodyPoint(page, "QF1");
    await touch(start, { x: start.x + 50 * 0.65, y: start.y + 295 * 0.65 });
    await expect
      .poll(async () => (await state(page)).project.physical.devices[q.id].y)
      .toBe(385);
    expect((await state(page)).project.circuit).toEqual(before.project.circuit);
    const oldSource = await board(page)
        .locator('[data-device="G1"]')
        .boundingBox(),
      area = await board(page).boundingBox();
    await touch({ x: 345, y: area!.y + 570 }, { x: 200, y: area!.y + 570 });
    expect(
      (await board(page).locator('[data-device="G1"]').boundingBox())!.x,
    ).toBeLessThan(oldSource!.x - 100);
  });
});

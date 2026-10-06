import { test, expect, type Page } from "@playwright/test";

async function editor(page: Page, action?: string) {
  return page.evaluate(async (action) => {
    const url = performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .find((url) => new URL(url).pathname === "/apps/web/src/store.ts")!;
    const { useApp } = await import(/* @vite-ignore */ url);
    const s = useApp.getState();
    if (action === "removeWire") {
      const w = s.project.circuit.conductors.find(
        (w: { declaredRole: string }) => w.declaredRole === "L1",
      )!;
      s.select(w.id);
      s.deleteSelection();
      return { from: w.from, to: w.to };
    }
    if (action === "point") s.addWaypoint({ x: 200, y: 460 });
    if (action === "staleStart")
      useApp.setState({
        wireStart: { deviceId: "removed-device", terminalId: "1" },
        waypoints: [{ x: 100, y: 100 }],
      });
    if (action === "staleClick")
      s.terminalClick({ deviceId: "removed-device", terminalId: "1" });
    if (action === "invalidTerminal")
      s.terminalClick({
        deviceId: s.project.circuit.devices[0].id,
        terminalId: "missing-terminal",
      });
    if (action === "undo") s.undo();
    if (action === "redo") s.redo();
    const next = useApp.getState();
    return {
      project: next.project,
      wireStart: next.wireStart,
      waypoints: next.waypoints,
      notice: next.notice,
    };
  }, action);
}
const terminal = (page: Page, name: string) =>
  page.getByTestId("board-physical").locator(`[data-terminal="${name}"]`);
test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.goto("./");
  await expect(
    page.getByText("Zapisano lokalnie", { exact: true }),
  ).toBeVisible();
});

test("Ponów usunięcie aparatu podczas prowadzenia przewodu nie blokuje zacisków", async ({
  page,
}) => {
  await page
    .getByTestId("board-physical")
    .locator('[data-device-body="S1"]')
    .click({ position: { x: 3, y: 30 } });
  await page.keyboard.press("Delete");
  await expect(terminal(page, "S1:1")).toHaveCount(0);
  await page.getByRole("button", { name: "Cofnij", exact: true }).click();
  await terminal(page, "S1:1").click();
  await editor(page, "point");
  await page.keyboard.press("Control+Shift+z");
  await expect(terminal(page, "S1:1")).toHaveCount(0);
  await terminal(page, "QF1:2").click();
  const fresh = await editor(page);
  expect(fresh.wireStart.terminalId).toBe("2");
  expect(
    fresh.project.circuit.devices.find(
      (d: { id: string }) => d.id === fresh.wireStart.deviceId,
    ).designation,
  ).toBe("QF1");
  expect(fresh.waypoints).toEqual([]);
  await terminal(page, "H1:L").click();
  expect((await editor(page)).wireStart).toBeNull();
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await expect(
    page.getByTestId("board-physical").locator('[data-device="H1"]'),
  ).toHaveAttribute("data-powered", "true");
});

test("nieaktualny początek i spóźnione kliknięcia nie psują następnego połączenia", async ({
  page,
}) => {
  await editor(page, "removeWire");
  await editor(page, "staleStart");
  await terminal(page, "G1:L").click();
  const fresh = await editor(page);
  expect(fresh.wireStart.terminalId).toBe("L");
  expect(fresh.waypoints).toEqual([]);
  await editor(page, "staleClick");
  await editor(page, "invalidTerminal");
  expect((await editor(page)).wireStart).toEqual(fresh.wireStart);
  await terminal(page, "QF1:1").click();
  expect((await editor(page)).wireStart).toBeNull();
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await expect(
    page.getByTestId("board-physical").locator('[data-device="H1"]'),
  ).toHaveAttribute("data-powered", "true");
});

test("wielokrotne kasowanie, przepinanie, cofanie i zmiana trasy zostawiają działające zaciski", async ({
  page,
}) => {
  for (let i = 0; i < 12; i++) {
    const removed = await editor(page, "removeWire");
    const p = (await editor(page)).project;
    const name = (ref: { deviceId: string; terminalId: string }) =>
      `${p.circuit.devices.find((d: { id: string }) => d.id === ref.deviceId).designation}:${ref.terminalId}`;
    await terminal(page, name(removed.from)).click();
    if (i % 2 === 0) await editor(page, "point");
    await terminal(page, name(removed.to)).click();
    expect((await editor(page)).wireStart).toBeNull();
    await editor(page, "undo");
    await terminal(page, name(removed.from)).click();
    await editor(page, "point");
    await editor(page, "redo");
    const state = await editor(page);
    expect(state.wireStart).toBeNull();
    expect(state.waypoints).toEqual([]);
  }
  await terminal(page, "G1:L").click();
  expect((await editor(page)).wireStart.terminalId).toBe("L");
  await page.keyboard.press("Escape");
});

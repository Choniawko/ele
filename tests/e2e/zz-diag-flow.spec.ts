import { test, expect } from "@playwright/test";
import { importLegacy } from "./legacy-project";

test("diag: churn under power", async ({ page }) => {
  await page.goto("./");
  await importLegacy(page, "distribution");
  const board = page.getByTestId("board-physical");
  await expect(board.locator('[data-device="H1"]')).toBeVisible();
  const measure = () =>
    page.evaluate(async () => {
      const root = document.querySelector('[data-testid="board-physical"]')!;
      let added = 0, removed = 0, attrs = 0;
      const obs = new MutationObserver((list) => {
        for (const m of list) {
          if (m.type === "childList") { added += m.addedNodes.length; removed += m.removedNodes.length; }
          else attrs++;
        }
      });
      obs.observe(root, { subtree: true, childList: true, attributes: true });
      let frames = 0;
      const t0 = performance.now();
      await new Promise<void>((r) => {
        const f = () => { frames++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(); };
        requestAnimationFrame(f);
      });
      obs.disconnect();
      return { added, removed, attrs, fps: frames / 3, flow: document.querySelectorAll("[data-flow-wire]").length };
    });
  console.log("off", JSON.stringify(await measure()));
  await page.getByRole("button", { name: "Włącz zasilanie", exact: true }).click();
  await expect(board.locator('[data-device="H1"]')).toHaveAttribute("data-powered", "true");
  console.log("on", JSON.stringify(await measure()));
});

test("diag: flowKey changes", async ({ page }) => {
  await page.goto("./");
  await importLegacy(page, "distribution");
  await page.getByRole("button", { name: "Włącz zasilanie", exact: true }).click();
  await page.waitForTimeout(500);
  const out = await page.evaluate(async () => {
    const path = performance.getEntriesByType("resource").map((e) => e.name)
      .find((u) => new URL(u).pathname === "/apps/web/src/store.ts")!;
    const { useApp } = await import(path);
    const flowPath = performance.getEntriesByType("resource").map((e) => e.name)
      .find((u) => new URL(u).pathname === "/packages/simulation/flow.ts")!;
    const { conductorFlow, flowSignature } = await import(flowPath);
    const seen: string[] = [];
    let runtimes = 0, devs = 0, prevDev = useApp.getState().runtime.devices;
    type State = { project: unknown; runtime: { devices: unknown } };
    const unsub = useApp.subscribe((s: State) => {
      runtimes++;
      if (s.runtime.devices !== prevDev) { devs++; prevDev = s.runtime.devices; }
      const k = flowSignature(conductorFlow(s.project, s.runtime));
      if (seen.at(-1) !== k) seen.push(k);
    });
    await new Promise((r) => setTimeout(r, 3000));
    unsub();
    return { updates: runtimes, deviceChanges: devs, distinctFlowKeys: seen.length, sample: seen.slice(0, 3).map((k) => k.length) };
  });
  console.log(JSON.stringify(out));
});

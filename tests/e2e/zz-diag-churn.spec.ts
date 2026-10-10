import { test } from "@playwright/test";
import { importLegacy } from "./legacy-project";

test("diag: runtime device churn", async ({ page }) => {
  await page.goto("./");
  await importLegacy(page, "distribution");
  await page.getByRole("button", { name: "Włącz zasilanie", exact: true }).click();
  await page.waitForTimeout(1500);
  const out = await page.evaluate(async () => {
    const path = performance.getEntriesByType("resource").map((e) => e.name)
      .find((u) => new URL(u).pathname === "/apps/web/src/store.ts")!;
    const { useApp } = await import(path);
    const changed: Record<string, number> = {};
    let updates = 0, prev = useApp.getState();
    type State = Record<string, unknown> & {
      runtime: { devices: Record<string, Record<string, unknown>> };
    };
    const unsub = useApp.subscribe((s: State) => {
      updates++;
      for (const k of Object.keys(s)) if (s[k] !== prev[k]) changed[k] = (changed[k] ?? 0) + 1;
      if (s.runtime.devices !== prev.runtime.devices)
        for (const id of Object.keys(s.runtime.devices))
          if (s.runtime.devices[id] !== prev.runtime.devices[id])
            for (const key of Object.keys(s.runtime.devices[id]))
              if (s.runtime.devices[id][key] !== prev.runtime.devices[id]?.[key]) changed[`dev.${key}`] = (changed[`dev.${key}`] ?? 0) + 1;
      prev = s;
    });
    await new Promise((r) => setTimeout(r, 3000));
    unsub();
    return { updates, changed };
  });
  console.log("CHURN", JSON.stringify(out));
});

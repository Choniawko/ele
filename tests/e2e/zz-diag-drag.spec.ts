import { test, expect } from "@playwright/test";
import { importLegacy } from "./legacy-project";

test("diag: drag RCD after rail 3", async ({ page }) => {
  await page.goto("./");
  await importLegacy(page, "distribution");
  const board = page.getByTestId("board-physical");
  await page.getByRole("button", { name: "Włącz zasilanie", exact: true }).click();
  await expect(board.locator('[data-device="H1"]')).toHaveAttribute("data-powered", "true");
  await page.getByRole("button", { name: "Dodaj szynę DIN", exact: true }).click();
  const b0 = (await board.locator('[data-device-body="FI1"]').boundingBox())!;
  await page.mouse.click(b0.x + b0.width * 0.08, b0.y + b0.height * 0.35);
  await page.getByLabel("Przenieś zaznaczone na szynę").selectOption({ label: "Szyna 3" });
  await page.waitForTimeout(800);
  const box = (await board.locator('[data-device-body="FI1"]').boundingBox())!;
  const x = box.x + box.width * 0.08, y = box.y + box.height * 0.35;
  const info = await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y)!;
    const chain: string[] = [];
    for (let e: Element | null = el; e && chain.length < 6; e = e.parentElement)
      chain.push(`${e.tagName}.${(e.getAttribute("class") ?? "").slice(0, 40)}[${["data-device","data-device-body","data-wire","model-id"].map((a) => e!.getAttribute(a)).filter(Boolean).join(",")}]`);
    return chain.join(" < ");
  }, [x, y]);
  console.log("AT", Math.round(x), Math.round(y), info);
  const zoom = Number((await page.locator(".zoom-label").innerText()).replace("%", "")) / 100;
  const logs: string[] = [];
  page.on("console", (m) => logs.push(m.type() + ":" + m.text().slice(0, 200)));
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 180 * zoom, y - 295 * zoom, { steps: 12 });
  await page.waitForTimeout(100);
  const mid = (await board.locator('[data-device-body="FI1"]').boundingBox())!;
  await page.mouse.up();
  await page.waitForTimeout(800);
  const after = (await board.locator('[data-device-body="FI1"]').boundingBox())!;
  const notice = await page.locator(".workbench-notice").allInnerTexts();
  console.log("MID", Math.round(mid.x - box.x), Math.round(mid.y - box.y), "AFTER", Math.round(after.x - box.x), Math.round(after.y - box.y), "NOTICE", JSON.stringify(notice), "LOGS", JSON.stringify(logs.slice(0, 5)));
});

import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { manifestSchema, versionSchema } from "../../scripts/lib/release";

test("Pages: /ele/, version.json, wszystkie zasoby i brak maskowania złych ścieżek", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (r) => errors.push(r.url()));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  const response = await page.goto("./");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByText("Zapisano lokalnie", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("a.brand")).toHaveAttribute("href", "/ele/");
  const version = versionSchema.parse(
    await (await request.get("./version.json")).json(),
  );
  expect(version.base).toBe("/ele/");
  if (process.env.ELE_RELEASE_TAG)
    expect(version.tag).toBe(process.env.ELE_RELEASE_TAG);
  const manifest = manifestSchema.parse(
    await (await request.get("./asset-manifest.json")).json(),
  );
  expect(
    manifest.files.some((f) =>
      /^assets\/simulation\.worker-.+\.js$/.test(f.path),
    ),
  ).toBe(true);
  for (const f of manifest.files) {
    const resource = await request.get(`./${f.path}`);
    expect(resource.status(), f.path).toBe(200);
    const body = await resource.body();
    expect(body.length, f.path).toBe(f.bytes);
    expect(createHash("sha256").update(body).digest("hex"), f.path).toBe(
      f.sha256,
    );
    if (f.path.endsWith(".js"))
      expect(resource.headers()["content-type"]).toContain("javascript");
    if (f.path.endsWith(".css"))
      expect(resource.headers()["content-type"]).toContain("text/css");
  }
  expect((await request.get("http://127.0.0.1:4173/")).status()).toBe(404);
  expect((await request.get("./assets/brak.js")).status()).toBe(404);
  expect(errors).toEqual([]);
});

test("Pages: rzeczywisty Worker, edycja, autosave, odtworzenie i ponowna praca solvera", async ({
  page,
}) => {
  const workers: string[] = [],
    errors: string[] = [];
  page.on("worker", (w) => workers.push(w.url()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(
    page.getByText("Zapisano lokalnie", { exact: true }),
  ).toBeVisible();
  await expect.poll(() => workers.length).toBeGreaterThan(0);
  expect(
    workers.every((url) =>
      /\/ele\/assets\/simulation\.worker-.+\.js$/.test(new URL(url).pathname),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Przykłady", exact: true }).click();
  await page
    .getByRole("button", { name: "Otwórz kopię ELE.02-101", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".save-state")).toHaveText("Zapisano lokalnie");
  await page.locator(".project-title").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nazwa projektu").fill("Wydanie ELE — /ele/");
  await dialog.getByLabel("Nazwa projektu").blur();
  await dialog.getByRole("button", { name: "Zamknij", exact: true }).click();
  await expect(
    page.getByText("Zapisano lokalnie", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  const lamp = page.getByTestId("board-physical").locator('[data-device="H1"]');
  await expect(lamp).toHaveAttribute("data-powered", "true");
  await page.reload();
  await expect(page.locator(".project-title")).toContainText(
    "Wydanie ELE — /ele/",
  );
  await expect(
    page.getByText("Zapisano lokalnie", { exact: true }),
  ).toBeVisible();
  await expect(lamp).toHaveAttribute("data-powered", "false");
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await expect(lamp).toHaveAttribute("data-powered", "true");
  await expect.poll(() => workers.length).toBeGreaterThanOrEqual(2);
  expect(errors).toEqual([]);
});

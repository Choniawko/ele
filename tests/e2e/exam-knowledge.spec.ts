import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { ExamTask } from "../../packages/knowledge/exams";
const data = JSON.parse(
  readFileSync("packages/knowledge/exam-data/ele02-tasks.json", "utf8"),
);
const examTasks: ExamTask[] = data.tasks;
const examComponents: { id: string; name: string }[] = data.components;
const examArticles: { id: string }[] = JSON.parse(
  readFileSync("packages/knowledge/exam-data/device-knowledge.json", "utf8"),
).articles;
const taskHref = (code: string) =>
  `#/wiedza/zadania/ele02-${code.toLowerCase()}`;
const examArticleHref = (id: string) => `#/wiedza/aparaty/${id}`;
const componentHref = (id: string) => `#/wiedza/zestaw/${id}`;
test.beforeEach(async ({ page }) => {
  page.on("pageerror", (e) => {
    throw e;
  });
});
test("00a: all cards, article/category links, search synonyms and honest availability", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("./#/wiedza/zadania");
  await expect(page.locator(".exam-task-card")).toHaveCount(17);
  await expect(page.getByText(/2\/17 układów możesz uruchomić/)).toBeVisible();
  const search = page.getByLabel("Szukaj w materiałach źródłowych");
  for (const query of [
    "RCD",
    "różnicówka",
    "roznicowka",
    "BIS-402",
    "BIS402",
    "podtrzymanie",
    "krańcówka",
    "krancowka",
    "L01",
  ]) {
    await search.fill(query);
    await expect(
      page
        .locator(".exam-task-card, .exam-article-card, .exam-component-card")
        .first(),
    ).toBeVisible();
  }
  await search.fill("");
  await page.getByLabel("Kwalifikacja").selectOption("ELE.05");
  await expect(page.getByText(/nie przekazano arkuszy ELE.05/)).toBeVisible();
  await expect(page.locator(".exam-task-card")).toHaveCount(0);
  await page.getByLabel("Kwalifikacja").selectOption("ELE.02");
  for (const a of examArticles) {
    await page.goto(`./${examArticleHref(a.id)}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const details = page
      .locator("details")
      .filter({ has: page.locator("#section-practice") })
      .first();
    await details.locator("summary").click();
    await expect(page.locator("#section-practice p").first()).toBeVisible();
  }
  await page.goto("./#/wiedza/zestaw");
  await expect(page.locator(".exam-component-card")).toHaveCount(60);
  for (const c of examComponents) {
    await page.goto(`./${componentHref(c.id)}`);
    await expect(
      page.getByRole("heading", { level: 1, name: c.name, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Jak działa / jak stosować",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Pełny artykuł:/ }),
    ).toHaveAttribute("href", /^#\/wiedza\/aparaty\//);
  }
});
test("00a: every source drawing decodes; direct task URL and refresh work under BASE_URL", async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(120000);
  let figures = 0;
  for (const t of examTasks) {
    await page.goto(`./${taskHref(t.code)}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(t.id);
    const images = page.locator(".exam-figures img");
    await expect(images).toHaveCount(t.schematics.length);
    for (let i = 0; i < t.schematics.length; i++) {
      const img = images.nth(i);
      await img.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          img.evaluate(
            (el) =>
              (el as HTMLImageElement).complete &&
              (el as HTMLImageElement).naturalWidth > 0,
          ),
        )
        .toBe(true);
      const svg = await request.get(
        new URL(
          `./knowledge/ele02/${t.schematics[i].svg}`,
          `${baseURL?.replace(/\/$/, "")}/`,
        ).href,
      );
      expect(svg.status()).toBe(200);
      expect(await svg.text()).toContain("<svg");
      figures++;
    }
  }
  expect(figures).toBe(40);
  await page.goto("./#/wiedza/zadania/ele02-108");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "ELE.02-108",
  );
  await expect(page.getByText(/Gałąź K1: równolegle START S1/)).toBeVisible();
  await page
    .getByText("Przewody i materiały — dane źródła", { exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "nie podano", exact: true }),
  ).toHaveCount(8);
  await page.goto("./#/wiedza/zadania/ele02-999");
  await expect(
    page.getByRole("heading", { name: "Nie znaleziono materiału" }),
  ).toBeVisible();
});
test("00a: native image dialog, keyboard zoom, Escape and return preserve the workbench", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.getByText("Zapisano lokalnie", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Baza wiedzy", exact: true }).click();
  await page.getByRole("link", { name: "Zadania", exact: true }).click();
  await expect(page.locator(".exam-task-card")).toHaveCount(17);
  await page.locator(`a[href="${taskHref("108")}"]`).click();
  const trigger = page.getByRole("button", {
    name: "Powiększ: moc-i-sterowanie",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Powiększony rysunek źródłowy",
  });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Powiększ rysunek", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(dialog.locator("output")).toHaveText("125%");
  await expect
    .poll(() =>
      dialog
        .locator("img")
        .evaluate(
          (el) =>
            (el as HTMLImageElement).complete &&
            (el as HTMLImageElement).naturalWidth > 0,
        ),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page
    .getByRole("button", { name: "Wróć do mojego układu", exact: true })
    .click();
  await expect(page.locator(".knowledge-page")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Baza wiedzy", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByText("Zapisano lokalnie", { exact: true }),
  ).toBeVisible();
});
for (const [width, height] of [
  [1366, 768],
  [1920, 1080],
  [390, 844],
  [844, 390],
]) {
  test(`00a: layout ${width}x${height}, reading tabs and source issues`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("./#/wiedza/zadania/ele02-114");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "ELE.02-114",
    );
    await expect
      .poll(() =>
        page
          .locator(".knowledge-page")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      )
      .toBe(true);
    if (width <= 850) {
      await page.getByRole("tab", { name: "Rysunek", exact: true }).focus();
      await page.keyboard.press("ArrowRight");
      await expect(
        page.getByRole("tab", { name: "Działanie", exact: true }),
      ).toBeFocused();
      await expect(
        page.getByRole("heading", {
          name: "Jak czytać ten schemat",
          exact: true,
        }),
      ).toBeVisible();
      await page.getByRole("tab", { name: "Próby", exact: true }).click();
    }
    await expect(
      page.getByText("114-ISSUE-04 · otwarte", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/specyfikacja próby/).first()).toBeVisible();
  });
}

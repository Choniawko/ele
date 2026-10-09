import { importLegacy } from "./legacy-project";
import { test, expect, type Page } from "@playwright/test";
const k = (page: Page) => page.locator(".knowledge-page");
async function documents(page: Page) {
  return page.evaluate(async () => {
    const name = (await indexedDB.databases()).find(
      (d) => d.name?.includes("pracownia") || d.name?.includes("ele"),
    )?.name;
    if (!name) throw Error("Brak bazy projektów");
    return new Promise<unknown[]>((resolve, reject) => {
      const open = indexedDB.open(name);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const req = db.transaction("projects").objectStore("projects").getAll();
        req.onsuccess = () => {
          db.close();
          resolve(req.result.map((r: { document: unknown }) => r.document));
        };
        req.onerror = () => reject(req.error);
      };
    });
  });
}
test.beforeEach(async ({ page }) => {
  page.on("pageerror", (e) => {
    throw e;
  });
  await page.goto("./");
  await expect(
    page.getByText("Zapisano lokalnie", { exact: true }),
  ).toBeVisible();
});
test("wiedza: synonimy, progres, klawiatura i odświeżenie stałego adresu", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Baza wiedzy", exact: true }).click();
  await expect(
    k(page).getByRole("heading", { name: "Baza wiedzy", exact: true }),
  ).toBeFocused();
  await k(page)
    .getByLabel("Szukaj w materiałach źródłowych")
    .fill("roznicowka");
  await expect(k(page).locator(".exam-article-card").first()).toBeVisible();
  await k(page)
    .getByRole("link", { name: /RCD i RCBO/ })
    .click();
  await expect(page).toHaveURL(/#\/wiedza\/aparaty\/rcd$/);
  // Existing product article URLs and reading progress remain compatible.
  await page.goto("./#knowledge/article/rcd");
  await page.reload();
  await expect(
    k(page).getByRole("heading", { name: "RCD i RCBO", exact: true }),
  ).toBeVisible();
  await k(page)
    .getByRole("button", { name: "Oznacz jako przeczytane" })
    .click();
  await page.reload();
  await expect(
    k(page).getByRole("button", { name: "Przeczytano ✓" }),
  ).toBeVisible();
  await k(page).getByRole("button", { name: "Wróć do mojego układu" }).focus();
  await page.keyboard.press("Escape");
  await expect(k(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Baza wiedzy", exact: true }),
  ).toBeFocused();
});
test("dawny adres START/STOP prowadzi do aktywnej lekcji 108 bez zmiany własnych projektów", async ({
  page,
}) => {
  const before = await documents(page);
  await page.goto("./#knowledge/circuit/start-stop");
  await expect(page).toHaveURL(/#\/wiedza\/uklady\/ele02-108$/);
  await expect(
    k(page)
      .getByRole("heading", { name: /ELE.02-108/ })
      .first(),
  ).toBeVisible();
  await expect(
    k(page).getByRole("button", { name: "Załącz energię lekcji", exact: true }),
  ).toBeVisible();
  expect(await documents(page)).toEqual(before);
});
test("101: równoległe oprawy i tabela wskazują rzeczywistą żyłę w obu widokach", async ({
  page,
}) => {
  const before = await documents(page);
  await page.goto("./#/wiedza/uklady/ele02-101");
  await k(page).getByRole("button", { name: "Śledź W27", exact: true }).click();
  await expect(
    k(page).locator('.reference-connections tr[aria-selected="true"]'),
  ).toContainText("OP2:L");
  await expect(k(page).locator(".physical path[stroke='#b05a10']")).toHaveCount(
    1,
  );
  await k(page)
    .getByRole("button", { name: "Załącz energię lekcji", exact: true })
    .click();
  await expect(k(page).getByText(/OP1: świeci · OP2: świeci/)).toBeVisible();
  await k(page)
    .getByRole("button", { name: "Przełącz Q1 w lekcji", exact: true })
    .click();
  await expect(
    k(page).getByText(/OP1: zgaszona · OP2: zgaszona.*H2: świeci/),
  ).toBeVisible();
  await k(page)
    .getByRole("button", { name: "Reset lekcji", exact: true })
    .click();
  expect(await documents(page)).toEqual(before);
});
test("pomoc kontekstowa z osobnego bloku, powrót do zaznaczenia i kadru", async ({
  page,
}) => {
  await importLegacy(page, "exam-start-stop", true);
  await expect(
    page.getByRole("button", {
      name: "Pokaż lub ukryj inspektor",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByTestId("board-physical")
    .locator('[data-device="KA1"]')
    .click();
  const before = await documents(page);
  await page
    .getByRole("button", { name: "Wyjaśnij zacisk KA1:53", exact: true })
    .click();
  await expect(k(page).locator(".knowledge-context")).toContainText(
    "mechanizm rodzica K1",
  );
  await k(page)
    .getByRole("button", { name: "Pokaż w moim układzie", exact: true })
    .click();
  await expect(k(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Poznaj aparat", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".knowledge-board-hint").first()).toContainText(
    "KA1:53",
  );
  expect(await documents(page)).toEqual(before);
});
test("akcja katalogu wyjaśnia wybrany model 24 V DC bez dodania aparatu", async ({
  page,
}) => {
  const before = await documents(page);
  await page
    .getByRole("button", {
      name: "Poznaj Stycznik · cewka 24 V DC",
      exact: true,
    })
    .click();
  await expect(k(page).locator(".knowledge-product-map")).toContainText(
    "24 V DC",
  );
  await expect(k(page).locator(".knowledge-product-map")).toContainText(
    "profil dydaktyczny",
  );
  await page.reload();
  await expect(k(page).locator(".knowledge-product-map")).toContainText(
    "24 V DC",
  );
  await k(page)
    .getByRole("button", { name: "Wróć do mojego układu", exact: true })
    .click();
  await expect(k(page)).toHaveCount(0);
  expect(await documents(page)).toEqual(before);
});
test("usunięcie aparatu w drugiej karcie unieważnia kontekst po odświeżeniu", async ({
  page,
  context,
}) => {
  await importLegacy(page, "exam-start-stop", true);
  await page
    .getByTestId("board-physical")
    .locator('[data-device="K1"]')
    .click();
  await page
    .getByRole("button", { name: "Poznaj aparat", exact: true })
    .click();
  await expect(
    k(page).getByRole("button", { name: "Pokaż w moim układzie", exact: true }),
  ).toBeEnabled();
  const other = await context.newPage();
  try {
    await other.goto("./");
    await expect(
      other.getByText("Zapisano lokalnie", { exact: true }),
    ).toBeVisible();
    const contactor = other
      .getByTestId("board-physical")
      .locator('[data-device="K1"]');
    await contactor.click();
    await other.keyboard.press("Delete");
    await expect(contactor).toHaveCount(0);
    await expect(
      other.getByText("Zapisano lokalnie", { exact: true }),
    ).toBeVisible();
    const changed = await documents(other);
    await page.reload();
    await expect(
      k(page).getByRole("heading", { name: "Stycznik", exact: true }),
    ).toBeVisible();
    await expect(
      k(page).getByRole("button", {
        name: "Pokaż w moim układzie",
        exact: true,
      }),
    ).toBeDisabled();
    await expect(k(page).locator(".knowledge-product-map")).toHaveCount(0);
    expect(await documents(page)).toEqual(changed);
  } finally {
    await other.close();
  }
});
test("wąski ekran i 1366×768: aktualna lekcja oraz teoria aparatu bez starej demonstracji", async ({
  page,
}, info) => {
  await page.goto("./#knowledge/article/przekaznik");
  await expect(
    k(page).getByRole("link", {
      name: "Sprawdzone wzorce i lekcje połączeń →",
    }),
  ).toBeVisible();
  await expect(k(page).locator(".knowledge-demo")).toHaveCount(0);
  await page.goto("./#/wiedza/uklady/ele02-101");
  await expect(k(page).locator(".reference-lesson")).toBeVisible();
  await page.screenshot({ path: info.outputPath("knowledge-1366.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    k(page).getByLabel("Powiększenie rysunków modelu"),
  ).toBeVisible();
  await k(page).getByLabel("Powiększenie rysunków modelu").selectOption("2");
  expect(
    await k(page).evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("knowledge-mobile.png") });
});
test("porządek aplikacji: pusty start i wyłącznie 17 obecnych arkuszy we wszystkich wejściach", async ({
  page,
}) => {
  await expect(
    page.getByTestId("board-physical").locator("[data-device]"),
  ).toHaveCount(0);
  const scope = [
    "101",
    "103",
    "104",
    "105",
    "106",
    "107",
    "108",
    "109",
    "110",
    "112",
    "113",
    "114",
    "115",
    "116",
    "117",
    "L01",
    "L02",
  ].map((code) => `ELE.02-${code}`);
  for (const entry of ["Przykłady", "Ćwiczenia"]) {
    await page.getByRole("button", { name: entry, exact: true }).click();
    const dialog = page.getByRole("dialog");
    expect(
      await dialog
        .locator("[data-exam-task]")
        .evaluateAll((cards) =>
          cards.map((card) => card.getAttribute("data-exam-task")),
        ),
    ).toEqual(scope);
    await expect(dialog.locator("[data-scenario]")).toHaveCount(0);
    await expect(
      dialog.getByRole("button", { name: /^Otwórz kopię ELE/ }),
    ).toHaveCount(2);
    await expect(dialog.getByText(/wzorzec w przygotowaniu/)).toHaveCount(15);
    await dialog.getByRole("button", { name: "Zamknij", exact: true }).click();
  }
  await page.locator(".project-title").click();
  await page
    .getByRole("button", { name: "Kopiuj przykład", exact: true })
    .click();
  const choices = page
    .getByLabel("Przykład", { exact: true })
    .locator("option");
  await expect(choices).toHaveCount(2);
  expect(
    await choices.evaluateAll((options) =>
      options.map((o) => o.getAttribute("value")),
    ),
  ).toEqual(["ele02-101", "ele02-108"]);
  await page.getByRole("button", { name: "Anuluj", exact: true }).click();
  await page.getByRole("button", { name: "Zamknij", exact: true }).click();
  await page.getByRole("button", { name: "Baza wiedzy", exact: true }).click();
  await k(page).getByRole("link", {name: "Zadania", exact: true}).click();
  await expect(k(page).locator(".exam-task-card")).toHaveCount(17);
  await expect(k(page).locator(".knowledge-demo")).toHaveCount(0);
});

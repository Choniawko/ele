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
  await k(page).getByLabel("Szukaj w bazie").fill("roznicowka");
  await expect(k(page).locator(".knowledge-card")).toHaveCount(1);
  await k(page)
    .getByRole("link", { name: /RCD i RCBO/ })
    .click();
  await expect(page).toHaveURL(/#knowledge\/article\/rcd$/);
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
test("START/STOP: działanie solvera, pary zacisków, reset izolowany i kopia bez nadpisania", async ({
  page,
}) => {
  const before = await documents(page);
  await page.getByRole("button", { name: "Baza wiedzy", exact: true }).click();
  await expect(
    k(page).getByRole("heading", { name: "Baza wiedzy", exact: true }),
  ).toBeVisible();
  await page.goto("./#knowledge/circuit/start-stop");
  const output = k(page).getByTestId("knowledge-readouts");
  await k(page)
    .getByRole("button", { name: "Wykonaj: Załącz zasilanie", exact: true })
    .click();
  await expect(output).toContainText("mechanizm OFF");
  await k(page)
    .getByRole("button", { name: "Wykonaj: Wciśnij START", exact: true })
    .click();
  await k(page)
    .getByRole("button", { name: "Wykonaj: Puść START", exact: true })
    .click();
  await expect(output).toContainText("mechanizm ON");
  await k(page)
    .getByRole("button", { name: "Podtrzymanie K1 KA1 53–54" })
    .click();
  await expect(k(page).locator(".knowledge-highlight")).toContainText(
    "KA1:53 ↔ KA1:54",
  );
  await expect(
    k(page).locator('.knowledge-physical [data-device="KA1"]'),
  ).toBeVisible();
  await k(page).getByRole("button", { name: "Powiększ rysunek" }).click();
  await expect(k(page).getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    k(page).getByRole("button", { name: "Powiększ rysunek" }),
  ).toBeFocused();
  await k(page)
    .getByRole("button", { name: "Wykonaj: Wciśnij STOP", exact: true })
    .click();
  await expect(output).toContainText("mechanizm OFF");
  await k(page)
    .getByRole("button", { name: "Reset przykładu", exact: true })
    .click();
  expect(await documents(page)).toEqual(before);
  await k(page)
    .getByRole("button", { name: "Otwórz kopię w pracowni", exact: true })
    .click();
  await expect(k(page)).toHaveCount(0);
  await expect(
    page.getByText("Zapisano lokalnie", { exact: true }),
  ).toBeVisible();
  const after = await documents(page);
  expect(after).toHaveLength(before.length + 1);
  for (const doc of before) expect(after).toContainEqual(doc);
});
test("lekcja węzłów: tabela wskazuje fizyczną żyłę, a solver zasila obie gałęzie lamp", async ({
  page,
}) => {
  await page.goto("./#knowledge/lesson/wezel-i-skrzyzowanie");
  await expect(
    k(page).getByRole("heading", { name: "Węzeł i skrzyżowanie", exact: true }),
  ).toBeVisible();
  await k(page)
    .getByRole("button", { name: "Wskaż XL2:3 do H2:L", exact: true })
    .click();
  await expect(k(page).locator(".knowledge-highlight")).toContainText(
    "XL2:3 ↔ H2:L",
  );
  await k(page)
    .getByRole("button", { name: "Wykonaj: Załącz zasilanie", exact: true })
    .click();
  await k(page)
    .getByRole("button", { name: "Wykonaj: Zamknij S1", exact: true })
    .click();
  const lamps = k(page)
    .getByTestId("knowledge-readouts")
    .locator("p")
    .filter({ hasText: /H[12]/ });
  await expect(lamps).toHaveCount(2);
  for (const lamp of await lamps.all())
    await expect(lamp).toContainText("odbiornik ON");
});
test("pomoc kontekstowa z osobnego bloku, powrót do zaznaczenia i kadru", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Ćwiczenia", exact: true }).click();
  await page
    .getByLabel("Nowe zestawy ELE.02 / ELE.05 — tryb")
    .selectOption("reference");
  await page.locator('[data-scenario="exam-start-stop"]').click();
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
  await page.getByRole("button", { name: "Ćwiczenia", exact: true }).click();
  await page
    .getByLabel("Nowe zestawy ELE.02 / ELE.05 — tryb")
    .selectOption("reference");
  await page.locator('[data-scenario="exam-start-stop"]').click();
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
test("wąski ekran i 1366×768: czytelne widoki bez przepełnienia oraz przykład bez modelu", async ({
  page,
}) => {
  await page.goto("./#knowledge/article/przekaznik");
  await expect(
    k(page).getByText(/Brak przygotowanego interaktywnego przykładu/),
  ).toBeVisible();
  await page.goto("./#knowledge/circuit/start-stop");
  await expect(k(page).locator(".knowledge-views")).toBeVisible();
  await k(page)
    .locator(".knowledge-views")
    .evaluate((e) => e.scrollIntoView({ block: "center" }));
  await page.screenshot({ path: "docs/qa/knowledge-1366.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    k(page).getByRole("button", { name: "Tablica fizyczna", exact: true }),
  ).toBeVisible();
  await k(page)
    .getByRole("button", { name: "Tablica fizyczna", exact: true })
    .click();
  await expect(k(page).locator(".knowledge-physical")).toBeVisible();
  await expect(k(page).locator(".knowledge-functional")).toBeHidden();
  expect(
    await k(page).evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
  ).toBe(true);
  await page.screenshot({ path: "docs/qa/knowledge-mobile.png" });
});

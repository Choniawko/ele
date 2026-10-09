import { test, expect } from "@playwright/test";

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
]) {
  for (const code of ["101", "108"])
    test(`audit lesson ${code}: complete paths, common terminals and trial at ${viewport.width}`, async ({
      page,
    }, info) => {
      await page.setViewportSize(viewport);
      await page.goto(`./#/wiedza/uklady/ele02-${code}`);
      const lesson = page.locator(".reference-lesson");
      await expect(
        lesson.getByRole("button", { name: "Zrozum", exact: true }),
      ).toHaveAttribute("aria-current", "step");
      await lesson.getByRole("button", { name: "Połącz", exact: true }).click();
      await lesson
        .getByRole("button", {
          name: code === "101" ? "Korespondencja 1" : "Podtrzymanie K1",
          exact: true,
        })
        .click();
      await lesson
        .getByRole("button", { name: "Tablica lekcji", exact: true })
        .click();
      const paths = lesson.locator('.physical [data-highlighted="true"]');
      expect(
        await paths.evaluateAll((nodes) =>
          nodes.map((n) => n.getAttribute("data-wire-id")),
        ),
      ).toEqual(
        code === "101"
          ? ["W20", "W21", "W22"]
          : ["W23", "W24", "W25", "W27", "W35"],
      );
      await lesson
        .getByRole("button", { name: "Schemat lekcji", exact: true })
        .click();
      const terminal = code === "101" ? "RCD:1" : "K1:1L1";
      await lesson
        .locator(`[data-view="schematic"] [data-terminal="${terminal}"]`)
        .first()
        .click();
      await expect(lesson.locator("[data-lesson-selection]")).toContainText(
        terminal,
      );
      await lesson
        .getByRole("button", { name: "Tablica lekcji", exact: true })
        .click();
      await expect(lesson.locator("[data-lesson-selection]")).toContainText(
        terminal,
      );
      await expect(
        lesson.locator(`.physical [data-terminal="${terminal}"]`),
      ).toHaveCount(1);
      await lesson
        .getByRole("button", { name: "Schemat lekcji", exact: true })
        .click();
      await lesson
        .getByRole("button", { name: "Załącz energię lekcji", exact: true })
        .click();
      if (code === "108") {
        const coil = lesson.locator(
          '[data-device-id="K1"][data-symbol-fragment="coil"]',
        );
        await coil.click();
        await expect(
          lesson.locator(
            '[data-device-id="K1"][data-mechanism-highlight="true"]',
          ),
        ).toHaveCount(6);
        await expect(
          lesson.locator(
            '[data-device-id="K2"][data-mechanism-highlight="true"]',
          ),
        ).toHaveCount(0);
        const left = lesson.getByRole("button", {
          name: "S2 LEWY — przytrzymaj",
          exact: true,
        });
        await left.focus();
        await page.keyboard.down("Space");
        await expect(lesson.locator(".reference-result")).toContainText(
          "M: lewy",
        );
        await page.keyboard.up("Space");
        await expect(lesson.locator(".reference-result")).toContainText(
          "M: stoi",
        );
        await left.focus();
        await page.keyboard.down("Space");
        await lesson
          .getByRole("button", { name: "Pauza lekcji", exact: true })
          .focus();
        await expect(lesson.locator(".reference-result")).toContainText(
          "M: stoi",
        );
        await page.keyboard.up("Space");
      }
      await lesson.locator(".reference-workspace").scrollIntoViewIfNeeded();
      const visibility = await lesson.evaluate((host) => {
        const selectors = [
          ".reference-controls",
          ".reference-result",
          ".reference-diagrams:not([hidden])",
        ];
        return selectors.map((s) => {
          const b = host.querySelector(s)!.getBoundingClientRect();
          return b.bottom > 0 && b.top < innerHeight;
        });
      });
      expect(visibility).toEqual([true, true, true]);
      await page.screenshot({
        path: info.outputPath(`lesson-${code}-${viewport.width}.png`),
      });
      await lesson
        .getByRole("button", { name: "Sprawdź", exact: true })
        .click();
      await lesson.getByRole("radio").first().check();
      await lesson
        .getByRole("button", { name: "Sprawdź przewidywanie", exact: true })
        .click();
      await expect(lesson.getByText(/Trafne przewidywanie/)).toBeVisible();
    });
}

test("audit: one apparatus card from SKU search, catalog and legacy addresses", async ({
  page,
}) => {
  await page.goto("./#knowledge");
  for (const name of ["Zacznij od podstaw", "Poznaj aparat", "Ćwicz zadanie"]) {
    await expect(
      page.getByRole("link", { name: new RegExp(name) }),
    ).toBeVisible();
  }
  const search = page.getByLabel("Szukaj w materiałach źródłowych");
  await search.fill("LC1D09P7");
  await page
    .locator(".exam-article-card")
    .filter({
      has: page.getByRole("heading", { name: "Stycznik", exact: true }),
    })
    .click();
  await expect(page).toHaveURL(/#\/wiedza\/aparaty\/stycznik$/);
  await expect(
    page.getByRole("heading", {
      name: "Co zmienia się po zadziałaniu",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("./#knowledge/article/stycznik");
  await expect(page).toHaveURL(/#\/wiedza\/aparaty\/stycznik$/);
  await page.goto("./#/wiedza/aparaty");
  await search.fill("XB5AA35");
  await page
    .locator(".exam-article-card")
    .filter({
      has: page.getByRole("heading", {
        name: "Łączniki i przyciski NO/NC",
        exact: true,
      }),
    })
    .click();
  await expect(page).toHaveURL(/#\/wiedza\/aparaty\/laczniki$/);
  await page.goto("./#/wiedza/aparaty/ochrona-silnika");
  await expect(page).toHaveURL(/#\/wiedza\/aparaty\/zabezpieczenia-silnikowe$/);
});

test("audit: reading help and returning preserves the started lesson", async ({page}) => {
  await page.goto("./#/wiedza/uklady/ele02-108");
  const lesson = page.locator(".reference-lesson");
  await lesson.getByRole("button", {name: "Załącz energię lekcji", exact: true}).click();
  await lesson.getByRole("button", {name: "S1 START — przytrzymaj", exact: true}).focus();
  await page.keyboard.press("Space");
  await expect(lesson.locator(".reference-result")).toContainText("M: prawy");
  await lesson.locator(".reference-profiles > summary").click();
  const profile = lesson.locator(".reference-profiles > details").filter({has: page.locator('a[href="#/wiedza/aparaty/stycznik"]')});
  await profile.locator("summary").click();
  await profile.getByRole("link", {name: "Przeczytaj teorię i źródła", exact: true}).click();
  await expect(page).toHaveURL(/#\/wiedza\/aparaty\/stycznik$/);
  await page.getByRole("link", {name: "Wróć do rozpoczętej lekcji", exact: true}).click();
  await expect(lesson.locator(".reference-result")).toContainText("M: prawy");
});

test("audit QA-01: selected welded contact, real SVG, compensated continuity and repair agree", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  page.on("pageerror", (e) => {
    throw e;
  });
  await page.goto("./");
  await expect(page.locator(".save-state")).toHaveText("Zapisano lokalnie");
  await page.getByRole("button", { name: "Przykłady", exact: true }).click();
  await page
    .getByRole("button", { name: "Otwórz kopię ELE.02-108", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Pokaż lub ukryj inspektor", exact: true })
    .click();
  await page
    .getByTestId("board-physical")
    .locator('[data-device="K1"]')
    .click();
  await page.getByLabel("Rodzaj usterki").selectOption("welded-contact");
  await page.getByLabel("Styk uszkodzenia").selectOption("pole1");
  await page
    .getByRole("button", { name: "Wprowadź usterkę", exact: true })
    .click();
  await page.getByRole("button", { name: "Schemat", exact: true }).click();
  const svg = page.getByTestId("board-schematic");
  const pole = svg.locator('[data-device="K1"][data-symbol-fragment="pole1"]');
  await expect(pole).toHaveAttribute("data-closed", "true");
  await expect(pole).toHaveAttribute("data-state-view", "continuity");
  await expect(pole.locator('path[d="M40 0L80 0"]')).toHaveCount(1);
  await expect(
    svg.locator('[data-device="K1"][data-symbol-fragment="pole2"]'),
  ).toHaveAttribute("data-closed", "false");
  await page.getByLabel("Tryb pracy").selectOption("measure");
  await page.getByLabel("Funkcja miernika").selectOption("continuity");
  await page.getByLabel("Kompensacja przewodów pomiarowych").check();
  await page.getByRole("button", { name: /SONDA CZERWONA/ }).click();
  await svg.locator('[data-terminal="K1:1L1"]').click();
  await svg.locator('[data-terminal="K1:2T1"]').click();
  await page
    .getByRole("button", { name: "Wykonaj i zapisz pomiar", exact: true })
    .click();
  await expect(page.getByTestId("meter-value")).toContainText("0,005");
  await page.screenshot({
    path: info.outputPath("welded-contact-and-continuity.png"),
  });
  await page.getByLabel("Tryb pracy").selectOption("build");
  const inspector = page.getByRole("button", {
    name: "Pokaż lub ukryj inspektor",
    exact: true,
  });
  if ((await inspector.getAttribute("aria-pressed")) !== "true")
    await inspector.click();
  await page
    .getByRole("button", {
      name: "Usuń usterki zaznaczonego elementu",
      exact: true,
    })
    .click();
  await expect(pole).toHaveAttribute("data-closed", "false");
  await page.getByLabel("Tryb pracy").selectOption("measure");
  await page
    .getByRole("button", { name: "Wykonaj i zapisz pomiar", exact: true })
    .click();
  await expect(page.getByTestId("meter-value")).toContainText("OL");
});

test("audit UX-01: reading-schematics entry and old address reach the active 101 lesson", async ({
  page,
}) => {
  await page.goto("./#/wiedza/czytanie");
  await page
    .getByRole("link", {
      name: "Czytaj schemat i śledź rzeczywiste żyły w ELE.02-101 →",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/#\/wiedza\/uklady\/ele02-101$/);
  await expect(
    page.getByRole("button", { name: "Załącz energię lekcji", exact: true }),
  ).toBeVisible();
  await page.goto("./#knowledge/lesson/linia-i-zyla");
  await expect(page).toHaveURL(/#\/wiedza\/uklady\/ele02-101$/);
  await page
    .getByRole("button", { name: "Załącz energię lekcji", exact: true })
    .click();
  await expect(page.getByText(/OP1: świeci · OP2: świeci/)).toBeVisible();
});

import { test, expect, type Page, type Locator } from "@playwright/test";
async function example(page: Page, title: string, training = false) {
  await page
    .getByRole("button", {
      name: training ? "Ćwiczenia" : "Przykłady",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: new RegExp(title) }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
const terminal = (page: Page, name: string) =>
  page
    .getByTestId("board-physical")
    .locator(`[data-terminal="${name}"]`)
    .locator("circle")
    .first();
const device = (page: Page, name: string) =>
  page.getByTestId("board-physical").locator(`[data-device="${name}"]`);
async function expectRotation(load: Locator) {
  const rotor = load.locator("[data-rotor]");
  await expect(rotor).toHaveAttribute("data-rotor", "running");
  const initial = await rotor.evaluate((el) => getComputedStyle(el).transform);
  await expect
    .poll(() => rotor.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(initial);
  // The blades must rotate around the fixed hub, also under the board's zoom transform.
  const offset = await load.evaluate((el) => {
    const rotor = el.querySelector<SVGGraphicsElement>("[data-rotor]")!,
      hub = el.querySelector<SVGCircleElement>("[data-rotor-hub]")!;
    const axis = new DOMPoint(0, 0).matrixTransform(rotor.getScreenCTM()!),
      center = new DOMPoint(
        hub.cx.baseVal.value,
        hub.cy.baseVal.value,
      ).matrixTransform(hub.getScreenCTM()!);
    return Math.hypot(axis.x - center.x, axis.y - center.y);
  });
  expect(offset).toBeLessThan(0.5);
}
async function measure(
  page: Page,
  red: string,
  black: string,
  fn = "voltage-ac",
) {
  await page.getByLabel("Tryb pracy").selectOption("measure");
  await page.getByLabel("Funkcja miernika").selectOption(fn);
  await page.getByRole("button", { name: /SONDA CZERWONA/ }).click();
  await terminal(page, red).click();
  await terminal(page, black).click();
  await page.getByRole("button", { name: "Wykonaj i zapisz pomiar" }).click();
  await expect(page.getByTestId("meter-value")).not.toContainText("—");
}
test.beforeEach(async ({ page }) => {
  page.on("pageerror", (e) => {
    throw e;
  });
  await page.goto("/");
  await expect(
    page.getByText("Zapisano lokalnie", { exact: true }),
  ).toBeVisible();
});
test("lampa świeci i grzałka żarzy się tylko przy zamkniętym obwodzie", async ({
  page,
}) => {
  const lamp = device(page, "H1");
  await expect(lamp.locator("[data-light]")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await expect(lamp.locator("[data-light]")).toBeVisible();
  await expect(lamp.locator(".lamp-glass")).not.toHaveCSS("filter", "none");
  await page.getByRole("button", { name: "Przełącz S1", exact: true }).click();
  await expect(lamp.locator("[data-light]")).toHaveCount(0);
  await expect(lamp.locator(".lamp-glass")).toHaveCSS("filter", "none");

  await example(page, "Gniazdo i tor ochronny");
  const heater = device(page, "R1");
  await expect(heater.locator("[data-heat]")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await expect(heater.locator("[data-heat]")).toBeVisible();
  await expect(heater.locator(".heater-active")).toHaveCSS(
    "stroke",
    "rgb(255, 116, 52)",
  );
  await page.getByRole("button", { name: "Przełącz QF1", exact: true }).click();
  await expect(heater.locator("[data-heat]")).toHaveCount(0);
  await expect(heater.locator(".heat-plume")).toHaveCount(0);
});
test("wentylator i silnik obracają łopatki oraz zatrzymują się po rozłączeniu", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await example(page, "Wentylator i łącznik");
  const fan = device(page, "M1"),
    rotor = fan.locator("[data-rotor]");
  await expect(rotor).toHaveAttribute("data-rotor", "stopped");
  await expect(rotor).toHaveCSS("animation-name", "none");
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await expectRotation(fan);
  await expect(fan.locator("[data-airflow]")).toBeVisible();
  await page.getByRole("button", { name: "Przełącz S1", exact: true }).click();
  await expect(rotor).toHaveAttribute("data-rotor", "stopped");
  await expect(rotor).toHaveCSS("transform", "none");
  await expect(fan.locator("[data-airflow]")).toHaveCount(0);
  await page.getByRole("button", { name: "Przełącz S1", exact: true }).click();
  await expectRotation(fan);
  await page.getByRole("button", { name: "Przełącz QF1", exact: true }).click();
  await expect(rotor).toHaveAttribute("data-rotor", "stopped");
  await page.getByRole("button", { name: "Przełącz QF1", exact: true }).click();
  await expectRotation(fan);
  await page.getByRole("button", { name: "Zasilanie ON", exact: true }).click();
  await expect(rotor).toHaveCSS("animation-name", "none");

  await example(page, "Trzy fazy i termik");
  const motor = device(page, "M1");
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Przytrzymaj S1", exact: true })
    .focus();
  await page.keyboard.press("Space");
  await expectRotation(motor);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(motor.locator("[data-rotor]")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expectRotation(motor);
  await page
    .getByRole("button", { name: "Przytrzymaj S0", exact: true })
    .focus();
  await page.keyboard.press("Space");
  await expect(motor.locator("[data-rotor]")).toHaveAttribute(
    "data-rotor",
    "stopped",
  );
  await expect(motor.locator("[data-rotor]")).toHaveCSS(
    "animation-name",
    "none",
  );
});
test("przesunięcie aparatu i samodzielny eksport SVG", async ({ page }) => {
  const source = device(page, "G1"),
    box = await source.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width / 2 - 24,
    box!.y + box!.height / 2,
    { steps: 8 },
  );
  await page.mouse.up();
  await page.getByRole("button", { name: "Eksport", exact: true }).click();
  const [json] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Projekt JSON/ }).click(),
  ]);
  const { readFile } = await import("node:fs/promises");
  const p = JSON.parse(await readFile((await json.path())!, "utf8"));
  const id = p.circuit.devices.find(
    (d: { id: string; designation: string }) => d.designation === "G1",
  ).id;
  expect(p.physical.devices[id].x).not.toBe(80);
  expect(p.circuit.revision).toBe(0);
  const [svg] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Tablica SVG/ }).click(),
  ]);
  const xml = await readFile((await svg.path())!, "utf8");
  expect(xml).toContain("TH35");
  expect(xml).toContain('xmlns="http://www.w3.org/2000/svg"');
  expect(xml).not.toContain("joint-grid-layer");
  expect(xml).toContain("MBN116E");
});
test("łączenie od pustego projektu, cofnięcie, zasilanie i pomiar", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Lampa i łącznik" }).click();
  await page.getByRole("button", { name: /Nowa instalacja/ }).click();
  const board = page.getByTestId("board-physical");
  for (const [name, x, y] of [
    ["Źródło sieciowe", 100, 70],
    ["Wyłącznik nadprądowy B16", 260, 70],
    ["Łącznik jednobiegunowy", 180, 260],
    ["Lampa · 60 W", 420, 260],
  ] as const) {
    await page
      .getByRole("button", { name: new RegExp("Dodaj .*" + name) })
      .click();
    await board.click({ position: { x, y } });
  }
  await expect(board.locator("[data-device]")).toHaveCount(4);
  for (const [a, b] of [
    ["G1:L", "QF1:1"],
    ["QF1:2", "S1:1"],
    ["S1:2", "H1:L"],
    ["G1:N", "H1:N"],
    ["G1:PE", "H1:PE"],
  ]) {
    await terminal(page, a).click();
    await terminal(page, b).click();
  }
  await expect(board).toContainText("5 żył");
  await page.getByRole("button", { name: "Cofnij", exact: true }).click();
  await expect(board).toContainText("4 żył");
  await page.getByRole("button", { name: "Ponów", exact: true }).click();
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await expect(device(page, "H1")).toHaveAttribute("data-powered", "true");
  await measure(page, "H1:L", "H1:N");
  await expect(page.getByTestId("meter-value")).toContainText(/229/);
  await page.getByRole("button", { name: "Schemat", exact: true }).click();
  await expect(
    page.getByTestId("board-schematic").locator("[data-device]"),
  ).toHaveCount(4);
});
test("przełączanie, prąd, blokada omomierza i odświeżenie", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await expect(device(page, "H1")).toHaveAttribute("data-powered", "true");
  await page.getByRole("button", { name: "Przełącz S1", exact: true }).click();
  await expect(device(page, "H1")).toHaveAttribute("data-powered", "false");
  const control = page.getByRole("button", {
    name: "Przełącz S1",
    exact: true,
  });
  await control.focus();
  await expect(control).toHaveCSS("outline-style", "none");
  await expect(control).toHaveCSS(
    "-webkit-tap-highlight-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(page.locator("[data-drag-handle]")).toHaveCount(0);
  await page.keyboard.press("Space");
  await expect(device(page, "H1")).toHaveAttribute("data-powered", "true");
  await measure(page, "H1:L", "H1:N");
  await page.getByLabel("Funkcja miernika").selectOption("continuity");
  await page.getByRole("button", { name: "Wykonaj i zapisz pomiar" }).click();
  await expect(page.locator(".meter-state")).toContainText("SPRAWDŹ WARUNKI");
  await page.getByLabel("Funkcja miernika").selectOption("current");
  await page.getByLabel("Żyła do pomiaru prądu").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Wykonaj i zapisz pomiar" }).click();
  await expect(page.getByTestId("meter-value")).toContainText(/0,26/);
  await expect(
    page.getByText("Zapisano lokalnie", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Włącz zasilanie", exact: true }),
  ).toBeVisible();
  await expect(device(page, "H1")).toHaveAttribute("data-powered", "false");
  await page.getByRole("button", { name: /Pomiary\s+3/ }).click();
  await expect(page.locator(".log-content")).toContainText("229");
});
test("START/STOP reaguje na przytrzymanie i nie restartuje po zaniku", async ({
  page,
}) => {
  await example(page, "START / STOP z podtrzymaniem");
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  const start = page.getByRole("button", {
    name: "Przytrzymaj S1",
    exact: true,
  });
  await start.focus();
  await page.keyboard.down("Space");
  await expect(device(page, "K1")).toHaveAttribute("data-mechanism", "true");
  await page.keyboard.up("Space");
  await expect(device(page, "H1")).toHaveAttribute("data-powered", "true");
  const stop = page.getByRole("button", {
    name: "Przytrzymaj S0",
    exact: true,
  });
  await stop.focus();
  await page.keyboard.down("Space");
  await expect(device(page, "K1")).toHaveAttribute("data-mechanism", "false");
  await page.keyboard.up("Space");
  await start.focus();
  await page.keyboard.press("Space");
  await expect(device(page, "K1")).toHaveAttribute("data-mechanism", "true");
  await page.getByRole("button", { name: "Zasilanie ON", exact: true }).click();
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await expect(device(page, "K1")).toHaveAttribute("data-mechanism", "false");
});
test("izolowane 24 V DC i pomiar na rzeczywistych zaciskach HDR", async ({
  page,
}) => {
  await example(page, "Sterowanie 24 V DC");
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await measure(page, "PS1:+V1", "PS1:-V1", "voltage-dc");
  await expect(page.getByTestId("meter-value")).toContainText(/24/);
});
test("RCD: zasilanie od góry i dołu, TEST oraz dźwignia OFF → ON", async ({
  page,
}) => {
  await example(page, "Mała rozdzielnica");
  const base = await page.evaluate(async () => {
    const url = performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .find((url) => new URL(url).pathname === "/apps/web/src/store.ts")!;
    const { useApp } = await import(/* @vite-ignore */ url);
    return useApp.getState().project;
  });
  for (const [reverseL, reverseN] of [
    [false, false],
    [true, true],
    [true, false],
  ]) {
    await page.evaluate(
      async ({ base, reverseL, reverseN }) => {
        const url = performance
          .getEntriesByType("resource")
          .map((e) => e.name)
          .find((url) => new URL(url).pathname === "/apps/web/src/store.ts")!;
        const { useApp } = await import(/* @vite-ignore */ url);
        const project = structuredClone(base);
        const fi = project.circuit.devices.find(
          (d: { designation: string }) => d.designation === "FI1",
        );
        const swaps: Record<string, string> = {
          ...(reverseL ? { "1": "2", "2": "1" } : {}),
          ...(reverseN ? { "N-in": "N-out", "N-out": "N-in" } : {}),
        };
        for (const wire of project.circuit.conductors)
          for (const endpoint of [wire.from, wire.to])
            if (endpoint.deviceId === fi.id)
              endpoint.terminalId =
                swaps[endpoint.terminalId] ?? endpoint.terminalId;
        useApp.getState().load(project);
      },
      { base, reverseL, reverseN },
    );
    const fi = device(page, "FI1"),
      lamp = device(page, "H1");
    const lever = fi.getByRole("button", { name: "Przełącz FI1" });
    const testButton = fi.getByRole("button", { name: "TEST FI1" });
    await testButton.click();
    await expect(fi.locator("[data-rcd-lever]")).toHaveAttribute(
      "data-rcd-lever",
      "on",
    );
    await page
      .getByRole("button", { name: "Włącz zasilanie", exact: true })
      .click();
    await expect(lamp).toHaveAttribute("data-powered", "true");
    const position = await fi.locator("[data-device-body]").boundingBox();
    await testButton.click();
    await expect(fi.locator("[data-rcd-lever]")).toHaveAttribute(
      "data-rcd-lever",
      "tripped",
    );
    await expect(lamp).toHaveAttribute("data-powered", "false");
    expect(await fi.locator("[data-device-body]").boundingBox()).toEqual(
      position,
    );
    await lever.click();
    await expect(fi.locator("[data-rcd-lever]")).toHaveAttribute(
      "data-rcd-lever",
      "off",
    );
    await expect(lamp).toHaveAttribute("data-powered", "false");
    await lever.focus();
    await page.keyboard.press("Enter");
    await expect(fi.locator("[data-rcd-lever]")).toHaveAttribute(
      "data-rcd-lever",
      "on",
    );
    await expect(lamp).toHaveAttribute("data-powered", "true");
    await testButton.focus();
    await page.keyboard.press("Space");
    await expect(lamp).toHaveAttribute("data-powered", "false");
  }
});
test("próba RCD zmienia obwód i pozostawia wyzwolenie", async ({ page }) => {
  await example(page, "Mała rozdzielnica");
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  await page.getByLabel("Tryb pracy").selectOption("measure");
  await page.getByLabel("Funkcja miernika").selectOption("rcd");
  await page.getByLabel("Badany aparat").selectOption({ index: 1 });
  await terminal(page, "FI1:2").click();
  await terminal(page, "G1:PE").click();
  await page.getByRole("button", { name: "Wykonaj i zapisz pomiar" }).click();
  await expect(page.getByTestId("meter-value")).toContainText("50");
  await expect(device(page, "FI1")).toContainText("WYZWOLONY");
  await expect(device(page, "H1")).toHaveAttribute("data-powered", "false");
});
test("sandbox wybiera usterkę właściwą dla cewki i wpływa na podtrzymanie", async ({
  page,
}) => {
  await example(page, "START / STOP z podtrzymaniem");
  await terminal(page, "K1:A1").click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Pokaż lub ukryj inspektor" }).click();
  await expect(page.getByLabel("Rodzaj usterki")).toHaveValue("open-coil");
  await page
    .getByRole("button", { name: "Wprowadź usterkę", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Włącz zasilanie", exact: true })
    .click();
  const start = page.getByRole("button", {
    name: "Przytrzymaj S1",
    exact: true,
  });
  await start.focus();
  await page.keyboard.down("Space");
  await expect(device(page, "K1")).toHaveAttribute("data-mechanism", "false");
  await page.keyboard.up("Space");
  await expect(device(page, "H1")).toHaveAttribute("data-powered", "false");
});
test("ukryta diagnoza: eksport bez odpowiedzi, pomiar PE, naprawa i retest", async ({
  page,
}) => {
  await example(page, "Diagnoza ukrytej usterki", true);
  await terminal(page, "H1:PE").click();
  await page
    .getByLabel("Hipoteza diagnozy")
    .fill("Podejrzewam przerwę ochrony. Sprawdzę ciągłość.");
  await page.getByLabel("Hipoteza diagnozy").blur();
  await page.getByRole("button", { name: "Eksport", exact: true }).click();
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Projekt JSON/ }).click(),
  ]);
  const { readFile } = await import("node:fs/promises");
  const data = JSON.parse(await readFile((await file.path())!, "utf8"));
  expect(data.faults).toEqual([]);
  expect(data.training).toBeUndefined();
  await page.getByRole("button", { name: "Zamknij", exact: true }).click();
  await measure(page, "G1:PE", "H1:PE", "continuity");
  await expect(page.getByTestId("meter-value")).toContainText("OL");
  await page.getByLabel("Tryb pracy").selectOption("diagnosis");
  await page.getByRole("button", { name: "Schemat", exact: true }).click();
  // Locate the protective conductor through its displayed endpoint identifiers.
  const wires = page.getByLabel("Wybierz przewód instalacji");
  const pe = await wires
    .locator("option")
    .filter({ hasText: /→ H1:PE/ })
    .getAttribute("value");
  await wires.selectOption(pe!);
  await page.getByRole("button", { name: "Napraw zaznaczony element" }).click();
  await page.getByRole("button", { name: "Tablica", exact: true }).click();
  await measure(page, "G1:PE", "H1:PE", "continuity");
  await expect(page.getByTestId("meter-value")).not.toContainText("OL");
  await page.getByRole("button", { name: "Sprawdź", exact: true }).click();
  await page.getByRole("button", { name: /Ocena ćwiczenia/ }).click();
  await expect(page.locator(".log-content")).toContainText(
    "Ciągłość toru ochronnego",
  );
});
test("odrzucony import nie zastępuje projektu; katalog badawczy jest zapisany", async ({
  page,
}) => {
  await page.getByLabel("Import projektu").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"name":"bad"}'),
  });
  await expect(
    page.getByRole("heading", { name: "Lampa i łącznik", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Import katalogu badawczego", { exact: true })
    .setInputFiles(
      "Symulator_Elektryczny_Pakiet_Codex/catalog-research-seed.json",
    );
  await expect(page.getByText(/Zapisano 31 wpisów badawczych/)).toBeVisible();
});

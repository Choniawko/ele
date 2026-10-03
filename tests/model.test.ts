import { describe, it, expect } from "vitest";
import { clone, projectSchema } from "@model/index";
import { assertProjectCatalog, catalogInputSchema } from "@catalog/index";
import { normalizeResearch } from "@catalog/research";
import { scenarioProject, scenarios } from "@training/index";
import { parseProject, safeExport } from "../apps/web/src/persistence";
import { tutorContext, validateSuggestion } from "@tutor/index";
import { initialRuntime } from "@simulation/index";
import seed from "../Symulator_Elektryczny_Pakiet_Codex/catalog-research-seed.json";
describe("import, wersje i referencje", () => {
  it.each(scenarios)("każdy wzorzec można zapisać i otworzyć: $id", (s) => {
    const p = s.create();
    expect(parseProject(JSON.stringify(p))).toEqual(p);
  });
  it("round-trip zachowuje oba layouty, parametry i wersje SKU", () => {
    const p = scenarioProject("dc");
    p.physical.routes[p.circuit.conductors[0].id] = [{ x: 143, y: 122 }];
    expect(parseProject(JSON.stringify(p))).toEqual(p);
  });
  it("obca wersja wymaga migracji, bez cichej zmiany końców", () => {
    const p = scenarioProject("lamp"),
      original = clone(p);
    const input = { ...p, circuit: { ...p.circuit, schemaVersion: 2 } };
    expect(() => parseProject(JSON.stringify(input))).toThrow();
    expect(p).toEqual(original);
  });
  it("brakujący SKU, zacisk i wersja katalogu są odrzucane", () => {
    for (const kind of ["sku", "port", "version"]) {
      const p = scenarioProject("lamp");
      if (kind === "sku") p.circuit.devices[0].productId = "unknown-sku";
      if (kind === "port") p.circuit.conductors[0].from.terminalId = "fake";
      if (kind === "version") p.circuit.devices[0].productRevision = "old";
      expect(() => parseProject(JSON.stringify(p))).toThrow();
    }
  });
  it("nie pozwala nadpisać prądu znamionowego prawdziwego B16", () => {
    const p = scenarioProject("lamp");
    p.circuit.devices.find(
      (d) => d.designation === "QF1",
    )!.settings.ratedCurrentA = 10;
    expect(() => assertProjectCatalog(p)).toThrow(/stały/);
  });
  it("sprawdza pojemność zacisku również w importowanym JSON", () => {
    const p = scenarioProject("lamp"),
      w = clone(p.circuit.conductors[0]);
    w.id = "extra";
    p.circuit.conductors.push(w);
    expect(() => parseProject(JSON.stringify(p))).toThrow(/zacisku/);
  });
  it("blokuje NaN, skrypt jako kolor oraz nieskończoną długość", () => {
    const p = scenarioProject("lamp");
    p.circuit.conductors[0].electricalLengthM = Infinity;
    expect(projectSchema.safeParse(p).success).toBe(false);
    p.circuit.conductors[0].electricalLengthM = 1;
    p.circuit.conductors[0].insulationColor = "url(javascript:alert(1))";
    expect(projectSchema.safeParse(p).success).toBe(false);
  });
  it("eksport diagnozy nie ujawnia fault overlays, rozwiązania ani sesji", () => {
    const p = scenarioProject("diagnosis", true),
      original = clone(p),
      exported = safeExport(p);
    expect(exported.faults).toEqual([]);
    expect(exported.training).toBeUndefined();
    expect(exported.scenarioId).toBeUndefined();
    expect(p).toEqual(original);
  });
});
describe("katalog badawczy i tutor", () => {
  it("normalizacja nie publikuje 31 surowych rekordów ani nie wymyśla wymiarów", () => {
    const r = normalizeResearch(seed);
    expect(r.products).toHaveLength(31);
    expect(
      r.products.every((p) => !p.published && p.dimensions.value === null),
    ).toBe(true);
    expect(r.products[0].facts[0].evidence).toHaveLength(1);
  });
  it("blokuje wymuszoną publikację, zduplikowane ID i brakujące źródło", () => {
    for (const kind of ["published", "duplicate", "source"]) {
      const data = clone(seed);
      if (kind === "published") data.products[0].published = true;
      if (kind === "duplicate") data.products[1].id = data.products[0].id;
      if (kind === "source") data.products[0].sourceIds.push("fake-source");
      expect(catalogInputSchema.safeParse(data).success).toBe(false);
    }
  });
  it("tutor otrzymuje obserwacje bez ukrytej przyczyny", () => {
    const p = scenarioProject("diagnosis", true),
      data = tutorContext(p, initialRuntime(p), []);
    const text = JSON.stringify(data);
    expect(text).not.toContain('"faults"');
    expect(text).not.toContain("open-wire");
    expect(text).not.toContain(p.faults[0].id);
  });
  it("tutor nie może zlecić przełączenia ani nieistniejącego pomiaru", () => {
    const p = scenarioProject("lamp");
    expect(() =>
      validateSuggestion(
        {
          explanation: "Test",
          hypothesis: "Test",
          execute: { type: "power", on: true },
        },
        p,
      ),
    ).toThrow();
    expect(() =>
      validateSuggestion(
        {
          explanation: "Test",
          hypothesis: "Test",
          suggestedMeasurement: {
            function: "continuity",
            red: { deviceId: "fake", terminalId: "PE" },
            reason: "Test",
          },
        },
        p,
      ),
    ).toThrow(/zacisk/);
  });
});

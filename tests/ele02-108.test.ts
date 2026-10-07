import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalog, validateCatalog } from "@catalog/index";
import { validateProjectDocument } from "@catalog/project-validation";
import { clone, terminalKey, type ProjectDocument } from "@model/index";
import {
  advance,
  initialRuntime,
  compile,
  type RuntimeSnapshot,
} from "@simulation/index";
import { voltageBetween, magnitude } from "@simulation/numeric";
import { mechanismOwner } from "@simulation/mechanisms";
import { parseProject, safeExport } from "../apps/web/src/persistence";
import { scenarioProject } from "@training/index";

const example = () =>
  validateProjectDocument(
    JSON.parse(
      readFileSync("examples/physical/ELE02_108_stanowisko.json", "utf8"),
    ),
  );
const on = (p: ProjectDocument) =>
  advance(p, initialRuntime(p), { type: "power", on: true });
const operate = (
  p: ProjectDocument,
  r: RuntimeSnapshot,
  deviceId: string,
  state: boolean,
  actuator?: "start" | "stop",
) => advance(p, r, { type: "operate", deviceId, state, actuator });
function expectRun(r: RuntimeSnapshot, direction?: "123" | "132") {
  expect(r.status, r.errors.join("; ")).toBe("valid");
  expect(r.devices.M.powered).toBe(!!direction);
  expect(r.devices.K1.mechanism).toBe(direction === "123");
  expect(r.devices.K2.mechanism).toBe(direction === "132");
  if (direction) expect(r.devices.M.direction).toBe(direction);
}
const paths = (p: ProjectDocument, r: RuntimeSnapshot) =>
  compile(p, r).map((b) => b.id);
function expectQ2(p: ProjectDocument, r: RuntimeSnapshot, closed: boolean) {
  const ids = paths(p, r);
  for (const branch of ["Q2/pole1", "Q2/pole2", "Q2/pole3", "Q2.AUX/no"])
    expect(ids.includes(branch), branch).toBe(closed);
  expect(r.devices["Q2.AUX"].mechanism).toBe(closed);
}
describe("ELE.02-108: Q2 i niezależne START/STOP", () => {
  it("trzy tory i NO 13–14 podążają wspólnie za ON/OFF, bez fikcyjnej cewki", () => {
    const p = example();
    expect(catalog["edu-motor-protection"].topology.coil).toBeUndefined();
    expect(mechanismOwner(p, "Q2.AUX")).toBe("Q2");
    const r = on(p);
    expectQ2(p, r, true);
    expectQ2(p, operate(p, r, "Q2", false), false);
  });
  it("START i STOP w każdym zespole są niezależne, również gdy oba są trzymane", () => {
    const p = example();
    for (const id of ["S1", "S3"]) {
      let r = operate(p, on(p), id, true, "start");
      expect(paths(p, r)).toContain(`${id}/start`);
      expect(paths(p, r)).toContain(`${id}/stop`);
      r = operate(p, r, id, true, "stop");
      expect(paths(p, r)).toContain(`${id}/start`);
      expect(paths(p, r)).not.toContain(`${id}/stop`);
      expectRun(r);
      r = operate(p, r, id, false, "start");
      expect(paths(p, r)).not.toContain(`${id}/start`);
      expect(paths(p, r)).not.toContain(`${id}/stop`);
    }
  });
  it.each(["S1", "S3"])(
    "START %s podtrzymuje prawy kierunek, oba STOP-y go przerywają",
    (start) => {
      const p = example();
      for (const stop of ["S1", "S3"]) {
        let r = operate(p, on(p), start, true, "start");
        expectRun(r, "123");
        r = operate(p, r, start, false, "start");
        expectRun(r, "123");
        r = operate(p, r, stop, true, "stop");
        expectRun(r);
        r = operate(p, r, stop, false, "stop");
        expectRun(r);
      }
    },
  );
  it.each(["S2", "S4"])(
    "%s uruchamia lewy tylko podczas trzymania; oba STOP-y także go przerywają",
    (left) => {
      const p = example();
      let r = operate(p, on(p), left, true);
      expectRun(r, "132");
      r = operate(p, r, left, false);
      expectRun(r);
      for (const stop of ["S1", "S3"]) {
        r = operate(p, r, left, true);
        r = operate(p, r, stop, true, "stop");
        expectRun(r);
        r = operate(p, r, stop, false, "stop");
        expectRun(r, "132"); // Holding left while releasing STOP requests a start.
        r = operate(p, r, left, false);
      }
    },
  );
  it("dwa lewe przyciski są równoległe: zwolnienie jednego nie zatrzymuje drugiego", () => {
    const p = example();
    let r = operate(p, on(p), "S2", true);
    r = operate(p, r, "S4", true);
    r = operate(p, r, "S2", false);
    expectRun(r, "132");
    expectRun(operate(p, r, "S4", false));
  });
  it.each(["123", "132"] as const)(
    "NC blokuje drugi kierunek podczas pracy %s, bez interlock",
    (first) => {
      const p = example();
      expect(
        p.circuit.mechanicalCouplings.some((c) => c.kind === "interlock"),
      ).toBe(false);
      let r =
        first === "123"
          ? operate(p, on(p), "S1", true, "start")
          : operate(p, on(p), "S2", true);
      r =
        first === "123"
          ? operate(p, r, "S2", true)
          : operate(p, r, "S1", true, "start");
      expectRun(r, first);
    },
  );
  it("jednoczesne żądanie od spoczynku wybiera jeden kierunek przez styki NC", () => {
    const p = example(),
      previous = on(p);
    previous.devices.S1.manual = true;
    previous.devices.S2.manual = true;
    const r = advance(p, previous, { type: "solve" });
    expectRun(r, "123"); // Deterministic coil iteration order, not mechanical interlock.
    expect(r.solution.branches.some((b) => b.id === "K2/pole1")).toBe(false);
  });
  it.each(["123", "132"] as const)(
    "otwarcie Q2 wyłącza styczniki z pracy %s, Q1 pozostaje zasilany",
    (dir) => {
      const p = example();
      let r =
        dir === "123"
          ? operate(p, on(p), "S1", true, "start")
          : operate(p, on(p), "S2", true);
      r = operate(p, r, "Q2", false);
      expectQ2(p, r, false);
      expectRun(r);
      const u = voltageBetween(r.solution, "Q1:2", "PZ:N");
      expect(u && magnitude(u)).toBeGreaterThan(225);
    },
  );
  it("przeciążenie wyzwala wszystkie tory i pomocniczy; ON nie zastępuje resetu", () => {
    const p = example();
    p.circuit.devices.find((d) => d.id === "M")!.settings.loadFactor = 2;
    let r = operate(p, on(p), "S1", true, "start");
    expect(r.devices.Q2.tripped).toBe(false);
    r = operate(p, r, "S1", false, "start");
    r = advance(p, r, { type: "step", deltaMs: 30000 });
    expect(r.devices.Q2.tripped).toBe(true);
    expect(r.devices.Q2.tripCause).toContain("cieplne");
    expectQ2(p, r, false);
    expectRun(r);
    p.circuit.devices.find((d) => d.id === "M")!.settings.loadFactor = 1;
    r = operate(p, r, "Q2", true);
    expectQ2(p, r, false);
    r = advance(p, r, { type: "operate", deviceId: "Q2", reset: true });
    expect(r.devices.Q2.tripped).toBe(false);
    expect(r.devices.Q2.heat).toBe(0);
    expectQ2(p, r, false);
    r = operate(p, r, "Q2", true);
    expectQ2(p, r, true);
    expectRun(r);
  });
  it("zwarcie jednej fazy za Q2 wyzwala wspólnie, OFF świadomie resetuje", () => {
    const p = example();
    p.faults.push({
      id: "short",
      kind: "short-circuit",
      targetId: "Q2",
      from: { deviceId: "Q2", terminalId: "4" },
      to: { deviceId: "PZ", terminalId: "N" },
      resistanceOhm: 0.02,
      activeAtMs: 0,
      hidden: false,
    });
    let r = on(p);
    expect(r.devices.Q2.tripCause).toContain("magnetyczny");
    expectQ2(p, r, false);
    expectRun(r);
    p.faults = [];
    r = advance(p, r, { type: "solve" });
    expect(r.devices.Q2.tripped).toBe(true);
    r = operate(p, r, "Q2", false);
    expect(r.devices.Q2.tripped).toBe(false);
    expectQ2(p, r, false);
    expectQ2(p, operate(p, r, "Q2", true), true);
  });
  it.each(["source", "Q2", "Q1"])(
    "zwolniony START: brak samoczynnego restartu po powrocie %s",
    (supply) => {
      const p = example();
      let r = operate(p, on(p), "S3", true, "start");
      r = operate(p, r, "S3", false, "start");
      expectRun(r, "123");
      for (const state of [false, true]) {
        r =
          supply === "source"
            ? advance(p, r, { type: "power", on: state })
            : operate(p, r, supply, state);
        expectRun(r);
      }
    },
  );
  it.each(["S1", "S3", "S2", "S4"])(
    "trzymany %s: powrót źródła/Q2 uruchamia zgodnie ze schematem",
    (id) => {
      const p = example(),
        right = id === "S1" || id === "S3";
      for (const supply of ["source", "Q2"]) {
        let r = operate(p, on(p), id, true, right ? "start" : undefined);
        r =
          supply === "source"
            ? advance(p, r, { type: "power", on: false })
            : operate(p, r, supply, false);
        expectRun(r);
        r =
          supply === "source"
            ? advance(p, r, { type: "power", on: true })
            : operate(p, r, supply, true);
        expectRun(r, right ? "123" : "132");
        r = operate(p, r, id, false, right ? "start" : undefined);
        expectRun(r, right ? "123" : undefined);
      }
    },
  );
});
describe("przykład ELE.02-108 i zgodność zapisu", () => {
  it("import/eksport zachowuje aktualny format, powiązanie Q2, niezależne przyciski i stare projekty", () => {
    const p = example();
    expect(parseProject(JSON.stringify(safeExport(p)))).toEqual(p);
    expect(validateCatalog()).toEqual([]);
    for (const id of ["lamp", "start-stop", "three-phase", "exam-reversing"]) {
      const legacy = scenarioProject(id);
      expect(parseProject(JSON.stringify(safeExport(legacy)))).toEqual(legacy);
    }
  });
  it("odrzuca dwóch właścicieli pomocniczego Q2 i powiązanie z silnikiem", () => {
    const p = example();
    p.circuit.mechanicalCouplings[0].deviceIds.push("K1");
    expect(() => validateProjectDocument(p)).toThrow(/jednego mechanizmu/);
    p.circuit.mechanicalCouplings[0].deviceIds = ["M", "Q2.AUX"];
    expect(() => validateProjectDocument(p)).toThrow(/jednego mechanizmu/);
    p.circuit.mechanicalCouplings[0].deviceIds = ["Q2", "Q2.AUX"];
    p.circuit.mechanicalCouplings.push(clone(p.circuit.mechanicalCouplings[0]));
    expect(() => validateProjectDocument(p)).toThrow(/jednego mechanizmu/);
  });
  it("ma pięć, cztery i pięć żył odpowiednich kabli, bez dużych szyn i obejścia Q2", () => {
    const p = example();
    expect(
      p.circuit.cables.map((c) => [c.designation, c.coreIds.length]),
    ).toEqual([
      ["OWY 5×2,5 mm²", 5],
      ["OWY 4×2,5 mm²", 4],
      ["YLY 5×1,5 mm²", 5],
    ]);
    for (const cable of p.circuit.cables)
      for (const id of cable.coreIds) {
        const w = p.circuit.conductors.find((w) => w.id === id)!;
        expect(w.cableId).toBe(cable.id);
        expect(w.crossSectionMm2).toBe(cable.id === "C.R2" ? 1.5 : 2.5);
      }
    expect(
      p.circuit.devices.some((d) => d.productId.startsWith("edu-bus")),
    ).toBe(false);
    expect(
      p.circuit.devices.find((d) => d.id === "Q2")!.settings.ratedCurrentA,
    ).toBe(4.35);
    expect(p.userMetadata.motorAssumption).toContain("ZAŁOŻENIEM");
    expect(
      p.circuit.conductors.some(
        (w) => terminalKey(w.from) === "Q2:1" && terminalKey(w.to) === "Q1:1",
      ),
    ).toBe(true);
  });
});

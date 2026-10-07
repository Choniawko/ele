import { describe, expect, it } from "vitest";
import fixture from "../examples/physical/ELE02_101_stanowisko.json";
import { validateProjectDocument } from "@catalog/project-validation";
import { catalog } from "@catalog/index";
import { clone, terminalKey } from "@model/index";
import {
  enclosureFor,
  translateEnclosure,
  physicalTerminalAccessible,
} from "@model/physical";
import {
  advance,
  initialRuntime,
  equivalentResistance,
  compile,
} from "@simulation/index";
import { measure } from "@measurements/index";
import { measurementWirePath } from "@editor/physical-highlight";
const project = () => validateProjectDocument(clone(fixture));
const ref = (deviceId: string, terminalId: string) => ({
  deviceId,
  terminalId,
});
const power = (p: ReturnType<typeof project>) =>
  advance(p, initialRuntime(p), { type: "power", on: true });
const voltage = (p: ReturnType<typeof project>, rt: ReturnType<typeof power>) =>
  measure(p, rt, {
    function: "voltage-ac",
    red: ref("GW", "test-L"),
    black: ref("GW", "test-N"),
    testVoltageV: 500,
    compensateLeads: true,
    rcdMultiplier: 1,
  });
describe("ELE.02-101 · stanowisko fizyczne", () => {
  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])(
    "Q1=%s Q2=%s: obie oprawy razem, gniazdo i kontrolki niezależnie",
    (q1, q2) => {
      const p = project();
      p.circuit.devices.find((d) => d.id === "Q1")!.settings.position = q1;
      p.circuit.devices.find((d) => d.id === "Q2")!.settings.position = q2;
      const rt = power(p);
      expect(rt.status).toBe("valid");
      expect(rt.devices.OP1.powered).toBe(q1 === q2);
      expect(rt.devices.OP2.powered).toBe(q1 === q2);
      expect(rt.devices.H1.powered).toBe(true);
      expect(rt.devices.H2.powered).toBe(true);
      expect(voltage(p, rt).value).toBeGreaterThan(225);
      expect(rt.devices.RCD.tripped).toBe(false);
    },
  );
  it.each(["B10", "B6"])(
    "%s odłącza tylko właściwy obwód i jego kontrolkę",
    (id) => {
      const p = project(),
        rt = advance(p, power(p), {
          type: "operate",
          deviceId: id,
          state: false,
        });
      expect(rt.devices.H1.powered).toBe(id !== "B10");
      expect(rt.devices.H2.powered).toBe(id !== "B6");
      expect(rt.devices.OP1.powered).toBe(id !== "B6");
      expect((voltage(p, rt).value ?? 0) > 200).toBe(id !== "B10");
    },
  );
  it.each(["H1", "H2"])(
    "%s: przerwa L lub N wyłącza dwuzaciskową kontrolkę",
    (id) => {
      expect(
        catalog["edu-indicator-green-230"].topology.terminals.map((t) => t.id),
      ).toEqual(["L", "N"]);
      for (const terminalId of ["L", "N"]) {
        const p = project(),
          w = p.circuit.conductors.find((w) =>
            [w.from, w.to].some(
              (r) => r.deviceId === id && r.terminalId === terminalId,
            ),
          )!;
        p.faults.push({
          id: "open",
          kind: "open-wire",
          targetId: w.id,
          hidden: false,
          activeAtMs: 0,
        });
        expect(power(p).devices[id].powered).toBe(false);
      }
    },
  );
  it("TEST RCD odłącza oba obwody, gniazdo i obie kontrolki", () => {
    const p = project(),
      rt = advance(p, power(p), { type: "test-rcd", deviceId: "RCD" });
    expect(rt.devices.RCD.tripped).toBe(true);
    for (const id of ["H1", "H2", "OP1", "OP2"])
      expect(rt.devices[id].powered).toBe(false);
    expect(voltage(p, rt).value ?? 0).toBeLessThan(1);
  });
  it.each([
    ["PZ", "R.PE"],
    ["R.PE", "GW"],
    ["R.PE", "OP1"],
    ["R.PE", "OP2"],
  ])("ciągłość PE %s→%s wynika z przewodów; przerwa jest wykrywana", (a, b) => {
    const p = project(),
      red = ref(a, a === "R.PE" ? "1" : "PE"),
      black = ref(b, b === "R.PE" ? "1" : "PE");
    const request = {
      function: "continuity" as const,
      red,
      black,
      testVoltageV: 500 as const,
      compensateLeads: true,
      rcdMultiplier: 1 as const,
    };
    const result = measure(p, initialRuntime(p), request);
    expect(result.status).toBe("valid");
    expect(result.value).toBeLessThan(1);
    const wireIds = measurementWirePath(p, red, black);
    expect(wireIds.size).toBeGreaterThan(0);
    p.faults.push({
      id: "pe-open",
      targetId: [...wireIds][0],
      kind: "open-wire",
      activeAtMs: 0,
      hidden: true,
    });
    expect(measurementWirePath(p, red, black)).toEqual(wireIds);
    expect(measure(p, initialRuntime(p), request).status).toBe("open-circuit");
  });
  it("puszki i wspólne korytko nie zwierają niezależnych złączek", () => {
    const p = project();
    p.circuit.conductors = [];
    p.physical.trunking!.forEach((t) => (t.conductorIds = []));
    const branches = compile(p, initialRuntime(p), { deenergized: true });
    expect(
      equivalentResistance(
        branches,
        terminalKey(ref("P1.N", "1")),
        terminalKey(ref("P1.N", "2")),
      ),
    ).toBeCloseTo(0.005, 6);
    for (const [a, b] of [
      ["P1.N", "P1.PE"],
      ["P1.T1", "P1.T2"],
      ["P1.N", "P2.N"],
    ])
      expect(equivalentResistance(branches, `${a}:1`, `${b}:1`)).toBeNull();
  });
  it("przenoszenie i pokrywy zachowują ID, zaciski, przekroje, długości i wyniki solvera", () => {
    const p = project(),
      before = clone(p.circuit),
      rt = power(p);
    translateEnclosure(p, "case-R", { x: 115, y: 360 });
    translateEnclosure(p, "case-P1", { x: 622, y: 410 });
    for (const e of p.physical.enclosures!) e.closed = false;
    for (const t of p.physical.trunking!) t.closed = false;
    p.physical.presentation = "connections";
    expect(validateProjectDocument(p).circuit).toEqual(before);
    expect(physicalTerminalAccessible(p, "P1.N")).toBe(true);
    expect(enclosureFor(p, "H1")?.id).toBe("case-R");
    expect(power(p).devices).toEqual(rt.devices);
    const exported = JSON.parse(JSON.stringify(p));
    expect(validateProjectDocument(exported)).toEqual(p);
  });
  it("odrzuca obce elementy, wyjście poza obudowę i ukośne korytko", () => {
    for (const mutate of [
      (p: ReturnType<typeof project>) =>
        p.physical.enclosures![0].deviceIds.push("missing"),
      (p: ReturnType<typeof project>) =>
        p.physical.enclosures![0].deviceIds.push("H1"),
      (p: ReturnType<typeof project>) => (p.physical.devices.H1.x += 2000),
      (p: ReturnType<typeof project>) =>
        (p.physical.trunking![0].points[0].y += 1),
    ]) {
      const p = project();
      mutate(p);
      expect(() => validateProjectDocument(p)).toThrow();
    }
  });
});

import { describe, expect, it } from "vitest";
import {
  catalog,
  validateCatalog,
  realProducts,
  assertProjectCatalog,
} from "@catalog/index";
import {
  clone,
  conductorResistance,
  terminalKey,
  type ProjectDocument,
} from "@model/index";
import {
  advance,
  initialRuntime,
  solveNetwork,
  c,
  phasor,
  magnitude,
  voltageBetween,
  equivalentResistance,
  type RuntimeSnapshot,
} from "@simulation/index";
import { measure, type MeasurementRequest } from "@measurements/index";
import { scenarioProject, scenarios, checkScenario } from "@training/index";
const request = (
  functionName: MeasurementRequest["function"],
  red?: MeasurementRequest["red"],
  black?: MeasurementRequest["black"],
): MeasurementRequest => ({
  function: functionName,
  red,
  black,
  testVoltageV: 500,
  rcdMultiplier: 1,
  compensateLeads: true,
});
const power = (p: ProjectDocument) =>
  advance(p, initialRuntime(p), { type: "power", on: true });
const named = (p: ProjectDocument, name: string) =>
  p.circuit.devices.find((d) => d.designation === name)!;
const ref = (p: ProjectDocument, name: string, terminalId: string) => ({
  deviceId: named(p, name).id,
  terminalId,
});
function reverseRcdPoles(
  p: ProjectDocument,
  reverseL: boolean,
  reverseN: boolean,
) {
  const fi = named(p, "FI1");
  const swaps: Record<string, string> = {
    ...(reverseL ? { "1": "2", "2": "1" } : {}),
    ...(reverseN ? { "N-in": "N-out", "N-out": "N-in" } : {}),
  };
  for (const wire of p.circuit.conductors)
    for (const endpoint of [wire.from, wire.to])
      if (endpoint.deviceId === fi.id)
        endpoint.terminalId = swaps[endpoint.terminalId] ?? endpoint.terminalId;
}
describe("RCD/RCBO — zasilanie i obsługa aparatu", () => {
  for (const productId of ["edu-rcd", "edu-rcbo"])
    for (const [reverseL, reverseN] of [
      [false, false],
      [true, true],
      [true, false],
      [false, true],
    ]) {
      it(`${productId}: L od ${reverseL ? "dołu" : "góry"}, N od ${reverseN ? "dołu" : "góry"}: bilans, upływ i TEST`, () => {
        const p = scenarioProject("distribution");
        const fi = named(p, "FI1");
        fi.productId = productId;
        fi.settings = { ...catalog[productId].defaults };
        reverseRcdPoles(p, reverseL, reverseN);
        const balanced = power(p);
        expect(balanced.status).toBe("valid");
        expect(balanced.devices[fi.id].tripped).toBe(false);
        expect(balanced.devices[named(p, "H1").id].powered).toBe(true);
        const measured = measure(p, balanced, {
          ...request(
            "rcd",
            ref(p, "FI1", reverseL ? "1" : "2"),
            ref(p, "G1", "PE"),
          ),
          deviceId: fi.id,
        });
        expect(measured.value).toBe(50);
        expect(measured.afterRuntime?.devices[fi.id].tripped).toBe(true);
        const tested = advance(p, balanced, {
          type: "test-rcd",
          deviceId: fi.id,
        });
        expect(tested.devices[fi.id].tripped).toBe(true);
        expect(tested.devices[fi.id].tripCause).toContain("TEST");
        expect(tested.devices[named(p, "H1").id].powered).toBe(false);
        expect(p.faults).toHaveLength(0);
        const bypass = clone(p);
        const neutral = bypass.circuit.conductors.find(
          (w) => w.from.deviceId === fi.id && w.declaredRole === "N",
        )!;
        neutral.from = ref(bypass, "G1", "N");
        expect(power(bypass).devices[fi.id].tripped).toBe(true);
        p.faults.push({
          id: "leak",
          kind: "leakage",
          targetId: named(p, "H1").id,
          from: ref(p, "H1", "L"),
          to: ref(p, "H1", "PE"),
          resistanceOhm: 23000,
          hidden: false,
          activeAtMs: 0,
        });
        expect(power(p).devices[fi.id].tripped).toBe(false);
        p.faults[0].resistanceOhm = 4600;
        expect(power(p).devices[fi.id].tripped).toBe(true);
      });
    }
  it("TEST działa bez odbiornika; wymaga napięcia, zamkniętych styków i sprawnego RCD", () => {
    const p = scenarioProject("distribution"),
      fi = named(p, "FI1");
    p.circuit.conductors = p.circuit.conductors.filter(
      (w) =>
        w.from.deviceId !== named(p, "H1").id &&
        w.to.deviceId !== named(p, "H1").id,
    );
    const test = (r: RuntimeSnapshot) =>
      advance(p, r, { type: "test-rcd", deviceId: fi.id });
    expect(test(initialRuntime(p)).devices[fi.id].tripped).toBe(false);
    expect(test(power(p)).devices[fi.id].tripped).toBe(true);
    const off = advance(p, power(p), {
      type: "operate",
      deviceId: fi.id,
      state: false,
    });
    expect(test(off).devices[fi.id].tripped).toBe(false);
    p.faults.push({
      id: "failure",
      kind: "rcd-failure",
      targetId: fi.id,
      hidden: false,
      activeAtMs: 0,
    });
    const broken = test(power(p));
    expect(broken.devices[fi.id].tripped).toBe(false);
    expect(broken.events.at(-1)?.message).toContain("brak zadziałania");
  });
  it("wyzwolenie jest zatrzaśnięte; dźwignia OFF resetuje, ON ponownie załącza", () => {
    const p = scenarioProject("distribution"),
      fi = named(p, "FI1"),
      lamp = named(p, "H1");
    let r = advance(p, power(p), { type: "test-rcd", deviceId: fi.id });
    r = advance(p, r, { type: "power", on: false });
    r = advance(p, r, { type: "power", on: true });
    r = advance(p, r, { type: "operate", deviceId: fi.id, state: true });
    expect(r.devices[fi.id].tripped).toBe(true);
    expect(r.devices[lamp.id].powered).toBe(false);
    r = advance(p, r, { type: "operate", deviceId: fi.id, state: false });
    expect(r.devices[fi.id].tripped).toBe(false);
    expect(r.devices[fi.id].manual).toBe(false);
    expect(r.devices[lamp.id].powered).toBe(false);
    r = advance(p, r, { type: "operate", deviceId: fi.id, state: true });
    expect(r.devices[lamp.id].powered).toBe(true);
    p.faults.push({
      id: "leak",
      kind: "leakage",
      targetId: lamp.id,
      from: ref(p, "H1", "L"),
      to: ref(p, "H1", "PE"),
      resistanceOhm: 4600,
      hidden: false,
      activeAtMs: 0,
    });
    r = advance(p, r, { type: "solve" });
    r = advance(p, r, { type: "operate", deviceId: fi.id, state: false });
    r = advance(p, r, { type: "operate", deviceId: fi.id, state: true });
    expect(r.devices[fi.id].tripped).toBe(true);
    expect(r.devices[lamp.id].powered).toBe(false);
  });
});
function op(
  p: ProjectDocument,
  r: RuntimeSnapshot,
  name: string,
  state?: boolean,
) {
  return advance(p, r, { type: "operate", deviceId: named(p, name).id, state });
}
describe("MNA — niezależne rozwiązania analityczne", () => {
  it("230 V i 23 Ω → 10 A; skończona rezystancja źródła zmienia wynik", () => {
    for (const resistance of [0, 0.4, 3]) {
      const r = solveNetwork([
        {
          id: "g",
          from: "L",
          to: "N",
          resistanceOhm: resistance,
          voltage: c(230),
          domain: "AC",
        },
        { id: "load", from: "L", to: "N", resistanceOhm: 23 },
      ]);
      expect(r.status).toBe("valid");
      expect(r.currents.load.re).toBeCloseTo(230 / (23 + resistance), 8);
    }
  });
  it("równoległe rezystancje, suma prądów, KCL i bilans mocy", () => {
    const r = solveNetwork([
      { id: "g", from: "l", to: "n", resistanceOhm: 0.4, voltage: c(230) },
      { id: "a", from: "l", to: "n", resistanceOhm: 23 },
      { id: "b", from: "l", to: "n", resistanceOhm: 46 },
    ]);
    expect(r.currents.a.re).toBeCloseTo(r.currents.b.re * 2, 8);
    expect(r.currents.a.re + r.currents.b.re + r.currents.g.re).toBeCloseTo(
      0,
      8,
    );
    const total =
      r.currents.a.re ** 2 * 23 +
      r.currents.b.re ** 2 * 46 +
      r.currents.g.re ** 2 * 0.4;
    expect(total).toBeCloseTo(-230 * r.currents.g.re, 7);
    expect(
      equivalentResistance(
        [
          { id: "a", from: "l", to: "n", resistanceOhm: 100 },
          { id: "b", from: "l", to: "n", resistanceOhm: 100 },
        ],
        "l",
        "n",
      ),
    ).toBeCloseTo(50, 8);
  });
  it("trzy fazy mają 120°, √3×230 V i symetryczny prąd N", () => {
    const bs = [0, 1, 2].flatMap((i) => [
      {
        id: `g${i}`,
        from: `L${i}`,
        to: "N",
        resistanceOhm: 0,
        voltage: phasor(230, -i * 120),
        domain: "AC" as const,
      },
      { id: `r${i}`, from: `L${i}`, to: "N", resistanceOhm: 23 },
    ]);
    const r = solveNetwork(bs);
    expect(magnitude(voltageBetween(r, "L0", "L1")!)).toBeCloseTo(
      Math.sqrt(3) * 230,
      8,
    );
    expect(
      [0, 1, 2].reduce((sum, i) => sum + r.currents[`r${i}`].re, 0),
    ).toBeCloseTo(0, 8);
    expect(
      [0, 1, 2].reduce((sum, i) => sum + r.currents[`r${i}`].im, 0),
    ).toBeCloseTo(0, 8);
  });
  it("izolowany DC nie łączy się z N/PE", () => {
    const r = solveNetwork([
      {
        id: "g",
        from: "L",
        to: "N",
        resistanceOhm: 0,
        voltage: c(230),
        domain: "AC",
      },
      {
        id: "dc",
        from: "+",
        to: "-",
        resistanceOhm: 0,
        voltage: c(24),
        domain: "DC",
      },
    ]);
    expect(voltageBetween(r, "+", "-")?.re).toBe(24);
    expect(voltageBetween(r, "+", "N")).toBeNull();
  });
  it("wyspa pływająca nie dostaje fałszywego 0 V względem PE", () => {
    const r = solveNetwork(
      [{ id: "r", from: "a", to: "b", resistanceOhm: 100 }],
      ["PE"],
    );
    expect(voltageBetween(r, "a", "PE")).toBeNull();
  });
  it("zwarcie I=U/Z i błąd źródeł idealnych bez NaN", () => {
    const r = solveNetwork([
      { id: "g", from: "l", to: "n", resistanceOhm: 0.4, voltage: c(230) },
      { id: "short", from: "l", to: "n", resistanceOhm: 0.06 },
    ]);
    expect(r.currents.short.re).toBeCloseTo(500, 8);
    const invalid = solveNetwork([
      { id: "a", from: "l", to: "n", resistanceOhm: 0, voltage: c(230) },
      { id: "b", from: "l", to: "n", resistanceOhm: 0, voltage: c(24) },
    ]);
    expect(invalid.status).toBe("solver-error");
    expect(JSON.stringify(invalid)).not.toMatch(/NaN|Infinity/);
  });
  it("AC i DC w jednej wyspie zwracają jawny brak obsługi", () => {
    expect(
      solveNetwork([
        {
          id: "a",
          from: "l",
          to: "n",
          resistanceOhm: 1,
          voltage: c(230),
          domain: "AC",
        },
        {
          id: "b",
          from: "l",
          to: "n",
          resistanceOhm: 1,
          voltage: c(24),
          domain: "DC",
        },
      ]).status,
    ).toBe("solver-error");
  });
});
describe("rzeczywisty obwód i usterki", () => {
  it("lampa reaguje na topologię, a trasa/kolor nie zmienia wyniku", () => {
    const p = scenarioProject("lamp"),
      r = power(p);
    expect(r.status).toBe("valid");
    const lamp = named(p, "H1");
    expect(r.devices[lamp.id].powered).toBe(true);
    const moved = clone(p);
    moved.physical.devices[lamp.id] = { x: 1000, y: 1000 };
    moved.physical.routes[moved.circuit.conductors[0].id] = [
      { x: 1000, y: 600 },
    ];
    moved.circuit.conductors[0].insulationColor = "#000000";
    expect(power(moved).devices[lamp.id].voltageV).toBeCloseTo(
      r.devices[lamp.id].voltageV!,
      8,
    );
    expect(op(p, r, "S1", false).devices[lamp.id].powered).toBe(false);
  });
  it("przerwa N gasi lampę; przerwa PE nie gasi, ale nie zalicza ochrony", () => {
    for (const role of ["N", "PE"]) {
      const p = scenarioProject("lamp"),
        wire = p.circuit.conductors.find(
          (w) => w.to.deviceId === named(p, "H1").id && w.declaredRole === role,
        )!;
      p.faults.push({
        id: "f",
        kind: "open-wire",
        targetId: wire.id,
        hidden: true,
        activeAtMs: 0,
      });
      const r = power(p);
      expect(r.devices[named(p, "H1").id].powered).toBe(role === "PE");
      if (role === "PE")
        expect(checkScenario(p, r, []).find((c) => c.id === "pe")?.passed).toBe(
          false,
        );
    }
  });
  it("luźny zacisk zwiększa spadek U i straty I²R", () => {
    const p = scenarioProject("socket"),
      r = power(p),
      wire = p.circuit.conductors.find(
        (w) => w.to.deviceId === named(p, "R1").id && w.declaredRole === "L1",
      )!;
    p.faults.push({
      id: "f",
      kind: "loose-terminal",
      targetId: wire.id,
      hidden: false,
      resistanceOhm: 5,
      activeAtMs: 0,
    });
    const after = power(p);
    expect(after.devices[named(p, "R1").id].voltageV!).toBeLessThan(
      r.devices[named(p, "R1").id].voltageV!,
    );
    const branch = after.solution.branches.find((b) => b.id === wire.id)!;
    expect(branch.resistanceOhm).toBeCloseTo(
      5 + conductorResistance(wire, p.circuit.installationConditions),
    );
  });
  it("MCB wyzwala na zwarcie, pozostaje zatrzaśnięty i wymaga resetu", () => {
    const p = scenarioProject("lamp"),
      l = named(p, "H1");
    p.faults.push({
      id: "f",
      kind: "short-circuit",
      targetId: l.id,
      from: ref(p, "H1", "L"),
      to: ref(p, "H1", "N"),
      resistanceOhm: 0.02,
      hidden: false,
      activeAtMs: 0,
    });
    const r = power(p),
      q = named(p, "QF1");
    expect(r.devices[q.id].tripped).toBe(true);
    expect(r.devices[l.id].powered).toBe(false);
    p.faults = [];
    const still = advance(p, r, { type: "solve" });
    expect(still.devices[q.id].tripped).toBe(true);
    const reset = advance(p, still, {
      type: "operate",
      deviceId: q.id,
      reset: true,
    });
    expect(reset.devices[q.id].tripped).toBe(false);
    expect(reset.devices[q.id].manual).toBe(false);
  });
  it("małe przeciążenie nie daje natychmiastowego wyzwolenia", () => {
    const p = scenarioProject("socket");
    named(p, "R1").settings.powerW = 4000;
    let r = power(p);
    const q = named(p, "QF1");
    expect(r.devices[q.id].tripped).toBe(false);
    for (let step = 0; step < 6; step++)
      r = advance(p, r, { type: "step", deltaMs: 60000 });
    expect(r.devices[q.id].tripped).toBe(true);
  });
  it("RCCB nie jest nadprądowym: L–N zbilansowane, L–PE wyzwala", () => {
    const base = scenarioProject("distribution"),
      rcd = named(base, "FI1");
    const p = clone(base);
    named(p, "H1").settings.powerW = 10000;
    expect(power(p).devices[rcd.id].tripCause).not.toContain("różnicowy");
    const leak = clone(base);
    leak.faults.push({
      id: "f",
      kind: "leakage",
      targetId: named(leak, "H1").id,
      from: ref(leak, "H1", "L"),
      to: ref(leak, "H1", "PE"),
      resistanceOhm: 4600,
      hidden: false,
      activeAtMs: 0,
    });
    expect(power(leak).devices[rcd.id].tripped).toBe(true);
    const short = clone(base);
    short.faults.push({
      id: "f",
      kind: "short-circuit",
      targetId: named(short, "H1").id,
      from: ref(short, "H1", "L"),
      to: ref(short, "H1", "N"),
      resistanceOhm: 0.1,
      hidden: false,
      activeAtMs: 0,
    });
    expect(power(short).devices[rcd.id].tripped).toBe(false);
  });
});
describe("sterowanie i deterministyczny zegar", () => {
  it.each(["start-stop", "dc"])(
    "podtrzymanie, STOP i brak restartu — %s",
    (id) => {
      const p = scenarioProject(id),
        k = named(p, "K1"),
        lamp = named(p, "H1");
      let r = power(p);
      expect(r.devices[k.id].mechanism).toBe(false);
      r = op(p, r, "S1", true);
      expect(r.devices[k.id].mechanism).toBe(true);
      r = op(p, r, "S1", false);
      expect(r.devices[lamp.id].powered).toBe(true);
      const stopped = op(p, r, "S0", true);
      expect(stopped.devices[k.id].mechanism).toBe(false);
      const loss = advance(p, r, { type: "power", on: false }),
        back = advance(p, loss, { type: "power", on: true });
      expect(back.devices[k.id].mechanism).toBe(false);
    },
  );
  it("przerwa cewki zachowuje napięcie A1–A2, znika prąd i ruch", () => {
    const p = scenarioProject("start-stop"),
      k = named(p, "K1");
    p.faults.push({
      id: "f",
      kind: "open-coil",
      targetId: k.id,
      hidden: false,
      activeAtMs: 0,
    });
    const r = op(p, power(p), "S1", true);
    expect(r.devices[k.id].voltageV!).toBeGreaterThan(220);
    expect(r.devices[k.id].coil).toBe(false);
    expect(r.devices[k.id].mechanism).toBe(false);
    expect(r.solution.currents[`${k.id}/coil`]).toBeUndefined();
  });
  it("sklejony kontakt działa bez cewki; zablokowany mechanizm ma aktywną cewkę", () => {
    const p = scenarioProject("start-stop"),
      k = named(p, "K1");
    p.faults.push({
      id: "f",
      kind: "welded-contact",
      targetId: k.id,
      hidden: false,
      activeAtMs: 0,
    });
    const r = power(p);
    expect(r.devices[named(p, "H1").id].powered).toBe(true);
    p.faults = [
      {
        id: "f",
        kind: "blocked-mechanism",
        targetId: k.id,
        hidden: false,
        activeAtMs: 0,
      },
    ];
    const blocked = op(p, power(p), "S1", true);
    expect(blocked.devices[k.id].coil).toBe(true);
    expect(blocked.devices[k.id].mechanism).toBe(false);
  });
  it("stycznik DC nie przyciąga od 24 V AC", () => {
    const p = scenarioProject("start-stop");
    const k = named(p, "K1");
    k.productId = "edu-contactor-dc";
    k.productRevision = "1";
    p.productRevisions[k.productId] = "1";
    named(p, "G1").settings.voltageV = 24;
    const r = op(p, power(p), "S1", true);
    expect(r.devices[k.id].mechanism).toBe(false);
  });
  it("bistabilny: jedno zbocze, długie trzymanie, drugi przycisk, utrata pamięci", () => {
    const p = scenarioProject("bistable"),
      k = named(p, "KT1");
    let r = op(p, power(p), "S1", true);
    r = advance(p, r, { type: "step", deltaMs: 200 });
    expect(r.devices[k.id].mechanism).toBe(true);
    r = advance(p, r, { type: "step", deltaMs: 2000 });
    expect(r.devices[k.id].mechanism).toBe(true);
    r = op(p, r, "S1", false);
    r = op(p, r, "S2", true);
    r = advance(p, r, { type: "step", deltaMs: 200 });
    expect(r.devices[k.id].mechanism).toBe(false);
    r = op(p, r, "S2", false);
    r = op(p, r, "S1", true);
    r = advance(p, r, { type: "step", deltaMs: 200 });
    r = op(p, r, "S1", false);
    r = advance(p, r, { type: "power", on: false });
    r = advance(p, r, { type: "power", on: true });
    expect(r.devices[k.id].mechanism).toBe(false);
  });
  it("automat schodowy wyłącza po czasie i nie ma fikcyjnego styku COM", () => {
    const p = scenarioProject("staircase"),
      k = named(p, "KT1");
    let r = op(p, power(p), "S1", true);
    r = op(p, r, "S1", false);
    expect(r.devices[k.id].mechanism).toBe(true);
    r = advance(p, r, { type: "step", deltaMs: 30001 });
    expect(r.devices[k.id].mechanism).toBe(false);
    expect(
      catalog[named(p, "KT1").productId].topology.connections.find(
        (c) => c.id === "out",
      )?.from,
    ).toBe("3");
  });
  it.each(["A", "B", "C", "D"] as const)(
    "timer %s: cykl od zasilania i reset obu zestyków",
    (mode) => {
      const p = scenarioProject("timer"),
        k = named(p, "KT1");
      k.settings.timerMode = mode;
      k.settings.timeS = 1;
      let r = power(p);
      expect(r.devices[k.id].mechanism).toBe(mode === "A" || mode === "C");
      r = advance(p, r, { type: "step", deltaMs: 1001 });
      expect(r.devices[k.id].mechanism).toBe(mode === "B" || mode === "D");
      const pole1 = r.solution.branches.some((b) => b.id === `${k.id}/no1`),
        pole2 = r.solution.branches.some((b) => b.id === `${k.id}/no2`);
      expect(pole1).toBe(pole2);
      r = advance(p, r, { type: "power", on: false });
      expect(r.devices[k.id].mechanism).toBe(false);
    },
  );
  it("termik rozłącza tylko pomocniczy NC, stycznik odpada przez okablowanie", () => {
    const p = scenarioProject("three-phase"),
      k = named(p, "K1"),
      th = named(p, "F1"),
      motor = named(p, "M1");
    named(p, "M1").settings.loadFactor = 5;
    let r = op(p, power(p), "S1", true);
    r = op(p, r, "S1", false);
    r = advance(p, r, { type: "step", deltaMs: 60000 });
    expect(r.devices[th.id].tripped).toBe(true);
    expect(r.devices[k.id].mechanism).toBe(false);
    expect(r.devices[motor.id].powered).toBe(false);
    expect(r.solution.branches.some((b) => b.id === `${th.id}/pole1`)).toBe(
      true,
    );
  });
  it("identyczne akcje i seed dają identyczne stany i zdarzenia", () => {
    const p = scenarioProject("bistable");
    const run = () => {
      let r = op(p, power(p), "S1", true);
      r = advance(p, r, { type: "step", deltaMs: 200 });
      return { ...r, durationMs: 0 };
    };
    expect(run()).toEqual(run());
  });
});
describe("pomiary i katalog", () => {
  it("zwarcie wyjścia HDR ogranicza prąd do 2,5 A bez oscylacji", () => {
    const p = scenarioProject("dc"),
      ps = named(p, "PS1");
    p.faults.push({
      id: "output-short",
      kind: "short-circuit",
      targetId: ps.id,
      from: { deviceId: ps.id, terminalId: "+V1" },
      to: { deviceId: ps.id, terminalId: "-V1" },
      resistanceOhm: 0.02,
      hidden: false,
      activeAtMs: 0,
    });
    const r = power(p);
    expect(r.status).toBe("valid");
    expect(magnitude(r.solution.currents[`${ps.id}/dc-output`])).toBeCloseTo(
      2.5,
      5,
    );
    expect(
      magnitude(voltageBetween(r.solution, `${ps.id}:+V1`, `${ps.id}:-V1`)!),
    ).toBeLessThan(0.1);
  });
  it("miernik napięcia i cęgi czytają obwód; omomierz jest blokowany pod napięciem", () => {
    const p = scenarioProject("lamp"),
      r = power(p),
      red = ref(p, "H1", "L"),
      black = ref(p, "H1", "N");
    expect(
      measure(p, r, request("voltage-ac", red, black)).value!,
    ).toBeGreaterThan(229);
    expect(measure(p, r, request("continuity", red, black)).status).toBe(
      "invalid-setup",
    );
    const wire = p.circuit.conductors.find(
      (w) => w.to.deviceId === red.deviceId && w.to.terminalId === "L",
    )!;
    expect(
      measure(p, r, { ...request("current"), wireId: wire.id }).value,
    ).toBeCloseTo(magnitude(r.solution.currents[wire.id]));
  });
  it("ciągłość PE zmienia się po przerwie i nie bierze BFS za omomierz", () => {
    const p = scenarioProject("lamp"),
      red = ref(p, "G1", "PE"),
      black = ref(p, "H1", "PE"),
      off = advance(p, initialRuntime(p), { type: "solve" });
    expect(
      measure(p, off, request("continuity", red, black)).value!,
    ).toBeLessThan(1);
    const wire = p.circuit.conductors.find(
      (w) => terminalKey(w.to) === terminalKey(black),
    )!;
    p.faults.push({
      id: "f",
      kind: "open-wire",
      targetId: wire.id,
      hidden: false,
      activeAtMs: 0,
    });
    const after = advance(p, initialRuntime(p), { type: "solve" });
    expect(measure(p, after, request("continuity", red, black)).status).toBe(
      "open-circuit",
    );
  });
  it("izolacja pochodzi z osobnej sieci i zmienia się po uszkodzeniu", () => {
    const p = scenarioProject("lamp"),
      red = ref(p, "H1", "L"),
      black = ref(p, "H1", "PE"),
      off = advance(p, initialRuntime(p), { type: "solve" });
    const before = measure(p, off, request("insulation", red, black));
    p.faults.push({
      id: "f",
      kind: "insulation",
      targetId: red.deviceId,
      from: red,
      to: black,
      resistanceOhm: 100000,
      hidden: false,
      activeAtMs: 0,
    });
    const after = measure(
      p,
      advance(p, initialRuntime(p), { type: "solve" }),
      request("insulation", red, black),
    );
    expect(after.value).toBeLessThan(before.value ?? 200);
    expect(after.value).toBeCloseTo(0.1, 3);
  });
  it("pętla: rezystancja Thévenina i Ik; zmiana długości wpływa na wynik", () => {
    const p = scenarioProject("lamp"),
      req = request("loop", ref(p, "H1", "L"), ref(p, "H1", "N")),
      before = measure(p, power(p), req);
    p.circuit.conductors.forEach((w) => (w.electricalLengthM *= 10));
    const after = measure(p, power(p), req);
    expect(before.status).toBe("valid");
    expect(after.value!).toBeGreaterThan(before.value!);
    expect(after.details?.Ik as number).toBeLessThan(
      before.details?.Ik as number,
    );
    expect(before.details?.X).toBe(0);
  });
  it("RCD 0,5× nie wyzwala, 1× wprowadza upływ i zostawia aparat wyzwolony", () => {
    const p = scenarioProject("distribution"),
      rcd = named(p, "FI1"),
      red = ref(p, "FI1", "2"),
      black = ref(p, "G1", "PE"),
      r = power(p);
    const half = measure(p, r, {
      ...request("rcd", red, black),
      deviceId: rcd.id,
      rcdMultiplier: 0.5,
    });
    expect(half.afterRuntime?.devices[rcd.id].tripped).toBe(false);
    const one = measure(p, r, {
      ...request("rcd", red, black),
      deviceId: rcd.id,
    });
    expect(one.afterRuntime?.devices[rcd.id].tripped).toBe(true);
    expect(one.value).toBe(50);
    expect(p.faults).toHaveLength(0);
  });
  it("niezależne źródło DC blokuje omomierz nawet po wyłączeniu głównego", () => {
    const p = scenarioProject("lamp"),
      d = clone(named(p, "G1"));
    d.id = "dc";
    d.productId = "edu-source-dc";
    d.productRevision = "1";
    d.designation = "G2";
    d.settings = {
      voltageV: 24,
      sourceResistanceOhm: 0.1,
      independentSupply: true,
    };
    p.circuit.devices.push(d);
    p.productRevisions[d.productId] = "1";
    p.physical.devices[d.id] = { x: 0, y: 0 };
    p.schematic.devices[d.id] = { x: 0, y: 0 };
    const off = advance(p, initialRuntime(p), { type: "solve" });
    expect(off.solution.branches.some((b) => b.voltage)).toBe(false);
    const r = advance(p, power(p), { type: "power", on: false });
    expect(
      measure(p, r, request("continuity", ref(p, "H1", "L"), ref(p, "H1", "N")))
        .status,
    ).toBe("invalid-setup");
  });
  it("publikacja ma bramki, pending SKU nie może wejść do projektu", () => {
    expect(realProducts).toHaveLength(31);
    expect(validateCatalog()).toEqual([]);
    const p = scenarioProject("lamp");
    p.circuit.devices[0].productId = "hager-cda240j";
    expect(() => assertProjectCatalog(p)).toThrow();
  });
  it.each(scenarios.filter((s) => s.id !== "diagnosis"))(
    "wzorzec $title ma poprawne referencje i działanie",
    (scenario) => {
      const p = scenario.create();
      assertProjectCatalog(p);
      const r = power(p);
      expect(r.status).toBe("valid");
      expect(
        checkScenario(p, r, []).find((c) => c.id === "function")?.passed,
      ).toBe(true);
      expect(checkScenario(p, r, []).find((c) => c.id === "pe")?.passed).toBe(
        true,
      );
    },
  );
  it("schodowy i krzyżowy — wszystkie kombinacje przełączają lampę", () => {
    for (const id of ["two-way", "crossover"]) {
      const p = scenarioProject(id),
        switches = p.circuit.devices.filter((d) =>
          ["changeover", "crossover"].includes(catalog[d.productId].behaviorId),
        );
      for (let bits = 0; bits < 2 ** switches.length; bits++) {
        switches.forEach((d, i) => (d.settings.position = !!(bits & (1 << i))));
        const r = power(p);
        expect(r.status).toBe("valid");
        for (const d of switches) {
          const next = advance(p, r, { type: "operate", deviceId: d.id });
          expect(next.devices[named(p, "H1").id].powered).not.toBe(
            r.devices[named(p, "H1").id].powered,
          );
        }
      }
    }
  });
});

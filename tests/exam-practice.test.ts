import { describe, it, expect } from "vitest";
import { catalog, validateCatalog } from "@catalog/index";
import { validateProjectDocument } from "@catalog/project-validation";
import {
  clone,
  newId,
  terminalKey,
  type ProjectDocument,
  type TerminalRef,
  type Fault,
} from "@model/index";
import {
  advance,
  initialRuntime,
  compile,
  type RuntimeSnapshot,
} from "@simulation/index";
import {
  measure,
  type MeasurementRecord,
  type MeasurementRequest,
} from "@measurements/index";
import { scenarioProject, checkScenario } from "@training/index";
import { practiceIds } from "@training/practice";
import { diagnosticWitness } from "@training/assessment";
import { safeExport, parseProject } from "../apps/web/src/persistence";

const named = (p: ProjectDocument, name: string) =>
  p.circuit.devices.find((d) => d.designation === name)!;
const ref = (
  p: ProjectDocument,
  name: string,
  terminalId: string,
): TerminalRef => ({ deviceId: named(p, name).id, terminalId });
const on = (p: ProjectDocument) =>
  advance(p, initialRuntime(p), { type: "power", on: true });
const press = (p: ProjectDocument, r: RuntimeSnapshot, name: string) => {
  r = advance(p, r, {
    type: "operate",
    deviceId: named(p, name).id,
    state: true,
  });
  r = advance(p, r, { type: "step", deltaMs: 200 });
  return advance(p, r, {
    type: "operate",
    deviceId: named(p, name).id,
    state: false,
  });
};
const request = (
  red?: TerminalRef,
  black?: TerminalRef,
): MeasurementRequest => ({
  function: "continuity",
  red,
  black,
  testVoltageV: 500,
  rcdMultiplier: 1,
  compensateLeads: true,
});
function record(
  p: ProjectDocument,
  rt: RuntimeSnapshot,
  q: MeasurementRequest,
): MeasurementRecord {
  const { afterRuntime: _after, ...result } = measure(p, rt, q);
  return {
    id: newId("m"),
    revision: p.circuit.revision,
    function: q.function,
    red: q.red,
    black: q.black,
    deviceId: q.deviceId,
    wireId: q.wireId,
    parameters: q,
    timeMs: rt.timeMs,
    energized: rt.energized,
    result,
  };
}
function requiredMeasurements(p: ProjectDocument): MeasurementRecord[] {
  const rt = initialRuntime(p),
    out = [record(p, rt, request(ref(p, "G1", "PE"), ref(p, "XPE1", "1")))];
  for (const d of p.circuit.devices.filter((d) =>
    ["load", "socket", "motor"].includes(catalog[d.productId].behaviorId),
  ))
    out.push(
      record(
        p,
        rt,
        request(ref(p, "XPE1", "5"), { deviceId: d.id, terminalId: "PE" }),
      ),
    );
  const motor = p.circuit.devices.find(
    (d) => catalog[d.productId].behaviorId === "motor",
  );
  if (motor)
    out.push(
      record(p, press(p, on(p), "S1"), {
        ...request(),
        function: "phase-order",
        deviceId: motor.id,
      }),
    );
  return out;
}
const check = (
  p: ProjectDocument,
  id: string,
  records: MeasurementRecord[] = [],
) =>
  checkScenario(p, initialRuntime(p), records).find((c) => c.id === id)!.passed;
const addFault = (
  p: ProjectDocument,
  f: Omit<Fault, "id" | "activeAtMs" | "hidden">,
) => p.faults.push({ ...f, id: newId("f"), activeAtMs: 0, hidden: false });
const wireBetween = (
  p: ProjectDocument,
  a: string,
  ta: string,
  b: string,
  tb: string,
) =>
  p.circuit.conductors.find(
    (w) =>
      [w.from, w.to].some(
        (r) => terminalKey(r) === terminalKey(ref(p, a, ta)),
      ) &&
      [w.from, w.to].some((r) => terminalKey(r) === terminalKey(ref(p, b, tb))),
  )!;

describe("ćwiczenia etapu 1 i ocena całego rezultatu", () => {
  for (const id of practiceIds) {
    it(`${id}: wzorzec przechodzi pełną ocenę po wymaganych rzeczywistych pomiarach`, () => {
      const p = scenarioProject(id, true);
      expect(validateProjectDocument(p)).toEqual(p);
      const ms = requiredMeasurements(p);
      expect(ms.every((m) => m.result.status === "valid")).toBe(true);
      expect(checkScenario(p, on(p), ms).filter((c) => !c.passed)).toEqual([]);
      expect(parseProject(JSON.stringify(safeExport(p)))).toEqual(p);
    });
    it(`${id}: stanowisko montażowe bez przewodów, mostków i sprzężeń nie zalicza`, () => {
      const p = scenarioProject(id, true, "assembly");
      expect(validateProjectDocument(p)).toEqual(p);
      expect(p.circuit.conductors).toEqual([]);
      expect(p.circuit.bridges).toEqual([]);
      expect(p.circuit.mechanicalCouplings).toEqual([]);
      expect(check(p, "function")).toBe(false);
      expect(check(p, "measurements")).toBe(false);
    });
    it(`${id}: dowolny dobry pomiar i świecący odbiornik nie wystarczają`, () => {
      const p = scenarioProject(id, true);
      const ms = requiredMeasurements(p);
      expect(check(p, "measurements", [ms[0]])).toBe(false);
      expect(
        check(
          p,
          "measurements",
          ms.map((m) => ({ ...m, revision: m.revision - 1 })),
        ),
      ).toBe(false);
    });
    it(`${id}: równoważne rozwiązanie zachowuje ocenę po zmianie oznaczeń, układu i stron przewodów`, () => {
      const p = scenarioProject(id, true);
      p.circuit.devices.forEach((d, i) => {
        d.designation = `A${i}`;
        p.physical.devices[d.id].x += 100;
      });
      p.circuit.conductors.reverse().forEach((w) => {
        [w.from, w.to] = [w.to, w.from];
        w.marking = "R" + w.marking;
      });
      expect(
        checkScenario(p, on(p), requiredMeasurementsRenamed(p)).filter(
          (c) => !c.passed,
        ),
      ).toEqual([]);
    });
    for (let c = 0; c < 3; c++)
      it(`${id}: ukryta usterka ${c + 1}, pomiar, naprawa i retest`, () => {
        const p = scenarioProject(id, true, "diagnosis", c);
        expect(validateProjectDocument(p)).toEqual(p);
        const fault = p.faults[0];
        expect(fault.hidden).toBe(true);
        const exported = safeExport(p);
        expect(exported.faults).toEqual([]);
        expect(exported.training).toBeUndefined();
        expect(exported.scenarioId).toBeUndefined();
        expect(
          checkScenario(p, on(p), []).some(
            (c) => ["function", "pe"].includes(c.id) && !c.passed,
          ),
        ).toBe(true);
        const w = p.circuit.conductors.find((w) => w.id === fault.targetId);
        const q = w
          ? request(w.from, w.to)
          : fault.kind === "open-coil"
            ? request(
                { deviceId: fault.targetId, terminalId: "A1" },
                { deviceId: fault.targetId, terminalId: "A2" },
              )
            : request(fault.from, fault.to);
        const weldedNC =
          p.scenarioId === "exam-reversing" && fault.kind === "welded-contact";
        const before = record(
          p,
          weldedNC ? press(p, on(p), "S1") : initialRuntime(p),
          weldedNC ? { ...q, function: "voltage-ac" } : q,
        );
        expect(["valid", "open-circuit"]).toContain(before.result.status);
        expect(diagnosticWitness(p, [before], [fault.targetId])).toBe(true);
        expect(
          diagnosticWitness(
            p,
            [
              record(
                p,
                initialRuntime(p),
                request(ref(p, "G1", "PE"), ref(p, "XPE1", "1")),
              ),
            ],
            [fault.targetId],
          ),
        ).toBe(false);
        p.training!.diagnosticEvidence = true;
        p.training!.diagnosis =
          "Wynik pomiaru wskazuje usterkę; sprawdzam połączenie i aparat.";
        p.training!.repaired = true;
        p.faults = [];
        p.circuit.revision++;
        expect(
          checkScenario(p, on(p), [before, ...requiredMeasurements(p)]).filter(
            (c) => !c.passed,
          ),
        ).toEqual([]);
      });
  }
});
function requiredMeasurementsRenamed(p: ProjectDocument) {
  const source = p.circuit.devices.find((d) =>
      catalog[d.productId].behaviorId.startsWith("source-"),
    )!,
    bus = p.circuit.devices.find((d) => d.productId === "edu-bus-pe")!,
    rt = initialRuntime(p);
  const records = [
    record(
      p,
      rt,
      request(
        { deviceId: source.id, terminalId: "PE" },
        { deviceId: bus.id, terminalId: "3" },
      ),
    ),
  ];
  for (const d of p.circuit.devices.filter((d) =>
    ["load", "socket", "motor"].includes(catalog[d.productId].behaviorId),
  ))
    records.push(
      record(
        p,
        rt,
        request(
          { deviceId: d.id, terminalId: "PE" },
          { deviceId: bus.id, terminalId: "4" },
        ),
      ),
    );
  const m = p.circuit.devices.find(
      (d) => catalog[d.productId].behaviorId === "motor",
    ),
    s = p.circuit.devices.find(
      (d) => catalog[d.productId].behaviorId === "push-multi",
    )!;
  if (m) {
    let r = advance(p, on(p), { type: "operate", deviceId: s.id, state: true });
    r = advance(p, r, { type: "operate", deviceId: s.id, state: false });
    records.push(
      record(p, r, { ...request(), function: "phase-order", deviceId: m.id }),
    );
  }
  return records;
}
describe("uzwojenia, styki, zabezpieczenia i błędne połączenia sandboxa", () => {
  it("A1–A2 można zewrzeć; zwarcie wyzwala B6 zamiast uruchomić silnik", () => {
    const p = scenarioProject("exam-start-stop");
    p.circuit.conductors.push({
      ...p.circuit.conductors[0],
      id: newId("short"),
      from: ref(p, "K1", "A1"),
      to: ref(p, "K1", "A2"),
      crossSectionMm2: 1.5,
      marking: "SHORT",
    });
    expect(() => validateProjectDocument(p)).not.toThrow();
    const r = press(p, on(p), "S1");
    expect(r.status).toBe("valid");
    expect(r.devices[named(p, "QF2").id].tripped).toBe(true);
    expect(r.devices[named(p, "M1").id].powered).toBe(false);
  });
  it("brak podtrzymania: silnik działa tylko podczas START i nie zalicza", () => {
    const p = scenarioProject("exam-start-stop");
    p.circuit.conductors = p.circuit.conductors.filter(
      (w) => w.id !== wireBetween(p, "KA1", "54", "XC1", "2").id,
    );
    let r = advance(p, on(p), {
      type: "operate",
      deviceId: named(p, "S1").id,
      state: true,
    });
    expect(r.devices[named(p, "M1").id].powered).toBe(true);
    r = advance(p, r, {
      type: "operate",
      deviceId: named(p, "S1").id,
      state: false,
    });
    expect(r.devices[named(p, "M1").id].powered).toBe(false);
    expect(check(p, "function")).toBe(false);
  });
  it("brak blokady elektrycznej: równoczesne styczniki zwierają fazy i wyzwalają ochronę", () => {
    const p = withoutElectricalInterlock(false);
    expect(() => validateProjectDocument(p)).not.toThrow();
    const r = press(p, press(p, on(p), "S1"), "S2");
    expect(r.devices[named(p, "QF1").id].tripped).toBe(true);
    expect(r.devices[named(p, "M1").id].powered).toBe(false);
    expect(check(p, "function")).toBe(false);
  });
  it("blokada mechaniczna zatrzymuje drugi mechanizm, ale nie zalicza brakujących NC", () => {
    const p = withoutElectricalInterlock(true);
    const r = advance(p, press(p, on(p), "S1"), {
      type: "operate",
      deviceId: named(p, "S2").id,
      state: true,
    });
    expect(r.status).toBe("valid");
    expect(r.devices[named(p, "K1").id].mechanism).toBe(true);
    expect(r.devices[named(p, "K2").id].coil).toBe(true);
    expect(r.devices[named(p, "K2").id].mechanism).toBe(false);
    expect(r.devices[named(p, "K2").id].mechanicallyBlocked).toBe(true);
    expect(check(p, "function")).toBe(false);
  });
  it("oba START wciśnięte od spoczynku: elektryczne NC otwierają się przed drugą cewką", () => {
    const p = scenarioProject("exam-reversing");
    p.circuit.mechanicalCouplings = p.circuit.mechanicalCouplings.filter(
      (c) => c.kind !== "interlock",
    );
    const r = initialRuntime(p);
    r.devices[named(p, "S1").id].manual = true;
    r.devices[named(p, "S2").id].manual = true;
    const powered = advance(p, r, { type: "power", on: true });
    expect(powered.status).toBe("valid");
    expect(
      ["K1", "K2"].filter((n) => powered.devices[named(p, n).id].coil),
    ).toHaveLength(1);
  });
  it("przerwa PE nie zatrzymuje silnika, ale OL i ocena PE ją wykrywają", () => {
    const p = scenarioProject("exam-start-stop", true, "diagnosis", 2),
      r = press(p, on(p), "S1");
    expect(r.devices[named(p, "M1").id].powered).toBe(true);
    expect(
      measure(
        p,
        initialRuntime(p),
        request(ref(p, "XPE1", "2"), ref(p, "M1", "PE")),
      ).status,
    ).toBe("open-circuit");
    expect(check(p, "pe")).toBe(false);
  });
  it("uszkodzona cewka: napięcie dostępne, brak przyciągnięcia, OL zamiast katalogowej zgadywanki", () => {
    const p = scenarioProject("exam-start-stop");
    addFault(p, { kind: "open-coil", targetId: named(p, "K1").id });
    const r = advance(p, on(p), {
      type: "operate",
      deviceId: named(p, "S1").id,
      state: true,
    });
    expect(r.devices[named(p, "K1").id].voltageV).toBeGreaterThan(210);
    expect(r.devices[named(p, "K1").id].mechanism).toBe(false);
    expect(
      measure(
        p,
        initialRuntime(p),
        request(ref(p, "K1", "A1"), ref(p, "K1", "A2")),
      ).status,
    ).toBe("open-circuit");
  });
  it("nieznana rezystancja DC sprawnej LC1D09P7 nie jest udawana przez VA", () => {
    const p = scenarioProject("exam-start-stop");
    expect(
      measure(
        p,
        initialRuntime(p),
        request(ref(p, "K1", "A1"), ref(p, "K1", "A2")),
      ).status,
    ).toBe("unsupported");
    expect(
      measure(
        p,
        initialRuntime(p),
        request(ref(p, "K1", "A1"), ref(p, "XN1", "2")),
      ).status,
    ).toBe("unsupported");
  });
  it("sklejony wybrany styk NC: pozostaje zamknięty przy pracy; inne styki są wspólne z mechanizmem", () => {
    const p = scenarioProject("exam-reversing");
    addFault(p, {
      kind: "welded-contact",
      targetId: named(p, "KA1").id,
      from: ref(p, "KA1", "61"),
      to: ref(p, "KA1", "62"),
    });
    const r = press(p, on(p), "S1");
    expect(compile(p, r).some((b) => b.id === `${named(p, "KA1").id}/nc`)).toBe(
      true,
    );
    expect(r.devices[named(p, "KA1").id].mechanism).toBe(true);
    expect(check(p, "function")).toBe(false);
  });
  it("sklejony pojedynczy styk główny jest wykrywany także gdy pozostałe fazy rozłączają silnik", () => {
    const p = scenarioProject("exam-start-stop");
    addFault(p, {
      kind: "welded-contact",
      targetId: named(p, "K1").id,
      from: ref(p, "K1", "1L1"),
      to: ref(p, "K1", "2T1"),
    });
    const r = press(p, press(p, on(p), "S1"), "S0");
    expect(r.devices[named(p, "M1").id].powered).toBe(false);
    expect(
      compile(p, r).some((b) => b.id === `${named(p, "K1").id}/pole1`),
    ).toBe(true);
    expect(
      compile(p, r).some((b) => b.id === `${named(p, "K1").id}/pole2`),
    ).toBe(false);
    expect(check(p, "function")).toBe(false);
  });
  it("gwiazda, brak mostków, trójkąt i dopasowanie napięcia wynikają z połączeń", () => {
    const p = scenarioProject("exam-start-stop");
    let r = press(p, on(p), "S1");
    expect(r.devices[named(p, "M1").id].windingConnection).toBe("star");
    expect(r.devices[named(p, "M1").id].powered).toBe(true);
    p.circuit.bridges = [];
    r = press(p, on(p), "S1");
    expect(r.devices[named(p, "M1").id].windingConnection).toBe("invalid");
    expect(r.devices[named(p, "M1").id].powered).toBe(false);
    p.circuit.bridges = [
      ["U1", "W2"],
      ["V1", "U2"],
      ["W1", "V2"],
    ].map(([a, b]) => ({
      id: newId("bridge"),
      from: ref(p, "M1", a),
      to: ref(p, "M1", b),
    }));
    r = press(p, on(p), "S1");
    expect(r.devices[named(p, "M1").id].windingConnection).toBe("delta");
    expect(r.devices[named(p, "M1").id].motorSupply).toBe("voltage-mismatch");
    expect(r.devices[named(p, "M1").id].powered).toBe(false);
    // Keep control 230 VAC on a separate source, lower only the three-phase supply.
    const g = clone(named(p, "G1"));
    g.id = newId("g");
    g.productId = "edu-source-ac";
    g.productRevision = catalog[g.productId].revision;
    g.designation = "GC";
    g.settings = { ...catalog[g.productId].defaults };
    p.circuit.devices.push(g);
    p.productRevisions[g.productId] = g.productRevision;
    p.physical.devices[g.id] = { x: 100, y: 1400 };
    p.schematic.devices[g.id] = { x: 100, y: 1400 };
    const w = wireBetween(p, "G1", "L1", "QF2", "1");
    w.from = { deviceId: g.id, terminalId: "L" };
    p.circuit.conductors.push({
      ...w,
      id: newId("neutral"),
      from: { deviceId: g.id, terminalId: "N" },
      to: ref(p, "XN1", "5"),
      declaredRole: "N",
      marking: "Nextra",
    });
    named(p, "G1").settings.voltageV = 133;
    r = press(p, on(p), "S1");
    expect(r.devices[named(p, "M1").id].powered).toBe(true);
    expect(r.devices[named(p, "M1").id].direction).toBe("123");
  });
  it("opóźniona przerwa mostka uzwojeń zmienia połączenie i zatrzymuje silnik", () => {
    const p = scenarioProject("exam-start-stop");
    const r = press(p, on(p), "S1");
    p.faults.push({
      id: newId("f"),
      targetId: p.circuit.bridges[0].id,
      kind: "open-wire",
      hidden: false,
      activeAtMs: r.timeMs + 500,
    });
    const after = advance(p, r, { type: "step", deltaMs: 1000 });
    expect(after.devices[named(p, "M1").id].powered).toBe(false);
    expect(after.devices[named(p, "M1").id].windingConnection).toBe("invalid");
  });
  it("PE do neutralnego zamiast zacisku ochronnego nie zalicza nawet przy wspólnym potencjale źródła TN-S", () => {
    const p = scenarioProject("exam-start-stop");
    const w = wireBetween(p, "G1", "PE", "XPE1", "1");
    w.from = ref(p, "G1", "N");
    const r = press(p, on(p), "S1");
    expect(r.devices[named(p, "M1").id].powered).toBe(true);
    expect(check(p, "pe")).toBe(false);
  });
  it("równoważne stanowisko z dodatkowym rozłącznikiem 2P zachowuje ocenę", () => {
    const p = scenarioProject("exam-bistable", true),
      g = named(p, "G1");
    const product = catalog["edu-isolator"],
      iso = {
        ...clone(g),
        id: newId("iso"),
        productId: product.id,
        productRevision: product.revision,
        designation: "QS1",
        settings: { ...product.defaults },
      };
    p.circuit.devices.push(iso);
    p.productRevisions[product.id] = product.revision;
    p.physical.devices[iso.id] = { x: 1200, y: 90 };
    p.schematic.devices[iso.id] = { x: 1200, y: 90 };
    for (const terminal of ["L", "N"]) {
      const w = p.circuit.conductors.find(
        (w) => w.from.deviceId === g.id && w.from.terminalId === terminal,
      )!;
      const added = {
        ...clone(w),
        id: newId("iso-wire"),
        marking: `QS-${terminal}`,
        to: { deviceId: iso.id, terminalId: terminal === "L" ? "1" : "N-in" },
      };
      w.from = {
        deviceId: iso.id,
        terminalId: terminal === "L" ? "2" : "N-out",
      };
      p.circuit.conductors.push(added);
    }
    expect(validateProjectDocument(p)).toEqual(p);
    expect(
      checkScenario(p, on(p), requiredMeasurements(p)).filter((c) => !c.passed),
    ).toEqual([]);
  });
  it("wielostykowy STOP wykorzystujący NC 21/22 jest równoważny przyciskowi tylko NC", () => {
    const p = scenarioProject("exam-start-stop", true),
      d = named(p, "S0"),
      product = catalog["schneider-xb5aa35"];
    d.productId = product.id;
    d.productRevision = product.revision;
    d.settings = { ...product.defaults };
    expect(validateProjectDocument(p)).toEqual(p);
    expect(
      checkScenario(p, on(p), requiredMeasurements(p)).filter((c) => !c.passed),
    ).toEqual([]);
  });
  it("przewody łączące końce uzwojeń są równoważne metalowym mostkom gwiazdy", () => {
    const p = scenarioProject("exam-start-stop", true);
    p.circuit.conductors.push(
      ...p.circuit.bridges.map((b, i) => ({
        ...clone(p.circuit.conductors[0]),
        ...b,
        marking: `STAR${i}`,
        electricalLengthM: 0.1,
        crossSectionMm2: 2.5,
        declaredRole: "UNSPECIFIED" as const,
        insulationColor: "#a486b8",
      })),
    );
    p.circuit.bridges = [];
    expect(validateProjectDocument(p)).toEqual(p);
    expect(
      checkScenario(p, on(p), requiredMeasurements(p)).filter((c) => !c.passed),
    ).toEqual([]);
  });
  it("zamiana L i N w instalacji może świecić, lecz nie zalicza dróg ochrony i zacisków", () => {
    const p = scenarioProject("exam-bistable");
    const g = named(p, "G1");
    for (const w of p.circuit.conductors)
      for (const end of [w.from, w.to])
        if (end.deviceId === g.id && ["L", "N"].includes(end.terminalId))
          end.terminalId = end.terminalId === "L" ? "N" : "L";
    expect(press(p, on(p), "S1").devices[named(p, "H1").id].powered).toBe(true);
    expect(check(p, "connections")).toBe(false);
  });
  it("neutralny oznaczony jako faza i brązowy nie zalicza identyfikacji mimo działającej lampy", () => {
    const p = scenarioProject("exam-bistable");
    const w = wireBetween(p, "XN1", "3", "H1", "N");
    w.declaredRole = "L1";
    w.insulationColor = "#755038";
    expect(validateProjectDocument(p)).toEqual(p);
    expect(press(p, on(p), "S1").devices[named(p, "H1").id].powered).toBe(true);
    expect(check(p, "connections")).toBe(true);
    expect(check(p, "colors")).toBe(false);
  });
  it("zanik fazy jest skutkiem połączeń, nie deklaracji kierunku urządzenia", () => {
    const p = scenarioProject("exam-start-stop");
    addFault(p, {
      kind: "phase-loss",
      targetId: named(p, "G1").id,
      from: ref(p, "G1", "L2"),
    });
    const r = press(p, on(p), "S1");
    expect(r.devices[named(p, "M1").id].powered).toBe(false);
    expect(r.devices[named(p, "M1").id].direction).toBe("phase-loss");
  });
  it("NO i NC przycisku oraz bloku podążają za jednym mechanizmem", () => {
    const p = scenarioProject("exam-start-stop");
    let r = on(p);
    let bs = compile(p, r);
    const s = named(p, "S1"),
      k = named(p, "K1"),
      a = named(p, "KA1");
    expect(bs.some((b) => b.id === `${s.id}/no`)).toBe(false);
    expect(bs.some((b) => b.id === `${s.id}/nc`)).toBe(true);
    r = advance(p, r, { type: "operate", deviceId: s.id, state: true });
    bs = compile(p, r);
    expect(bs.some((b) => b.id === `${s.id}/no`)).toBe(true);
    expect(bs.some((b) => b.id === `${s.id}/nc`)).toBe(false);
    expect(r.devices[a.id].mechanism).toBe(r.devices[k.id].mechanism);
    expect(bs.some((b) => b.id === `${a.id}/no`)).toBe(true);
    expect(bs.some((b) => b.id === `${a.id}/nc`)).toBe(false);
  });
  it("nowe SKU mają zweryfikowane numery zacisków, napięcia i obrysy; starsze rewizje zachowano", () => {
    expect(validateCatalog()).toEqual([]);
    expect(catalog["schneider-lc1d09p7"].dimensions.value).toEqual({
      width: 45,
      height: 77,
      depth: 86,
    });
    expect(catalog["schneider-lc1d09p7"].topology.coil).toMatchObject({
      voltageV: 230,
      kind: "AC",
      dcResistanceOhm: null,
    });
    expect(
      catalog["schneider-xb5aa35"].topology.terminals.map((t) => t.id),
    ).toEqual(["13", "21", "14", "22"]);
    expect(catalog["schneider-xb5aa35"].dimensions.value).toEqual({
      width: 30,
      height: 42,
      depth: 52,
    });
    expect(catalog["fif-bis411-230"].published).toBe(false);
    expect(catalog["edu-motor"].topology.terminals.map((t) => t.id)).toEqual([
      "U",
      "V",
      "W",
      "PE",
    ]);
    expect(catalog["edu-motor"].revision).toBe("1");
    expect(catalog["hager-mbn116e"].revision).toBe("verified-1");
  });
});
function withoutElectricalInterlock(mechanical: boolean) {
  const p = scenarioProject("exam-reversing");
  if (!mechanical)
    p.circuit.mechanicalCouplings = p.circuit.mechanicalCouplings.filter(
      (c) => c.kind !== "interlock",
    );
  for (let i = 1; i <= 2; i++) {
    const w = wireBetween(p, `KA${3 - i}`, "62", `K${i}`, "A1");
    w.from = ref(p, `XC${i}`, "3");
  }
  return p;
}

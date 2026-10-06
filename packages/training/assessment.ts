import { catalog } from "@catalog/index";
import {
  clone,
  terminalKey,
  type ProjectDocument,
  type DeviceInstance,
} from "@model/index";
import {
  advance,
  initialRuntime,
  compile,
  equivalentResistance,
  type RuntimeSnapshot,
} from "@simulation/index";
import type { MeasurementRecord } from "@measurements/index";
import { mechanismOwner } from "@simulation/mechanisms";
import { colors } from "./builder";
import type { CheckResult } from "./index";

const behavior = (d: DeviceInstance) => catalog[d.productId].behaviorId;
const isStart = (d: DeviceInstance) =>
  ["push-no", "push-multi"].includes(behavior(d));
function usesContact(
  p: ProjectDocument,
  d: DeviceInstance,
  condition: "manual" | "manual-inverse",
) {
  const attached = (terminalId: string) =>
    [...p.circuit.conductors, ...p.circuit.bridges].some((w) =>
      [w.from, w.to].some(
        (t) => t.deviceId === d.id && t.terminalId === terminalId,
      ),
    );
  return catalog[d.productId].topology.connections.some(
    (c) =>
      c.kind === "contact" &&
      c.condition === condition &&
      attached(c.from) &&
      attached(c.to),
  );
}
const startsFor = (p: ProjectDocument) =>
  p.circuit.devices.filter((d) => isStart(d) && usesContact(p, d, "manual"));
const stopFor = (p: ProjectDocument) =>
  p.circuit.devices.find(
    (d) =>
      ["push-nc", "push-multi"].includes(behavior(d)) &&
      usesContact(p, d, "manual-inverse") &&
      !usesContact(p, d, "manual"),
  );
const power = (p: ProjectDocument) =>
  advance(p, initialRuntime(p), { type: "power", on: true });
const press = (p: ProjectDocument, r: RuntimeSnapshot, id: string) => {
  let s = advance(p, r, { type: "operate", deviceId: id, state: true });
  s = advance(p, s, { type: "step", deltaMs: 200 });
  return advance(p, s, { type: "operate", deviceId: id, state: false });
};
const stateOk = (rt: RuntimeSnapshot) =>
  rt.status === "valid" && !Object.values(rt.devices).some((s) => s.tripped);
function peRequirements(p: ProjectDocument): [string, string][] {
  const source = p.circuit.devices.find((d) =>
    behavior(d).startsWith("source-"),
  );
  const buses = p.circuit.devices.filter((d) => d.productId === "edu-bus-pe");
  if (!source || !buses.length) return [];
  const loads = p.circuit.devices.filter(
    (d) =>
      ["load", "motor", "socket"].includes(behavior(d)) &&
      catalog[d.productId].topology.terminals.some((t) => t.id === "PE"),
  );
  return [
    [`${source.id}:PE`, `${buses[0].id}:1`],
    ...loads.map((d) => [`${buses[0].id}:1`, `${d.id}:PE`] as [string, string]),
  ];
}
function evidence(p: ProjectDocument, measurements: MeasurementRecord[]) {
  const current = measurements.filter(
    (m) => m.revision === p.circuit.revision && m.result.status === "valid",
  );
  const pe = peRequirements(p);
  const samePePoint = (actual: string, expected: string) =>
    actual === expected ||
    (expected.endsWith(":1") &&
      actual.split(":")[0] === expected.split(":")[0]);
  const peComplete =
    pe.length > 1 &&
    pe.every(([a, b]) =>
      current.some(
        (m) =>
          m.function === "continuity" &&
          !m.energized &&
          (m.result.value ?? Infinity) < 2 &&
          m.red &&
          m.black &&
          ((samePePoint(terminalKey(m.red), a) &&
            samePePoint(terminalKey(m.black), b)) ||
            (samePePoint(terminalKey(m.black), a) &&
              samePePoint(terminalKey(m.red), b))),
      ),
    );
  const motor = p.circuit.devices.find((d) => behavior(d) === "motor");
  return (
    peComplete &&
    (!motor ||
      current.some(
        (m) =>
          m.function === "phase-order" &&
          m.deviceId === motor.id &&
          m.energized,
      ))
  );
}
function peIntact(p: ProjectDocument) {
  const peWires = new Set(
    p.circuit.conductors
      .filter((w) => w.declaredRole === "PE")
      .map((w) => w.id),
  );
  const peBuses = new Set(
    p.circuit.devices
      .filter((d) => d.productId === "edu-bus-pe")
      .map((d) => d.id),
  );
  const branches = compile(p, initialRuntime(p), { deenergized: true }).filter(
    (b) =>
      peWires.has(b.id) ||
      (b.kind === "bridge" && !!b.deviceId && peBuses.has(b.deviceId)),
  );
  const pairs = peRequirements(p);
  return (
    pairs.length > 1 &&
    pairs.every(([a, b]) => {
      const r = equivalentResistance(branches, a, b);
      return r !== null && r < 2;
    })
  );
}
function isolated(p: ProjectDocument, id: string) {
  const copy = clone(p);
  copy.circuit.conductors = copy.circuit.conductors.filter(
    (w) => w.from.deviceId !== id && w.to.deviceId !== id,
  );
  copy.circuit.bridges = copy.circuit.bridges.filter(
    (w) => w.from.deviceId !== id && w.to.deviceId !== id,
  );
  return copy;
}
function equipment(p: ProjectDocument) {
  const ds = p.circuit.devices,
    light = p.scenarioId === "exam-bistable",
    reverse = p.scenarioId === "exam-reversing";
  if (light)
    return (
      ds.some((d) => behavior(d) === "source-ac") &&
      ds.filter(isStart).length >= 2 &&
      ds.some((d) => behavior(d) === "bistable") &&
      ds.some((d) => behavior(d) === "socket") &&
      ds.some((d) => behavior(d) === "load") &&
      ds.some((d) => behavior(d) === "rccb") &&
      [6, 10].every((n) =>
        ds.some((d) => behavior(d) === "mcb" && d.settings.ratedCurrentA === n),
      )
    );
  const ks = ds.filter((d) => behavior(d) === "contactor");
  return (
    ds.some((d) => behavior(d) === "source-3ph") &&
    ds.some(
      (d) =>
        behavior(d) === "motor" &&
        catalog[d.productId].topology.terminals.some((t) => t.id === "U1"),
    ) &&
    ks.length === (reverse ? 2 : 1) &&
    ks.every((k) =>
      ds.some(
        (a) => behavior(a) === "auxiliary" && mechanismOwner(p, a.id) === k.id,
      ),
    ) &&
    !!stopFor(p) &&
    ds.filter(isStart).length >= (reverse ? 2 : 1) &&
    ds.some((d) => behavior(d) === "thermal") &&
    ds.filter((d) => behavior(d) === "mcb").length >= 2 &&
    ds.filter((d) => behavior(d) === "load").length >= (reverse ? 2 : 1)
  );
}
function lightingBehavior(p: ProjectDocument) {
  const starts = startsFor(p),
    lamp = p.circuit.devices.find((d) => behavior(d) === "load"),
    socket = p.circuit.devices.find((d) => behavior(d) === "socket"),
    rcd = p.circuit.devices.find((d) => behavior(d) === "rccb");
  if (!lamp || !socket || !rcd || starts.length < 2) return false;
  let r = power(p);
  if (
    !stateOk(r) ||
    r.devices[lamp.id].powered ||
    (r.devices[socket.id].voltageV ?? 0) < 210
  )
    return false;
  for (const start of starts) {
    r = press(p, r, start.id);
    if (
      !stateOk(r) ||
      !r.devices[lamp.id].powered ||
      (r.devices[socket.id].voltageV ?? 0) < 210
    )
      return false;
    r = press(p, r, start.id);
    if (!stateOk(r) || r.devices[lamp.id].powered) return false;
  }
  r = press(p, r, starts[0].id);
  r = advance(p, r, { type: "test-rcd", deviceId: rcd.id });
  return (
    r.devices[rcd.id].tripped &&
    !r.devices[lamp.id].powered &&
    (r.devices[socket.id].voltageV ?? 230) < 1
  );
}
function motorBehavior(p: ProjectDocument, checkMechanical = false) {
  const copy = clone(p);
  if (!checkMechanical)
    copy.circuit.mechanicalCouplings = copy.circuit.mechanicalCouplings.filter(
      (c) => c.kind !== "interlock",
    );
  const m = copy.circuit.devices.find((d) => behavior(d) === "motor"),
    stop = stopFor(copy),
    starts = startsFor(copy),
    ks = copy.circuit.devices.filter((d) => behavior(d) === "contactor"),
    lamps = copy.circuit.devices.filter((d) => behavior(d) === "load");
  if (!m || !stop || !starts.length) return false;
  const directions = new Set<string>();
  for (const start of starts) {
    const base = power(copy);
    if (!stateOk(base) || base.devices[m.id].powered) return false;
    let r = press(copy, base, start.id);
    if (
      !stateOk(r) ||
      !r.devices[m.id].powered ||
      ks.filter((k) => r.devices[k.id].mechanism).length !== 1 ||
      lamps.filter((l) => r.devices[l.id].powered).length !== 1
    )
      return false;
    directions.add(r.devices[m.id].direction!);
    if (ks.length > 1)
      for (const other of starts.filter((s) => s.id !== start.id)) {
        const direction = r.devices[m.id].direction;
        r = press(copy, r, other.id);
        if (
          !stateOk(r) ||
          !r.devices[m.id].powered ||
          r.devices[m.id].direction !== direction ||
          ks.filter((k) => r.devices[k.id].mechanism).length !== 1 ||
          ks.filter((k) => r.devices[k.id].coil).length !== 1
        )
          return false;
      }
    const lost = advance(copy, r, { type: "power", on: false }),
      back = advance(copy, lost, { type: "power", on: true });
    if (back.devices[m.id].powered) return false;
    r = press(copy, r, stop.id);
    if (
      !stateOk(r) ||
      r.devices[m.id].powered ||
      ks.some((k) => r.devices[k.id].mechanism) ||
      lamps.some((l) => r.devices[l.id].powered)
    )
      return false;
    // A welded main contact remains a hazard even if the motor cannot turn.
    const bs = compile(copy, r, { deenergized: true });
    if (
      ks.some((k) =>
        bs.some(
          (b) =>
            b.deviceId === k.id && b.kind === "contact" && /pole/.test(b.id),
        ),
      )
    )
      return false;
  }
  return copy.scenarioId !== "exam-reversing" || directions.size === 2;
}
function protection(p: ProjectDocument) {
  const light = p.scenarioId === "exam-bistable",
    ds = p.circuit.devices;
  const currentSection = ds.every(
    (d) =>
      !["motor", "contactor", "thermal"].includes(behavior(d)) ||
      p.circuit.conductors
        .filter((w) =>
          [w.from, w.to].some(
            (t) =>
              t.deviceId === d.id &&
              [
                "U1",
                "V1",
                "W1",
                "1L1",
                "3L2",
                "5L3",
                "2T1",
                "4T2",
                "6T3",
              ].includes(t.terminalId),
          ),
        )
        .every((w) => w.crossSectionMm2 >= 2.5),
  );
  if (light) {
    const socket = ds.find((d) => behavior(d) === "socket"),
      lamp = ds.find((d) => behavior(d) === "load"),
      starts = startsFor(p),
      q6 = ds.find(
        (d) => behavior(d) === "mcb" && d.settings.ratedCurrentA === 6,
      ),
      q10 = ds.find(
        (d) => behavior(d) === "mcb" && d.settings.ratedCurrentA === 10,
      );
    if (!socket || !lamp || !q6 || !q10 || !starts.length) return false;
    const a = isolated(p, q6.id),
      b = isolated(p, q10.id),
      ra = press(a, power(a), starts[0].id),
      rb = press(b, power(b), starts[0].id);
    return (
      !ra.devices[lamp.id].powered &&
      (ra.devices[socket.id].voltageV ?? 0) > 210 &&
      rb.devices[lamp.id].powered &&
      (rb.devices[socket.id].voltageV ?? 0) < 1
    );
  }
  const m = ds.find((d) => behavior(d) === "motor"),
    thermal = ds.find((d) => behavior(d) === "thermal"),
    qs = ds.filter((d) => behavior(d) === "mcb"),
    start = startsFor(p)[0];
  if (!m || !thermal || qs.length < 2 || !start || !currentSection)
    return false;
  for (const q of qs) {
    const cut = isolated(p, q.id),
      r = press(cut, power(cut), start.id);
    if (r.devices[m.id].powered) return false;
  }
  const r = press(p, power(p), start.id);
  r.devices[thermal.id].tripped = true;
  const tripped = advance(p, r, { type: "solve" });
  return !tripped.devices[m.id].powered;
}
function polarityRoutes(p: ProjectDocument) {
  const inlineSwitch = (d: DeviceInstance) =>
    ["mcb", "rccb", "rcbo", "switch"].includes(behavior(d));
  const rt = initialRuntime(p);
  for (const d of p.circuit.devices)
    if (inlineSwitch(d)) rt.devices[d.id].manual = true;
  const bs = compile(p, rt, { deenergized: true });
  const wires = bs.filter(
    (b) =>
      b.kind === "wire" ||
      (b.kind === "bridge" &&
        !!b.deviceId &&
        p.circuit.devices.some(
          (d) => d.id === b.deviceId && behavior(d) === "connector",
        )),
  );
  const contacts = bs.filter(
    (b) =>
      b.kind === "contact" &&
      b.deviceId &&
      p.circuit.devices.some((d) => d.id === b.deviceId && inlineSwitch(d)),
  );
  const neutral = wires.concat(
    contacts.filter(
      (b) =>
        b.from.split(":")[1].startsWith("N") &&
        b.to.split(":")[1].startsWith("N"),
    ),
  );
  const phase = wires.concat(
    contacts.filter(
      (b) =>
        !b.from.split(":")[1].startsWith("N") &&
        !b.to.split(":")[1].startsWith("N"),
    ),
  );
  return { neutral, phase };
}
function correctColors(p: ProjectDocument) {
  if (
    !p.circuit.conductors.length ||
    p.circuit.conductors.some(
      (w) => w.insulationColor !== colors[w.declaredRole],
    )
  )
    return false;
  const source = p.circuit.devices.find((d) =>
    behavior(d).startsWith("source-"),
  );
  if (!source) return false;
  const { neutral, phase } = polarityRoutes(p);
  const reachable = (graph: typeof neutral, starts: string[]) => {
    const edges = new Map<string, string[]>();
    for (const b of graph) {
      edges.set(b.from, [...(edges.get(b.from) ?? []), b.to]);
      edges.set(b.to, [...(edges.get(b.to) ?? []), b.from]);
    }
    const seen = new Set(starts),
      queue = [...starts];
    for (let i = 0; i < queue.length; i++)
      for (const next of edges.get(queue[i]) ?? [])
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
    return seen;
  };
  const n = reachable(neutral, [`${source.id}:N`]),
    pe = reachable(neutral, [`${source.id}:PE`]),
    l = reachable(
      phase,
      (behavior(source) === "source-3ph" ? ["L1", "L2", "L3"] : ["L"]).map(
        (t) => `${source.id}:${t}`,
      ),
    );
  return p.circuit.conductors.every((w) => {
    const ends = [terminalKey(w.from), terminalKey(w.to)];
    return (
      (!ends.some((t) => n.has(t)) || w.declaredRole === "N") &&
      (!ends.some((t) => pe.has(t)) || w.declaredRole === "PE") &&
      (!ends.some((t) => l.has(t)) ||
        ["L1", "L2", "L3", "CONTROL"].includes(w.declaredRole))
    );
  });
}
function correctPolarity(p: ProjectDocument) {
  const { neutral, phase } = polarityRoutes(p);
  const connected = (graph: typeof neutral, a: string, b: string) =>
    equivalentResistance(graph, a, b) !== null;
  const g = p.circuit.devices.find(
    (d) =>
      behavior(d) ===
      (p.scenarioId === "exam-bistable" ? "source-ac" : "source-3ph"),
  );
  if (!g) return false;
  if (p.scenarioId === "exam-bistable") {
    const k = p.circuit.devices.find((d) => behavior(d) === "bistable"),
      x = p.circuit.devices.find((d) => behavior(d) === "socket"),
      h = p.circuit.devices.find((d) => behavior(d) === "load");
    if (!k || !x || !h) return false;
    const supply = catalog[k.productId].topology.supply!;
    return (
      [`${k.id}:${supply.plus}`, `${x.id}:L`].every((t) =>
        connected(phase, `${g.id}:L`, t),
      ) &&
      [`${k.id}:${supply.minus}`, `${x.id}:N`, `${h.id}:N`].every((t) =>
        connected(neutral, `${g.id}:N`, t),
      )
    );
  }
  const ks = p.circuit.devices.filter((d) => behavior(d) === "contactor");
  const lamps = p.circuit.devices.filter((d) => behavior(d) === "load");
  return (
    ks.length > 0 &&
    ks.every((k) =>
      connected(
        neutral,
        `${g.id}:N`,
        `${k.id}:${catalog[k.productId].topology.coil!.minus}`,
      ),
    ) &&
    lamps.every((h) => connected(neutral, `${g.id}:N`, `${h.id}:N`))
  );
}
export function assessPractice(
  p: ProjectDocument,
  measurements: MeasurementRecord[],
): CheckResult[] {
  const light = p.scenarioId === "exam-bistable",
    reverse = p.scenarioId === "exam-reversing";
  const diagnostic = p.userMetadata.exerciseVariant === "diagnosis";
  const checks: [string, string, boolean, string][] = [
    [
      "equipment",
      "Wymagane aparaty i przypisanie mechanizmów",
      equipment(p),
      "Oceniane funkcje aparatów, nie ich oznaczenia ani współrzędne. Osobne bloki muszą być przypisane do mechanizmu.",
    ],
    [
      "connections",
      "Drogi L/N i właściwe zaciski",
      correctPolarity(p),
      "Faza i neutralny są sprawdzane jako drogi w sieci. Odwrotne zasilanie góra/dół jest dopuszczalne; zamiana L z N i przełączanie samego neutralnego nie są równoważnym rozwiązaniem.",
    ],
    [
      "function",
      "Sekwencje sterowania i sygnalizacja",
      light ? lightingBehavior(p) : motorBehavior(p),
      "Próby wykonywane na kopii: każdy START, puszczenie, STOP, zanik zasilania i przeciwne żądanie kierunku.",
    ],
    [
      "protection",
      "Rozdział obwodów i działanie zabezpieczeń",
      protection(p),
      "Bez obejścia ochrony; osobne tory. Silnik wyłącza się przez NC termika, tor mocy ma 2,5 mm².",
    ],
    [
      "pe",
      "Rzeczywista ciągłość PE",
      peIntact(p),
      "Każda obudowa i gniazdo muszą mieć tor do PE źródła. Próg ćwiczeniowy 2 Ω.",
    ],
    [
      "colors",
      "Identyfikacja żył",
      correctColors(p),
      "Kolor według funkcji żyły; drogi do N, PE i zasilania sprawdzane w sieci, niezależnie od deklaracji.",
    ],
    [
      "measurements",
      "Wymagane pomiary bieżącej rewizji",
      evidence(p, measurements),
      "Zapisz wszystkie odcinki PE bez zasilania; dla silnika także kolejność faz pod napięciem.",
    ],
  ];
  if (reverse)
    checks.push([
      "mechanical",
      "Osobna blokada mechaniczna",
      p.circuit.mechanicalCouplings.some(
        (c) =>
          c.kind === "interlock" &&
          c.deviceIds.filter((id) => dsContactor(p, id)).length === 2,
      ) && motorBehavior(p, true),
      "Blokada elektryczna jest oceniana oddzielnie, przy usuniętym sprzężeniu mechanicznym.",
    ]);
  if (diagnostic)
    checks.push([
      "diagnosis",
      "Dowód diagnozy i sprawdzenie naprawy",
      !!p.training?.diagnosis?.trim() &&
        !!p.training?.repaired &&
        p.faults.length === 0 &&
        p.training.diagnosticEvidence === true &&
        evidence(p, measurements),
      "Wymagana hipoteza, zapis pomiaru przed naprawą i kompletny pomiar po naprawie. Wynik tekstowy nie jest automatycznie oceniany jako fachowa diagnoza.",
    ]);
  return checks.map(([id, label, passed, explanation]) => ({
    id,
    label,
    passed,
    explanation,
  }));
}
function dsContactor(p: ProjectDocument, id: string) {
  const d = p.circuit.devices.find((d) => d.id === id);
  return d && behavior(d) === "contactor";
}

// A measurement must concern the actually repaired faulty component; any other
// valid PE reading cannot serve as proof of diagnosing an open coil/contact.
export function diagnosticWitness(
  p: ProjectDocument,
  records: MeasurementRecord[],
  selected: string[],
): boolean {
  return p.faults
    .filter((f) => selected.includes(f.targetId))
    .some((f) =>
      records.some((m) => {
        if (
          m.revision !== p.circuit.revision ||
          !["valid", "open-circuit"].includes(m.result.status)
        )
          return false;
        if (f.kind === "open-wire") {
          const wire = p.circuit.conductors.find((w) => w.id === f.targetId);
          if (!wire || !m.red || !m.black)
            return m.function === "current" && m.wireId === f.targetId;
          if (wire.declaredRole === "PE")
            return (
              m.function === "continuity" &&
              m.result.status === "open-circuit" &&
              [m.red, m.black].some((t) =>
                [wire.from, wire.to].some(
                  (end) => terminalKey(t) === terminalKey(end),
                ),
              )
            );
          return (
            m.function === "continuity" &&
            m.result.status === "open-circuit" &&
            [m.red, m.black].every((t) =>
              [wire.from, wire.to].some(
                (end) => terminalKey(t) === terminalKey(end),
              ),
            )
          );
        }
        if (
          !m.red ||
          !m.black ||
          m.red.deviceId !== f.targetId ||
          m.black.deviceId !== f.targetId
        )
          return false;
        if (f.kind === "open-coil")
          return (
            m.function === "continuity" &&
            m.result.status === "open-circuit" &&
            [m.red.terminalId, m.black.terminalId].includes("A1") &&
            [m.red.terminalId, m.black.terminalId].includes("A2")
          );
        if (f.kind === "welded-contact") {
          if (
            !f.from ||
            !f.to ||
            ![terminalKey(m.red), terminalKey(m.black)].includes(
              terminalKey(f.from),
            ) ||
            ![terminalKey(m.red), terminalKey(m.black)].includes(
              terminalKey(f.to),
            )
          )
            return false;
          const inverse =
            m.result.details?.contactCondition === "mechanism-inverse";
          return inverse
            ? m.function === "voltage-ac" &&
                m.energized &&
                m.result.details?.mechanism === 1 &&
                (m.result.value ?? Infinity) < 5
            : m.function === "continuity" &&
                !m.energized &&
                m.result.details?.mechanism === 0 &&
                (m.result.value ?? Infinity) < 2;
        }
        return false;
      }),
    );
}

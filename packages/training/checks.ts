import { catalog } from "@catalog/index";
import type { ProjectDocument, TerminalRef } from "@model/index";
import {
  advance,
  initialRuntime,
  compile,
  equivalentResistance,
  type RuntimeSnapshot,
} from "@simulation/index";
import type { MeasurementRecord } from "@measurements/index";
import { isPractice } from "./practice-identity";
import { assessPractice } from "./assessment";
import { colors } from "./builder";
export interface CheckResult {
  id: string;
  label: string;
  passed: boolean;
  explanation: string;
}
function functionalCheck(p: ProjectDocument): boolean {
  let rt = advance(p, initialRuntime(p), { type: "power", on: true });
  const loads = p.circuit.devices.filter((d) =>
    ["load", "motor"].includes(catalog[d.productId].behaviorId),
  );
  if (!loads.length) return false;
  const buttons = p.circuit.devices.filter(
    (d) => catalog[d.productId].behaviorId === "push-no",
  );
  if (buttons.length) {
    rt = advance(p, rt, {
      type: "operate",
      deviceId: buttons[0].id,
      state: true,
    });
    rt = advance(p, rt, { type: "step", deltaMs: 200 });
    rt = advance(p, rt, {
      type: "operate",
      deviceId: buttons[0].id,
      state: false,
    });
  }
  const timer = p.circuit.devices.find(
    (d) => catalog[d.productId].behaviorId === "timer",
  );
  if (timer)
    rt = advance(p, rt, {
      type: "step",
      deltaMs: (timer.settings.timeS ?? 5) * 1000 + 100,
    });
  if (rt.status !== "valid" || !loads.every((d) => rt.devices[d.id]?.powered))
    return false;
  const stop = p.circuit.devices.find(
    (d) => catalog[d.productId].behaviorId === "push-nc",
  );
  if (stop) {
    const off = advance(p, rt, {
      type: "operate",
      deviceId: stop.id,
      state: true,
    });
    if (loads.some((d) => off.devices[d.id].powered)) return false;
    const lost = advance(p, rt, { type: "power", on: false });
    const back = advance(p, lost, { type: "power", on: true });
    if (loads.some((d) => back.devices[d.id].powered)) return false;
  }
  const changes = p.circuit.devices.filter((d) =>
    ["changeover", "crossover"].includes(catalog[d.productId].behaviorId),
  );
  for (const d of changes) {
    const switched = advance(p, rt, { type: "operate", deviceId: d.id });
    if (
      loads.every(
        (l) => switched.devices[l.id].powered === rt.devices[l.id].powered,
      )
    )
      return false;
  }
  const simple = p.circuit.devices.find(
    (d) =>
      catalog[d.productId].behaviorId === "switch" &&
      catalog[d.productId].visualId === "switch",
  );
  if (simple) {
    const off = advance(p, rt, {
      type: "operate",
      deviceId: simple.id,
      state: false,
    });
    if (loads.some((d) => off.devices[d.id].powered)) return false;
  }
  return true;
}
export function checkScenario(
  p: ProjectDocument,
  rt: RuntimeSnapshot,
  measurements: MeasurementRecord[],
): CheckResult[] {
  if (isPractice(p)) return assessPractice(p, measurements);
  const inactive = { ...rt, energized: false };
  const protectionBranches = compile(p, inactive, { deenergized: true }).filter(
    (b) => b.kind === "wire" || b.kind === "bridge",
  );
  const source = p.circuit.devices.find(
    (d) =>
      catalog[d.productId].behaviorId === "source-ac" ||
      catalog[d.productId].behaviorId === "source-3ph",
  );
  const loads = p.circuit.devices.filter(
    (d) =>
      catalog[d.productId].topology.terminals.some((t) => t.id === "PE") &&
      !catalog[d.productId].behaviorId.startsWith("source"),
  );
  const pe =
    !!source &&
    loads.length > 0 &&
    loads.every((d) => {
      const r = equivalentResistance(
        protectionBranches,
        `${source.id}:PE`,
        `${d.id}:PE`,
      );
      return r !== null && r < 2;
    });
  const color = p.circuit.conductors.every(
    (w) => w.insulationColor === colors[w.declaredRole],
  );
  let measurement = measurements.some(
    (m) => m.revision === p.circuit.revision && m.result.status === "valid",
  );
  if (p.scenarioId === "diagnosis") {
    const protectionMeasure = (m: MeasurementRecord) =>
      m.function === "continuity" &&
      m.red?.terminalId === "PE" &&
      m.black?.terminalId === "PE";
    measurement =
      !!p.training?.diagnosis?.trim() &&
      !!p.training?.repaired &&
      measurements.some(
        (m) => protectionMeasure(m) && m.result.status === "open-circuit",
      ) &&
      measurements.some(
        (m) =>
          protectionMeasure(m) &&
          m.revision === p.circuit.revision &&
          m.result.status === "valid" &&
          (m.result.value ?? Infinity) < 2,
      );
  }
  return [
    {
      id: "function",
      label: "Działanie i przełączanie",
      passed: functionalCheck(p),
      explanation:
        "Test obwodu i sterowania wykonywany na kopii modelu; położenia aparatów nie wpływają na ocenę.",
    },
    {
      id: "pe",
      label: "Ciągłość toru ochronnego",
      passed: pe,
      explanation: pe
        ? "Wszystkie punkty PE odbiorników mają drogę do PE źródła."
        : "Nie potwierdzono ciągłości wszystkich punktów PE. Odłącz źródła i wykonaj pomiar.",
    },
    {
      id: "marking",
      label: "Identyfikacja przewodów",
      passed: color,
      explanation: color
        ? "Role i barwy żył są zgodne z profilem pracowni."
        : "Co najmniej jedna żyła ma barwę niezgodną z zadeklarowaną rolą.",
    },
    {
      id: "measurement",
      label: "Dowód pomiarowy",
      passed: measurement,
      explanation: measurement
        ? "Zapisano poprawny pomiar dla bieżącej rewizji."
        : "Wykonaj i zapisz pomiar po ostatniej zmianie obwodu.",
    },
  ];
}
export function suggestMeasurement(
  p: ProjectDocument,
  rt: RuntimeSnapshot,
): { red?: TerminalRef; black?: TerminalRef; text: string } {
  const load = p.circuit.devices.find(
    (d) => catalog[d.productId].behaviorId === "load",
  );
  if (!load)
    return {
      text: "Wybierz właściwe zaciski cewki lub odbiornika i porównaj napięcie między nimi.",
    };
  return {
    red: { deviceId: load.id, terminalId: "L" },
    black: { deviceId: load.id, terminalId: "N" },
    text: rt.devices[load.id]?.powered
      ? "Odbiornik działa. Odłącz źródła i zbadaj osobno ciągłość PE; działanie odbiornika jej nie potwierdza."
      : "Zmierz napięcie L–N na odbiorniku. Następnie porównaj napięcia przed i za elementem łączeniowym.",
  };
}

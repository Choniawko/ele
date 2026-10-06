import { catalog } from "@catalog/index";
import {
  terminalKey,
  type ProjectDocument,
  type DeviceInstance,
} from "@model/index";
import { magnitude, voltageBetween, type NetworkSolution } from "./numeric";

export type WindingConnection = "star" | "delta" | "invalid";
export function motorConnection(
  project: ProjectDocument,
  device: DeviceInstance,
  timeMs = 0,
): WindingConnection {
  const parents = new Map<string, string>();
  const root = (a: string): string => {
    const b = parents.get(a);
    return !b || b === a ? a : root(b);
  };
  const join = (a: string, b: string) => parents.set(root(a), root(b));
  for (const w of [...project.circuit.conductors, ...project.circuit.bridges]) {
    if (
      project.faults.some(
        (f) =>
          f.targetId === w.id &&
          f.kind === "open-wire" &&
          f.activeAtMs <= timeMs,
      )
    )
      continue;
    join(terminalKey(w.from), terminalKey(w.to));
  }
  for (const d of project.circuit.devices)
    for (const c of catalog[d.productId].topology.connections.filter(
      (c) => c.kind === "bridge",
    ))
      join(`${d.id}:${c.from}`, `${d.id}:${c.to}`);
  const key = (t: string) => root(`${device.id}:${t}`);
  const start = ["U1", "V1", "W1"].map(key),
    end = ["U2", "V2", "W2"].map(key);
  if (
    new Set(start).size === 3 &&
    new Set(end).size === 1 &&
    !start.includes(end[0])
  )
    return "star";
  // Either cycle connects each winding between successive phase nodes.
  if (
    new Set(start).size === 3 &&
    new Set(end).size === 3 &&
    end.every((e, i) => start.includes(e) && e !== start[i])
  )
    return "delta";
  return "invalid";
}
export function analyzeMotor(
  project: ProjectDocument,
  d: DeviceInstance,
  solution: NetworkSolution,
  timeMs = 0,
) {
  const connection = motorConnection(project, d, timeMs);
  const voltages = ["U", "V", "W"].map((t) =>
    voltageBetween(solution, `${d.id}:${t}1`, `${d.id}:${t}2`),
  );
  const amplitudes = voltages.map((v) => (v ? magnitude(v) : 0)),
    nominal = d.settings.voltageV ?? 230;
  const angles = voltages.map((v) => (v ? Math.atan2(v.im, v.re) : 0));
  const phaseSines = [
    Math.sin(angles[1] - angles[0]),
    Math.sin(angles[2] - angles[1]),
    Math.sin(angles[0] - angles[2]),
  ];
  const ac = ["U1", "V1", "W1"].every(
    (t) => solution.domains[`${d.id}:${t}`] === "AC",
  );
  const phases =
    ac &&
    phaseSines.every((s) => Math.abs(s) > 0.75) &&
    phaseSines.every((s) => s * phaseSines[0] > 0);
  const balanced =
    amplitudes.every((v) => v >= nominal * 0.85 && v <= nominal * 1.15) &&
    amplitudes.every((v) => Math.abs(v - amplitudes[0]) < nominal * 0.05);
  const powered = connection !== "invalid" && phases && balanced;
  return {
    windingConnection: connection,
    powered,
    direction: powered
      ? phaseSines[0] < 0
        ? ("123" as const)
        : ("132" as const)
      : ("phase-loss" as const),
    motorSupply:
      connection === "invalid"
        ? ("missing-links" as const)
        : !phases
          ? ("phase-loss" as const)
          : !balanced
            ? ("voltage-mismatch" as const)
            : ("ok" as const),
  };
}

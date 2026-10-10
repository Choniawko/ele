import type { ProjectDocument } from "@model/index";
import { catalog } from "@catalog/index";
import { magnitude, type Complex } from "./numeric";
import type { RuntimeSnapshot } from "./index";

// Below this the indicator lamp (2.6 mA) still shows; insulation leakage does not.
export const FLOW_THRESHOLD_A = 5e-4;
// Phase-to-reference voltage that a learner should read as "pod napięciem".
export const LIVE_THRESHOLD_V = 50;

/**
 * Conventional direction of current in each conductor during the positive
 * half-cycle of the reference phase: 1 = from → to, -1 = to → from.
 * Conductors without a meaningful current are omitted. This is a teaching
 * picture of an AC circuit, not a claim about a single instant.
 */
export function conductorFlow(
  project: ProjectDocument,
  rt: RuntimeSnapshot,
): Record<string, 1 | -1> {
  const result: Record<string, 1 | -1> = {};
  if (!rt.energized || rt.solution.status !== "valid") return result;
  for (const w of project.circuit.conductors) {
    const i = rt.solution.currents[w.id];
    if (!i || magnitude(i) < FLOW_THRESHOLD_A) continue;
    result[w.id] = i.re >= 0 ? 1 : -1;
  }
  return result;
}

/** Stable text key, so subscribers re-render only when the picture changes. */
export const flowSignature = (flow: Record<string, 1 | -1>) =>
  Object.entries(flow)
    .map(([id, d]) => `${id}${d > 0 ? "+" : "-"}`)
    .sort()
    .join(",");

/** Voltage magnitude of a terminal against the supply's neutral (or PE). */
export function terminalPotential(
  project: ProjectDocument,
  rt: RuntimeSnapshot,
  terminalKey: string,
): number {
  if (!rt.energized || rt.solution.status !== "valid") return 0;
  const source = project.circuit.devices.find((d) =>
    catalog[d.productId].behaviorId.startsWith("source-"),
  );
  const zero: Complex = { re: 0, im: 0 };
  const reference =
    (source &&
      (rt.solution.voltages[`${source.id}:N`] ??
        rt.solution.voltages[`${source.id}:PE`])) ??
    zero;
  const v = rt.solution.voltages[terminalKey];
  if (!v) return 0;
  return magnitude({ re: v.re - reference.re, im: v.im - reference.im });
}

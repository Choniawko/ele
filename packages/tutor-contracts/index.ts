import { z } from "zod";
import type { ProjectDocument } from "@model/index";
import type { RuntimeSnapshot } from "@simulation/index";
import type { MeasurementRecord } from "@measurements/index";
import { catalog } from "@catalog/index";
// Tool contracts are read-only. A future provider never receives fault overlays.
export const tutorSuggestionSchema = z
  .object({
    explanation: z.string().min(1).max(3000),
    hypothesis: z.string().max(1000),
    suggestedMeasurement: z
      .object({
        function: z.enum([
          "voltage-ac",
          "voltage-dc",
          "continuity",
          "current",
          "insulation",
          "loop",
          "rcd",
          "phase-order",
        ]),
        red: z
          .object({ deviceId: z.string(), terminalId: z.string() })
          .optional(),
        black: z
          .object({ deviceId: z.string(), terminalId: z.string() })
          .optional(),
        wireId: z.string().optional(),
        reason: z.string().max(1000),
      })
      .optional(),
  })
  .strict();
export type TutorSuggestion = z.infer<typeof tutorSuggestionSchema>;
export const tutorTools = [
  "readCircuit",
  "readObservations",
  "readMeasurements",
  "suggestMeasurement",
  "explain",
  "suggestHypothesis",
] as const;
export function tutorContext(
  p: ProjectDocument,
  rt: RuntimeSnapshot,
  measurements: MeasurementRecord[],
) {
  return {
    revision: p.circuit.revision,
    devices: p.circuit.devices.map((d) => ({
      id: d.id,
      designation: d.designation,
      productId: d.productId,
      terminals: catalog[d.productId].topology.terminals.map((t) => ({
        id: t.id,
        label: t.label,
        role: t.role,
      })),
      observed: {
        manual: rt.devices[d.id]?.manual,
        tripped: rt.devices[d.id]?.tripped,
        mechanism: rt.devices[d.id]?.mechanism,
        powered: rt.devices[d.id]?.powered,
      },
    })),
    conductors: p.circuit.conductors,
    observations: p.training?.observations ?? [],
    measurements: measurements.filter((m) => m.revision === p.circuit.revision),
  };
}
export function validateSuggestion(
  input: unknown,
  p: ProjectDocument,
): TutorSuggestion {
  const suggestion = tutorSuggestionSchema.parse(input),
    m = suggestion.suggestedMeasurement;
  for (const ref of [m?.red, m?.black])
    if (
      ref &&
      !p.circuit.devices.some(
        (d) =>
          d.id === ref.deviceId &&
          catalog[d.productId].topology.terminals.some(
            (t) => t.id === ref.terminalId,
          ),
      )
    )
      throw new Error("Tutor wskazał nieistniejący zacisk.");
  if (m?.wireId && !p.circuit.conductors.some((w) => w.id === m.wireId))
    throw new Error("Tutor wskazał nieistniejącą żyłę.");
  return suggestion;
}

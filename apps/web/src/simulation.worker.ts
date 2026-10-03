import {
  advance,
  initialRuntime,
  type RuntimeAction,
  type RuntimeSnapshot,
} from "@simulation/index";
import { measure, type MeasurementRequest } from "@measurements/index";
import type { ProjectDocument } from "@model/index";
export interface WorkerRequest {
  sessionId: string;
  revision: number;
  sequence: number;
  seed: number;
  project: ProjectDocument;
  action?: RuntimeAction;
  measurement?: MeasurementRequest;
}
let state: RuntimeSnapshot | undefined;
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  try {
    if (
      !state ||
      state.sessionId !== req.sessionId ||
      state.revision !== req.revision
    )
      state = initialRuntime(req.project, req.sessionId, req.seed);
    if (req.action) state = advance(req.project, state, req.action);
    if (!state.solution.branches.length)
      state = advance(req.project, state, { type: "solve" });
    const measurement = req.measurement
      ? measure(req.project, state, req.measurement)
      : undefined;
    if (measurement?.afterRuntime) state = measurement.afterRuntime;
    state.sequence = req.sequence;
    self.postMessage({
      sessionId: req.sessionId,
      revision: req.revision,
      sequence: req.sequence,
      runtime: state,
      measurement,
      request: req.measurement,
    });
  } catch (error) {
    self.postMessage({
      sessionId: req.sessionId,
      revision: req.revision,
      sequence: req.sequence,
      error: error instanceof Error ? error.message : "Błąd workera.",
    });
  }
};

// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { useApp } from "../apps/web/src/store";
import { openReferenceCopy } from "../apps/web/src/ReferenceLesson";
import { referenceCopy } from "../packages/knowledge/reference-examples";
import { advance, initialRuntime } from "@simulation/index";
// Isolate launch behavior from the public evidence gate. Draft UI stays disabled.
vi.mock("../packages/knowledge/exams", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../packages/knowledge/exams")>();
  const ref = structuredClone(actual.examAvailability[0]);
  ref.status = "model-tested";
  ref.referenceRevision = "1";
  ref.documentPath = "examples/physical/ELE02_101_stanowisko.json";
  ref.fidelity = "educational";
  ref.evidence = ["isolated test fixture"];
  for (const id of Object.keys(ref.gates) as (keyof typeof ref.gates)[])
    ref.gates[id] = "passed";
  return {
    ...actual,
    examAvailability: [ref, ...actual.examAvailability.slice(1)],
  };
});
vi.mock("../apps/web/src/persistence", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../apps/web/src/persistence")>()),
  saveProject: vi.fn().mockResolvedValue(undefined),
}));
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "Worker",
    class {
      postMessage() {}
    },
  );
  const p = referenceCopy("ele02-101");
  useApp.setState({
    project: p,
    runtime: advance(p, initialRuntime(p), { type: "power", on: true }),
    libraryRevision: 0,
    history: [],
    future: [],
    measurements: [],
    archivedEvents: [],
    saveStatus: "saved",
    flushSave: vi.fn().mockResolvedValue(undefined),
  });
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("R8: waits for the old save before loading; new identity, OFF energy and requested real wire", async () => {
  const before = useApp.getState(),
    old = structuredClone(before.project);
  let resolve!: () => void;
  const pending = new Promise<void>((done) => {
    resolve = done;
  });
  const flush = vi
    .fn()
    .mockReturnValueOnce(pending)
    .mockResolvedValue(undefined);
  useApp.setState({ flushSave: flush });
  const launch = openReferenceCopy("ele02-101", "W21");
  expect(useApp.getState().project.circuit.projectId).toBe(
    old.circuit.projectId,
  );
  resolve();
  await launch;
  const after = useApp.getState();
  expect(after.project.circuit.projectId).not.toBe(old.circuit.projectId);
  expect(after.runtime.energized).toBe(false);
  expect(after.history).toEqual([]);
  expect(after.selection).toEqual(["W21"]);
  expect(after.knowledgeHighlight).toEqual([
    { deviceId: "P1.T1", terminalId: "2" },
    { deviceId: "P2.T1", terminalId: "1" },
  ]);
  expect(before.project).toEqual(old);
  expect(flush).toHaveBeenCalledTimes(2);
});
it("R8: failed prior save prevents replacement and preserves active session", async () => {
  useApp.setState({
    flushSave: vi.fn().mockRejectedValue(new Error("Brak miejsca")),
  });
  const before = useApp.getState();
  await expect(openReferenceCopy("ele02-101")).rejects.toThrow("Brak miejsca");
  expect(useApp.getState().project).toBe(before.project);
  expect(useApp.getState().runtime).toBe(before.runtime);
  await expect(openReferenceCopy("unknown")).rejects.toThrow("pełnego odbioru");
});
it("does not grade an exam reference with the retired generic exercise checker", () => {
  const before = useApp.getState();
  before.runChecks();
  expect(useApp.getState().checks).toEqual([]);
  expect(useApp.getState().notice).toContain(
    "nie ma automatycznej oceny montażu",
  );
  expect(useApp.getState().project).toBe(before.project);
  expect(useApp.getState().runtime).toBe(before.runtime);
});

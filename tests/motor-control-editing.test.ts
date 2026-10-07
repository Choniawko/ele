// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import fixture from "../examples/physical/ELE02_108_stanowisko.json";
import { validateProjectDocument } from "@catalog/project-validation";
import { initialRuntime } from "@simulation/index";
import { useApp } from "../apps/web/src/store";
const posted = vi.fn();
vi.mock("../apps/web/src/persistence", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../apps/web/src/persistence")>()),
  saveProject: vi.fn().mockResolvedValue(undefined),
}));
beforeEach(() => {
  vi.useFakeTimers();
  posted.mockClear();
  vi.stubGlobal(
    "Worker",
    class {
      postMessage(request: unknown) {
        posted(request);
      }
    },
  );
  const p = validateProjectDocument(fixture);
  useApp.setState({
    project: p,
    runtime: initialRuntime(p),
    mode: "build",
    selection: [],
    history: [],
    future: [],
    measurements: [],
    archivedEvents: [],
    sessionId: "motor-editing",
    libraryRevision: 0,
    notice: "",
    saveStatus: "saved",
  });
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("chwilowe przyciski obu stanowisk w Budowie trafiają do solvera, bez zapisu wciśnięcia jako nastawy projektu", () => {
  const before = useApp.getState().project;
  for (const [id, actuator] of [
    ["S1", "start"],
    ["S1", "stop"],
    ["S3", "start"],
    ["S3", "stop"],
    ["S2", undefined],
    ["S4", undefined],
  ] as const) {
    for (const state of [true, false]) {
      useApp.getState().operate(id, state, undefined, actuator);
      expect(posted).toHaveBeenLastCalledWith(
        expect.objectContaining({
          action: {
            type: "operate",
            deviceId: id,
            state,
            reset: undefined,
            actuator,
          },
        }),
      );
      expect(useApp.getState().project).toBe(before);
      expect(useApp.getState().notice).toBe("");
    }
  }
  expect(useApp.getState().history).toEqual([]);
});
it("inspektor przypina blok NO do Q2, a nie do silnika czy niezależnego zespołu przycisków", () => {
  useApp.getState().attachAuxiliary("Q2.AUX", "Q2");
  const before = useApp.getState().project;
  expect(before.circuit.mechanicalCouplings).toEqual([
    expect.objectContaining({ kind: "assembly", deviceIds: ["Q2", "Q2.AUX"] }),
  ]);
  for (const parent of ["M", "S1"]) {
    useApp.getState().attachAuxiliary("Q2.AUX", parent);
    expect(useApp.getState().project).toBe(before);
    expect(useApp.getState().notice).toContain("Blok wymaga mechanizmu");
  }
});

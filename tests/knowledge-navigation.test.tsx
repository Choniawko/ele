// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useApp } from "../apps/web/src/store";
import {
  openKnowledge,
  readContext,
  returnToWorkbench,
  boardCameras,
} from "../apps/web/src/knowledge-navigation";
import { createDemo, deviceByName } from "../packages/knowledge/examples";
import { initialRuntime } from "@simulation/index";
vi.mock("../apps/web/src/persistence", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../apps/web/src/persistence")>()),
  saveProject: vi.fn().mockResolvedValue(undefined),
}));
beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  localStorage.clear();
  location.hash = "workbench";
  vi.stubGlobal(
    "Worker",
    class {
      postMessage() {}
    },
  );
  const p = createDemo("prawo-lewo");
  useApp.setState({
    project: p,
    runtime: initialRuntime(p),
    history: [],
    future: [],
    measurements: [],
    archivedEvents: [],
    selection: [],
    knowledgeHighlight: [],
    saveStatus: "saved",
    libraryRevision: 0,
    view: "schematic",
  });
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("czytanie i powrót zachowują tożsamość projektu, undo/redo, runtime i kadr", async () => {
  const s = useApp.getState(),
    d = deviceByName(s.project, "K2");
  s.updateDevice(d.id, {}, "K2a");
  useApp.getState().undo();
  const before = useApp.getState();
  boardCameras.schematic = { x: 25, y: -50, scale: 1.3 };
  useApp.setState({ selection: [d.id] });
  await openKnowledge(d.productId, d.id, "A1");
  expect(location.hash).toBe("#/wiedza/aparaty/stycznik");
  expect(readContext()).toMatchObject({
    deviceId: d.id,
    revision: before.project.circuit.revision,
    cameras: { schematic: { x: 25, y: -50, scale: 1.3 } },
  });
  const camera = vi.fn();
  window.addEventListener("ele:restore-cameras", camera);
  returnToWorkbench(true);
  window.removeEventListener("ele:restore-cameras", camera);
  const after = useApp.getState();
  expect(after.project).toBe(before.project);
  expect(after.history).toBe(before.history);
  expect(after.future).toBe(before.future);
  expect(after.runtime).toBe(before.runtime);
  expect(after.selection).toEqual([d.id]);
  expect(after.knowledgeHighlight).toEqual([
    { deviceId: d.id, terminalId: "A1" },
  ]);
  expect(after.view).toBe("schematic");
  expect(camera).toHaveBeenCalledOnce();
  expect(after.runtime.energized).toBe(false);
});
it("usunięty aparat nie jest zastępowany przez obiekt o takim samym oznaczeniu", async () => {
  const s = useApp.getState(),
    d = deviceByName(s.project, "K1");
  await openKnowledge(d.productId, d.id);
  const p = structuredClone(s.project);
  p.circuit.devices = p.circuit.devices.filter((x) => x.id !== d.id);
  const other = deviceByName(p, "K2");
  other.designation = "K1";
  useApp.setState({ project: p, selection: [] });
  returnToWorkbench(true);
  expect(useApp.getState().selection).toEqual([]);
  expect(useApp.getState().knowledgeHighlight).toEqual([]);
  expect(useApp.getState().project).toBe(p);
});
it("odrzucony zapis blokuje nawigację i zachowuje kontekst", async () => {
  const s = useApp.getState(),
    d = deviceByName(s.project, "K1"),
    flush = s.flushSave;
  const failed = vi.fn().mockRejectedValue(Error("Zapis odrzucony"));
  useApp.setState({ flushSave: failed });
  try {
    await openKnowledge(d.productId, d.id);
    expect(location.hash).toBe("#workbench");
    expect(readContext()).toBeNull();
  } finally {
    useApp.setState({ flushSave: flush });
  }
});

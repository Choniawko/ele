// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { scenarioProject } from "@training/index";
import { initialRuntime } from "@simulation/index";
import { projectLimits, type Point } from "@model/index";
import { validateProjectDocument } from "@catalog/project-validation";
import { useApp } from "../apps/web/src/store";
import { saveProject, ProjectReadError } from "../apps/web/src/persistence";

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
  const project = scenarioProject("lamp");
  const runtime = initialRuntime(project);
  runtime.energized = true;
  useApp.setState({
    project,
    runtime,
    sessionId: "test-session",
    history: [],
    future: [
      {
        project: structuredClone(project),
        label: "Przyszła zmiana",
        topology: false,
      },
    ],
    measurements: [],
    archivedEvents: [],
    selection: [],
    mode: "build",
    wireStart: null,
    waypoints: [],
    paused: false,
    busy: false,
    saveStatus: "saved",
    saveError: "",
    notice: "",
    recovery: null,
  });
  vi.mocked(saveProject).mockClear();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function unchanged(before: ReturnType<typeof useApp.getState>) {
  const after = useApp.getState();
  for (const key of [
    "project",
    "runtime",
    "history",
    "future",
    "sessionId",
    "measurements",
    "archivedEvents",
    "paused",
    "busy",
    "saveStatus",
  ] as const)
    expect(after[key], key).toBe(before[key]);
  expect(after.notice).not.toBe("");
  expect(saveProject).not.toHaveBeenCalled();
}
describe("jedna definicja poprawnego projektu", () => {
  it("błąd zapisu poprzedniego projektu podczas przełączenia również udostępnia kopię", async () => {
    const previous = structuredClone(useApp.getState().project);
    previous.name = "N".repeat(projectLimits.name.maxLength + 1);
    const error = new ProjectReadError(
      { document: previous },
      previous.circuit.projectId,
      new Error("Niepoprawna nazwa projektu"),
    );
    vi.mocked(saveProject).mockRejectedValueOnce(error);
    useApp.getState().newProject();
    const current = useApp.getState().project;
    await Promise.resolve();
    expect(useApp.getState().recovery).toEqual(error.recovery);
    expect(useApp.getState().project).toBe(current);
    expect(useApp.getState().saveStatus).toBe("saving");
    expect(useApp.getState().notice).toContain("poprzedniego projektu");
  });
  it("status zapisu czeka na sukces; stary błąd nie zastępuje stanu nowszego zapisu", async () => {
    let rejectFirst!: (error: Error) => void, resolveSecond!: () => void;
    vi.mocked(saveProject)
      .mockImplementationOnce(
        () =>
          new Promise<void>((_, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveSecond = resolve;
          }),
      );
    useApp.getState().rename("Pierwsza nazwa");
    await vi.advanceTimersByTimeAsync(350);
    expect(useApp.getState().saveStatus).toBe("saving");
    useApp.getState().rename("Druga nazwa");
    await vi.advanceTimersByTimeAsync(350);
    rejectFirst(new Error("Stary błąd"));
    await Promise.resolve();
    await Promise.resolve();
    expect(useApp.getState().saveStatus).toBe("saving");
    expect(useApp.getState().saveError).toBe("");
    resolveSecond();
    await Promise.resolve();
    await Promise.resolve();
    expect(useApp.getState().saveStatus).toBe("saved");
  });
  it("nazwa 121 znaków i pusta nazwa nie zmieniają dokumentu ani undo/redo", () => {
    for (const name of ["N".repeat(projectLimits.name.maxLength + 1), ""]) {
      const before = useApp.getState();
      before.rename(name);
      unchanged(before);
      expect(useApp.getState().notice).toMatch(/Nazwa projektu/);
    }
  });
  it("undo i redo walidują cały wynik, łącznie z nową rewizją", () => {
    const project = structuredClone(useApp.getState().project);
    project.circuit.revision = Number.MAX_SAFE_INTEGER;
    const frame = {
      project: structuredClone(project),
      label: "Granica rewizji",
      topology: true,
    };
    useApp.setState({ project, history: [frame], future: [frame] });
    for (const operation of [useApp.getState().undo, useApp.getState().redo]) {
      const before = useApp.getState();
      operation();
      unchanged(before);
    }
  });
  it("niepoprawny przewód z poprawną zmianą opisu jest odrzucany w całości", () => {
    const before = useApp.getState(),
      w = before.project.circuit.conductors[0];
    before.updateWire(w.id, {
      electricalLengthM: 10001,
      marking: "Nie zatwierdzaj",
    });
    unchanged(before);
    expect(useApp.getState().notice).toContain("10000");
  });
  it("oznaczenia, opisy, nastawy i punkty tras podlegają walidacji domenowej", () => {
    const s = useApp.getState(),
      d = s.project.circuit.devices.find((d) => d.designation === "H1")!,
      w = s.project.circuit.conductors[0];
    const operations = [
      () => s.updateDevice(d.id, {}, "D".repeat(31)),
      () => s.updateDevice(d.id, {}, ""),
      () => s.updateWire(w.id, { marking: "W".repeat(31) }),
      () => s.updateDevice(d.id, { powerW: 0 }),
      () => s.updateDevice(d.id, { powerW: 100001 }),
      () => s.updateWire(w.id, { electricalLengthM: NaN }),
      () => s.updateRoute(w.id, "physical", [{ x: 10001, y: 0 }]),
      () => s.updateRoute(w.id, "physical", [{ x: 0, y: Infinity }]),
      () =>
        s.updateRoute(
          w.id,
          "physical",
          Array.from({ length: 101 }, () => ({ x: 1, y: 1 })),
        ),
    ];
    for (const op of operations) {
      const before = useApp.getState();
      op();
      unchanged(before);
    }
  });
  it("prawidłowe granice są zachowane bez skracania i eksport przechodzi import", () => {
    const s = useApp.getState();
    s.rename("N".repeat(120));
    s.updateWire(s.project.circuit.conductors[0].id, {
      electricalLengthM: 10000,
      marking: "W".repeat(30),
    });
    const saved = useApp.getState();
    expect(saved.project.name).toHaveLength(120);
    expect(saved.project.circuit.conductors[0].electricalLengthM).toBe(10000);
    expect(validateProjectDocument(saved.exported())).toEqual(saved.project);
  });
  it("limity nowych przewodów i roboczych tras nie zależą od HTML", () => {
    const s = useApp.getState(),
      length = s.length;
    s.setWireOptions({ length: 10001, role: "N" });
    expect(useApp.getState().length).toBe(length);
    expect(useApp.getState().role).toBe(s.role);
    s.addWaypoint({ x: 10001, y: 1 });
    expect(useApp.getState().waypoints).toEqual([]);
    s.addWaypoint({ x: NaN, y: 1 } as Point);
    expect(useApp.getState().waypoints).toEqual([]);
  });
  it("hipoteza w sandbox i ćwiczeniu ma ten sam limit przy edycji i imporcie", () => {
    for (const training of [false, true]) {
      const project = scenarioProject(
        training ? "diagnosis" : "lamp",
        training,
      );
      useApp.setState({ project });
      const text = "H".repeat(projectLimits.diagnosis.maxLength + 1);
      const before = useApp.getState();
      before.recordHypothesis(text);
      unchanged(before);
      expect(useApp.getState().notice).toContain("1000");
      const imported = structuredClone(project);
      if (imported.training) imported.training.diagnosis = text;
      else imported.userMetadata.diagnosisHypothesis = text;
      expect(() => validateProjectDocument(imported)).toThrow(/1000/);
    }
  });
});

// @vitest-environment jsdom
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProjectMiniature } from "../apps/web/src/MyProjects";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import fixture from "../examples/physical/ELE02_101_stanowisko.json";
import { validateProjectDocument } from "@catalog/project-validation";
import { initialRuntime } from "@simulation/index";
import { useApp } from "../apps/web/src/store";
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
  const p = validateProjectDocument(fixture),
    rt = initialRuntime(p);
  rt.energized = true;
  useApp.setState({
    project: p,
    runtime: rt,
    mode: "build",
    view: "split",
    wireStart: null,
    waypoints: [],
    selection: [],
    history: [],
    future: [],
    measurements: [],
    archivedEvents: [],
    sessionId: "physical-test",
    notice: "",
    saveStatus: "saved",
    libraryRevision: 0,
  });
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("pokrywy i przeniesienie zachowują sesję symulacji i historię pomiarów", () => {
  const before = useApp.getState();
  before.toggleEnclosure("case-P1");
  useApp.getState().moveEnclosure("case-P1", { x: 612, y: 400 });
  const after = useApp.getState();
  expect(after.runtime).toBe(before.runtime);
  expect(after.measurements).toBe(before.measurements);
  expect(after.sessionId).toBe(before.sessionId);
  expect(after.project.circuit).toEqual(before.project.circuit);
  expect(after.history).toHaveLength(2);
  after.undo();
  expect(useApp.getState().project.physical.enclosures).toEqual(
    before.project.physical.enclosures!.map((e) =>
      e.id === "case-P1" ? { ...e, closed: false } : e,
    ),
  );
});
it("zamknięta puszka blokuje zacisk fizyczny, schemat w widoku dzielonym nadal działa", () => {
  const s = useApp.getState(),
    ref = { deviceId: "P1.N", terminalId: "1" };
  s.terminalClick(ref, "physical");
  expect(useApp.getState().wireStart).toBeNull();
  expect(useApp.getState().notice).toContain("Otwórz pokrywę");
  s.terminalClick(ref, "schematic");
  expect(useApp.getState().wireStart).toEqual(ref);
  useApp.getState().toggleEnclosure("case-P1");
  expect(useApp.getState().wireStart).toBeNull();
  useApp.getState().terminalClick(ref, "physical");
  expect(useApp.getState().wireStart).toEqual(ref);
});
it("odrzuca wyciągnięcie aparatu poza puszkę bez częściowej zmiany stanu", () => {
  const before = useApp.getState();
  before.moveDevices({ "P1.N": { x: 1800, y: 1300 } }, "physical");
  const after = useApp.getState();
  for (const key of [
    "project",
    "runtime",
    "measurements",
    "history",
    "future",
  ] as const)
    expect(after[key]).toBe(before[key]);
  expect(after.notice).toContain("nie mieści się");
});
it("usunięcie aparatu i żył usuwa metadane bez pozostawienia nieczytelnego projektu", () => {
  useApp.setState({ selection: ["P1.T1"] });
  useApp.getState().deleteSelection();
  const p = useApp.getState().project;
  expect(() => validateProjectDocument(p)).not.toThrow();
  expect(
    p.physical.enclosures!.find((e) => e.id === "case-P1")!.deviceIds,
  ).not.toContain("P1.T1");
  const ids = new Set(p.circuit.conductors.map((w) => w.id));
  expect(
    p.physical.trunking!.every((t) =>
      t.conductorIds.every((id) => ids.has(id)),
    ),
  ).toBe(true);
});
it("przypisanie wielu żył zachowuje długości elektryczne, powtórzenie jest bez zmian trasy", () => {
  const before = useApp.getState().project;
  useApp.getState().addTrunk({
    name: "Dodatkowe",
    points: [
      { x: 600, y: 1000 },
      { x: 900, y: 1000 },
    ],
    width: 36,
    closed: false,
  });
  const id = useApp.getState().project.physical.trunking!.at(-1)!.id;
  useApp.getState().assignTrunk(id, ["W20", "W21"]);
  const p = useApp.getState().project;
  expect(p.circuit).toEqual(before.circuit);
  expect(p.physical.trunking!.at(-1)!.conductorIds).toEqual(["W20", "W21"]);
  useApp.getState().assignTrunk(id, ["W20", "W21"]);
  expect(useApp.getState().project.physical.routes).toEqual(p.physical.routes);
});

it("miniatura obejmuje również puste obudowy i skrajne segmenty korytek", () => {
  const p = useApp.getState().project;
  p.physical.enclosures!.push({
    id: "empty-case",
    name: "P3",
    kind: "junction",
    position: { x: 1700, y: 1200 },
    width: 600,
    height: 400,
    deviceIds: [],
    closed: true,
  });
  p.physical.trunking!.push({
    id: "edge-trunk",
    name: "Trasa",
    points: [
      { x: -300, y: -200 },
      { x: -300, y: 1700 },
    ],
    width: 36,
    conductorIds: [],
    closed: true,
  });
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(
    createElement(ProjectMiniature, { project: p }),
  );
  const [x, y, width, height] = host
    .querySelector("svg")!
    .getAttribute("viewBox")!
    .split(" ")
    .map(Number);
  expect(x).toBeLessThanOrEqual(-318);
  expect(y).toBeLessThanOrEqual(-218);
  expect(x + width).toBeGreaterThanOrEqual(2300);
  expect(y + height).toBeGreaterThanOrEqual(1718);
});

it("usunięcie zaznaczonej obudowy zachowuje aparaty, przewody i działającą symulację", () => {
  useApp.setState({ selection: ["case-P1"] });
  const before = useApp.getState();
  before.deleteSelection();
  const after = useApp.getState();
  expect(after.project.physical.enclosures).toHaveLength(3);
  expect(after.project.circuit).toEqual(before.project.circuit);
  expect(after.runtime).toBe(before.runtime);
  expect(() => validateProjectDocument(after.project)).not.toThrow();
  after.undo();
  expect(useApp.getState().project.physical.enclosures).toEqual(
    before.project.physical.enclosures,
  );
});

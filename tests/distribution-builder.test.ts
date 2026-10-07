// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { scenarioProject } from "@training/index";
import { initialRuntime } from "@simulation/index";
import { catalog } from "@catalog/index";
import { mountingInfo } from "@catalog/mounting-profiles";
import { clone, emptyProject } from "@model/index";
import { validateProjectDocument } from "@catalog/project-validation";
import {
  enclosureWindows,
  distributionRails,
  rowOccupancy,
  placementPoint,
} from "@model/distribution";
import { useApp } from "../apps/web/src/store";
import legacy from "../examples/physical/ELE02_101_stanowisko.json";
vi.mock("../apps/web/src/persistence", async (original) => ({
  ...(await original<typeof import("../apps/web/src/persistence")>()),
  saveProject: vi.fn().mockResolvedValue(undefined),
}));
const resolve = (id: string) => mountingInfo(catalog[id]);
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
    sessionId: "cabinet-test",
    mode: "build",
    view: "physical",
    wireStart: null,
    waypoints: [],
    selection: [],
    history: [],
    future: [],
    measurements: [],
    archivedEvents: [],
    mountingTarget: null,
    focusedEnclosureId: null,
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
function create(rows = 2, modules: 8 | 12 = 12) {
  expect(
    useApp
      .getState()
      .createDistribution("R1", rows, modules, 2, { x: 1400, y: 100 }),
  ).toBe(true);
  return useApp.getState().project.physical.enclosures!.at(-1)!;
}
function same(before: ReturnType<typeof useApp.getState>) {
  const after = useApp.getState();
  for (const key of [
    "project",
    "history",
    "future",
    "runtime",
    "sessionId",
    "measurements",
    "saveStatus",
  ] as const)
    expect(after[key], key).toBe(before[key]);
}
it("szerokości wynikają z korpusów, RCD 48 mm zajmuje 3 pola bez skalowania", () => {
  const e = create();
  useApp.getState().addDevice("edu-rcd");
  useApp.getState().addDevice("hager-mbn116e");
  const project = useApp.getState().project,
    box = project.physical.enclosures!.at(-1)!;
  expect(rowOccupancy(project, box, "modules", 0, resolve).size).toBe(4);
  const [rcd, mcb] = box.deviceIds;
  expect(box.distribution!.placements[rcd]).toEqual({
    zone: "modules",
    row: 0,
    slot: 0,
  });
  expect(box.distribution!.placements[mcb].slot).toBe(3);
  expect(
    project.physical.devices[mcb].x - project.physical.devices[rcd].x,
  ).toBeCloseTo(118.8);
  expect(enclosureWindows(e)).toHaveLength(2);
  expect(distributionRails(e)).toHaveLength(2);
  expect(validateProjectDocument(project)).toEqual(project);
});
it("pełny rząd odrzuca dodanie bez aparatu na innej szynie i bez częściowej transakcji", () => {
  create(1, 8);
  for (let i = 0; i < 8; i++) useApp.getState().addDevice("hager-mbn116e");
  const before = useApp.getState();
  before.addDevice("hager-mbn116e");
  same(before);
  expect(useApp.getState().notice).toContain("kolejnych wolnych pól");
});
it("przeniesienie między rzędami, rozbudowa i undo zachowują ID, przewody, pomiary oraz symulację", () => {
  const e = create();
  const d = useApp
    .getState()
    .project.circuit.devices.find(
      (d) => catalog[d.productId].behaviorId === "mcb",
    )!;
  useApp
    .getState()
    .mountDevices({ enclosureId: e.id, zone: "modules", row: 0 }, [d.id], 0);
  const before = useApp.getState();
  expect(before.runtime.energized).toBe(true);
  expect(
    before.mountDevices(
      { enclosureId: e.id, zone: "modules", row: 1 },
      [d.id],
      5,
    ),
  ).toBe(true);
  expect(useApp.getState().configureDistribution(e.id, "R1", 3, 12, 4)).toBe(
    true,
  );
  const after = useApp.getState();
  expect(after.project.circuit).toEqual(before.project.circuit);
  expect(after.runtime).toBe(before.runtime);
  expect(after.measurements).toBe(before.measurements);
  expect(after.sessionId).toBe(before.sessionId);
  after.undo();
  useApp.getState().undo();
  expect(useApp.getState().project).toEqual(before.project);
});
it("zmniejszenie zajętej rozdzielnicy i kolizja pól nie mutują historii ani symulacji", () => {
  const e = create();
  useApp.getState().addDevice("edu-rcd");
  const a = useApp.getState().selection[0];
  useApp.getState().addDevice("hager-mbn116e");
  const b = useApp.getState().selection[0];
  const first = useApp.getState();
  expect(
    first.mountDevices({ enclosureId: e.id, zone: "modules", row: 0 }, [b], 1),
  ).toBe(false);
  same(first);
  useApp
    .getState()
    .mountDevices({ enclosureId: e.id, zone: "modules", row: 1 }, [a], 0);
  const before = useApp.getState();
  expect(before.configureDistribution(e.id, "R1", 1, 8, 0)).toBe(false);
  same(before);
  expect(useApp.getState().notice).toContain("nie mieści");
});
it("przeciąganie przyciąga do pól własnego rzędu i zachowuje połączenia", () => {
  const e = create();
  useApp.getState().addDevice("hager-mbn116e");
  const id = useApp.getState().selection[0],
    before = useApp.getState();
  const expected = placementPoint(e, { zone: "modules", row: 1, slot: 3 });
  before.moveDevices(
    { [id]: { x: expected.x + 3, y: expected.y + 8 } },
    "physical",
  );
  expect(useApp.getState().project.physical.devices[id]).toEqual(expected);
  expect(useApp.getState().project.circuit).toEqual(before.project.circuit);
});
it("listwy mają osobną strefę, brak maskownicy jest wymagany, niemodułowe aparaty pozostają na tablicy", () => {
  const e = create();
  const before = useApp.getState();
  before.addDevice("schneider-lc1d09p7");
  same(before);
  useApp
    .getState()
    .setMountingTarget({ enclosureId: e.id, zone: "terminals", row: 0 });
  useApp.getState().addDevice("edu-bus-n");
  useApp.getState().addDevice("edu-bus-pe");
  const box = useApp.getState().project.physical.enclosures!.at(-1)!;
  expect(box.deviceIds).toHaveLength(2);
  expect(
    rowOccupancy(useApp.getState().project, box, "modules", 0, resolve).size,
  ).toBe(0);
  useApp.getState().toggleEnclosure(e.id);
  const closed = useApp.getState();
  closed.addDevice("edu-junction-terminal");
  same(closed);
  expect(useApp.getState().notice).toContain("maskownicę");
});
it("walidacja importu odrzuca niespójne pozycje, nieznaną rewizję profilu i nałożone pola", () => {
  create();
  useApp.getState().addDevice("hager-mbn116e");
  const p = clone(useApp.getState().project),
    e = p.physical.enclosures!.at(-1)!,
    id = e.deviceIds[0];
  p.physical.devices[id].x += 1;
  expect(() => validateProjectDocument(p)).toThrow("pozycja");
  const raw = clone(useApp.getState().project);
  (
    raw.physical.enclosures!.at(-1)!.distribution as { revision: string }
  ).revision = "2";
  expect(() => validateProjectDocument(raw)).toThrow();
  useApp.getState().addDevice("hager-mbn116e");
  const collision = clone(useApp.getState().project),
    box = collision.physical.enclosures!.at(-1)!,
    [first, second] = box.deviceIds;
  box.distribution!.placements[second] = {
    ...box.distribution!.placements[first],
  };
  collision.physical.devices[second] = { ...collision.physical.devices[first] };
  expect(() => validateProjectDocument(collision)).toThrow("pola montażowe");
});
it("przesunięcie całej skrzynki, usunięcie członka i usunięcie obudowy dają poprawne dokumenty", () => {
  const e = create();
  useApp.getState().addDevice("edu-rcd");
  const id = useApp.getState().selection[0];
  useApp.getState().moveEnclosure(e.id, { x: 1450, y: 150 });
  expect(() =>
    validateProjectDocument(useApp.getState().project),
  ).not.toThrow();
  useApp.getState().deleteSelection();
  expect(
    useApp.getState().project.physical.enclosures!.at(-1)!.distribution!
      .placements[id],
  ).toBeUndefined();
  useApp.getState().focusEnclosure(e.id);
  useApp.getState().deleteEnclosure(e.id);
  expect(useApp.getState().mountingTarget).toBeNull();
  expect(useApp.getState().focusedEnclosureId).toBeNull();
});
it("stary przykład pozostaje ręczny, nowy pusty projekt może zawierać tylko rozdzielnicę", () => {
  expect(validateProjectDocument(legacy)).toEqual(legacy);
  expect(
    validateProjectDocument(legacy).physical.enclosures!.every(
      (e) => !e.distribution,
    ),
  ).toBe(true);
  useApp.setState({ project: emptyProject() });
  create(1, 8);
  expect(() =>
    validateProjectDocument(useApp.getState().project),
  ).not.toThrow();
});

it("rozbudowa lub przesunięcie obudowy na zewnętrzny aparat jest odrzucone atomowo", () => {
  const e = create(1, 8),
    before = useApp.getState();
  const g = before.project.circuit.devices.find((d) => d.designation === "G1")!;
  before.moveEnclosure(e.id, before.project.physical.devices[g.id]);
  same(before);
  expect(useApp.getState().notice).toContain("nakłada");
});
it("zamknięta maskownica źródłowej rozdzielnicy blokuje wyjęcie i transfer", () => {
  const a = create();
  useApp.getState().addDevice("hager-mbn116e");
  const id = useApp.getState().selection[0];
  useApp.getState().toggleEnclosure(a.id);
  expect(
    useApp.getState().createDistribution("R2", 1, 12, 0, { x: 2200, y: 100 }),
  ).toBe(true);
  const b = useApp.getState().project.physical.enclosures!.at(-1)!,
    before = useApp.getState();
  expect(
    before.mountDevices({ enclosureId: b.id, zone: "modules", row: 0 }, [id]),
  ).toBe(false);
  same(before);
  expect(useApp.getState().notice).toContain("maskownicę");
});

it("undo, zmniejszenie liczby rzędów i schemat porządkują przejściowy cel montażu", () => {
  const e = create();
  useApp.getState().focusEnclosure(e.id);
  useApp.getState().undo();
  expect(useApp.getState().mountingTarget).toBeNull();
  expect(useApp.getState().focusedEnclosureId).toBeNull();
  useApp.getState().redo();
  useApp.getState().focusEnclosure(e.id);
  useApp.getState().configureDistribution(e.id, "R1", 3, 12, 0);
  useApp
    .getState()
    .setMountingTarget({ enclosureId: e.id, zone: "modules", row: 2 });
  useApp.getState().undo();
  expect(useApp.getState().mountingTarget!.row).toBe(0);
  useApp.getState().setView("schematic");
  expect(useApp.getState().mountingTarget).toBeNull();
  expect(useApp.getState().focusedEnclosureId).toBeNull();
});

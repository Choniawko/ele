import { create } from "zustand";
import {
  mountingRails,
  nearestRail,
  snapMounting,
  mountingCollision,
  freeMountingPosition,
  RAIL_OFFSET,
  RAIL_SPACING,
} from "@editor/layout";
import { catalog } from "@catalog/index";
import {
  validateProjectDocument,
  validationMessage,
} from "@catalog/project-validation";
import {
  clone,
  emptyProject,
  newId,
  terminalKey,
  routeSchema,
  wireOptionsSchema,
  projectLimits,
  type ProjectDocument,
  type Point,
  type TerminalRef,
  type Role,
  type FaultKind,
  type DeviceSettings,
} from "@model/index";
import {
  initialRuntime,
  type RuntimeSnapshot,
  type RuntimeAction,
} from "@simulation/index";
import {
  scenarioProject,
  colors,
  checkScenario,
  type CheckResult,
} from "@training/index";
import type {
  MeasurementRequest,
  MeasurementRecord,
  MeasurementResult,
  MeasurementFunction,
} from "@measurements/index";
import {
  restoreProject,
  saveProject,
  safeExport,
  ProjectReadError,
  type ProjectRecovery,
} from "./persistence";
import type { WorkerRequest } from "./simulation.worker";
export type Mode = "build" | "test" | "measure" | "diagnosis" | "training";
export type View = "physical" | "schematic" | "split";
type SavedFrame = {
  project: ProjectDocument;
  label: string;
  topology: boolean;
};
interface AppState {
  project: ProjectDocument;
  runtime: RuntimeSnapshot;
  mode: Mode;
  view: View;
  selection: string[];
  wireStart: TerminalRef | null;
  waypoints: Point[];
  adding: string | null;
  showTerminals: boolean;
  role: Role;
  wireColor: string;
  section: number;
  length: number;
  history: SavedFrame[];
  future: SavedFrame[];
  saveStatus: "loading" | "saved" | "saving" | "error";
  saveError: string;
  recovery: ProjectRecovery | null;
  notice: string;
  hydrated: boolean;
  paused: boolean;
  speed: 1 | 5 | 20;
  sessionId: string;
  sequence: number;
  busy: boolean;
  measurements: MeasurementRecord[];
  archivedEvents: RuntimeSnapshot["events"];
  instrument: MeasurementRequest;
  measurement: MeasurementResult | null;
  activeProbe: "red" | "black";
  checks: CheckResult[];
  setView: (view: View) => void;
  setMode: (mode: Mode) => void;
  select: (id: string | null, multi?: boolean) => void;
  setAdding: (id: string | null) => void;
  addDevice: (
    productId: string,
    point?: Point,
    view?: "physical" | "schematic",
  ) => void;
  addRail: () => void;
  moveSelectionToRail: (railId: string) => void;
  updateRoute: (
    id: string,
    view: "physical" | "schematic",
    points: Point[],
  ) => void;
  moveDevices: (
    positions: Record<string, Point>,
    view: "physical" | "schematic",
  ) => void;
  updateDevice: (
    id: string,
    settings: DeviceSettings,
    designation?: string,
  ) => void;
  updateWire: (
    id: string,
    values: Partial<{
      declaredRole: Role;
      insulationColor: string;
      crossSectionMm2: number;
      electricalLengthM: number;
      marking: string;
    }>,
  ) => void;
  terminalClick: (ref: TerminalRef) => void;
  cancelWire: () => void;
  addWaypoint: (point: Point) => void;
  popWaypoint: () => void;
  setWireOptions: (
    options: Partial<
      Pick<AppState, "role" | "wireColor" | "section" | "length">
    >,
  ) => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  alignSelection: () => void;
  undo: () => void;
  redo: () => void;
  power: (on?: boolean) => void;
  operate: (id: string, state?: boolean, reset?: boolean) => void;
  testRcd: (id: string) => void;
  step: (deltaMs?: number) => void;
  reset: () => void;
  setPaused: (paused: boolean) => void;
  setSpeed: (speed: 1 | 5 | 20) => void;
  toggleTerminals: () => void;
  setInstrument: (values: Partial<MeasurementRequest>) => void;
  setProbe: (probe: "red" | "black") => void;
  performMeasurement: () => void;
  addFault: (
    kind: FaultKind,
    targetId: string,
    resistanceOhm?: number,
    from?: TerminalRef,
    to?: TerminalRef,
  ) => void;
  repairFaults: () => void;
  revealFaults: () => void;
  load: (
    project: ProjectDocument,
    records?: MeasurementRecord[],
    events?: RuntimeSnapshot["events"],
  ) => void;
  newProject: () => void;
  loadScenario: (id: string, training?: boolean) => void;
  rename: (name: string) => void;
  hydrate: () => Promise<void>;
  runChecks: () => void;
  hint: () => void;
  recordHypothesis: (text: string) => void;
  setNotice: (notice: string) => void;
  reportReadError: (error: unknown) => void;
  exported: () => ProjectDocument;
}
let worker: Worker | undefined,
  saveTimer: ReturnType<typeof setTimeout> | undefined,
  saveGeneration = 0;
const startProject = scenarioProject("lamp");
function request(action?: RuntimeAction, measurement?: MeasurementRequest) {
  const s = useApp.getState(),
    sequence = s.sequence + 1;
  if (!worker) {
    worker = new Worker(new URL("./simulation.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (
      event: MessageEvent<{
        sessionId: string;
        revision: number;
        sequence: number;
        runtime?: RuntimeSnapshot;
        measurement?: MeasurementResult;
        request?: MeasurementRequest;
        error?: string;
      }>,
    ) => {
      const reply = event.data,
        current = useApp.getState();
      if (
        reply.sessionId !== current.sessionId ||
        reply.revision !== current.project.circuit.revision ||
        reply.sequence < current.runtime.sequence
      )
        return;
      if (reply.error) {
        useApp.setState({ notice: reply.error, busy: false });
        return;
      }
      if (!reply.runtime) return;
      const devices = Object.fromEntries(
        Object.entries(reply.runtime.devices).map(([id, next]) => {
          const old = current.runtime.devices[id];
          return [
            id,
            old &&
            Object.keys(next).every(
              (key) =>
                next[key as keyof typeof next] === old[key as keyof typeof old],
            )
              ? old
              : next,
          ];
        }),
      );
      if (
        Object.keys(devices).every(
          (id) => devices[id] === current.runtime.devices[id],
        )
      )
        reply.runtime.devices = current.runtime.devices;
      else reply.runtime.devices = devices;
      useApp.setState({
        runtime: reply.runtime,
        busy: reply.sequence < current.sequence,
      });
      if (reply.runtime.events.at(-1)?.id !== current.runtime.events.at(-1)?.id)
        scheduleSave();
      if (reply.measurement && reply.request) {
        const { afterRuntime: ignored, ...result } = reply.measurement;
        void ignored;
        const record: MeasurementRecord = {
          id: newId("measurement"),
          function: reply.request.function,
          red: reply.request.red,
          black: reply.request.black,
          wireId: reply.request.wireId,
          deviceId: reply.request.deviceId,
          parameters: {
            function: reply.request.function,
            testVoltageV: reply.request.testVoltageV,
            rcdMultiplier: reply.request.rcdMultiplier,
            compensateLeads: reply.request.compensateLeads,
          },
          revision: reply.revision,
          timeMs: reply.runtime.timeMs,
          energized: reply.runtime.energized,
          result,
        };
        useApp.setState({
          measurement: result,
          measurements: [...useApp.getState().measurements, record].slice(-500),
        });
        scheduleSave();
      }
    };
    worker.onerror = () =>
      useApp.setState({
        notice:
          "Solver nie uruchomił się. Odśwież projekt lub wyeksportuj kopię.",
        busy: false,
      });
  }
  useApp.setState({ sequence, busy: true });
  const req: WorkerRequest = {
    sessionId: s.sessionId,
    revision: s.project.circuit.revision,
    sequence,
    seed: 1,
    project: s.project,
    action,
    measurement,
  };
  worker.postMessage(req);
}
function scheduleSave() {
  const generation = ++saveGeneration;
  clearTimeout(saveTimer);
  useApp.setState({ saveStatus: "saving" });
  saveTimer = setTimeout(() => {
    const s = useApp.getState();
    const savedDocument = s.project;
    void saveProject(s.project, s.measurements, [
      ...s.archivedEvents,
      ...s.runtime.events,
    ])
      .then(() => {
        const now = useApp.getState();
        if (
          generation === saveGeneration &&
          now.project.circuit.projectId === savedDocument.circuit.projectId
        )
          useApp.setState({ saveStatus: "saved", saveError: "" });
      })
      .catch((error) => {
        if (
          generation !== saveGeneration ||
          useApp.getState().project.circuit.projectId !==
            savedDocument.circuit.projectId
        )
          return;
        useApp.setState({
          saveStatus: "error",
          saveError: validationMessage(error),
          notice: "Nie udało się zapisać projektu: " + validationMessage(error),
          ...(error instanceof ProjectReadError
            ? { recovery: error.recovery }
            : {}),
        });
      });
  }, 350);
}
function transaction(
  label: string,
  mutate: (p: ProjectDocument) => void,
  topology = true,
) {
  const s = useApp.getState();
  let p: ProjectDocument;
  try {
    const draft = clone(s.project);
    mutate(draft);
    if (topology) draft.circuit.revision = s.project.circuit.revision + 1;
    p = validateProjectDocument(draft);
  } catch (error) {
    useApp.setState({
      notice: validationMessage(error),
    });
    return false;
  }
  const sessionId = topology ? newId("session") : s.sessionId;
  useApp.setState({
    project: p,
    // A structural edit may remove the device where an unfinished wire began.
    ...(s.wireStart && !connectionTerminal(p, s.wireStart)
      ? { wireStart: null, waypoints: [] }
      : {}),
    history: [
      ...s.history,
      { project: clone(s.project), label, topology },
    ].slice(-80),
    future: [],
    checks: topology ? [] : s.checks,
    notice:
      topology && s.runtime.energized
        ? "Edycja obwodu zatrzymała symulację. Pomiary wcześniejszej rewizji pozostają w historii."
        : s.notice,
    ...(topology
      ? {
          archivedEvents: [
            ...s.archivedEvents,
            ...s.runtime.events.map((e) => ({
              ...e,
              id: s.sessionId + ":" + e.id,
            })),
          ].slice(-300),
          sessionId,
          runtime: initialRuntime(p, sessionId),
          measurement: null,
          paused: true,
          busy: false,
        }
      : {}),
  });
  if (topology) request({ type: "solve" });
  scheduleSave();
  return true;
}
function connectionTerminal(project: ProjectDocument, ref: TerminalRef) {
  const device = project.circuit.devices.find((d) => d.id === ref.deviceId);
  const terminal =
    device &&
    catalog[device.productId]?.topology.terminals.find(
      (t) => t.id === ref.terminalId,
    );
  return device && terminal ? { device, terminal } : null;
}
export const useApp = create<AppState>((set, get) => ({
  project: startProject,
  runtime: initialRuntime(startProject),
  mode: "build",
  view: "physical",
  selection: [],
  wireStart: null,
  waypoints: [],
  adding: null,
  showTerminals: true,
  role: "L1",
  wireColor: colors.L1,
  section: 1.5,
  length: 2,
  history: [],
  future: [],
  saveStatus: "loading",
  saveError: "",
  recovery: null,
  notice:
    "Przeciągnij aparat za korpus. Kliknij dwa zaciski, aby podłączyć przewód.",
  hydrated: false,
  paused: true,
  speed: 1,
  sessionId: newId("session"),
  sequence: 0,
  busy: false,
  measurements: [],
  archivedEvents: [],
  instrument: {
    function: "voltage-ac",
    testVoltageV: 500,
    rcdMultiplier: 1,
    compensateLeads: true,
  },
  measurement: null,
  activeProbe: "red",
  checks: [],
  setView: (view) => set({ view, wireStart: null, waypoints: [] }),
  setMode: (mode) => {
    if (mode === "build" && get().runtime.energized) get().power(false);
    set({ mode, wireStart: null, waypoints: [], adding: null });
  },
  select: (id, multi = false) => {
    if (!id) {
      set({ selection: [] });
      return;
    }
    const current = get().selection;
    set({
      selection: multi
        ? current.includes(id)
          ? current.filter((x) => x !== id)
          : [...current, id]
        : [id],
    });
    if (get().mode === "measure") {
      const d = get().project.circuit.devices.find((d) => d.id === id);
      if (!d) get().setInstrument({ wireId: id });
      else if (
        (get().instrument.function === "rcd" &&
          ["rccb", "rcbo"].includes(catalog[d.productId].behaviorId)) ||
        (get().instrument.function === "phase-order" &&
          ["source-3ph", "motor"].includes(catalog[d.productId].behaviorId))
      )
        get().setInstrument({ deviceId: id });
    }
  },
  setAdding: (adding) => {
    get().setMode("build");
    set({ adding, wireStart: null, waypoints: [] });
  },
  addDevice: (productId, point, view = "physical") => {
    const p = catalog[productId];
    if (!p?.published) {
      set({ notice: "Produkt oczekuje na weryfikację katalogową." });
      return;
    }
    const physicalPoint = freeMountingPosition(
      get().project,
      productId,
      view === "physical" ? (point ?? { x: 80, y: 90 }) : { x: 80, y: 90 },
    );
    if (!physicalPoint) {
      set({
        notice: "Na tej szynie zabrakło miejsca. Dodaj szynę lub wybierz inną.",
      });
      return;
    }
    const id = newId("d");
    const accepted = transaction("Dodaj aparat", (project) => {
      const designations = project.circuit.devices.map((d) => d.designation);
      let n = 1;
      while (designations.includes(`${p.designationPrefix}${n}`)) n++;
      project.circuit.devices.push({
        id,
        productId,
        productRevision: p.revision,
        designation: `${p.designationPrefix}${n}`,
        settings: { ...p.defaults },
      });
      project.productRevisions[productId] = p.revision;
      project.physical.devices[id] = physicalPoint;
      project.schematic.devices[id] =
        view === "schematic" && point
          ? {
              x: Math.round(point.x / 10) * 10,
              y: Math.round(point.y / 10) * 10,
            }
          : {
              x: 80 + (project.circuit.devices.length % 5) * 190,
              y: 80 + Math.floor(project.circuit.devices.length / 5) * 520,
            };
      if (p.behaviorId.startsWith("source-"))
        project.circuit.supplySystems.push({
          id: newId("supply"),
          kind: p.behaviorId === "source-dc" ? "isolated-DC" : "TN-S",
          sourceId: id,
        });
    });
    if (accepted) set({ selection: [id], adding: null });
  },
  addRail: () => {
    if (mountingRails(get().project).length >= projectLimits.rails) {
      set({
        notice: `Tablica może mieć maksymalnie ${projectLimits.rails} szyny.`,
      });
      return;
    }
    const accepted = transaction(
      "Dodaj szynę DIN",
      (p) => {
        const rails = mountingRails(p);
        p.physical.rails = [
          ...rails,
          {
            id: newId("rail"),
            x: 60,
            y: Math.max(...rails.map((rail) => rail.y)) + RAIL_SPACING,
            width: 970,
          },
        ];
      },
      false,
    );
    if (accepted)
      set({
        notice:
          "Dodano szynę DIN. Przeciągnij na nią aparat albo wybierz szynę w menu zaznaczenia.",
      });
  },
  moveSelectionToRail: (railId) => {
    const s = get(),
      rail = mountingRails(s.project).find((rail) => rail.id === railId);
    if (!rail) return;
    const draft = clone(s.project),
      positions: Record<string, Point> = {};
    const devices = draft.circuit.devices.filter(
      (d) =>
        s.selection.includes(d.id) && catalog[d.productId].mounting === "DIN",
    );
    for (const d of devices) {
      const next = freeMountingPosition(
        draft,
        d.productId,
        { x: draft.physical.devices[d.id].x, y: rail.y - RAIL_OFFSET },
        devices.map((d) => d.id).filter((id) => !positions[id]),
      );
      if (!next) {
        set({ notice: "Na wybranej szynie zabrakło miejsca dla zaznaczenia." });
        return;
      }
      positions[d.id] = next;
      draft.physical.devices[d.id] = next;
    }
    if (devices.length) s.moveDevices(positions, "physical");
  },
  moveDevices: (positions, view) => {
    const s = get(),
      nextPositions: Record<string, Point> = {};
    for (const [id, pos] of Object.entries(positions)) {
      const d = s.project.circuit.devices.find((d) => d.id === id);
      if (!d) continue;
      nextPositions[id] =
        view === "physical"
          ? snapMounting(s.project, d.productId, pos)
          : { x: Math.round(pos.x / 10) * 10, y: Math.round(pos.y / 10) * 10 };
    }
    if (view === "physical") {
      const draft = clone(s.project);
      Object.assign(draft.physical.devices, nextPositions);
      if (
        Object.entries(nextPositions).some(([id, pos]) =>
          mountingCollision(
            draft,
            draft.circuit.devices.find((d) => d.id === id)!.productId,
            pos,
            [id],
          ),
        )
      ) {
        // A fresh controlled layout also restores a rejected JointJS drag.
        set({
          project: clone(s.project),
          notice:
            "To miejsce jest zajęte. Wybierz wolny fragment szyny lub inną szynę.",
        });
        return;
      }
    }
    if (
      !Object.entries(nextPositions).some(
        ([id, pos]) =>
          pos.x !== s.project[view].devices[id].x ||
          pos.y !== s.project[view].devices[id].y,
      )
    ) {
      set({ project: clone(s.project) });
      return;
    }
    transaction(
      "Przesuń aparaty",
      (p) => Object.assign(p[view].devices, nextPositions),
      false,
    );
  },
  updateRoute: (id, view, points) => {
    if (!get().project.circuit.conductors.some((w) => w.id === id)) return;
    transaction(
      "Zmień trasę przewodu",
      (p) => {
        p[view].routes[id] = points;
      },
      false,
    );
  },
  updateDevice: (id, settings, designation) =>
    transaction("Zmień aparat", (p) => {
      const d = p.circuit.devices.find((d) => d.id === id);
      if (d) {
        d.settings = { ...d.settings, ...settings };
        if (designation !== undefined) d.designation = designation;
      }
    }),
  updateWire: (id, values) =>
    transaction("Zmień przewód", (p) => {
      const w = p.circuit.conductors.find((w) => w.id === id);
      if (w) Object.assign(w, values);
    }),
  terminalClick: (ref) => {
    const s = get();
    const clicked = connectionTerminal(s.project, ref);
    if (!clicked) {
      set({
        notice:
          "Ten zacisk już nie istnieje. Wybierz zacisk na aktualnej tablicy.",
      });
      return;
    }
    if (s.mode === "measure") {
      s.setInstrument({ [s.activeProbe]: ref });
      set({
        activeProbe: s.activeProbe === "red" ? "black" : "red",
        measurement: null,
      });
      return;
    }
    if (s.mode !== "build") {
      s.select(ref.deviceId);
      set({
        notice:
          "Połączenia zmienisz w trybie Budowa. Sondy przypniesz w trybie Pomiary.",
      });
      return;
    }
    const from = s.wireStart;
    const start = from && connectionTerminal(s.project, from);
    if (!from || !start) {
      set({
        wireStart: ref,
        waypoints: [],
        selection: [ref.deviceId],
        notice:
          "Wybierz drugi zacisk. Esc anuluje; kliknięcie tła dodaje punkt trasy.",
      });
      return;
    }
    if (terminalKey(from) === terminalKey(ref)) {
      s.cancelWire();
      return;
    }
    const duplicate = s.project.circuit.conductors.some(
      (w) =>
        (terminalKey(w.from) === terminalKey(from) &&
          terminalKey(w.to) === terminalKey(ref)) ||
        (terminalKey(w.to) === terminalKey(from) &&
          terminalKey(w.from) === terminalKey(ref)),
    );
    if (duplicate) {
      set({ notice: "Te zaciski są już połączone." });
      return;
    }
    for (const { target, device: d, terminal: t } of [
      { target: from, ...start },
      { target: ref, ...clicked },
    ]) {
      const count = s.project.circuit.conductors.filter(
        (w) =>
          terminalKey(w.from) === terminalKey(target) ||
          terminalKey(w.to) === terminalKey(target),
      ).length;
      if (
        count >= t.maxConductors ||
        s.section < t.minMm2 ||
        s.section > t.maxMm2
      ) {
        set({
          notice: `${d.designation}/${t.label}: brak miejsca lub niedopuszczalny przekrój. Użyj złączki.`,
        });
        return;
      }
    }
    const id = newId("w");
    const accepted = transaction("Połącz zaciski", (p) => {
      p.circuit.conductors.push({
        id,
        from,
        to: ref,
        declaredRole: s.role,
        insulationColor: s.wireColor,
        crossSectionMm2: s.section,
        electricalLengthM: s.length,
        material: "Cu",
        marking: `W${p.circuit.conductors.length + 1}`,
      });
      if (s.waypoints.length)
        p[s.view === "schematic" ? "schematic" : "physical"].routes[id] = clone(
          s.waypoints,
        );
    });
    if (accepted)
      set({
        wireStart: null,
        waypoints: [],
        notice: "Przewód podłączony. Możesz rozpocząć następne połączenie.",
      });
  },
  cancelWire: () => set({ wireStart: null, waypoints: [], adding: null }),
  addWaypoint: (point) => {
    const parsed = routeSchema.safeParse([...get().waypoints, point]);
    if (!parsed.success) {
      set({ notice: validationMessage(parsed.error) });
      return;
    }
    set({ waypoints: parsed.data });
  },
  popWaypoint: () => set({ waypoints: get().waypoints.slice(0, -1) }),
  setWireOptions: (options) => {
    const parsed = wireOptionsSchema.safeParse(options);
    if (!parsed.success) {
      set({ notice: validationMessage(parsed.error) });
      return;
    }
    set({
      ...options,
      ...(options.role ? { wireColor: colors[options.role] } : {}),
    });
  },
  deleteSelection: () => {
    const ids = get().selection;
    const accepted = transaction("Usuń zaznaczenie", (p) => {
      p.circuit.devices = p.circuit.devices.filter((d) => !ids.includes(d.id));
      const removed = p.circuit.conductors
        .filter(
          (w) =>
            ids.includes(w.id) ||
            ids.includes(w.from.deviceId) ||
            ids.includes(w.to.deviceId),
        )
        .map((w) => w.id);
      p.circuit.conductors = p.circuit.conductors.filter(
        (w) => !removed.includes(w.id),
      );
      p.circuit.bridges = p.circuit.bridges.filter(
        (w) => !ids.includes(w.from.deviceId) && !ids.includes(w.to.deviceId),
      );
      p.circuit.supplySystems = p.circuit.supplySystems.filter(
        (s) => !ids.includes(s.sourceId),
      );
      p.circuit.mechanicalCouplings = p.circuit.mechanicalCouplings.filter(
        (c) => c.deviceIds.every((id) => !ids.includes(id)),
      );
      p.faults = p.faults.filter(
        (f) =>
          !ids.includes(f.targetId) &&
          !removed.includes(f.targetId) &&
          (!f.from || !ids.includes(f.from.deviceId)) &&
          (!f.to || !ids.includes(f.to.deviceId)),
      );
      for (const l of [p.physical, p.schematic]) {
        for (const id of ids) delete l.devices[id];
        for (const id of removed) delete l.routes[id];
      }
    });
    if (accepted) set({ selection: [], wireStart: null, waypoints: [] });
  },
  duplicateSelection: () => {
    const ids = get().selection,
      newIds: string[] = [];
    const accepted = transaction("Powiel aparaty", (p) => {
      for (const d of p.circuit.devices.filter((d) => ids.includes(d.id))) {
        const id = newId("d"),
          product = catalog[d.productId];
        let n = 1;
        while (
          p.circuit.devices.some(
            (d) => d.designation === `${product.designationPrefix}${n}`,
          )
        )
          n++;
        p.circuit.devices.push({
          ...clone(d),
          id,
          designation: `${product.designationPrefix}${n}`,
        });
        let target = {
          x: p.physical.devices[d.id].x,
          y: p.physical.devices[d.id].y + RAIL_SPACING,
        };
        if (
          product.mounting === "DIN" &&
          nearestRail(p, target).y - RAIL_OFFSET < target.y - 20
        ) {
          const rails = mountingRails(p);
          if (rails.length < projectLimits.rails)
            p.physical.rails = [
              ...rails,
              {
                id: newId("rail"),
                x: 60,
                y: Math.max(...rails.map((r) => r.y)) + RAIL_SPACING,
                width: 970,
              },
            ];
        }
        target =
          freeMountingPosition(p, d.productId, target, [id]) ??
          freeMountingPosition(p, d.productId, p.physical.devices[d.id], [
            id,
          ]) ??
          p.physical.devices[d.id];
        p.physical.devices[id] = target;
        p.schematic.devices[id] = {
          x: p.schematic.devices[d.id].x,
          y: p.schematic.devices[d.id].y + RAIL_SPACING,
        };
        newIds.push(id);
      }
    });
    if (accepted) set({ selection: newIds });
  },
  alignSelection: () => {
    const s = get(),
      view = s.view === "schematic" ? "schematic" : "physical";
    const positions = Object.fromEntries(
      s.selection
        .filter((id) => s.project[view].devices[id])
        .map((id, i) => [id, { x: 80 + i * 250, y: 385 }]),
    );
    s.moveDevices(positions, view);
  },
  undo: () => {
    const s = get(),
      frame = s.history.at(-1);
    if (!frame) return;
    let p: ProjectDocument;
    try {
      const draft = clone(frame.project);
      draft.circuit.revision =
        s.project.circuit.revision + (frame.topology ? 1 : 0);
      p = validateProjectDocument(draft);
    } catch (error) {
      set({ notice: validationMessage(error) });
      return;
    }
    const sessionId = frame.topology ? newId("session") : s.sessionId;
    set({
      project: p,
      history: s.history.slice(0, -1),
      future: [
        ...s.future,
        {
          project: clone(s.project),
          label: frame.label,
          topology: frame.topology,
        },
      ],
      runtime: frame.topology ? initialRuntime(p, sessionId) : s.runtime,
      sessionId,
      selection: [],
      wireStart: null,
      waypoints: [],
      adding: null,
      checks: [],
      measurement: frame.topology ? null : s.measurement,
    });
    if (frame.topology) request({ type: "solve" });
    scheduleSave();
  },
  redo: () => {
    const s = get(),
      frame = s.future.at(-1);
    if (!frame) return;
    let p: ProjectDocument;
    try {
      const draft = clone(frame.project);
      draft.circuit.revision =
        s.project.circuit.revision + (frame.topology ? 1 : 0);
      p = validateProjectDocument(draft);
    } catch (error) {
      set({ notice: validationMessage(error) });
      return;
    }
    const sessionId = frame.topology ? newId("session") : s.sessionId;
    set({
      project: p,
      future: s.future.slice(0, -1),
      history: [
        ...s.history,
        {
          project: clone(s.project),
          label: frame.label,
          topology: frame.topology,
        },
      ],
      runtime: frame.topology ? initialRuntime(p, sessionId) : s.runtime,
      sessionId,
      selection: [],
      wireStart: null,
      waypoints: [],
      adding: null,
      checks: [],
      measurement: frame.topology ? null : s.measurement,
    });
    if (frame.topology) request({ type: "solve" });
    scheduleSave();
  },
  power: (on) => {
    const next = on ?? !get().runtime.energized;
    if (next && get().mode === "build") get().setMode("test");
    set({ paused: !next });
    request({ type: "power", on: next });
  },
  operate: (deviceId, state, reset) => {
    if (get().mode === "build") {
      const d = get().project.circuit.devices.find((d) => d.id === deviceId);
      if (d)
        get().updateDevice(deviceId, {
          position: state ?? !d.settings.position,
        });
    } else request({ type: "operate", deviceId, state, reset });
  },
  testRcd: (deviceId) => request({ type: "test-rcd", deviceId }),
  step: (deltaMs = 1000) => request({ type: "step", deltaMs }),
  reset: () => {
    const sessionId = newId("session");
    const previous = get();
    set({
      archivedEvents: [
        ...previous.archivedEvents,
        ...previous.runtime.events.map((e) => ({
          ...e,
          id: previous.sessionId + ":" + e.id,
        })),
      ].slice(-300),
      sessionId,
      runtime: initialRuntime(get().project, sessionId),
      paused: true,
      measurement: null,
    });
    request({ type: "solve" });
  },
  setPaused: (paused) => set({ paused }),
  setSpeed: (speed) => set({ speed }),
  toggleTerminals: () => set({ showTerminals: !get().showTerminals }),
  setInstrument: (values) =>
    set({ instrument: { ...get().instrument, ...values }, measurement: null }),
  setProbe: (activeProbe) => set({ activeProbe }),
  performMeasurement: () => request(undefined, get().instrument),
  addFault: (kind, targetId, resistanceOhm, from, to) =>
    transaction("Wprowadź usterkę", (p) => {
      p.faults.push({
        id: newId("fault"),
        kind,
        targetId,
        resistanceOhm,
        from,
        to,
        hidden: false,
        activeAtMs: 0,
      });
    }),
  repairFaults: () => {
    const ids = get().selection;
    if (!ids.length) {
      set({ notice: "Zaznacz przewód lub aparat, który chcesz naprawić." });
      return;
    }
    const accepted = transaction("Napraw zaznaczony element", (p) => {
      p.faults = p.faults.filter((f) => !ids.includes(f.targetId));
      if (p.training) {
        p.training.repaired = p.faults.length === 0;
        p.training.observations.push(
          "Naprawiono: " +
            ids
              .map(
                (id) =>
                  p.circuit.devices.find((d) => d.id === id)?.designation ??
                  p.circuit.conductors.find((w) => w.id === id)?.marking ??
                  "przewód",
              )
              .join(", "),
        );
      }
    });
    if (accepted)
      set({
        notice:
          "Wykonano naprawę zaznaczonego elementu. Powtórz pomiar i próbę działania.",
      });
  },
  revealFaults: () => {
    transaction(
      "Pokaż rozwiązanie",
      (p) => {
        p.faults = p.faults.map((f) => ({ ...f, hidden: false }));
        if (p.training) p.training.hintLevel = 4;
      },
      false,
    );
  },
  load: (project, records = [], events = []) => {
    try {
      project = validateProjectDocument(project);
    } catch (error) {
      set({ notice: validationMessage(error) });
      return;
    }
    const sessionId = newId("session");
    const previous = get();
    clearTimeout(saveTimer);
    if (previous.project.circuit.projectId !== project.circuit.projectId)
      void saveProject(
        previous.project,
        previous.measurements,
        [...previous.archivedEvents, ...previous.runtime.events],
        false,
      ).catch((error) =>
        set({
          notice:
            "Błąd zapisu poprzedniego projektu: " + validationMessage(error),
          ...(error instanceof ProjectReadError
            ? { recovery: error.recovery }
            : {}),
        }),
      );
    set({
      project: clone(project),
      runtime: initialRuntime(project, sessionId),
      sessionId,
      mode: project.training ? "training" : "build",
      selection: [],
      wireStart: null,
      waypoints: [],
      adding: null,
      history: [],
      future: [],
      paused: true,
      checks: [],
      measurements: records,
      archivedEvents: events.map((e) => ({ ...e, id: "archived-" + e.id })),
      measurement: null,
      instrument: {
        ...get().instrument,
        red: undefined,
        black: undefined,
        wireId: undefined,
        deviceId: undefined,
      },
      notice:
        "Projekt otwarto z odłączonymi źródłami. Załącz zasilanie, aby rozpocząć próbę.",
    });
    request({ type: "solve" });
    scheduleSave();
  },
  newProject: () => get().load(emptyProject()),
  loadScenario: (id, training = false) =>
    get().load(scenarioProject(id, training)),
  rename: (name) =>
    transaction(
      "Zmień nazwę",
      (p) => {
        p.name = name;
      },
      false,
    ),
  hydrate: async () => {
    if (get().hydrated) return;
    set({ hydrated: true });
    try {
      const saved = await restoreProject();
      if (saved) get().load(saved.document, saved.measurements, saved.events);
      else {
        request({ type: "solve" });
        scheduleSave();
      }
    } catch (error) {
      get().reportReadError(error);
      request({ type: "solve" });
    }
  },
  runChecks: () => {
    const s = get();
    const checks = checkScenario(s.project, s.runtime, s.measurements);
    if (s.project.training)
      transaction(
        "Zapisz ocenę",
        (p) => {
          p.training!.completedChecks = checks
            .filter((c) => c.passed)
            .map((c) => c.id);
        },
        false,
      );
    set({ checks });
  },
  hint: () => {
    if (!get().project.training) return;
    transaction(
      "Podpowiedź",
      (p) => {
        p.training!.hintLevel = Math.min(4, p.training!.hintLevel + 1);
      },
      false,
    );
  },
  recordHypothesis: (text) =>
    transaction(
      "Zapisz hipotezę",
      (p) => {
        if (p.training) p.training.diagnosis = text;
        else p.userMetadata.diagnosisHypothesis = text;
      },
      false,
    ),
  setNotice: (notice) => set({ notice }),
  reportReadError: (error) =>
    set({
      saveStatus: "error",
      saveError: validationMessage(error),
      notice:
        error instanceof ProjectReadError
          ? error.message
          : "Nie udało się odczytać zapisu. Dane w bazie zachowano: " +
            validationMessage(error),
      ...(error instanceof ProjectReadError
        ? { recovery: error.recovery }
        : {}),
    }),
  exported: () => safeExport(get().project),
}));
export function measurementSelect(functionName: MeasurementFunction) {
  useApp.getState().setMode("measure");
  useApp.getState().setInstrument({ function: functionName });
}

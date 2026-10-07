import {
  distributionGeometry,
  distributionAtPoint,
  assertMountAccess,
  distributionRails,
  distributionProfile,
  detachFromEnclosures,
  mountInDistribution,
  resizeDistribution,
  type MountingResolver,
} from "@model/distribution";
import { mountingInfo } from "@catalog/mounting-profiles";
import {
  enclosureFor,
  physicalTerminalAccessible,
  translateEnclosure,
} from "@model/physical";
import type { PhysicalEnclosure, PhysicalTrunk } from "@model/index";
import { diagnosticWitness } from "@training/assessment";
import type { ExerciseVariant } from "@training/index";
import { create } from "zustand";
import {
  mountingRails,
  globalMountingRails,
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
const resolveMounting: MountingResolver = (id) => mountingInfo(catalog[id]);
export type MountingTarget = {
  enclosureId: string;
  zone: "modules" | "terminals";
  row: number;
};
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
  mountingTarget: MountingTarget | null;
  focusedEnclosureId: string | null;
  setMountingTarget: (target: MountingTarget | null) => void;
  focusEnclosure: (id: string | null) => void;
  createDistribution: (
    name: string,
    rows: number,
    modules: 8 | 12,
    reserve: number,
    position: Point,
  ) => boolean;
  configureDistribution: (
    id: string,
    name: string,
    rows: number,
    modules: 8 | 12,
    reserve: number,
  ) => boolean;
  mountDevices: (
    target: MountingTarget,
    ids: string[],
    slot?: number,
  ) => boolean;
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
  libraryRevision: number;
  flushSave: () => Promise<void>;
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
  addEnclosure: (value: Omit<PhysicalEnclosure, "id" | "deviceIds">) => void;
  moveEnclosure: (id: string, position: Point) => void;
  setEnclosureMembers: (
    id: string,
    deviceIds: string[],
    insert: boolean,
  ) => void;
  toggleEnclosure: (id: string) => void;
  deleteEnclosure: (id: string) => void;
  addTrunk: (value: Omit<PhysicalTrunk, "id" | "conductorIds">) => void;
  assignTrunk: (id: string, conductorIds: string[]) => void;
  toggleTrunk: (id: string) => void;
  deleteTrunk: (id: string) => void;
  setPhysicalPresentation: (value: "external" | "connections") => void;
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
  terminalClick: (ref: TerminalRef, view?: "physical" | "schematic") => void;
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
    libraryRevision?: number,
    skipPreviousSave?: boolean,
  ) => void;
  newProject: () => void;
  loadScenario: (
    id: string,
    training?: boolean,
    variant?: ExerciseVariant,
    diagnosticCase?: number,
  ) => void;
  setMotorLinks: (id: string, connection: "star" | "delta" | "none") => void;
  attachAuxiliary: (id: string, parentId?: string) => void;
  setMechanicalInterlock: (id: string, otherId?: string) => void;
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
    void saveProject(
      s.project,
      s.measurements,
      [...s.archivedEvents, ...s.runtime.events],
      true,
      s.libraryRevision,
    )
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
function mechanicalUi(
  project: ProjectDocument,
  s: Pick<AppState, "mountingTarget" | "focusedEnclosureId">,
) {
  const e = project.physical.enclosures?.find(
    (e) => e.id === s.mountingTarget?.enclosureId,
  );
  const mountingTarget =
    e?.distribution && s.mountingTarget
      ? {
          ...s.mountingTarget,
          row:
            s.mountingTarget.row <
            (s.mountingTarget.zone === "modules"
              ? e.distribution.rows
              : distributionProfile.terminalRows)
              ? s.mountingTarget.row
              : 0,
        }
      : null;
  return {
    mountingTarget,
    focusedEnclosureId: project.physical.enclosures?.some(
      (e) => e.id === s.focusedEnclosureId,
    )
      ? s.focusedEnclosureId
      : null,
  };
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
    ...mechanicalUi(p, s),
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
  libraryRevision: 0,
  flushSave: async () => {
    clearTimeout(saveTimer);
    const generation = ++saveGeneration;
    const s = get();
    try {
      await saveProject(
        s.project,
        s.measurements,
        [...s.archivedEvents, ...s.runtime.events],
        true,
        s.libraryRevision,
      );
      if (generation === saveGeneration)
        set({ saveStatus: "saved", saveError: "" });
    } catch (error) {
      if (
        generation === saveGeneration &&
        get().project.circuit.projectId === s.project.circuit.projectId
      )
        get().reportReadError(error);
      throw error;
    }
  },
  runtime: initialRuntime(startProject),
  mode: "build",
  view: "physical",
  selection: [],
  wireStart: null,
  waypoints: [],
  adding: null,
  mountingTarget: null,
  focusedEnclosureId: null,
  setMountingTarget: (mountingTarget) =>
    set({ mountingTarget, adding: null, wireStart: null, waypoints: [] }),
  focusEnclosure: (id) => {
    const e = get().project.physical.enclosures?.find((e) => e.id === id);
    if (id && !e) return;
    if (e?.closed) get().toggleEnclosure(e.id);
    set({
      focusedEnclosureId: id,
      view: "physical",
      wireStart: null,
      waypoints: [],
      ...(e?.distribution
        ? {
            mountingTarget: {
              enclosureId: e.id,
              zone: "modules",
              row: 0,
            } as MountingTarget,
          }
        : id === null
          ? { mountingTarget: null }
          : {}),
    });
  },
  createDistribution: (name, rows, modulesPerRow, reserve, position) => {
    const id = newId("case");
    const accepted = transaction(
      "Dodaj rozdzielnicę modułową",
      (p) => {
        (p.physical.enclosures ??= []).push({
          id,
          name,
          kind: "distribution",
          position,
          ...distributionGeometry(rows, modulesPerRow),
          deviceIds: [],
          closed: false,
          distribution: {
            profileId: distributionProfile.id,
            revision: distributionProfile.revision,
            rows,
            modulesPerRow,
            reserve,
            placements: {},
          },
        });
      },
      false,
    );
    if (accepted)
      set({
        selection: [id],
        mountingTarget: { enclosureId: id, zone: "modules", row: 0 },
      });
    return accepted;
  },
  configureDistribution: (id, name, rows, modules, reserve) => {
    const accepted = transaction(
      "Zmień konfigurację rozdzielnicy",
      (p) => resizeDistribution(p, id, rows, modules, reserve, name),
      false,
    );
    if (
      accepted &&
      get().mountingTarget?.enclosureId === id &&
      get().mountingTarget!.zone === "modules" &&
      get().mountingTarget!.row >= rows
    )
      set({ mountingTarget: { enclosureId: id, zone: "modules", row: 0 } });
    return accepted;
  },
  mountDevices: (target, ids, slot) =>
    transaction(
      "Zmień montaż aparatów",
      (p) => {
        assertMountAccess(p, ids);
        for (const id of ids) detachFromEnclosures(p, id);
        for (const id of ids) {
          mountInDistribution(
            p,
            target.enclosureId,
            id,
            target.zone,
            target.row,
            resolveMounting,
            slot,
          );
          if (slot !== undefined) {
            const d = p.circuit.devices.find((d) => d.id === id)!;
            slot += Math.ceil(
              resolveMounting(d.productId).width /
                distributionProfile.moduleMm -
                1e-9,
            );
          }
        }
      },
      false,
    ),
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
  setView: (view) =>
    set({
      view,
      wireStart: null,
      waypoints: [],
      ...(view !== "physical"
        ? { mountingTarget: null, focusedEnclosureId: null }
        : {}),
    }),
  addEnclosure: (value) => {
    transaction(
      "Dodaj obudowę",
      (p) => {
        (p.physical.enclosures ??= []).push({
          ...value,
          id: newId("case"),
          deviceIds: [],
        });
      },
      false,
    );
  },
  moveEnclosure: (id, point) => {
    transaction(
      "Przesuń obudowę z zawartością",
      (p) => translateEnclosure(p, id, point),
      false,
    );
  },
  setEnclosureMembers: (id, deviceIds, insert) => {
    transaction(
      insert ? "Włóż do obudowy" : "Wyjmij z obudowy",
      (p) => {
        const e = p.physical.enclosures?.find((e) => e.id === id);
        if (!e) throw new Error("Wybierz istniejącą obudowę.");
        if (e.distribution && e.closed)
          throw new Error("Zdejmij maskownicę przed zmianą montażu.");
        assertMountAccess(p, deviceIds);
        for (const deviceId of deviceIds) {
          const d = p.circuit.devices.find((d) => d.id === deviceId);
          if (!d) continue;
          if (insert && e.distribution) {
            const target = get().mountingTarget;
            mountInDistribution(
              p,
              e.id,
              deviceId,
              target?.enclosureId === e.id ? target.zone : "modules",
              target?.enclosureId === e.id ? target.row : 0,
              resolveMounting,
            );
            continue;
          }
          const wasModular = enclosureFor(p, deviceId)?.distribution;
          detachFromEnclosures(p, deviceId);
          if (!insert && wasModular) {
            const next = freeMountingPosition(
              p,
              d.productId,
              { x: e.position.x + e.width + 40, y: e.position.y + 40 },
              [deviceId],
            );
            if (!next)
              throw new Error(
                "Brak miejsca poza obudową. Najpierw dodaj szynę na tablicy.",
              );
            p.physical.devices[deviceId] = next;
          }
          if (insert) {
            const size = catalog[d.productId].dimensions.value!;
            let position: Point | null = null;
            for (
              let y = e.position.y + 30;
              y + size.height * 2.2 < e.position.y + e.height - 10 && !position;
              y += 10
            )
              for (
                let x = e.position.x + 10;
                x + size.width * 2.2 < e.position.x + e.width - 10;
                x += 10
              )
                if (!mountingCollision(p, d.productId, { x, y }, [deviceId])) {
                  position = { x, y };
                  break;
                }
            if (!position)
              throw new Error(
                `${d.designation}: brak wolnego miejsca w ${e.name}.`,
              );
            p.physical.devices[deviceId] = position;
            e.deviceIds.push(deviceId);
            e.closed = false;
          }
        }
      },
      false,
    );
  },
  toggleEnclosure: (id) => {
    if (
      transaction(
        "Zmień pokrywę obudowy",
        (p) => {
          const e = p.physical.enclosures?.find((e) => e.id === id);
          if (e) e.closed = !e.closed;
        },
        false,
      )
    )
      set({ wireStart: null, waypoints: [] });
  },
  deleteEnclosure: (id) => {
    transaction(
      "Usuń samą obudowę",
      (p) => {
        p.physical.enclosures = p.physical.enclosures?.filter(
          (e) => e.id !== id,
        );
      },
      false,
    );
  },
  addTrunk: (value) => {
    transaction(
      "Dodaj korytko",
      (p) => {
        (p.physical.trunking ??= []).push({
          ...value,
          id: newId("trunk"),
          conductorIds: [],
        });
      },
      false,
    );
  },
  assignTrunk: (id, conductorIds) => {
    transaction(
      "Przypisz żyły do korytka",
      (p) => {
        const t = p.physical.trunking?.find((t) => t.id === id);
        if (!t) throw new Error("Wybierz istniejące korytko.");
        for (const id of conductorIds) {
          const w = p.circuit.conductors.find((w) => w.id === id);
          if (!w) continue;
          if (t.conductorIds.includes(id)) continue;
          t.conductorIds.push(id);
          const from = p.physical.devices[w.from.deviceId],
            first = t.points[0],
            last = t.points.at(-1)!;
          const points =
            Math.hypot(from.x - first.x, from.y - first.y) <=
            Math.hypot(from.x - last.x, from.y - last.y)
              ? t.points
              : [...t.points].reverse();
          // Append a segment to the existing route; geometry never changes electricalLengthM.
          p.physical.routes[id] = [
            ...(p.physical.routes[id] ?? []),
            ...points.map((p) => ({ ...p })),
          ];
        }
      },
      false,
    );
  },
  toggleTrunk: (id) => {
    transaction(
      "Zmień pokrywę korytka",
      (p) => {
        const t = p.physical.trunking?.find((t) => t.id === id);
        if (t) t.closed = !t.closed;
      },
      false,
    );
  },
  deleteTrunk: (id) => {
    transaction(
      "Usuń korytko",
      (p) => {
        p.physical.trunking = p.physical.trunking?.filter((t) => t.id !== id);
      },
      false,
    );
  },
  setPhysicalPresentation: (value) => {
    if (
      transaction(
        "Zmień prezentację tablicy",
        (p) => {
          p.physical.presentation = value;
          for (const e of p.physical.enclosures ?? [])
            e.closed = value === "external";
          for (const t of p.physical.trunking ?? [])
            t.closed = value === "external";
        },
        false,
      )
    )
      set({ wireStart: null, waypoints: [] });
  },
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
    if (adding && get().mountingTarget) {
      get().addDevice(adding);
      return;
    }
    get().setMode("build");
    set({ adding, wireStart: null, waypoints: [] });
  },
  addDevice: (productId, point, view = "physical") => {
    const p = catalog[productId];
    if (!p?.published) {
      set({ notice: "Produkt oczekuje na weryfikację katalogową." });
      return;
    }
    const current = get();
    const inside =
      view === "physical" && point
        ? distributionAtPoint(current.project, point)
        : null;
    const target =
      view === "physical"
        ? inside
          ? {
              enclosureId: inside.enclosure.id,
              zone: inside.zone,
              row: inside.row,
            }
          : !point
            ? current.mountingTarget
            : null
        : null;
    const physicalPoint = target
      ? { x: 0, y: 0 }
      : freeMountingPosition(
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
      if (target)
        mountInDistribution(
          project,
          target.enclosureId,
          id,
          target.zone,
          target.row,
          resolveMounting,
          inside?.slot,
        );
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
    if (globalMountingRails(get().project).length >= projectLimits.rails) {
      set({
        notice: `Tablica może mieć maksymalnie ${projectLimits.rails} szyny.`,
      });
      return;
    }
    const accepted = transaction(
      "Dodaj szynę DIN",
      (p) => {
        const rails = globalMountingRails(p);
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
    const owned = s.project.physical.enclosures?.find((e) =>
      distributionRails(e).some((r) => r.id === railId),
    );
    if (owned) {
      s.mountDevices(
        {
          enclosureId: owned.id,
          zone: "modules",
          row: distributionRails(owned).findIndex((r) => r.id === railId),
        },
        s.selection.filter((id) =>
          s.project.circuit.devices.some((d) => d.id === id),
        ),
      );
      return;
    }
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
    if (
      view === "physical" &&
      Object.entries(positions).some(
        ([id, pos]) =>
          enclosureFor(s.project, id)?.distribution ||
          s.project.physical.enclosures?.some(
            (e) =>
              e.distribution &&
              pos.x >= e.position.x &&
              pos.x <= e.position.x + e.width &&
              pos.y >= e.position.y &&
              pos.y <= e.position.y + e.height,
          ),
      )
    ) {
      const accepted = transaction(
        "Przesuń aparaty na pola montażowe",
        (p) => {
          assertMountAccess(p, Object.keys(positions));
          for (const id of Object.keys(positions)) detachFromEnclosures(p, id);
          for (const [id, pos] of Object.entries(positions)) {
            const drop = distributionAtPoint(p, pos);
            const e = drop?.enclosure ?? enclosureFor(p, id);
            if (!e?.distribution || !drop)
              throw new Error("Najpierw wyjmij aparat z rozdzielnicy.");
            const { zone, row, slot } = drop;
            mountInDistribution(p, e.id, id, zone, row, resolveMounting, slot);
          }
        },
        false,
      );
      if (!accepted) set({ project: clone(s.project) });
      return;
    }
    for (const [id, pos] of Object.entries(positions)) {
      const d = s.project.circuit.devices.find((d) => d.id === id);
      if (!d) continue;
      nextPositions[id] =
        view === "physical"
          ? enclosureFor(s.project, id)
            ? { x: Math.round(pos.x / 10) * 10, y: Math.round(pos.y / 10) * 10 }
            : snapMounting(s.project, d.productId, pos)
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
  terminalClick: (ref, view) => {
    const s = get();
    if (
      (view ?? (s.view === "schematic" ? "schematic" : "physical")) ===
        "physical" &&
      !physicalTerminalAccessible(s.project, ref.deviceId)
    ) {
      set({
        notice: enclosureFor(s.project, ref.deviceId)?.distribution
          ? "Zdejmij maskownicę rozdzielnicy, aby podłączyć przewód lub sondę."
          : "Otwórz pokrywę obudowy, aby podłączyć przewód lub sondę.",
      });
      return;
    }
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
    const s = get(),
      ids = s.selection;
    const electrical = ids.some((id) =>
      [
        ...s.project.circuit.devices,
        ...s.project.circuit.conductors,
        ...s.project.circuit.bridges,
      ].some((element) => element.id === id),
    );
    const accepted = transaction(
      "Usuń zaznaczenie",
      (p) => {
        p.circuit.devices = p.circuit.devices.filter(
          (d) => !ids.includes(d.id),
        );
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
          (w) =>
            !ids.includes(w.id) &&
            !ids.includes(w.from.deviceId) &&
            !ids.includes(w.to.deviceId),
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
        p.physical.enclosures = p.physical.enclosures?.filter(
          (e) => !ids.includes(e.id),
        );
        p.physical.trunking = p.physical.trunking?.filter(
          (t) => !ids.includes(t.id),
        );
        for (const e of p.physical.enclosures ?? []) {
          e.deviceIds = e.deviceIds.filter((id) => !ids.includes(id));
          if (e.distribution)
            for (const id of ids) delete e.distribution.placements[id];
        }
        for (const t of p.physical.trunking ?? [])
          t.conductorIds = t.conductorIds.filter((id) => !removed.includes(id));
        for (const l of [p.physical, p.schematic]) {
          for (const id of ids) delete l.devices[id];
          for (const id of removed) delete l.routes[id];
        }
      },
      electrical,
    );
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
          const rails = globalMountingRails(p);
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
      ...mechanicalUi(p, s),
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
      ...mechanicalUi(p, s),
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
      if (p.training)
        p.training.diagnosticEvidence ||= diagnosticWitness(
          p,
          get().measurements,
          ids,
        );
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
  load: (
    project,
    records = [],
    events = [],
    libraryRevision = 0,
    skipPreviousSave = false,
  ) => {
    try {
      project = validateProjectDocument(project);
    } catch (error) {
      set({ notice: validationMessage(error) });
      return;
    }
    const sessionId = newId("session");
    const previous = get();
    clearTimeout(saveTimer);
    if (
      !skipPreviousSave &&
      previous.project.circuit.projectId !== project.circuit.projectId
    )
      void saveProject(
        previous.project,
        previous.measurements,
        [...previous.archivedEvents, ...previous.runtime.events],
        false,
        previous.libraryRevision,
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
      libraryRevision,
      runtime: initialRuntime(project, sessionId),
      sessionId,
      mode: project.training
        ? project.userMetadata.exerciseVariant === "assembly"
          ? "build"
          : project.userMetadata.exerciseVariant === "diagnosis"
            ? "diagnosis"
            : "training"
        : "build",
      selection: [],
      wireStart: null,
      waypoints: [],
      adding: null,
      mountingTarget: null,
      focusedEnclosureId: null,
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
  loadScenario: (
    id,
    training = false,
    variant = "reference",
    diagnosticCase = 0,
  ) => get().load(scenarioProject(id, training, variant, diagnosticCase)),
  setMotorLinks: (id, connection) =>
    transaction("Zmień mostki zaciskowe silnika", (p) => {
      const d = p.circuit.devices.find((d) => d.id === id);
      if (
        !d ||
        !catalog[d.productId].topology.terminals.some((t) => t.id === "U1")
      )
        throw new Error("Wybierz silnik z sześcioma końcami uzwojeń.");
      p.circuit.bridges = p.circuit.bridges.filter(
        (b) => b.from.deviceId !== id || b.to.deviceId !== id,
      );
      const pairs =
        connection === "star"
          ? [
              ["W2", "U2"],
              ["U2", "V2"],
            ]
          : connection === "delta"
            ? [
                ["U1", "W2"],
                ["V1", "U2"],
                ["W1", "V2"],
              ]
            : [];
      p.circuit.bridges.push(
        ...pairs.map(([a, b]) => ({
          id: newId("bridge"),
          from: { deviceId: id, terminalId: a },
          to: { deviceId: id, terminalId: b },
        })),
      );
    }),
  attachAuxiliary: (id, parentId) =>
    transaction("Przypisz blok pomocniczy", (p) => {
      const d = p.circuit.devices.find((d) => d.id === id),
        parent = p.circuit.devices.find((d) => d.id === parentId);
      if (!d || catalog[d.productId].behaviorId !== "auxiliary")
        throw new Error("Wybierz blok pomocniczy.");
      if (
        parentId &&
        (!parent ||
          !(
            catalog[parent.productId].topology.coil ||
            ["push-no", "push-nc", "push-multi"].includes(
              catalog[parent.productId].behaviorId,
            )
          ))
      )
        throw new Error("Blok wymaga mechanizmu stycznika lub przycisku.");
      p.circuit.mechanicalCouplings = p.circuit.mechanicalCouplings
        .map((c) =>
          c.kind === "assembly"
            ? { ...c, deviceIds: c.deviceIds.filter((x) => x !== id) }
            : c,
        )
        .filter((c) => c.deviceIds.length >= 2);
      if (parentId)
        p.circuit.mechanicalCouplings.push({
          id: newId("assembly"),
          kind: "assembly",
          deviceIds: [parentId, id],
        });
    }),
  setMechanicalInterlock: (id, otherId) =>
    transaction("Zmień blokadę mechaniczną", (p) => {
      const ds = [id, ...(otherId ? [otherId] : [])].map((x) =>
        p.circuit.devices.find((d) => d.id === x),
      );
      if (
        ds.some((d) => !d || catalog[d.productId].behaviorId !== "contactor") ||
        id === otherId
      )
        throw new Error("Blokada wymaga dwóch różnych styczników.");
      p.circuit.mechanicalCouplings = p.circuit.mechanicalCouplings.filter(
        (c) =>
          c.kind !== "interlock" ||
          (!c.deviceIds.includes(id) &&
            (!otherId || !c.deviceIds.includes(otherId))),
      );
      if (otherId)
        p.circuit.mechanicalCouplings.push({
          id: newId("interlock"),
          kind: "interlock",
          deviceIds: [id, otherId],
        });
    }),
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
      if (saved)
        get().load(
          saved.document,
          saved.measurements,
          saved.events,
          saved.libraryRevision,
          true,
        );
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

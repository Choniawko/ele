import { auxiliaryMechanism, mechanicallyBlocked } from "./mechanisms";
import { analyzeMotor, type WindingConnection } from "./motor";
import { catalog } from "@catalog/index";
import {
  conductorResistance,
  terminalKey,
  type ProjectDocument,
  type DeviceInstance,
  type Fault,
} from "@model/index";
import {
  c,
  add,
  sub,
  magnitude,
  phasor,
  solveNetwork,
  voltageBetween,
  equivalentResistance,
  type Branch,
  type NetworkSolution,
} from "./numeric";
export * from "./numeric";
export interface DeviceRuntime {
  manual: boolean;
  stopPressed?: boolean;
  coil: boolean;
  mechanism: boolean;
  tripped: boolean;
  tripCause: string;
  heat: number;
  powered: boolean;
  lastInput: boolean;
  startedAtMs: number | null;
  deadlineMs: number | null;
  pendingState: boolean | null;
  voltageV: number | null;
  currentA: number;
  powerW: number;
  direction?: "123" | "132" | "phase-loss";
  outputPowerW: number;
  mechanicallyBlocked?: boolean;
  windingConnection?: WindingConnection;
  motorSupply?: "missing-links" | "phase-loss" | "voltage-mismatch" | "ok";
}
export interface RuntimeEvent {
  id: string;
  timeMs: number;
  deviceId?: string;
  message: string;
  type: "info" | "warning" | "trip";
}
export interface RuntimeSnapshot {
  sessionId: string;
  revision: number;
  sequence: number;
  seed: number;
  timeMs: number;
  energized: boolean;
  independentSourcesArmed: boolean;
  status: "valid" | "solver-error" | "oscillation";
  devices: Record<string, DeviceRuntime>;
  solution: NetworkSolution;
  events: RuntimeEvent[];
  errors: string[];
  durationMs: number;
}
export type RuntimeAction =
  | { type: "power"; on: boolean }
  | {
      type: "operate";
      deviceId: string;
      state?: boolean;
      reset?: boolean;
      actuator?: "start" | "stop";
    }
  | { type: "test-rcd"; deviceId: string }
  | { type: "step"; deltaMs: number }
  | { type: "solve" };
export const initialDevice = (d: DeviceInstance): DeviceRuntime => ({
  manual: d.settings.position ?? false,
  coil: false,
  mechanism: false,
  tripped: false,
  tripCause: "",
  heat: 0,
  powered: false,
  lastInput: false,
  startedAtMs: null,
  deadlineMs: null,
  pendingState: null,
  voltageV: null,
  currentA: 0,
  powerW: 0,
  outputPowerW: 0,
});
export function initialRuntime(
  project: ProjectDocument,
  sessionId = "session",
  seed = 1,
): RuntimeSnapshot {
  return {
    sessionId,
    revision: project.circuit.revision,
    sequence: 0,
    seed,
    timeMs: 0,
    energized: false,
    independentSourcesArmed: false,
    status: "valid",
    devices: Object.fromEntries(
      project.circuit.devices.map((d) => [d.id, initialDevice(d)]),
    ),
    solution: solveNetwork([]),
    events: [],
    errors: [],
    durationMs: 0,
  };
}
function activeFaults(project: ProjectDocument, timeMs: number): Fault[] {
  return project.faults.filter((f) => f.activeAtMs <= timeMs);
}
export function compile(
  project: ProjectDocument,
  rt: RuntimeSnapshot,
  options: {
    deenergized?: boolean;
    shortSources?: boolean;
    measurement?: boolean;
  } = {},
): Branch[] {
  const branches: Branch[] = [],
    faults = activeFaults(project, rt.timeMs);
  for (const w of project.circuit.conductors) {
    if (faults.some((f) => f.targetId === w.id && f.kind === "open-wire"))
      continue;
    const loose = faults
      .filter((f) => f.targetId === w.id && f.kind === "loose-terminal")
      .reduce((sum, f) => sum + (f.resistanceOhm ?? 5), 0);
    branches.push({
      id: w.id,
      from: terminalKey(w.from),
      to: terminalKey(w.to),
      resistanceOhm:
        conductorResistance(w, project.circuit.installationConditions) + loose,
      kind: "wire",
    });
  }
  for (const b of project.circuit.bridges) {
    if (faults.some((f) => f.targetId === b.id && f.kind === "open-wire"))
      continue;
    branches.push({
      id: b.id,
      from: terminalKey(b.from),
      to: terminalKey(b.to),
      resistanceOhm: 0.00001,
      kind: "bridge",
    });
  }
  for (const d of project.circuit.devices) {
    const p = catalog[d.productId];
    if (!p?.published)
      throw new Error(`Niezweryfikowany produkt ${d.productId}`);
    const state = rt.devices[d.id] ?? initialDevice(d),
      top = p.topology,
      k = (id: string) => `${d.id}:${id}`,
      df = faults.filter((f) => f.targetId === d.id);
    const mechanism =
      p.behaviorId === "auxiliary"
        ? auxiliaryMechanism(project, rt, d.id)
        : state.mechanism;
    for (const cn of top.connections) {
      let closed = true;
      if (cn.kind === "contact") {
        const value =
          cn.condition === "manual"
            ? state.manual && !state.tripped
            : cn.condition === "manual-inverse"
              ? !state.manual
              : cn.condition === "stop-inverse"
                ? !state.stopPressed
                : cn.condition === "mechanism"
                  ? mechanism
                  : cn.condition === "mechanism-inverse"
                    ? !mechanism
                    : cn.condition === "healthy"
                      ? !state.tripped
                      : state.tripped;
        closed = value;
        if (
          df.some(
            (f) =>
              f.kind === "welded-contact" &&
              (f.from && f.to
                ? (f.from.terminalId === cn.from &&
                    f.to.terminalId === cn.to) ||
                  (f.from.terminalId === cn.to && f.to.terminalId === cn.from)
                : cn.condition === "mechanism" || cn.condition === "manual"),
          )
        )
          closed = true;
      }
      if (cn.kind === "coil" && df.some((f) => f.kind === "open-coil"))
        closed = false;
      if (!closed) continue;
      let resistanceOhm = cn.resistanceOhm ?? 0.005;
      if (cn.kind === "load") {
        const nominal = d.settings.voltageV ?? p.defaults.voltageV ?? 230;
        resistanceOhm =
          d.settings.resistanceOhm ??
          nominal ** 2 / (d.settings.powerW ?? p.defaults.powerW ?? 60);
        if (p.behaviorId === "motor")
          resistanceOhm =
            (3 * nominal ** 2) /
            ((d.settings.powerW ?? 3000) * (d.settings.loadFactor ?? 1));
      }
      if (p.behaviorId === "power-supply" && cn.kind === "electronics")
        resistanceOhm = 230 ** 2 / (0.3 + state.outputPowerW / 0.9);
      branches.push({
        id: `${d.id}/${cn.id}`,
        from: k(cn.from),
        to: k(cn.to),
        resistanceOhm,
        deviceId: d.id,
        kind: cn.kind,
      });
    }
    if (p.behaviorId.startsWith("source-")) {
      const enabled =
        !options.deenergized &&
        (rt.energized ||
          (rt.independentSourcesArmed && d.settings.independentSupply));
      const u = d.settings.voltageV ?? p.defaults.voltageV ?? 230,
        r =
          d.settings.sourceResistanceOhm ??
          p.defaults.sourceResistanceOhm ??
          0.4;
      const phases =
        p.behaviorId === "source-3ph"
          ? ["L1", "L2", "L3"]
          : p.behaviorId === "source-ac"
            ? ["L"]
            : ["+"];
      phases.forEach((phase, i) => {
        if (
          df.some(
            (f) =>
              f.kind === "phase-loss" &&
              (!f.from || f.from.terminalId === phase),
          )
        )
          return;
        if (!enabled && !options.shortSources) return;
        const sign = d.settings.phaseOrder === "132" ? 1 : -1;
        branches.push({
          id: `${d.id}/source-${phase}`,
          from: k(phase),
          to: k(p.behaviorId === "source-dc" ? "-" : "N"),
          resistanceOhm: r,
          voltage: enabled ? phasor(u, sign * i * 120) : c(),
          domain: p.behaviorId === "source-dc" ? "DC" : "AC",
          deviceId: d.id,
          kind: "source",
        });
      });
    }
    if (
      p.behaviorId === "power-supply" &&
      state.powered &&
      !options.deenergized
    ) {
      const top = p.topology;
      branches.push({
        id: `${d.id}/dc-output`,
        from: k(top.output!.plus),
        to: k(top.output!.minus),
        resistanceOhm: 0.04,
        voltage: c(24),
        domain: "DC",
        deviceId: d.id,
        kind: "source",
      });
    }
  }
  for (const f of faults)
    if (
      f.from &&
      f.to &&
      ["short-circuit", "leakage", "insulation"].includes(f.kind)
    )
      branches.push({
        id: `fault/${f.id}`,
        from: terminalKey(f.from),
        to: terminalKey(f.to),
        resistanceOhm:
          f.resistanceOhm ?? (f.kind === "short-circuit" ? 0.02 : 4600),
        kind: "fault",
      });
  for (const output of branches.filter((b) => b.id.endsWith("/dc-output"))) {
    const load = equivalentResistance(
      branches
        .filter((b) => b.id !== output.id)
        .map((b) => (b.voltage ? { ...b, voltage: c() } : b)),
      output.from,
      output.to,
    );
    if (load !== null) output.resistanceOhm = Math.max(0.04, 24 / 2.5 - load);
  }
  return branches;
}
function event(
  rt: RuntimeSnapshot,
  deviceId: string,
  message: string,
  type: RuntimeEvent["type"] = "info",
) {
  rt.events.push({
    id: `${rt.sequence}-${rt.events.length}`,
    timeMs: rt.timeMs,
    deviceId,
    message,
    type,
  });
  if (rt.events.length > 300) rt.events.shift();
}
function summarize(project: ProjectDocument, rt: RuntimeSnapshot) {
  for (const d of project.circuit.devices) {
    const p = catalog[d.productId],
      state = rt.devices[d.id],
      top = p.topology,
      k = (id: string) => `${d.id}:${id}`;
    const pair = top.coil ?? top.supply;
    let voltage = pair
      ? voltageBetween(rt.solution, k(pair.plus), k(pair.minus))
      : null;
    if (p.behaviorId === "load")
      voltage = voltageBetween(rt.solution, k("L"), k("N"));
    if (p.behaviorId === "socket")
      voltage = voltageBetween(rt.solution, k("test-L"), k("test-N"));
    if (p.behaviorId.startsWith("source-"))
      voltage = voltageBetween(
        rt.solution,
        k(
          p.behaviorId === "source-dc"
            ? "+"
            : p.behaviorId === "source-3ph"
              ? "L1"
              : "L",
        ),
        k(p.behaviorId === "source-dc" ? "-" : "N"),
      );
    state.voltageV = voltage ? magnitude(voltage) : null;
    const currents = Object.entries(rt.solution.currents).filter(
      ([id]) =>
        id.startsWith(`${d.id}/`) &&
        !id.endsWith("/electronics") &&
        !id.endsWith("/input"),
    );
    state.currentA = currents.reduce(
      (max, [, i]) => Math.max(max, magnitude(i)),
      0,
    );
    state.powerW = rt.solution.branches
      .filter((b) => b.deviceId === d.id && !b.voltage)
      .reduce(
        (sum, b) =>
          sum +
          magnitude(rt.solution.currents[b.id] ?? c()) ** 2 * b.resistanceOhm,
        0,
      );
    if (p.behaviorId === "load")
      state.powered =
        (state.voltageV ?? 0) >
        (p.visualId === "indicator" ? (d.settings.voltageV ?? 230) * 0.8 : 0.5);
    if (p.behaviorId === "motor" && top.terminals.some((t) => t.id === "U1")) {
      Object.assign(state, analyzeMotor(project, d, rt.solution, rt.timeMs));
    } else if (p.behaviorId === "motor") {
      const diffs = [
        ["U", "V"],
        ["V", "W"],
        ["W", "U"],
      ]
        .map(([a, b]) => voltageBetween(rt.solution, k(a), k(b)))
        .map((u) => (u ? magnitude(u) : 0));
      const phases = ["U", "V", "W"].map(
        (t) => rt.solution.voltages[k(t)] ?? c(),
      );
      const phaseDelta =
        Math.atan2(phases[1].im, phases[1].re) -
        Math.atan2(phases[0].im, phases[0].re);
      state.powered =
        diffs.every((v) => v > 300) &&
        diffs.every((v) => Math.abs(v - diffs[0]) < 20);
      state.direction = state.powered
        ? Math.sin(phaseDelta) < 0
          ? "123"
          : "132"
        : "phase-loss";
    }
  }
}
export function advance(
  project: ProjectDocument,
  previous: RuntimeSnapshot,
  action: RuntimeAction,
): RuntimeSnapshot {
  const started = performance.now(),
    rt = structuredClone(previous);
  rt.sequence++;
  rt.revision = project.circuit.revision;
  rt.errors = [];
  for (const d of project.circuit.devices)
    rt.devices[d.id] ??= initialDevice(d);
  let dt = 0;
  if (action.type === "power") {
    rt.energized = action.on;
    if (action.on) rt.independentSourcesArmed = true;
    event(
      rt,
      "",
      action.on ? "Załączono główne źródło." : "Odłączono główne źródło.",
    );
  }
  if (action.type === "step") {
    dt = Math.max(0, Math.min(action.deltaMs, 60000));
    rt.timeMs += dt;
  }
  if (action.type === "operate") {
    const state = rt.devices[action.deviceId];
    if (state) {
      const manual = action.state ?? !state.manual;
      const device = project.circuit.devices.find(
        (d) => d.id === action.deviceId,
      );
      if (
        catalog[device?.productId ?? ""]?.behaviorId === "push-start-stop" &&
        action.actuator === "stop"
      ) {
        state.stopPressed = action.state ?? !state.stopPressed;
        event(
          rt,
          action.deviceId,
          `STOP: ${state.stopPressed ? "wciśnięty" : "puszczony"}.`,
        );
      } else {
        const protection =
          device &&
          ["mcb", "rccb", "rcbo", "thermal", "motor-protection"].includes(
            catalog[device.productId].behaviorId,
          );
        const reset = action.reset || (protection && state.tripped && !manual);
        if (reset) {
          state.tripped = false;
          state.heat = 0;
          state.tripCause = "";
          state.manual = false;
        } else state.manual = manual;
        event(
          rt,
          action.deviceId,
          reset
            ? "Zresetowano zabezpieczenie."
            : `Obsługa aparatu: ${state.manual ? "ON / wciśnięty" : "OFF / puszczony"}.`,
        );
      }
    }
  }
  const faults = activeFaults(project, rt.timeMs),
    seen = new Set<string>();
  try {
    for (let iteration = 0; iteration < 24; iteration++) {
      const key = JSON.stringify(
        Object.values(rt.devices).map((s) => [
          s.mechanism,
          s.tripped,
          s.powered,
          s.outputPowerW,
        ]),
      );
      if (seen.has(key)) {
        rt.status = "oscillation";
        rt.errors = ["Układ oscyluje. Sprawdź styki NC w torze własnej cewki."];
        break;
      }
      seen.add(key);
      const branches = compile(project, rt),
        nodes = project.circuit.devices.flatMap((d) =>
          catalog[d.productId].topology.terminals.map((t) => `${d.id}:${t.id}`),
        );
      rt.solution = solveNetwork(branches, nodes);
      rt.status = rt.solution.status;
      if (rt.solution.status !== "valid") {
        rt.errors = rt.solution.errors;
        break;
      }
      summarize(project, rt);
      let changed = false;
      for (const d of project.circuit.devices) {
        const p = catalog[d.productId],
          s = rt.devices[d.id],
          top = p.topology,
          k = (id: string) => `${d.id}:${id}`;
        const fault = (kind: Fault["kind"]) =>
          faults.some((f) => f.targetId === d.id && f.kind === kind);
        if (
          action.type === "test-rcd" &&
          action.deviceId === d.id &&
          iteration === 0 &&
          ["rccb", "rcbo"].includes(p.behaviorId)
        ) {
          const poles = (top.poles ?? []).map((id) =>
            top.connections.find((cn) => cn.id === id)!,
          );
          const voltage =
            poles.length === 2
              ? voltageBetween(rt.solution, k(poles[0].from), k(poles[1].from))
              : null;
          // Virtual internal test resistor: 230 V / 4600 Ω = 50 mA.
          // It never adds a persistent fault or changes the project wiring.
          const testCurrent = voltage ? magnitude(voltage) / 4600 : 0;
          if (!s.manual || s.tripped) {
            event(
              rt,
              d.id,
              `${d.designation}: TEST — aparat wyłączony lub wyzwolony.`,
              "warning",
            );
          } else if (
            rt.solution.domains[k(poles[0]?.from ?? "")] !== "AC" ||
            testCurrent < 0.03
          ) {
            event(
              rt,
              d.id,
              `${d.designation}: TEST — brak wystarczającego zasilania L–N.`,
              "warning",
            );
          } else if (fault("rcd-failure")) {
            event(
              rt,
              d.id,
              `${d.designation}: TEST — brak zadziałania RCD.`,
              "warning",
            );
          } else {
            s.tripped = true;
            s.tripCause = "Przycisk TEST — wewnętrzny prąd różnicowy ≥ 30 mA";
            changed = true;
            event(
              rt,
              d.id,
              `${d.designation}: wyzwolenie — ${s.tripCause}.`,
              "trip",
            );
          }
        }
        const updateMechanism = (requested: boolean) => {
          const blocked = requested && mechanicallyBlocked(project, rt, d.id);
          s.mechanicallyBlocked = blocked;
          const value = requested && !blocked;
          if (s.mechanism !== value) {
            s.mechanism = value;
            changed = true;
            event(
              rt,
              d.id,
              `${d.designation}: styki ${value ? "załączone" : "w spoczynku"}.`,
            );
          }
        };
        if (top.coil) {
          const domain = rt.solution.domains[k(top.coil.plus)],
            u = s.voltageV ?? 0,
            nom = top.coil.voltageV;
          s.coil =
            domain === top.coil.kind &&
            u >= nom * (s.coil ? 0.3 : 0.85) &&
            u < nom * 1.2 &&
            !fault("open-coil");
          const wasMechanism = s.mechanism;
          updateMechanism(s.coil && !fault("blocked-mechanism"));
          // Resolve the newly opened NC before processing another coil. This
          // models electrical mutual exclusion without inventing a mechanical tie.
          if (s.mechanism !== wasMechanism) {
            rt.solution = solveNetwork(compile(project, rt), nodes);
            summarize(project, rt);
          }
        }
        if (["bistable", "staircase", "timer"].includes(p.behaviorId)) {
          const input = top.supply!;
          const u = voltageBetween(rt.solution, k(input.plus), k(input.minus));
          let powered =
            !!u &&
            magnitude(u) > 165 &&
            magnitude(u) < 265 &&
            rt.solution.domains[k(input.plus)] === "AC";
          if (p.behaviorId === "timer") {
            const dc = voltageBetween(rt.solution, k("4"), k("3")),
              dcPowered = !!dc && magnitude(dc) > 20 && magnitude(dc) < 28;
            if (powered && dcPowered) {
              rt.status = "solver-error";
              rt.errors = [
                "Przekaźnik czasowy: dwa alternatywne zasilania jednocześnie.",
              ];
              return rt;
            }
            powered = powered || dcPowered;
          }
          const signal = input.input
            ? voltageBetween(rt.solution, k(input.input), k(input.minus))
            : null;
          const active = powered && !!signal && magnitude(signal) > 100;
          if (!powered) {
            if (s.powered || s.mechanism) {
              changed = true;
              s.powered = false;
              updateMechanism(false);
            }
            s.lastInput = false;
            s.startedAtMs = null;
            s.deadlineMs = null;
            s.pendingState = null;
          } else {
            if (!s.powered) {
              s.powered = true;
              s.startedAtMs = rt.timeMs;
              changed = true;
            }
            const time = (d.settings.timeS ?? p.defaults.timeS ?? 5) * 1000;
            if (p.behaviorId === "bistable") {
              if (active && !s.lastInput) {
                s.pendingState = !s.mechanism;
                s.deadlineMs = rt.timeMs + 150;
              }
              if (
                s.deadlineMs !== null &&
                rt.timeMs >= s.deadlineMs &&
                s.pendingState !== null
              ) {
                updateMechanism(s.pendingState);
                s.pendingState = null;
                s.deadlineMs = null;
              }
            }
            if (p.behaviorId === "staircase") {
              if (active) {
                s.deadlineMs = rt.timeMs + time;
                updateMechanism(true);
              } else if (s.deadlineMs !== null && rt.timeMs >= s.deadlineMs)
                updateMechanism(false);
            }
            if (p.behaviorId === "timer") {
              const elapsed = rt.timeMs - (s.startedAtMs ?? rt.timeMs),
                mode = d.settings.timerMode ?? "B";
              // Manufacturer instruction E231117 pp. 1–2: C starts ON, D starts OFF.
              const out =
                mode === "A"
                  ? elapsed < time
                  : mode === "B"
                    ? elapsed >= time
                    : mode === "C"
                      ? Math.floor(elapsed / time) % 2 === 0
                      : Math.floor(elapsed / time) % 2 === 1;
              updateMechanism(out);
            }
            s.lastInput = active;
          }
        }
        if (p.behaviorId === "power-supply") {
          const u = s.voltageV ?? 0,
            valid = u >= 85 && u <= 264 && rt.solution.domains[k("L")] === "AC";
          if (s.powered !== valid) {
            s.powered = valid;
            changed = true;
          }
          const current = rt.solution.currents[`${d.id}/dc-output`];
          const outVoltage = voltageBetween(
            rt.solution,
            k(top.output!.plus),
            k(top.output!.minus),
          );
          const output = Math.min(
            1000,
            current && outVoltage
              ? magnitude(current) * magnitude(outVoltage)
              : 0,
          );
          if (Math.abs(s.outputPowerW - output) > 0.05) {
            s.outputPowerW = output;
            changed = true;
          }
        }
        if (
          ["mcb", "rcbo", "thermal", "rccb", "motor-protection"].includes(
            p.behaviorId,
          ) &&
          !s.tripped
        ) {
          const poleIds = top.poles ?? [];
          const currents = poleIds.map(
            (id) => rt.solution.currents[`${d.id}/${id}`] ?? c(),
          );
          const peak = Math.max(0, ...currents.map(magnitude));
          const nominal =
            d.settings.ratedCurrentA ?? p.defaults.ratedCurrentA ?? 16;
          if (iteration === 0 && p.behaviorId !== "rccb")
            s.heat = Math.max(
              0,
              s.heat +
                (dt / 1000) *
                  (peak > nominal ? ((peak / nominal) ** 2 - 1) / 30 : -0.08),
            );
          const magnetic =
            p.behaviorId === "motor-protection"
              ? peak >= nominal * 12
              : p.behaviorId === "mcb" || p.behaviorId === "rcbo"
                ? peak >= nominal * (p.topologyId === "mcb-3p" ? 7.5 : 4)
                : false;
          let residual = false;
          if (p.behaviorId === "rccb" || p.behaviorId === "rcbo") {
            const sum = currents.reduce(add, c());
            // Educational 2P devices accept either orientation of each pole.
            // Keep complex phase information and leakage detection, ignoring only
            // the arbitrary sign of a pole's terminal order. This deliberately
            // also accepts mixed top/bottom feeding, unlike a physical toroid.
            const residualA =
              p.educational && currents.length === 2
                ? Math.min(
                    magnitude(sum),
                    magnitude(sub(currents[0], currents[1])),
                  )
                : magnitude(sum);
            residual = residualA >= 0.03 - 1e-8 && !fault("rcd-failure");
          }
          if (magnetic || s.heat >= 1 || residual) {
            s.tripped = true;
            s.tripCause = residual
              ? "Prąd różnicowy ≥ 30 mA"
              : magnetic
                ? "Człon magnetyczny (profil dydaktyczny)"
                : "Przeciążenie cieplne (profil dydaktyczny)";
            changed = true;
            event(
              rt,
              d.id,
              `${d.designation}: wyzwolenie — ${s.tripCause}.`,
              "trip",
            );
          }
          if (peak > 6000)
            rt.errors.push(
              `${d.designation}: prąd poza zdolnością wyłączania modelu.`,
            );
        }
      }
      for (const d of project.circuit.devices.filter(
        (d) => catalog[d.productId].behaviorId === "auxiliary",
      )) {
        const value = auxiliaryMechanism(project, rt, d.id);
        if (rt.devices[d.id].mechanism !== value) {
          rt.devices[d.id].mechanism = value;
          changed = true;
        }
      }
      if (!changed) break;
      if (iteration === 23) {
        rt.status = "oscillation";
        rt.errors = ["Nie osiągnięto stanu ustalonego w 24 iteracjach."];
      }
    }
  } catch (error) {
    rt.status = "solver-error";
    rt.errors = [error instanceof Error ? error.message : "Błąd symulacji"];
  }
  rt.durationMs = performance.now() - started;
  return rt;
}

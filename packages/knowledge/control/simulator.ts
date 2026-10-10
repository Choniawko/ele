import { layoutCircuit, type Layout } from "./layout";
import type { Action, ControlCircuit, Device } from "./model";

// Discrete contact logic. A load is energised when one terminal is joined to
// +24 V and the other to 0 V through wires and closed contacts. Coils switch
// their contacts, which changes the paths, so the state is iterated until it
// stops changing ("ustala się"). Every iteration is kept as a frame, which lets
// the page replay the chain of events in slow motion.

export interface TimerState {
  running: boolean;
  elapsed: number;
}
export interface SimState {
  power: boolean;
  time: number;
  pressed: Record<string, boolean>;
  detected: Record<string, boolean>;
  /** Device switched: contactor pulled in, timer output changed over,
   * button pressed, sensor output active. */
  active: Record<string, boolean>;
  /** Device has voltage on its coil / lamp / buzzer / supply. */
  energized: Record<string, boolean>;
  timers: Record<string, TimerState>;
  short: boolean;
  unstable: boolean;
}
export type SimEvent =
  | { kind: "input"; text: string }
  | { kind: "energized"; device: string; on: boolean }
  | { kind: "switched"; device: string; on: boolean }
  | { kind: "timer"; device: string; started: boolean };
export interface Settled {
  state: SimState;
  frames: SimState[];
  events: SimEvent[][];
}

interface Compiled {
  circuit: ControlCircuit;
  layout: Layout;
  devices: Map<string, Device>;
  /** Wire-joined groups of nodes, as indexes. */
  group: Record<string, number>;
  groups: number;
}
const compiled = new WeakMap<ControlCircuit, Compiled>();
export function compile(circuit: ControlCircuit): Compiled {
  const hit = compiled.get(circuit);
  if (hit) return hit;
  const layout = layoutCircuit(circuit);
  const ids = Object.keys(layout.nodes);
  const index = new Map(ids.map((k, i) => [k, i]));
  const parent = ids.map((_, i) => i);
  const find = (i: number): number =>
    parent[i] === i ? i : (parent[i] = find(parent[i]));
  for (const w of layout.wires)
    parent[find(index.get(w.a)!)] = find(index.get(w.b)!);
  const roots = new Map<number, number>();
  const group: Record<string, number> = {};
  for (const k of ids) {
    const r = find(index.get(k)!);
    if (!roots.has(r)) roots.set(r, roots.size);
    group[k] = roots.get(r)!;
  }
  const result = {
    circuit,
    layout,
    devices: new Map(circuit.devices.map((d) => [d.id, d])),
    group,
    groups: roots.size,
  };
  compiled.set(circuit, result);
  return result;
}

export function initialState(circuit: ControlCircuit, power = true): SimState {
  const s: SimState = {
    power,
    time: 0,
    pressed: {},
    detected: {},
    active: {},
    energized: {},
    timers: {},
    short: false,
    unstable: false,
  };
  for (const d of circuit.devices) {
    s.active[d.id] = false;
    s.energized[d.id] = false;
    if (d.kind === "button") s.pressed[d.id] = false;
    if (d.kind === "sensor") s.detected[d.id] = false;
    if (d.kind === "timer-on" || d.kind === "timer-off")
      s.timers[d.id] = { running: false, elapsed: 0 };
  }
  return settle(circuit, s).state;
}

const clone = (s: SimState): SimState => ({
  ...s,
  pressed: { ...s.pressed },
  detected: { ...s.detected },
  active: { ...s.active },
  energized: { ...s.energized },
  timers: Object.fromEntries(
    Object.entries(s.timers).map(([k, t]) => [k, { ...t }]),
  ),
});

/** Is this contact closed in the given state? */
export function contactClosed(
  s: SimState,
  device: string,
  type: "no" | "nc",
): boolean {
  return (s.active[device] ?? false) !== (type === "nc");
}

function energize(c: Compiled, s: SimState) {
  const parent = Array.from({ length: c.groups }, (_, i) => i);
  const find = (i: number): number =>
    parent[i] === i ? i : (parent[i] = find(parent[i]));
  for (const e of c.layout.elements)
    if (
      e.element.kind === "contact" &&
      contactClosed(s, e.element.device, e.element.type)
    )
      parent[find(c.group[e.a])] = find(c.group[e.b]);
  const plus = find(c.group[c.layout.plus]),
    minus = find(c.group[c.layout.minus]);
  const short = plus === minus;
  const on: Record<string, boolean> = {};
  for (const d of c.circuit.devices) on[d.id] = false;
  if (s.power && !short)
    for (const e of c.layout.elements) {
      if (e.element.kind === "contact") continue;
      const a = find(c.group[e.a]),
        b = find(c.group[e.b]);
      if ((a === plus && b === minus) || (a === minus && b === plus))
        on[e.element.device] = true;
    }
  return { on, short: s.power && short };
}

/** One synchronous update of all devices from the present contact state. */
function update(
  c: Compiled,
  s: SimState,
  only?: string,
): { next: SimState; events: SimEvent[] } {
  const next = clone(s);
  const events: SimEvent[] = [];
  const { on, short } = energize(c, s);
  next.short = short;
  for (const d of c.circuit.devices) {
    if (on[d.id] !== s.energized[d.id])
      events.push({ kind: "energized", device: d.id, on: on[d.id] });
    next.energized[d.id] = on[d.id];
  }
  for (const d of c.circuit.devices) {
    if (only && d.id !== only) continue;
    const was = s.active[d.id];
    let now = was;
    const t = next.timers[d.id];
    switch (d.kind) {
      case "button":
        now = s.pressed[d.id];
        break;
      case "contactor":
        now = on[d.id];
        break;
      case "sensor":
        now = on[d.id] && s.detected[d.id];
        break;
      case "timer-on":
        if (!on[d.id]) {
          now = false;
          if (t.running) events.push({ kind: "timer", device: d.id, started: false });
          t.running = false;
          t.elapsed = 0;
        } else if (!was && !t.running) {
          t.running = true;
          t.elapsed = 0;
          events.push({ kind: "timer", device: d.id, started: true });
        }
        break;
      case "timer-off":
        if (on[d.id]) {
          now = true;
          if (t.running) events.push({ kind: "timer", device: d.id, started: false });
          t.running = false;
          t.elapsed = 0;
        } else if (was && !t.running) {
          t.running = true;
          t.elapsed = 0;
          events.push({ kind: "timer", device: d.id, started: true });
        }
        break;
    }
    next.active[d.id] = now;
    if (now !== was) events.push({ kind: "switched", device: d.id, on: now });
  }
  return { next, events };
}

const changed = (a: SimState, b: SimState) =>
  Object.keys(a.active).some((k) => a.active[k] !== b.active[k]) ||
  Object.keys(a.energized).some((k) => a.energized[k] !== b.energized[k]) ||
  Object.keys(a.timers).some((k) => a.timers[k].running !== b.timers[k].running);

export function settle(circuit: ControlCircuit, start: SimState): Settled {
  const c = compile(circuit);
  const run = (sequential: boolean): Settled | undefined => {
    let s = start;
    const frames: SimState[] = [];
    const events: SimEvent[][] = [];
    for (let i = 0; i < (sequential ? 200 : 60); i++) {
      let step = update(c, s);
      if (sequential) {
        // Race resolution: let only the first device that wants to change
        // switch, as if it were a little faster than the others.
        const first = c.circuit.devices.find(
          (d) => step.next.active[d.id] !== s.active[d.id],
        );
        if (first) step = update(c, s, first.id);
      }
      if (!changed(s, step.next)) return { state: step.next, frames, events };
      s = step.next;
      frames.push(s);
      events.push(step.events);
    }
    return undefined;
  };
  const result = run(false) ?? run(true);
  if (result) return result;
  const state = clone(start);
  state.unstable = true;
  return { state, frames: [], events: [] };
}

function input(
  circuit: ControlCircuit,
  s: SimState,
  edit: (n: SimState) => void,
  text: string,
): Settled {
  const n = clone(s);
  edit(n);
  const r = settle(circuit, n);
  return { ...r, events: [[{ kind: "input", text }], ...r.events] };
}
export const press = (c: ControlCircuit, s: SimState, id: string) =>
  input(c, s, (n) => (n.pressed[id] = true), `${id} wciśnięty`);
export const release = (c: ControlCircuit, s: SimState, id: string) =>
  input(c, s, (n) => (n.pressed[id] = false), `${id} zwolniony`);
export const setPower = (c: ControlCircuit, s: SimState, on: boolean) =>
  input(
    c,
    s,
    (n) => {
      n.power = on;
      if (!on)
        for (const t of Object.values(n.timers)) {
          t.running = false;
          t.elapsed = 0;
        }
    },
    on ? "Zasilanie 24 V załączone" : "Zasilanie 24 V wyłączone",
  );
export const setDetected = (
  c: ControlCircuit,
  s: SimState,
  id: string,
  on: boolean,
) =>
  input(
    c,
    s,
    (n) => (n.detected[id] = on),
    on ? `Obiekt przed czujnikiem ${id}` : `Brak obiektu przed ${id}`,
  );

/** Time until the nearest timer completes, or Infinity. */
export function nextTimerEvent(circuit: ControlCircuit, s: SimState): number {
  let best = Infinity;
  for (const d of circuit.devices) {
    const t = s.timers[d.id];
    if (t?.running) best = Math.min(best, (d.delayMs ?? 0) - t.elapsed);
  }
  return Math.max(0, best);
}

/** Advance the clock; timers that complete switch their contacts exactly on
 * time, independent of how large the step is. */
export function advance(
  circuit: ControlCircuit,
  start: SimState,
  ms: number,
): Settled {
  let s = clone(start);
  const frames: SimState[] = [];
  const events: SimEvent[][] = [];
  let left = ms;
  for (let guard = 0; guard < 1000; guard++) {
    const dt = nextTimerEvent(circuit, s);
    if (dt > left) {
      for (const t of Object.values(s.timers)) if (t.running) t.elapsed += left;
      s.time += left;
      break;
    }
    for (const t of Object.values(s.timers)) if (t.running) t.elapsed += dt;
    s.time += dt;
    left -= dt;
    const fired: SimEvent[] = [];
    for (const d of circuit.devices) {
      const t = s.timers[d.id];
      if (!t?.running || t.elapsed < (d.delayMs ?? 0) - 1e-6) continue;
      t.running = false;
      t.elapsed = d.delayMs ?? 0;
      s.active[d.id] = d.kind === "timer-on";
      if (d.kind === "timer-off") t.elapsed = 0;
      fired.push({ kind: "switched", device: d.id, on: s.active[d.id] });
    }
    const r = settle(circuit, s);
    frames.push(s, ...r.frames);
    events.push(fired, ...r.events);
    s = r.state;
  }
  return { state: s, frames, events };
}

export function apply(
  circuit: ControlCircuit,
  s: SimState,
  action: Action,
): SimState {
  if ("tap" in action)
    return release(circuit, press(circuit, s, action.tap).state, action.tap)
      .state;
  if ("hold" in action) return press(circuit, s, action.hold).state;
  if ("release" in action) return release(circuit, s, action.release).state;
  if ("toggle" in action)
    return (s.pressed[action.toggle] ? release : press)(
      circuit,
      s,
      action.toggle,
    ).state;
  if ("wait" in action) return advance(circuit, s, action.wait).state;
  if ("power" in action) return setPower(circuit, s, action.power).state;
  return setDetected(circuit, s, action.sensor, action.detect).state;
}

/** Device looks "on": lamp lit, coil pulled in, timer output switched. */
export function isOn(circuit: ControlCircuit, s: SimState, id: string) {
  const d = circuit.devices.find((d) => d.id === id);
  if (!d) return false;
  return d.kind === "lamp" || d.kind === "buzzer"
    ? s.energized[id]
    : s.active[id];
}

// ---------------------------------------------------------------------------
// Currents for the drawing: every wire segment and closed contact is a small
// resistor, loads are larger ones. Node voltages come from a direct solve.

const R_WIRE = 0.01;
const R_LOAD: Record<string, number> = {
  coil: 180,
  lamp: 1200,
  buzzer: 1000,
  "sensor-supply": 2400,
};
export interface Flow {
  /** Current (A) from node a to node b of each wire / element id. */
  current: Record<string, number>;
  voltage: Record<string, number | undefined>;
}
export function flow(circuit: ControlCircuit, s: SimState): Flow {
  const { layout } = compile(circuit);
  const edges: { id: string; a: string; b: string; g: number }[] = [];
  for (const w of layout.wires) edges.push({ ...w, g: 1 / R_WIRE });
  for (const e of layout.elements) {
    const el = e.element;
    if (el.kind === "contact") {
      if (contactClosed(s, el.device, el.type))
        edges.push({ id: e.id, a: e.a, b: e.b, g: 1 / R_WIRE });
    } else edges.push({ id: e.id, a: e.a, b: e.b, g: 1 / R_LOAD[el.kind] });
  }
  const current: Record<string, number> = {};
  const voltage: Record<string, number | undefined> = {};
  for (const e of edges) current[e.id] = 0;
  if (!s.power) return { current, voltage };
  const fixed: Record<string, number> = { [layout.plus]: 24, [layout.minus]: 0 };
  // Only nodes connected to a rail have a defined potential.
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    adj.set(e.a, [...(adj.get(e.a) ?? []), e.b]);
    adj.set(e.b, [...(adj.get(e.b) ?? []), e.a]);
  }
  const reach = new Set<string>(Object.keys(fixed));
  const queue = Object.keys(fixed);
  while (queue.length) {
    const n = queue.pop()!;
    for (const m of adj.get(n) ?? [])
      if (!reach.has(m)) {
        reach.add(m);
        queue.push(m);
      }
  }
  const unknown = [...reach].filter((n) => !(n in fixed));
  const idx = new Map(unknown.map((n, i) => [n, i]));
  const size = unknown.length;
  const A = Array.from({ length: size }, () => new Float64Array(size + 1));
  for (const e of edges) {
    const ia = idx.get(e.a),
      ib = idx.get(e.b);
    if (ia !== undefined) {
      A[ia][ia] += e.g;
      if (ib !== undefined) A[ia][ib] -= e.g;
      else if (e.b in fixed) A[ia][size] += e.g * fixed[e.b];
    }
    if (ib !== undefined) {
      A[ib][ib] += e.g;
      if (ia !== undefined) A[ib][ia] -= e.g;
      else if (e.a in fixed) A[ib][size] += e.g * fixed[e.a];
    }
  }
  for (let col = 0; col < size; col++) {
    let pivot = col;
    for (let r = col + 1; r < size; r++)
      if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
    [A[col], A[pivot]] = [A[pivot], A[col]];
    const p = A[col][col];
    if (Math.abs(p) < 1e-15) continue;
    for (let r = col + 1; r < size; r++) {
      const f = A[r][col] / p;
      if (!f) continue;
      for (let k = col; k <= size; k++) A[r][k] -= f * A[col][k];
    }
  }
  const v = new Float64Array(size);
  for (let r = size - 1; r >= 0; r--) {
    let sum = A[r][size];
    for (let k = r + 1; k < size; k++) sum -= A[r][k] * v[k];
    v[r] = A[r][r] ? sum / A[r][r] : 0;
  }
  for (const [n, i] of idx) voltage[n] = v[i];
  for (const [n, val] of Object.entries(fixed)) voltage[n] = val;
  for (const e of edges) {
    const va = voltage[e.a],
      vb = voltage[e.b];
    if (va !== undefined && vb !== undefined) current[e.id] = (va - vb) * e.g;
  }
  return { current, voltage };
}
export const CURRENT_MIN = 1e-3;

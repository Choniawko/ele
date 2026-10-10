import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  circuitById,
  circuitGroups,
  controlCircuits,
} from "../../../packages/knowledge/control/circuits";
import {
  theoryArticles,
  theoryById,
  type TheoryArticle,
} from "../../../packages/knowledge/control/theory";
import { measurementTable } from "../../../packages/knowledge/control/measure";
import {
  ROW,
  TOP,
  laneX,
  type Layout,
  type Placed,
} from "../../../packages/knowledge/control/layout";
import {
  CURRENT_MIN,
  advance,
  compile,
  contactClosed,
  flow as solveFlow,
  initialState,
  apply,
  isOn,
  nextTimerEvent,
  press as simPress,
  release as simRelease,
  setDetected,
  setPower,
  type Flow,
  type Settled,
  type SimEvent,
  type SimState,
} from "../../../packages/knowledge/control/simulator";
import type {
  Action,
  ContactRole,
  ControlCircuit,
  Device,
  Step,
} from "../../../packages/knowledge/control/model";
import "./control-circuits.css";

const href = (id?: string) => `#/wiedza/sterowanie${id ? `/${id}` : ""}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const reducedMotion = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const roleText: Record<ContactRole, string> = {
  podtrzymanie: "podtrzymanie",
  blokada: "blokada",
  warunek: "warunek",
  sygnalizacja: "sygnalizacja",
  start: "start",
  stop: "stop",
  reset: "kasowanie",
  czas: "zwłoka czasowa",
};
const lampFill: Record<string, string> = {
  yellow: "#ffd84a",
  red: "#ff5b4a",
  green: "#3fcf6b",
  blue: "#4aa3ff",
  white: "#f4f1e4",
};
const seconds = (ms: number) =>
  (ms / 1000).toLocaleString("pl-PL", { maximumFractionDigits: 1 });
/** Keep receiving pointerup when the finger slides off a held button. */
const capture = (ev: ReactPointerEvent) => {
  try {
    (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
  } catch {
    /* Synthetic or already released pointer. */
  }
};
const circuitName = (c: ControlCircuit) =>
  c.bookNumber ? `Układ ${c.bookNumber}` : "Podstawy";

// ---------------------------------------------------------------- simulation

type HistoryEntry =
  | { kind: "press" | "release" | "toggle"; id: string }
  | { kind: "power"; on: boolean }
  | { kind: "detect"; id: string; on: boolean };

function useLab(circuit: ControlCircuit) {
  const [sim, setSim] = useState(() => initialState(circuit));
  const ref = useRef(sim);
  /** Recent gestures, newest last; each is the chain of events it caused. */
  const [log, setLog] = useState<SimEvent[][]>([]);
  const [frames, setFrames] = useState<SimState[]>([]);
  const framesRef = useRef(frames);
  const [slow, setSlow] = useState(false);
  const slowRef = useRef(slow);
  slowRef.current = slow;
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const waitTarget = useRef<{ time: number; done: () => void } | null>(null);
  const token = useRef(0);

  const commit = useCallback((r: Settled, clock = false) => {
    ref.current = r.state;
    setSim(r.state);
    const events = r.events.flat();
    if (events.length) {
      const quiet = events.every((e) => e.kind === "input");
      const gesture: SimEvent[] = clock
        ? [{ kind: "input", text: `Mija czas: t = ${seconds(r.state.time)} s` }, ...events]
        : events;
      setLog((log) =>
        quiet && log.length
          ? [...log.slice(0, -1), [...log[log.length - 1], ...gesture]]
          : [...log, gesture].slice(-4),
      );
    }
    const next =
      slowRef.current && r.frames.length > 0 && !reducedMotion()
        ? [...r.frames, r.state]
        : [];
    framesRef.current = next;
    setFrames(next);
  }, []);
  const record = (e: HistoryEntry) => setHistory((h) => [...h, e]);

  const press = useCallback(
    (id: string) => {
      const d = circuit.devices.find((d) => d.id === id)!;
      if (d.latching) {
        const s = ref.current;
        commit((s.pressed[id] ? simRelease : simPress)(circuit, s, id));
        record({ kind: "toggle", id });
      } else if (!ref.current.pressed[id]) {
        commit(simPress(circuit, ref.current, id));
        record({ kind: "press", id });
      }
    },
    [circuit, commit],
  );
  const release = useCallback(
    (id: string) => {
      const d = circuit.devices.find((d) => d.id === id)!;
      if (d.latching || !ref.current.pressed[id]) return;
      commit(simRelease(circuit, ref.current, id));
      record({ kind: "release", id });
    },
    [circuit, commit],
  );
  const power = (on: boolean) => {
    commit(setPower(circuit, ref.current, on));
    record({ kind: "power", on });
  };
  const detect = (id: string, on: boolean) => {
    commit(setDetected(circuit, ref.current, id, on));
    record({ kind: "detect", id, on });
  };
  const reset = () => {
    token.current++;
    waitTarget.current?.done();
    waitTarget.current = null;
    const s = initialState(circuit, ref.current.power);
    ref.current = s;
    setSim(s);
    setLog([]);
    framesRef.current = [];
    setFrames([]);
    setHistory([]);
  };
  const load = (s: SimState) => {
    token.current++;
    waitTarget.current?.done();
    waitTarget.current = null;
    ref.current = s;
    setSim(s);
    setLog([]);
    framesRef.current = [];
    setFrames([]);
  };
  const advanceBy = (ms: number) => {
    if (ms > 0) commit(advance(circuit, ref.current, ms), true);
  };
  const skip = () => {
    const dt = nextTimerEvent(circuit, ref.current);
    if (Number.isFinite(dt)) commit(advance(circuit, ref.current, dt), true);
  };

  // Clock: runs only while a timer is counting.
  const counting = Object.values(sim.timers).some((t) => t.running);
  const playing = frames.length > 0;
  useEffect(() => {
    if (!counting || paused || playing) return;
    let raf = 0,
      last = performance.now();
    const tick = (now: number) => {
      let dt = Math.min(250, now - last) * speed;
      last = now;
      const w = waitTarget.current;
      if (w) dt = Math.min(dt, Math.max(0, w.time - ref.current.time));
      if (dt > 0) commit(advance(circuit, ref.current, dt), true);
      if (w && ref.current.time >= w.time - 1e-6) {
        waitTarget.current = null;
        w.done();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [counting, paused, playing, speed, circuit, commit]);

  // Slow motion: show each intermediate state of the last change.
  useEffect(() => {
    if (!frames.length) return;
    const t = setTimeout(() => {
      const next = frames.slice(1);
      framesRef.current = next;
      setFrames(next);
    }, 650);
    return () => clearTimeout(t);
  }, [frames]);

  const idle = async (my: number) => {
    while (framesRef.current.length && my === token.current) await sleep(60);
  };
  const waitSim = (ms: number) =>
    new Promise<void>((done) => {
      const target = ref.current.time + ms;
      if (!Object.values(ref.current.timers).some((t) => t.running)) {
        commit(advance(circuit, ref.current, ms), true);
        return done();
      }
      setPaused(false);
      waitTarget.current = { time: target, done };
    });
  const play = async (actions: Action[]) => {
    const my = ++token.current;
    for (const a of actions) {
      if (my !== token.current) return false;
      await idle(my);
      if ("tap" in a) {
        press(a.tap);
        await sleep(420);
        await idle(my);
        release(a.tap);
      } else if ("hold" in a) press(a.hold);
      else if ("release" in a) release(a.release);
      else if ("toggle" in a) press(a.toggle);
      else if ("power" in a) power(a.power);
      else if ("detect" in a) detect(a.sensor, a.detect);
      else await waitSim(a.wait);
      await sleep(260);
    }
    await idle(my);
    return my === token.current;
  };
  return {
    sim,
    shown: frames[0] ?? sim,
    log,
    slow,
    setSlow,
    paused,
    setPaused,
    speed,
    setSpeed,
    history,
    playing,
    press,
    release,
    power,
    detect,
    reset,
    load,
    advanceBy,
    skip,
    play,
  };
}
type Lab = ReturnType<typeof useLab>;

// ------------------------------------------------------------------- events

function contactChanges(layout: Layout, device: string, on: boolean) {
  return layout.elements
    .filter((e) => e.element.kind === "contact" && e.element.device === device)
    .map((e) => {
      const el = e.element as Extract<Placed["element"], { kind: "contact" }>;
      const closes = (el.type === "no") === on;
      return `${el.terminals.join("–")} ${closes ? "zamyka się" : "otwiera się"} (gał. ${e.lane + 1}${el.role ? `, ${roleText[el.role]}` : ""})`;
    });
}
function describe(c: ControlCircuit, layout: Layout, ev: SimEvent): string | null {
  if (ev.kind === "input") return ev.text;
  const d = c.devices.find((d) => d.id === ev.device)!;
  const contacts = (on: boolean) => {
    const list = contactChanges(layout, d.id, on);
    return list.length ? `: ${list.join("; ")}` : "";
  };
  if (ev.kind === "energized") {
    if (d.kind === "lamp") return `${d.id} ${ev.on ? "świeci" : "gaśnie"}`;
    if (d.kind === "buzzer") return `${d.id} ${ev.on ? "brzęczy" : "milknie"}`;
    if (d.kind === "sensor")
      return `Czujnik ${d.id} ${ev.on ? "ma zasilanie" : "traci zasilanie"}`;
    if (d.kind === "button") return null;
    return `Cewka ${d.id} ${ev.on ? "dostaje napięcie" : "traci napięcie"}`;
  }
  if (ev.kind === "timer")
    return ev.started
      ? d.kind === "timer-on"
        ? `${d.id} zaczyna odliczać ${seconds(d.delayMs!)} s`
        : `${d.id} odlicza ${seconds(d.delayMs!)} s, trzymając styki`
      : `${d.id} przerywa odliczanie`;
  if (d.kind === "button") return null;
  if (d.kind === "contactor")
    return ev.on
      ? `${d.id} przyciąga zworę${contacts(true)}`
      : `${d.id} odpada${contacts(false)}`;
  if (d.kind === "timer-on")
    return ev.on
      ? `${d.id} odliczył czas — przełącza styki${contacts(true)}`
      : `${d.id} bez napięcia — styki wracają od razu${contacts(false)}`;
  if (d.kind === "timer-off")
    return ev.on
      ? `${d.id} przełącza styki od razu${contacts(true)}`
      : `${d.id} odliczył czas po zaniku napięcia — styki wracają${contacts(false)}`;
  if (d.kind === "sensor")
    return ev.on ? `${d.id} wykrywa obiekt — wyjście BK załączone` : `${d.id}: wyjście wyłączone`;
  return null;
}

// ------------------------------------------------------------------ drawing

const INK = "#253f43";
function Wire({
  x1,
  y1,
  x2,
  y2,
  current,
  live,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  current: number;
  live: boolean;
}) {
  const on = Math.abs(current) > CURRENT_MIN;
  const [a, b] = current < 0 ? [[x2, y2], [x1, y1]] : [[x1, y1], [x2, y2]];
  return (
    <>
      <line
        className={on ? "cc-wire cc-on" : live ? "cc-wire cc-live" : "cc-wire"}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
      />
      {on && (
        <line className="cc-dots" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
      )}
    </>
  );
}

interface ElementProps {
  e: Placed;
  device: Device;
  s: SimState;
  current: number;
  live: boolean;
  selected: boolean;
  target: boolean;
}
function ElementSymbol({ e, device, s, current, live, selected, target }: ElementProps) {
  const { x, yTop, yBottom } = e;
  const yc = yTop + ROW / 2;
  const el = e.element;
  const on = Math.abs(current) > CURRENT_MIN;
  const lead = (y1: number, y2: number) => (
    <Wire x1={x} y1={y1} x2={x} y2={y2} current={current} live={live} />
  );
  const active = s.active[device.id];
  const name = (
    <g className="cc-name">
      {active && device.kind !== "lamp" && (
        <text x={x - 40} y={yc - 10} className="cc-arrow" textAnchor="end">
          ⇑
        </text>
      )}
      <text x={x - 40} y={yc + 5} textAnchor="end">
        {device.id}
      </text>
      {device.label && el.kind === "contact" && device.kind === "button" && (
        <text x={x - 40} y={yc + 17} textAnchor="end" className="cc-sub">
          {device.label}
        </text>
      )}
    </g>
  );
  const halo = (selected || target) && (
    <rect
      className={target ? "cc-target" : "cc-selected"}
      x={x - 64}
      y={yTop + 6}
      width={104}
      height={ROW - 12}
      rx={10}
    />
  );
  if (el.kind === "contact") {
    const closed = contactClosed(s, el.device, el.type);
    const angle =
      el.type === "no" ? (closed ? 0 : -26) : closed ? 22 : -14;
    const timer = device.kind === "timer-on" || device.kind === "timer-off";
    return (
      <g>
        {halo}
        {lead(yTop, yc - 14)}
        {lead(yc + 14, yBottom)}
        {el.type === "nc" && (
          <line className="cc-sym" x1={x} y1={yc - 14} x2={x + 11} y2={yc - 14} />
        )}
        <line
          className={on ? "cc-blade cc-on" : "cc-blade"}
          x1={x}
          y1={yc + 14}
          x2={x}
          y2={yc - 18}
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: `${x}px ${yc + 14}px`,
          }}
        />
        {device.kind === "button" && (
          <g
            className="cc-actuator"
            style={{ transform: `translateX(${s.pressed[device.id] ? 5 : 0}px)` }}
          >
            <line x1={x - 30} y1={yc} x2={x - 6} y2={yc} strokeDasharray="4 3" />
            <path d={`M${x - 25} ${yc - 7}H${x - 30}V${yc + 7}H${x - 25}`} />
            {device.latching && (
              <path d={`M${x - 21} ${yc - 5}L${x - 18} ${yc}L${x - 15} ${yc - 5}`} />
            )}
          </g>
        )}
        {timer && (
          <g className="cc-actuator">
            <line x1={x - 18} y1={yc - 2} x2={x - 5} y2={yc - 2} />
            <line x1={x - 18} y1={yc + 2} x2={x - 5} y2={yc + 2} />
            {device.kind === "timer-on" ? (
              <path d={`M${x - 15} ${yc - 8}A8 8 0 0 0 ${x - 15} ${yc + 8}`} />
            ) : (
              <path d={`M${x - 26} ${yc - 8}A8 8 0 0 1 ${x - 26} ${yc + 8}`} />
            )}
          </g>
        )}
        {device.kind === "sensor" && (
          <g className="cc-actuator">
            <line x1={x - 19} y1={yc} x2={x - 6} y2={yc} strokeDasharray="4 3" />
            <path d={`M${x - 26} ${yc - 8}L${x - 19} ${yc}L${x - 26} ${yc + 8}L${x - 33} ${yc}Z`} />
          </g>
        )}
        <text className="cc-term" x={x + 7} y={yc - 17}>
          {el.terminals[0]}
        </text>
        <text className="cc-term" x={x + 7} y={yc + 26}>
          {el.terminals[1]}
        </text>
        {name}
      </g>
    );
  }
  if (el.kind === "coil" && (device.kind === "timer-on" || device.kind === "timer-off")) {
    const t = s.timers[device.id];
    const shown = t.running ? t.elapsed : device.delayMs!;
    const energized = s.energized[device.id];
    return (
      <g>
        {halo}
        {lead(yTop, yc - 12)}
        {lead(yc + 12, yBottom)}
        <rect
          className={energized ? "cc-coil cc-energized" : "cc-coil"}
          x={x - 30}
          y={yc - 12}
          width={60}
          height={24}
        />
        <rect className="cc-timer-box" x={x - 30} y={yc - 12} width={22} height={24} fill={device.kind === "timer-off" ? INK : "white"} />
        {device.kind === "timer-on" && (
          <path className="cc-sym" d={`M${x - 30} ${yc - 12}L${x - 8} ${yc + 12}M${x - 30} ${yc + 12}L${x - 8} ${yc - 12}`} />
        )}
        <text x={x + 11} y={yc + 5} textAnchor="middle" className={t.running ? "cc-time cc-counting" : "cc-time"}>
          {seconds(shown)}
        </text>
        {t.running && (
          <rect
            className="cc-progress"
            x={x - 30}
            y={yc + 15}
            width={(60 * t.elapsed) / device.delayMs!}
            height={4}
          />
        )}
        <text className="cc-term" x={x + 33} y={yc - 14}>
          A1
        </text>
        <text className="cc-term" x={x + 33} y={yc + 24}>
          A2
        </text>
        {name}
      </g>
    );
  }
  if (el.kind === "coil")
    return (
      <g>
        {halo}
        {lead(yTop, yc - 11)}
        {lead(yc + 11, yBottom)}
        <rect
          className={s.energized[device.id] ? "cc-coil cc-energized" : "cc-coil"}
          x={x - 18}
          y={yc - 11}
          width={36}
          height={22}
        />
        <text className="cc-term" x={x + 21} y={yc - 13}>
          A1
        </text>
        <text className="cc-term" x={x + 21} y={yc + 23}>
          A2
        </text>
        {name}
      </g>
    );
  if (el.kind === "lamp") {
    const lit = s.energized[device.id];
    return (
      <g>
        {halo}
        {lead(yTop, yc - 12)}
        {lead(yc + 12, yBottom)}
        {lit && (
          <circle className="cc-glow" cx={x} cy={yc} r={22} fill={lampFill[device.color ?? "yellow"]} />
        )}
        <circle
          className="cc-sym"
          cx={x}
          cy={yc}
          r={12}
          fill={lit ? lampFill[device.color ?? "yellow"] : "white"}
        />
        <path className="cc-sym" d={`M${x - 8.5} ${yc - 8.5}L${x + 8.5} ${yc + 8.5}M${x - 8.5} ${yc + 8.5}L${x + 8.5} ${yc - 8.5}`} />
        <text className="cc-term" x={x + 15} y={yc - 13}>
          X1
        </text>
        <text className="cc-term" x={x + 15} y={yc + 23}>
          X2
        </text>
        {name}
      </g>
    );
  }
  if (el.kind === "buzzer") {
    const loud = s.energized[device.id];
    return (
      <g>
        {halo}
        {lead(yTop, yc - 10)}
        {lead(yc + 10, yBottom)}
        <rect className="cc-coil" x={x - 6} y={yc - 10} width={12} height={20} />
        <path className="cc-sym" d={`M${x + 6} ${yc - 12}A12 12 0 0 1 ${x + 6} ${yc + 12}`} fill="white" />
        {loud && (
          <g className="cc-waves">
            <path d={`M${x + 24} ${yc - 10}A14 14 0 0 1 ${x + 24} ${yc + 10}`} />
            <path d={`M${x + 31} ${yc - 15}A20 20 0 0 1 ${x + 31} ${yc + 15}`} />
          </g>
        )}
        {name}
      </g>
    );
  }
  return (
    <g>
      {halo}
      {lead(yTop, yc - 14)}
      {lead(yc + 14, yBottom)}
      <rect className={s.energized[device.id] ? "cc-coil cc-energized" : "cc-coil"} x={x - 16} y={yc - 14} width={32} height={28} />
      <path className="cc-sym" d={`M${x} ${yc - 9}L${x + 8} ${yc}L${x} ${yc + 9}L${x - 8} ${yc}Z`} />
      <text className="cc-term" x={x + 19} y={yc - 14}>
        BN
      </text>
      <text className="cc-term" x={x + 19} y={yc + 24}>
        BU
      </text>
      {name}
    </g>
  );
}

function Ladder({
  circuit,
  s,
  flow,
  selected,
  targets,
  potential,
  onSelect,
  lab,
}: {
  circuit: ControlCircuit;
  s: SimState;
  flow: Flow;
  selected?: string;
  targets: Set<string>;
  potential: boolean;
  onSelect: (device: string, keep?: boolean) => void;
  lab: Lab;
}) {
  const { layout, devices } = compile(circuit);
  const nodes = layout.nodes;
  const live = (a: string, b: string) =>
    potential && (flow.voltage[a] ?? 0) > 12 && (flow.voltage[b] ?? 0) > 12;
  const degree = new Map<string, number>();
  for (const w of layout.wires)
    for (const n of [w.a, w.b]) degree.set(n, (degree.get(n) ?? 0) + 1);
  for (const e of layout.elements)
    for (const n of [e.a, e.b]) degree.set(n, (degree.get(n) ?? 0) + 1);
  const pointer = (id: string, down: boolean) => (ev: ReactPointerEvent) => {
    if (down) {
      capture(ev);
      onSelect(id, true);
      lab.press(id);
    } else lab.release(id);
  };
  const keys = (id: string, down: boolean) => (ev: ReactKeyboardEvent) => {
    if (ev.key !== " " && ev.key !== "Enter") return;
    ev.preventDefault();
    if (down && !ev.repeat) {
      onSelect(id, true);
      lab.press(id);
    } else if (!down) lab.release(id);
  };
  const plus = nodes[layout.plus],
    minus = nodes[layout.minus];
  return (
    <svg
      className="cc-ladder"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      width={layout.width}
      style={{ minWidth: Math.round(layout.width * 0.7) }}
      role="img"
      aria-label={`Schemat sterowania: ${circuit.title}`}
    >
      <g className="cc-lanes">
        {Array.from({ length: layout.lanes }, (_, i) => (
          <text key={i} x={laneX(i)} y={TOP - 30} textAnchor="middle">
            {i + 1}
          </text>
        ))}
      </g>
      <text className="cc-rail-label" x={plus.x} y={TOP - 12} textAnchor="middle">
        +24 V
      </text>
      <text className="cc-rail-label" x={minus.x} y={layout.bottom + 24} textAnchor="middle">
        0 V
      </text>
      {layout.wires.map((w) => (
        <Wire
          key={w.id}
          x1={nodes[w.a].x}
          y1={nodes[w.a].y}
          x2={nodes[w.b].x}
          y2={nodes[w.b].y}
          current={flow.current[w.id] ?? 0}
          live={live(w.a, w.b)}
        />
      ))}
      {[...degree]
        .filter(([n, d]) => d >= 3 && n !== layout.plus && n !== layout.minus)
        .map(([n]) => (
          <circle key={n} className="cc-node" cx={nodes[n].x} cy={nodes[n].y} r={3.6} />
        ))}
      {[plus, minus].map((p, i) => (
        <circle key={i} className="cc-terminal" cx={p.x} cy={p.y} r={5} />
      ))}
      {layout.elements.map((e) => {
        const device = devices.get(e.element.device)!;
        const button = device.kind === "button" && e.element.kind === "contact";
        const symbol = (
          <ElementSymbol
            e={e}
            device={device}
            s={s}
            current={flow.current[e.id] ?? 0}
            live={live(e.a, e.b)}
            selected={selected === device.id}
            target={targets.has(device.id)}
          />
        );
        const hit = (
          <rect className="cc-hit" x={e.x - 50} y={e.yTop + 4} width={96} height={ROW - 8} />
        );
        if (button)
          return (
            <g
              key={e.id}
              className="cc-button"
              role="button"
              tabIndex={0}
              aria-pressed={s.pressed[device.id]}
              aria-label={`${device.id}${device.label ? ` ${device.label}` : ""} — ${device.latching ? "kliknij, aby przełączyć" : "przytrzymaj"}`}
              onPointerDown={pointer(device.id, true)}
              onPointerUp={pointer(device.id, false)}
              onPointerCancel={pointer(device.id, false)}
              onKeyDown={keys(device.id, true)}
              onKeyUp={keys(device.id, false)}
              onBlur={() => lab.release(device.id)}
            >
              {symbol}
              {hit}
            </g>
          );
        return (
          <g
            key={e.id}
            className="cc-element"
            onClick={() => onSelect(device.id)}
          >
            {symbol}
            {hit}
          </g>
        );
      })}
      {Object.entries(layout.crossRef)
        .filter(([, r]) => r.nc.length + r.no.length > 0)
        .map(([id, r]) => {
          const x = laneX(r.lane),
            y = layout.bottom + 16;
          const rows = Math.max(r.nc.length, r.no.length);
          return (
            <g
              key={id}
              className={selected === id ? "cc-xref cc-xref-sel" : "cc-xref"}
              onClick={() => onSelect(id)}
            >
              <title>{`Styki ${id}: NC w gałęziach ${r.nc.join(", ") || "—"}, NO w gałęziach ${r.no.join(", ") || "—"}`}</title>
              <line x1={x} y1={y} x2={x} y2={y + 16 + rows * 12} />
              <line x1={x - 24} y1={y + 14} x2={x + 24} y2={y + 14} />
              <text x={x - 12} y={y + 10} textAnchor="middle" className="cc-xref-head">
                NC
              </text>
              <text x={x + 12} y={y + 10} textAnchor="middle" className="cc-xref-head">
                NO
              </text>
              {r.nc.map((n, i) => (
                <text key={`c${i}`} x={x - 12} y={y + 26 + i * 12} textAnchor="middle">
                  {n}
                </text>
              ))}
              {r.no.map((n, i) => (
                <text key={`o${i}`} x={x + 12} y={y + 26 + i * 12} textAnchor="middle">
                  {n}
                </text>
              ))}
            </g>
          );
        })}
    </svg>
  );
}

function MotorPanel({ circuit, s }: { circuit: ControlCircuit; s: SimState }) {
  const [q1, setQ1] = useState(true);
  const m = circuit.motor!;
  const f = s.active[m.forward],
    r = s.active[m.reverse];
  const short = q1 && f && r;
  const dir = q1 && f !== r ? (f ? "prawo" : "lewo") : null;
  const running = q1 && (f || r);
  const phase = (hot: boolean, live = true) =>
    hot ? "cc-power cc-on" : live ? "cc-power cc-live" : "cc-power";
  const xs = [50, 80, 110],
    ks = [170, 200, 230];
  const contact = (x: number, y: number, closed: boolean, hot: boolean) => (
    <g>
      <line className={phase(hot, q1)} x1={x} y1={y - 16} x2={x} y2={y - 8} />
      <line
        className={hot && closed ? "cc-blade cc-on" : "cc-blade"}
        x1={x}
        y1={y + 8}
        x2={x}
        y2={y - 10}
        style={{ transform: `rotate(${closed ? 0 : -24}deg)`, transformOrigin: `${x}px ${y + 8}px` }}
      />
    </g>
  );
  return (
    <figure className="cc-motor">
      <svg viewBox="0 0 280 330" role="img" aria-label="Obwód mocy: wyłącznik Q1, styczniki K1 i K2, silnik M1">
        {["L1", "L2", "L3"].map((l, i) => (
          <g key={l}>
            <text x={8} y={22 + i * 16} className="cc-rail-label">
              {l}
            </text>
            <line className={phase(running)} x1={26} y1={18 + i * 16} x2={270} y2={18 + i * 16} />
          </g>
        ))}
        {xs.map((x, i) => (
          <g key={x}>
            <line className={phase(running)} x1={x} y1={18 + i * 16} x2={x} y2={78} />
            <circle className="cc-node" cx={x} cy={18 + i * 16} r={3} />
            {contact(x, 92, q1, running)}
            <line className={phase(running, q1)} x1={x} y1={100} x2={x} y2={124 + i * 8} />
            <line className={phase(q1 && r, q1)} x1={x} y1={124 + i * 8} x2={ks[i]} y2={124 + i * 8} />
            <circle className="cc-node" cx={x} cy={124 + i * 8} r={3} />
            <line className={phase(q1 && r, q1)} x1={ks[i]} y1={124 + i * 8} x2={ks[i]} y2={160} />
            <line className={phase(q1 && f, q1)} x1={x} y1={124 + i * 8} x2={x} y2={160} />
            {contact(x, 174, f, q1 && f)}
            {contact(ks[i], 174, r, q1 && r)}
            <line className={phase(running, false)} x1={x} y1={182} x2={x} y2={250} />
          </g>
        ))}
        <rect className="cc-box" x={38} y={80} width={84} height={24} />
        <text x={130} y={97} className="cc-term">
          Q1
        </text>
        <text x={18} y={178} className="cc-term">
          {m.forward}
        </text>
        <text x={240} y={178} className="cc-term">
          {m.reverse}
        </text>
        {ks.map((x, i) => {
          const to = xs[2 - i];
          const y = 206 + i * 12;
          return (
            <g key={x}>
              <line className={phase(q1 && r, false)} x1={x} y1={182} x2={x} y2={y} />
              <line className={phase(q1 && r, false)} x1={x} y1={y} x2={to} y2={y} />
              <circle className="cc-node" cx={to} cy={y} r={3} />
            </g>
          );
        })}
        <circle className="cc-sym" cx={80} cy={282} r={30} fill="white" />
        <text x={80} y={280} textAnchor="middle" className="cc-motor-m">
          M
        </text>
        <text x={80} y={296} textAnchor="middle" className="cc-term">
          3~
        </text>
        {["U", "V", "W"].map((u, i) => (
          <text key={u} x={xs[i] + 4} y={262} className="cc-term">
            {u}
          </text>
        ))}
        {dir && (
          <g className={dir === "prawo" ? "cc-rotor" : "cc-rotor cc-rotor-left"}>
            <path d="M80 244a38 38 0 0 1 36 26" />
            <path d="M112 262l4 8 7-6" />
          </g>
        )}
      </svg>
      <figcaption>
        <button onClick={() => setQ1((v) => !v)} aria-pressed={!q1}>
          {q1 ? "Q1 załączony — zasymuluj zadziałanie" : "Q1 wyłączony — załącz"}
        </button>
        <span role="status">
          {short
            ? "Zwarcie L1–L3! Oba styczniki zamknięte."
            : dir
              ? `Silnik obraca się w ${dir}`
              : q1 && (f || r)
                ? "—"
                : !q1 && (f || r)
                  ? "Q1 odciął silnik, ale stycznik dalej jest załączony"
                  : "Silnik stoi"}
        </span>
      </figcaption>
    </figure>
  );
}

// -------------------------------------------------------------------- guide

function satisfied(step: Step, entries: HistoryEntry[], s: SimState, elapsed: number) {
  let wait = 0;
  return step.do.every((a) => {
    if ("tap" in a)
      return entries.some((e) => e.kind === "release" && e.id === a.tap);
    if ("hold" in a)
      return s.pressed[a.hold] || entries.some((e) => e.kind === "press" && e.id === a.hold);
    if ("release" in a)
      return entries.some((e) => e.kind === "release" && e.id === a.release);
    if ("toggle" in a)
      return entries.some((e) => e.kind === "toggle" && e.id === a.toggle);
    if ("power" in a)
      return entries.some((e) => e.kind === "power" && e.on === a.power);
    if ("detect" in a)
      return entries.some((e) => e.kind === "detect" && e.id === a.sensor && e.on === a.detect);
    wait += a.wait;
    return elapsed >= wait - 1;
  });
}
function Guide({
  circuit,
  lab,
  onTargets,
}: {
  circuit: ControlCircuit;
  lab: Lab;
  onTargets: (ids: string[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [start, setStart] = useState({ history: 0, time: 0 });
  const [running, setRunning] = useState(false);
  const step = circuit.steps[index];
  const entries = lab.history.slice(start.history);
  const reached =
    !!step && !running && satisfied(step, entries, lab.sim, lab.sim.time - start.time);
  // The verdict is taken when the step is completed; afterwards the clock is
  // stopped until "Dalej", so timers do not run ahead of the next step.
  const [verdict, setVerdict] = useState<boolean>();
  const timed = circuit.devices.some(
    (d) => d.kind === "timer-on" || d.kind === "timer-off",
  );
  useEffect(() => {
    if (!reached || verdict !== undefined) return;
    setVerdict(
      (step.on ?? []).every((id) => isOn(circuit, lab.sim, id)) &&
        (step.off ?? []).every((id) => !isOn(circuit, lab.sim, id)),
    );
    if (timed) lab.setPaused(true);
  }, [reached, verdict, step, circuit, lab, timed]);
  const done = verdict !== undefined;
  const ok = verdict === true;
  const waits = step
    ? step.do.reduce((t, a) => t + ("wait" in a ? a.wait : 0), 0)
    : 0;
  const waitLeft = Math.max(0, waits - (lab.sim.time - start.time));
  // Waiting makes sense once the button actions of the step are done.
  const waitReady =
    !!step &&
    satisfied(
      { ...step, do: step.do.filter((a) => !("wait" in a)) },
      entries,
      lab.sim,
      0,
    );
  const targets = useMemo(
    () =>
      done || !step
        ? []
        : step.do.flatMap((a) =>
            "tap" in a ? [a.tap] : "hold" in a ? [a.hold] : "toggle" in a ? [a.toggle] : "release" in a ? [a.release] : [],
          ),
    [done, step],
  );
  useEffect(() => onTargets(targets), [targets, onTargets]);
  const begin = (i: number) => {
    setIndex(i);
    setVerdict(undefined);
    setStart({ history: lab.history.length, time: lab.sim.time });
    lab.setPaused(false);
  };
  const restart = () => {
    lab.reset();
    setIndex(0);
    setVerdict(undefined);
    setStart({ history: 0, time: 0 });
    lab.setPaused(false);
  };
  const restore = () => {
    let s = initialState(circuit, true);
    for (const st of circuit.steps.slice(0, index))
      for (const a of st.do) s = apply(circuit, s, a);
    lab.load(s);
    setVerdict(undefined);
    setStart({ history: lab.history.length, time: s.time });
    lab.setPaused(false);
  };
  const show = async () => {
    setRunning(true);
    await lab.play(step.do);
    setRunning(false);
  };
  if (!step)
    return (
      <section className="cc-guide" aria-label="Prowadzenie">
        <h3>Prowadzenie ukończone</h3>
        <p>Przejdź jeszcze raz całość albo sprawdzaj własne kombinacje przycisków.</p>
        <button onClick={restart}>Zacznij od nowa</button>
      </section>
    );
  return (
    <section className="cc-guide" aria-label="Prowadzenie krok po kroku">
      <div className="cc-guide-head">
        <h3>
          Krok {index + 1} z {circuit.steps.length}
        </h3>
        <button className="cc-link" onClick={restart}>
          od początku
        </button>
      </div>
      <p className="cc-guide-text">{step.text}</p>
      {!done && (
        <div className="cc-guide-actions">
          {step.do.length > 0 && (
            <button disabled={running} onClick={show}>
              {running ? "Wykonuję…" : "Pokaż mi"}
            </button>
          )}
          {waitLeft > 0 && waitReady && (
            <button disabled={running} onClick={() => lab.advanceBy(waitLeft)}>
              ⏩ Przewiń {seconds(waitLeft)} s
            </button>
          )}
          <span>
            {step.do.some((a) => "wait" in a)
              ? "Czas płynie sam. Możesz go przewinąć do końca tego kroku."
              : "Kliknij przycisk na schemacie albo w panelu."}
          </span>
        </div>
      )}
      {done && (
        <div className={ok ? "cc-explain" : "cc-explain cc-warn"} role="status">
          {ok ? (
            <p>
              {step.explain}
              {timed && <small> Czas zatrzymano — „Dalej” go wznowi.</small>}
            </p>
          ) : (
            <p>
              Stan układu różni się od opisu tego kroku — po drodze naciśnięto
              coś innego.
            </p>
          )}
          {!ok && (
            <button onClick={restore}>Przywróć stan sprzed kroku</button>
          )}
          <button className="knowledge-primary" onClick={() => begin(index + 1)}>
            Dalej →
          </button>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------- lab

function Controls({ circuit, lab }: { circuit: ControlCircuit; lab: Lab }) {
  const buttons = circuit.devices.filter((d) => d.kind === "button");
  const sensors = circuit.devices.filter((d) => d.kind === "sensor");
  return (
    <div className="cc-controls" role="group" aria-label="Przyciski układu">
      {buttons.map((d) => {
        const down = lab.sim.pressed[d.id];
        const nc = compile(circuit).layout.elements.some(
          (e) => e.element.device === d.id && e.element.kind === "contact" && e.element.type === "nc",
        );
        return (
          <button
            key={d.id}
            className={`cc-pb ${nc ? "cc-pb-nc" : "cc-pb-no"}`}
            aria-pressed={down}
            onPointerDown={(e) => {
              if (d.latching) return;
              capture(e);
              lab.press(d.id);
            }}
            onPointerUp={() => !d.latching && lab.release(d.id)}
            onPointerCancel={() => !d.latching && lab.release(d.id)}
            onClick={() => d.latching && lab.press(d.id)}
            onKeyDown={(e) => {
              if (d.latching || (e.key !== " " && e.key !== "Enter")) return;
              e.preventDefault();
              if (!e.repeat) lab.press(d.id);
            }}
            onKeyUp={(e) => {
              if (d.latching || (e.key !== " " && e.key !== "Enter")) return;
              lab.release(d.id);
            }}
            onBlur={() => !d.latching && lab.release(d.id)}
          >
            <strong>{d.id}</strong>
            <span>
              {d.label ?? (nc ? "STOP" : "START")}
              {d.latching ? " · bistabilny" : ""}
            </span>
          </button>
        );
      })}
      {sensors.map((d) => (
        <button
          key={d.id}
          className="cc-pb cc-pb-sensor"
          aria-pressed={lab.sim.detected[d.id]}
          onClick={() => lab.detect(d.id, !lab.sim.detected[d.id])}
        >
          <strong>{d.id}</strong>
          <span>{lab.sim.detected[d.id] ? "obiekt wykryty" : "postaw obiekt"}</span>
        </button>
      ))}
    </div>
  );
}

function Status({ circuit, s }: { circuit: ControlCircuit; s: SimState }) {
  return (
    <ul className="cc-status" aria-label="Stan aparatów">
      {circuit.devices
        .filter((d) => d.kind !== "button")
        .map((d) => {
          const on = isOn(circuit, s, d.id);
          const t = s.timers[d.id];
          return (
            <li key={d.id} className={on ? "cc-st-on" : ""}>
              <span
                className="cc-dot"
                style={
                  d.kind === "lamp" && on
                    ? { background: lampFill[d.color ?? "yellow"] }
                    : undefined
                }
              />
              {d.id}
              {t?.running && <small> {seconds(t.elapsed)} s</small>}
            </li>
          );
        })}
    </ul>
  );
}

function DeviceInfo({ circuit, id }: { circuit: ControlCircuit; id: string }) {
  const { layout, devices } = compile(circuit);
  const d = devices.get(id)!;
  const kind: Record<Device["kind"], string> = {
    button: d.latching ? "łącznik bistabilny (z zatrzaskiem)" : "przycisk monostabilny",
    contactor: "stycznik / przekaźnik pomocniczy",
    "timer-on": `przekaźnik czasowy, opóźnione załączanie ${seconds(d.delayMs ?? 0)} s`,
    "timer-off": `przekaźnik czasowy, opóźnione wyłączanie ${seconds(d.delayMs ?? 0)} s`,
    lamp: "lampka sygnalizacyjna",
    buzzer: "sygnalizator dźwiękowy",
    sensor: "czujnik zbliżeniowy trójprzewodowy (PNP)",
  };
  const parts = layout.elements.filter((e) => e.element.device === id);
  return (
    <div className="cc-info" role="status">
      <strong>
        {d.id}
        {d.label ? ` · ${d.label}` : ""}
      </strong>{" "}
      — {kind[d.kind]}
      <ul>
        {parts.map((e) => {
          const el = e.element;
          return (
            <li key={e.id}>
              gałąź {e.lane + 1}:{" "}
              {el.kind === "contact"
                ? `styk ${el.type === "no" ? "zwierny NO" : "rozwierny NC"} ${el.terminals.join("–")}${el.role ? ` (${roleText[el.role]})` : ""}`
                : el.kind === "coil"
                  ? "cewka A1–A2"
                  : el.kind === "sensor-supply"
                    ? "zasilanie BN–BU"
                    : "X1–X2"}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Lab({ circuit, compact = false }: { circuit: ControlCircuit; compact?: boolean }) {
  const lab = useLab(circuit);
  const [selected, setSelected] = useState<string>();
  const [targets, setTargets] = useState<string[]>([]);
  const [potential, setPotential] = useState(false);
  const flow = useMemo(() => solveFlow(circuit, lab.shown), [circuit, lab.shown]);
  const { layout } = compile(circuit);
  const counting = Object.values(lab.sim.timers).some((t) => t.running);
  const timed = circuit.devices.some((d) => d.kind === "timer-on" || d.kind === "timer-off");
  const gestures = lab.log
    .map((g) =>
      g
        .map((ev) => describe(circuit, layout, ev))
        .filter((t): t is string => !!t),
    )
    .reverse();
  return (
    <section className={compact ? "cc-lab cc-compact" : "cc-lab"} aria-label="Symulacja układu">
      <div className="cc-toolbar">
        <label className="cc-switch">
          <input
            type="checkbox"
            checked={lab.sim.power}
            onChange={(e) => lab.power(e.target.checked)}
          />
          Zasilanie 24 V
        </label>
        <button onClick={lab.reset}>Reset</button>
        {timed && (
          <>
            <button
              onClick={() => lab.setPaused(!lab.paused)}
              aria-pressed={lab.paused}
              title="Zatrzymaj czas"
            >
              {lab.paused ? "▶ Wznów czas" : "⏸ Pauza"}
            </button>
            <button disabled={!counting} onClick={lab.skip} title="Przewiń do najbliższego przełączenia przekaźnika czasowego">
              ⏭ Następne zdarzenie
            </button>
            <label>
              Tempo{" "}
              <select
                value={lab.speed}
                onChange={(e) => lab.setSpeed(Number(e.target.value))}
              >
                <option value={0.5}>×0,5</option>
                <option value={1}>×1</option>
                <option value={2}>×2</option>
                <option value={4}>×4</option>
              </select>
            </label>
          </>
        )}
        <label className="cc-switch">
          <input
            type="checkbox"
            checked={lab.slow}
            onChange={(e) => lab.setSlow(e.target.checked)}
          />
          Zwolnione tempo zmian
        </label>
        <label className="cc-switch">
          <input
            type="checkbox"
            checked={potential}
            onChange={(e) => setPotential(e.target.checked)}
          />
          Pokaż +24 V bez prądu
        </label>
      </div>
      {lab.sim.unstable && (
        <p className="cc-warn" role="alert">
          Układ nie może się ustalić — styczniki przełączałyby się bez końca.
        </p>
      )}
      <div className="cc-stage">
        <div className="cc-drawing">
          <div className="cc-scroll" tabIndex={0} aria-label="Schemat — przewiń w poziomie">
            <Ladder
              circuit={circuit}
              s={lab.shown}
              flow={flow}
              selected={selected}
              targets={new Set(targets)}
              potential={potential}
              onSelect={(id, keep) =>
                setSelected((cur) => (keep || cur !== id ? id : undefined))
              }
              lab={lab}
            />
          </div>
          <p className="cc-legend">
            <span className="cc-leg-on" /> płynie prąd{" "}
            {potential && (
              <>
                <span className="cc-leg-live" /> +24 V bez prądu{" "}
              </>
            )}
            · ⇑ aparat zadziałał · kliknij aparat, aby podświetlić wszystkie
            jego styki
            {lab.playing && <strong> · zwolnione tempo…</strong>}
          </p>
          {selected && <DeviceInfo circuit={circuit} id={selected} />}
          {circuit.motor && <MotorPanel circuit={circuit} s={lab.shown} />}
        </div>
        <aside className="cc-panel">
          <h3>Sterowanie</h3>
          <Controls circuit={circuit} lab={lab} />
          <Status circuit={circuit} s={lab.shown} />
          {!compact && (
            <Guide circuit={circuit} lab={lab} onTargets={setTargets} />
          )}
          <section className="cc-log" aria-label="Co się stało">
            <h3>Co się stało</h3>
            {gestures.length ? (
              <div aria-live="polite">
                {gestures.map((lines, g) => (
                  <ol key={lab.log.length - g} className={g ? "cc-old" : ""}>
                    {lines.map((t, i) => (
                      <li key={i} className={i ? "" : "cc-cause"}>
                        {t}
                      </li>
                    ))}
                  </ol>
                ))}
              </div>
            ) : (
              <p>Naciśnij przycisk — tu pojawi się łańcuch przyczyn i skutków.</p>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}

// -------------------------------------------------------------------- pages

function MeasureTable({ circuit }: { circuit: ControlCircuit }) {
  const lanes = useMemo(() => measurementTable(circuit), [circuit]);
  const [hidden, setHidden] = useState(true);
  return (
    <details className="cc-measure">
      <summary>Tabela pomiarowa (ciągłość, zasilanie odłączone)</summary>
      <p>
        Przed podaniem napięcia sprawdź każdy odcinek omomierzem. Wartości
        dotyczą samego elementu; w gotowym układzie inne odbiorniki mogą
        utworzyć drogę równoległą.{" "}
        <button onClick={() => setHidden((h) => !h)}>
          {hidden ? "Pokaż oczekiwane wyniki" : "Ukryj wyniki (sprawdź się)"}
        </button>
      </p>
      <div className="knowledge-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tor prądowy</th>
              <th>Spoczynek</th>
              <th>Po zadziałaniu</th>
              <th>Wniosek</th>
            </tr>
          </thead>
          {lanes.map((l) => (
            <tbody key={l.lane}>
              <tr className="cc-measure-lane">
                <th colSpan={4}>Gałąź {l.lane}</th>
              </tr>
              {l.rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.path}</td>
                  <td>{hidden ? "?" : r.atRest}</td>
                  <td>{hidden ? (r.actuated ? "?" : "") : (r.actuated ?? "")}</td>
                  <td>{hidden ? "" : r.meaning}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </details>
  );
}

function ConceptLinks({ ids }: { ids: string[] }) {
  return (
    <div className="cc-chips">
      {ids.map((id) => {
        const t = theoryById(id);
        return t ? (
          <a key={id} href={href(id)}>
            {t.title}
          </a>
        ) : null;
      })}
    </div>
  );
}

function CircuitPage({ circuit }: { circuit: ControlCircuit }) {
  const i = controlCircuits.indexOf(circuit);
  const prev = controlCircuits[i - 1],
    next = controlCircuits[i + 1];
  return (
    <article className="cc-page">
      <a href={href()} className="cc-back">
        ← Układy sterowania
      </a>
      <span className="knowledge-eyebrow">
        {circuitName(circuit)}
        {circuit.bookPage ? ` · książka s. ${circuit.bookPage}` : " · opracowanie własne"}
      </span>
      <h1 tabIndex={-1}>{circuit.title}</h1>
      <p className="knowledge-lead">{circuit.summary}</p>
      <Lab key={circuit.id} circuit={circuit} />
      <div className="cc-text">
        <section>
          <h2>Jak to działa</h2>
          {circuit.principle.map((p, j) => (
            <p key={j}>{p}</p>
          ))}
        </section>
        <section>
          <h2>Jak czytać ten schemat</h2>
          <ul>
            {circuit.reading.map((p, j) => (
              <li key={j}>{p}</li>
            ))}
          </ul>
          <h3>Pojęcia</h3>
          <ConceptLinks ids={circuit.concepts} />
          {circuit.notes && (
            <>
              <h3>Uwagi do rysunku w książce</h3>
              <ul>
                {circuit.notes.map((n, j) => (
                  <li key={j}>{n}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
      <MeasureTable circuit={circuit} />
      <nav className="cc-pager" aria-label="Sąsiednie układy">
        {prev ? (
          <a href={href(prev.id)}>
            ← {circuitName(prev)}: {prev.title}
          </a>
        ) : (
          <span />
        )}
        {next && (
          <a href={href(next.id)}>
            {circuitName(next)}: {next.title} →
          </a>
        )}
      </nav>
    </article>
  );
}

function TheoryPage({ article }: { article: TheoryArticle }) {
  const i = theoryArticles.indexOf(article);
  const next = theoryArticles[i + 1];
  return (
    <article className="cc-page">
      <a href={href()} className="cc-back">
        ← Układy sterowania
      </a>
      <span className="knowledge-eyebrow">Teoria {i + 1} z {theoryArticles.length}</span>
      <h1 tabIndex={-1}>{article.title}</h1>
      <p className="knowledge-lead">{article.lead}</p>
      {article.sections.map((s) => {
        const demo = s.demo ? circuitById(s.demo) : undefined;
        return (
          <section key={s.title} className="cc-theory-section">
            <h2>{s.title}</h2>
            {s.paragraphs.map((p, j) => (
              <p key={j}>{p}</p>
            ))}
            {s.list && (
              <ul>
                {s.list.map((p, j) => (
                  <li key={j}>{p}</li>
                ))}
              </ul>
            )}
            {s.table && (
              <div className="knowledge-table-wrap">
                <table>
                  <thead>
                    <tr>
                      {s.table.head.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.table.rows.map((r, j) => (
                      <tr key={j}>
                        {r.map((c, k) => (k ? <td key={k}>{c}</td> : <th key={k} scope="row">{c}</th>))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {demo && (
              <div className="cc-demo">
                <p className="cc-demo-title">
                  Wypróbuj: <strong>{demo.title}</strong> ·{" "}
                  <a href={href(demo.id)}>pełna lekcja z prowadzeniem →</a>
                </p>
                <Lab circuit={demo} compact />
              </div>
            )}
          </section>
        );
      })}
      <section>
        <h2>Ćwicz dalej</h2>
        <div className="knowledge-cards">
          {article.practice.map((id) => {
            const c = circuitById(id)!;
            return (
              <a key={id} className="knowledge-card" href={href(id)}>
                <span className="knowledge-eyebrow">{circuitName(c)}</span>
                <h2>{c.title}</h2>
                <p>{c.summary}</p>
              </a>
            );
          })}
        </div>
      </section>
      {next && (
        <nav className="cc-pager" aria-label="Następny temat">
          <span />
          <a href={href(next.id)}>Następny temat: {next.title} →</a>
        </nav>
      )}
    </article>
  );
}

function Index() {
  return (
    <div className="cc-page">
      <span className="knowledge-eyebrow">Osobny temat · sterowanie stykowe 24 V DC</span>
      <h1 tabIndex={-1}>Układy sterowania stykowego</h1>
      <p className="knowledge-lead">
        Jak działają i jak czytać schematy z przyciskami, stycznikami i
        przekaźnikami czasowymi. Każdy układ jest działającą symulacją: naciskasz
        przyciski, a na schemacie widać, którędy płynie prąd i które styki się
        przełączają.
      </p>
      <aside className="cc-source">
        Układy 1–36 i przykłady z s. 39–40 pochodzą z książki dr. inż. Witolda
        Kriesera <cite>Stykowe elektryczne układy sterowania</cite> (wyd. II,
        Helion 2023). Rysunki narysowano od nowa z topologii połączeń, a opisy,
        teoria i scenariusze są opracowaniem tej aplikacji. Ten temat nie jest
        częścią zadań egzaminacyjnych ELE.02.
      </aside>
      <ol className="cc-path" aria-label="Kolejność nauki">
        <li>
          <a href={href("jak-czytac")}>
            <strong>Przeczytaj schemat</strong>
            <span>Szyny, gałęzie, stan spoczynku, numery zacisków</span>
          </a>
        </li>
        <li>
          <a href={href("samopodtrzymanie")}>
            <strong>Zrozum samopodtrzymanie</strong>
            <span>Pamięć stycznika, STOP, ochrona zanikowa</span>
          </a>
        </li>
        <li>
          <a href={href("uklad-1")}>
            <strong>Przejdź układy po kolei</strong>
            <span>Od START/STOP do sekwencji czasowych</span>
          </a>
        </li>
      </ol>
      <h2>Teoria</h2>
      <div className="knowledge-cards">
        {theoryArticles.map((t, i) => (
          <a key={t.id} className="knowledge-card" href={href(t.id)}>
            <span className="knowledge-eyebrow">Temat {i + 1}</span>
            <h2>{t.title}</h2>
            <p>{t.lead}</p>
          </a>
        ))}
      </div>
      {circuitGroups.map((g) => (
        <section key={g.id} aria-label={g.title}>
          <h2>{g.title}</h2>
          <p>{g.intro}</p>
          <div className="knowledge-cards">
            {controlCircuits
              .filter((c) => c.group === g.id)
              .map((c) => (
                <a key={c.id} className="knowledge-card cc-card" href={href(c.id)}>
                  <span className="knowledge-eyebrow">
                    {circuitName(c)}
                    {c.bookPage ? ` · s. ${c.bookPage}` : ""}
                  </span>
                  <h2>{c.title}</h2>
                  <p>{c.summary}</p>
                  <span className="cc-tags">
                    {c.concepts
                      .map((id) => theoryById(id)?.title)
                      .filter(Boolean)
                      .slice(0, 2)
                      .join(" · ")}
                  </span>
                </a>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function ControlCircuits({ slug }: { slug?: string }): ReactNode {
  if (!slug) return <Index />;
  const circuit = circuitById(slug);
  if (circuit) return <CircuitPage key={circuit.id} circuit={circuit} />;
  const article = theoryById(slug);
  if (article) return <TheoryPage key={article.id} article={article} />;
  return (
    <>
      <h1 tabIndex={-1}>Nie znaleziono układu</h1>
      <a href={href()}>Wróć do układów sterowania</a>
    </>
  );
}

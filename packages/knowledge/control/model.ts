// Contact control circuits (ladder diagrams, 24 V DC) used by the
// "Układy sterowania" topic. A circuit is one series–parallel expression
// between the +24 V and 0 V rails. The same expression drives the logic
// simulator, the drawing and the measurement table, so the three cannot
// disagree.

export type DeviceKind =
  | "button"
  | "contactor"
  | "timer-on"
  | "timer-off"
  | "lamp"
  | "buzzer"
  | "sensor";

export type LampColor = "yellow" | "red" | "green" | "blue" | "white";

export interface Device {
  id: string;
  kind: DeviceKind;
  /** Short function shown next to the symbol, e.g. "START". */
  label?: string;
  /** Buttons only: bistable (latching) instead of momentary. */
  latching?: boolean;
  /** Timers only. */
  delayMs?: number;
  /** Lamps only. */
  color?: LampColor;
}

export type ContactRole =
  | "podtrzymanie"
  | "blokada"
  | "warunek"
  | "sygnalizacja"
  | "start"
  | "stop"
  | "reset"
  | "czas";

export interface ContactElement {
  kind: "contact";
  device: string;
  type: "no" | "nc";
  terminals: [string, string];
  role?: ContactRole;
}
export interface LoadElement {
  kind: "coil" | "lamp" | "buzzer" | "sensor-supply";
  device: string;
  terminals: [string, string];
}
export type Element = ContactElement | LoadElement;
export interface Series {
  kind: "series";
  items: Net[];
}
export interface Parallel {
  kind: "parallel";
  items: Net[];
}
export type Net = Element | Series | Parallel;

export const ser = (...items: Net[]): Series => ({ kind: "series", items });
export const par = (...items: Net[]): Parallel => ({ kind: "parallel", items });
/** Normally open contact; terminals n and n+1 (13 → 13-14). */
export const no = (device: string, n: number, role?: ContactRole) =>
  ({
    kind: "contact",
    device,
    type: "no",
    terminals: [String(n), String(n + 1)],
    role,
  }) satisfies ContactElement;
/** Normally closed contact; terminals n and n+1 (21 → 21-22). */
export const nc = (device: string, n: number, role?: ContactRole) =>
  ({
    kind: "contact",
    device,
    type: "nc",
    terminals: [String(n), String(n + 1)],
    role,
  }) satisfies ContactElement;
export const coil = (device: string): LoadElement => ({
  kind: "coil",
  device,
  terminals: ["A1", "A2"],
});
export const lamp = (device: string): LoadElement => ({
  kind: "lamp",
  device,
  terminals: ["X1", "X2"],
});
export const buzzer = (device: string): LoadElement => ({
  kind: "buzzer",
  device,
  terminals: ["X1", "X2"],
});
export const sensorSupply = (device: string): LoadElement => ({
  kind: "sensor-supply",
  device,
  terminals: ["+", "−"],
});

export const isElement = (n: Net): n is Element =>
  n.kind !== "series" && n.kind !== "parallel";
export const isLoad = (n: Net): n is LoadElement =>
  isElement(n) && n.kind !== "contact";

/** Elements in drawing order (depth first, left to right). */
export function elementsOf(net: Net): Element[] {
  return isElement(net) ? [net] : net.items.flatMap(elementsOf);
}

export type Action =
  | { tap: string }
  | { hold: string }
  | { release: string }
  | { toggle: string }
  | { wait: number }
  | { power: boolean }
  | { detect: boolean; sensor: string };

export interface Step {
  /** Instruction for the learner. */
  text: string;
  do: Action[];
  /** What happened and why — shown after the step. */
  explain: string;
  /** Devices that must be active (coil/lamp energized, timer output switched)
   * and inactive after the step. Checked by a unit test. */
  on?: string[];
  off?: string[];
}

export type CircuitGroup =
  | "podstawy"
  | "proste"
  | "rozbudowane"
  | "czasowe"
  | "inne"
  | "walizka";

export interface ControlCircuit {
  id: string;
  /** Number in the book, when the circuit comes from it. */
  bookNumber?: number;
  /** Page in the book (Wydanie II, Helion 2023). */
  bookPage?: number;
  group: CircuitGroup;
  title: string;
  summary: string;
  devices: Device[];
  net: Net;
  /** Power circuit with a reversible three-phase motor (układy 30, 31). */
  motor?: { forward: string; reverse: string };
  /** Paragraphs explaining the principle in more detail than the book. */
  principle: string[];
  /** What to look at on the drawing. */
  reading: string[];
  /** Theory articles that explain the ideas used here. */
  concepts: string[];
  steps: Step[];
  /** Differences from the book's drawing worth knowing. */
  notes?: string[];
}

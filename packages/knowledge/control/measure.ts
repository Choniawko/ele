import { compile } from "./simulator";
import type { ControlCircuit } from "./model";

// Continuity table in the book's format (s. 44): for each current path the
// wire into every element and the element itself, with the reading expected
// with the supply disconnected — at rest and after actuation.

export interface MeasureRow {
  path: string;
  atRest: string;
  actuated?: string;
  meaning: string;
}
export interface MeasureLane {
  lane: number;
  rows: MeasureRow[];
}

export function measurementTable(circuit: ControlCircuit): MeasureLane[] {
  const { layout, group, devices } = compile(circuit);
  const plusGroup = group[layout.plus],
    minusGroup = group[layout.minus];
  const sorted = [...layout.elements].sort(
    (a, b) => a.lane - b.lane || a.yTop - b.yTop,
  );
  const terminal = (e: (typeof sorted)[number], end: 0 | 1) =>
    `${e.element.device}:${e.element.terminals[end]}`;
  // Name of the point an element terminal is wired to: a rail, or the
  // nearest terminal of another element on the same wire.
  const peer = (node: string, self: (typeof sorted)[number], end: 0 | 1) => {
    const g = group[node];
    if (g === plusGroup) return "+24 V";
    if (g === minusGroup) return "0 V";
    const others = sorted.filter((e) => e !== self);
    const above = others.find(
      (e) => group[e.b] === g && (end === 0 ? e.yBottom <= self.yTop : true),
    );
    const any = above ?? others.find((e) => group[e.a] === g || group[e.b] === g);
    if (!any) return undefined;
    return group[any.b] === g ? terminal(any, 1) : terminal(any, 0);
  };
  const lanes = new Map<number, MeasureRow[]>();
  for (const e of sorted) {
    const rows = lanes.get(e.lane + 1) ?? [];
    lanes.set(e.lane + 1, rows);
    const from = peer(e.a, e, 0);
    if (from)
      rows.push({
        path: `${from} ÷ ${terminal(e, 0)}`,
        atRest: "0 Ω",
        meaning: "przewód — ciągłość",
      });
    const el = e.element;
    const d = devices.get(el.device)!;
    const self = `${el.device}:${el.terminals[0]}/${el.terminals[1]}`;
    if (el.kind === "contact") {
      const what =
        d.kind === "button"
          ? "przycisk"
          : d.kind === "sensor"
            ? "wyjście czujnika"
            : d.kind === "contactor"
              ? "styk stycznika"
              : "styk czasowy";
      rows.push({
        path: self,
        atRest: el.type === "no" ? "∞" : "0 Ω",
        actuated: d.kind === "sensor" ? undefined : el.type === "no" ? "0 Ω" : "∞",
        meaning:
          d.kind === "sensor"
            ? "elektronika — sprawdzaj pod napięciem"
            : `${what} ${el.type === "no" ? "NO — w spoczynku przerwa" : "NC — w spoczynku ciągłość"}`,
      });
    } else
      rows.push({
        path: self,
        atRest:
          el.kind === "coil"
            ? d.kind === "contactor"
              ? "≈ 180 Ω"
              : "wartość liczbowa"
            : el.kind === "lamp"
              ? "wartość liczbowa"
              : "—",
        meaning:
          el.kind === "coil"
            ? d.kind === "contactor"
              ? "cewka 24 V DC (wartość przykładowa, sprawdź w katalogu)"
              : "zasilanie przekaźnika czasowego (elektronika)"
            : el.kind === "lamp"
              ? "lampka — wynik zależy od typu (LED)"
              : el.kind === "buzzer"
                ? "brzęczyk — sprawdzaj pod napięciem"
                : "zasilanie czujnika — nie mierz omomierzem",
      });
    if (group[e.b] === minusGroup)
      rows.push({
        path: `${terminal(e, 1)} ÷ 0 V`,
        atRest: "0 Ω",
        meaning: "przewód — ciągłość",
      });
  }
  return [...lanes].map(([lane, rows]) => ({ lane, rows }));
}

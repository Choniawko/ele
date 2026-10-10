import {
  elementsOf,
  isElement,
  isLoad,
  type ControlCircuit,
  type Element,
  type Net,
} from "./model";

// Ladder layout: every element sits in a vertical lane (current path) between
// the +24 V rail at the top and the 0 V rail at the bottom. Series items stack
// down a lane, parallel items sit in neighbouring lanes joined by horizontal
// bars. Loads are pushed to the bottom row, as on the book drawings.

export const LANE = 104;
export const ROW = 78;
export const X0 = 128;
export const TOP = 64;
const TERMINAL = 84;

export interface Point {
  x: number;
  y: number;
}
export interface Wire {
  id: string;
  a: string;
  b: string;
}
export interface Placed {
  id: string;
  element: Element;
  lane: number;
  x: number;
  yTop: number;
  yBottom: number;
  a: string;
  b: string;
}
export interface Layout {
  lanes: number;
  width: number;
  height: number;
  bottom: number;
  nodes: Record<string, Point>;
  wires: Wire[];
  elements: Placed[];
  plus: string;
  minus: string;
  /** Lane numbers (1-based) of NC and NO contacts of every switching device. */
  crossRef: Record<string, { nc: number[]; no: number[]; lane: number }>;
}

const width = (n: Net): number =>
  isElement(n)
    ? 1
    : n.kind === "series"
      ? Math.max(...n.items.map(width))
      : n.items.reduce((s, i) => s + width(i), 0);
const height = (n: Net): number =>
  isElement(n)
    ? 1
    : n.kind === "series"
      ? n.items.reduce((s, i) => s + height(i), 0)
      : Math.max(...n.items.map(height));
const hasLoad = (n: Net): boolean =>
  isElement(n) ? isLoad(n) : n.items.some(hasLoad);
const key = (x: number, y: number) => `${Math.round(x)},${Math.round(y)}`;
export const laneX = (lane: number) => X0 + lane * LANE;

export function layoutCircuit(circuit: Pick<ControlCircuit, "net">): Layout {
  const nodes: Record<string, Point> = {};
  const raw: [string, string][] = [];
  const placed: Placed[] = [];
  const order = new Map(elementsOf(circuit.net).map((e, i) => [e, i]));
  const node = (x: number, y: number) => {
    const k = key(x, y);
    nodes[k] ??= { x, y };
    return k;
  };
  const wire = (x1: number, y1: number, x2: number, y2: number) => {
    if (x1 !== x2 || y1 !== y2) raw.push([node(x1, y1), node(x2, y2)]);
  };
  const place = (net: Net, lane: number, y0: number, rows: number): void => {
    const x = laneX(lane);
    if (isElement(net)) {
      const atBottom = isLoad(net);
      const yTop = atBottom ? y0 + (rows - 1) * ROW : y0;
      if (atBottom) wire(x, y0, x, yTop);
      else wire(x, y0 + ROW, x, y0 + rows * ROW);
      placed.push({
        id: `e${order.get(net)}`,
        element: net,
        lane,
        x,
        yTop,
        yBottom: yTop + ROW,
        a: node(x, yTop),
        b: node(x, yTop + ROW),
      });
      return;
    }
    if (net.kind === "series") {
      const extra = rows - height(net);
      const last = net.items[net.items.length - 1];
      let y = y0;
      net.items.forEach((item, i) => {
        const h =
          height(item) + (i === net.items.length - 1 && hasLoad(last) ? extra : 0);
        place(item, lane, y, h);
        y += h * ROW;
      });
      if (!hasLoad(last)) wire(x, y, x, y0 + rows * ROW);
      return;
    }
    let l = lane;
    const xs: number[] = [];
    for (const item of net.items) {
      xs.push(laneX(l));
      place(item, l, y0, rows);
      l += width(item);
    }
    for (let i = 1; i < xs.length; i++) {
      wire(xs[i - 1], y0, xs[i], y0);
      wire(xs[i - 1], y0 + rows * ROW, xs[i], y0 + rows * ROW);
    }
  };
  const rows = height(circuit.net);
  const bottom = TOP + rows * ROW;
  place(circuit.net, 0, TOP, rows);
  wire(X0 - TERMINAL, TOP, X0, TOP);
  wire(X0 - TERMINAL, bottom, X0, bottom);
  // Split segments at every node lying on them, then remove duplicates, so
  // that overlapping bars become one chain of segments between real nodes.
  const points = Object.entries(nodes);
  const seen = new Set<string>();
  const wires: Wire[] = [];
  for (const [a, b] of raw) {
    const pa = nodes[a],
      pb = nodes[b];
    const on = points
      .filter(
        ([, p]) =>
          (pa.x === pb.x &&
            p.x === pa.x &&
            p.y > Math.min(pa.y, pb.y) &&
            p.y < Math.max(pa.y, pb.y)) ||
          (pa.y === pb.y &&
            p.y === pa.y &&
            p.x > Math.min(pa.x, pb.x) &&
            p.x < Math.max(pa.x, pb.x)),
      )
      .sort(
        ([, p], [, q]) =>
          Math.abs(p.x - pa.x) + Math.abs(p.y - pa.y) -
          (Math.abs(q.x - pa.x) + Math.abs(q.y - pa.y)),
      )
      .map(([k]) => k);
    const chain = [a, ...on, b];
    for (let i = 1; i < chain.length; i++) {
      const id = [chain[i - 1], chain[i]].sort().join("|");
      if (seen.has(id)) continue;
      // An element lead already joins these two points.
      if (placed.some((e) => [e.a, e.b].sort().join("|") === id)) continue;
      seen.add(id);
      wires.push({ id: `w${wires.length}`, a: chain[i - 1], b: chain[i] });
    }
  }
  const lanes = width(circuit.net);
  const crossRef: Layout["crossRef"] = {};
  for (const e of placed) {
    const el = e.element;
    if (el.kind === "coil") {
      crossRef[el.device] ??= { nc: [], no: [], lane: e.lane };
      crossRef[el.device].lane = e.lane;
    }
  }
  for (const e of placed) {
    const el = e.element;
    if (el.kind !== "contact" || !crossRef[el.device]) continue;
    crossRef[el.device][el.type].push(e.lane + 1);
  }
  for (const r of Object.values(crossRef)) {
    r.nc.sort((a, b) => a - b);
    r.no.sort((a, b) => a - b);
  }
  return {
    lanes,
    width: laneX(lanes - 1) + 96,
    height: bottom + 112,
    bottom,
    nodes,
    wires,
    elements: placed,
    plus: key(X0 - TERMINAL, TOP),
    minus: key(X0 - TERMINAL, bottom),
    crossRef,
  };
}

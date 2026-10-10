import { catalog } from "@catalog/index";
import type { ProjectDocument, TerminalRef } from "@model/index";
import { deviceByName, permanentNets } from "./diagram-model";
import { routedNet } from "./diagram-routing";
import type { DiagramScope } from "./types";

export interface DiagramSegment {
  a: { x: number; y: number };
  b: { x: number; y: number };
}
export interface DiagramLine {
  /** Net key from permanentNets(project). */
  k: string;
  path: string;
  segments: DiagramSegment[];
  junctions: { x: number; y: number }[];
  ports: { x: number; y: number; ref: TerminalRef }[];
}

// Absolute M/H/V/L subset produced below and by routedNet.
export function pathSegments(path: string): DiagramSegment[] {
  const tokens = path.match(/[MHVL]|-?\d+(?:\.\d+)?/g) ?? [];
  const segments: DiagramSegment[] = [];
  let x = 0,
    y = 0,
    command = "M";
  for (let i = 0; i < tokens.length;) {
    if (/[MHVL]/.test(tokens[i])) command = tokens[i++];
    const read = () => Number(tokens[i++]);
    const from = { x, y };
    if (command === "M") {
      x = read();
      y = read();
      command = "L";
      continue;
    }
    if (command === "H") x = read();
    else if (command === "V") y = read();
    else {
      x = read();
      y = read();
    }
    if (from.x !== x || from.y !== y) segments.push({ a: from, b: { x, y } });
  }
  return segments;
}

/** Drawing of a functional scope: one line per electrical net. */
export function functionalDiagramGeometry(
  p: ProjectDocument,
  scope: DiagramScope,
) {
  const net = permanentNets(p);
  const symbols = scope.symbols.map((s) => {
    const d = deviceByName(p, s.designation),
      c = catalog[d.productId].topology.connections.find(
        (c) => c.id === s.fragmentId,
      )!;
    return { ...s, d, c };
  });
  const ports = [
    ...scope.ports.map((pt) => ({
      x: pt.x,
      y: pt.y,
      ref: {
        deviceId: deviceByName(p, pt.designation).id,
        terminalId: pt.terminalId,
      },
    })),
    ...symbols.flatMap((s) => [
      {
        x: s.x + (s.reverse ? 120 : 0),
        y: s.y,
        ref: { deviceId: s.d.id, terminalId: s.c.from },
      },
      {
        x: s.x + (s.reverse ? 0 : 120),
        y: s.y,
        ref: { deviceId: s.d.id, terminalId: s.c.to },
      },
    ]),
  ];
  const groups = new Map<string, typeof ports>();
  for (const port of ports) {
    const k = net(port.ref);
    groups.set(k, [...(groups.get(k) ?? []), port]);
  }
  const lines: DiagramLine[] = [...groups.entries()].map(([k, pts]) => {
    const anchor = scope.netAnchors?.find(
      (a) =>
        net({
          deviceId: deviceByName(p, a.designation).id,
          terminalId: a.terminalId,
        }) === k,
    );
    const minX = Math.min(...pts.map((pt) => pt.x)),
      maxX = Math.max(...pts.map((pt) => pt.x)),
      minY = Math.min(...pts.map((pt) => pt.y)),
      maxY = Math.max(...pts.map((pt) => pt.y));
    const x =
      anchor?.point.x ??
      (pts.some((pt) => pt.x > scope.width - 180) ? maxX : minX);
    const path =
      minY === maxY
        ? `M${minX} ${minY}H${maxX}`
        : `M${x} ${minY}V${maxY} ${pts.map((pt) => `M${pt.x} ${pt.y}H${x}`).join(" ")}`;
    const routed = anchor?.trunk
      ? routedNet(pts, anchor.trunk)
      : {
          path,
          junctions:
            pts.length > 2 && minY !== maxY
              ? [...new Set(pts.map((pt) => pt.y))].map((y) => ({ x, y }))
              : [],
        };
    return { k, ...routed, segments: pathSegments(routed.path), ports: pts };
  });
  return { net, symbols, ports, lines };
}

const on = (pt: { x: number; y: number }, s: DiagramSegment, tolerance = 0.5) =>
  pt.x >= Math.min(s.a.x, s.b.x) - tolerance &&
  pt.x <= Math.max(s.a.x, s.b.x) + tolerance &&
  pt.y >= Math.min(s.a.y, s.b.y) - tolerance &&
  pt.y <= Math.max(s.a.y, s.b.y) + tolerance &&
  Math.abs(
    (s.b.x - s.a.x) * (pt.y - s.a.y) - (s.b.y - s.a.y) * (pt.x - s.a.x),
  ) <=
    tolerance * Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);

/**
 * Places where the drawing would show a connection the circuit does not have:
 * two different nets drawn on top of each other, a line touching the end of
 * another net, or a line running through a terminal (or symbol) of another net.
 */
export function diagramConflicts(p: ProjectDocument, scope: DiagramScope) {
  const { lines, symbols, net } = functionalDiagramGeometry(p, scope);
  const name = (k: string) => {
    const port = lines.find((l) => l.k === k)!.ports[0].ref;
    const d = p.circuit.devices.find((d) => d.id === port.deviceId)!;
    return `${d.designation}:${port.terminalId}`;
  };
  const conflicts = new Set<string>();
  for (const a of lines)
    for (const b of lines) {
      if (a.k === b.k) continue;
      for (const sa of a.segments)
        for (const sb of b.segments) {
          const horizontal = (s: DiagramSegment) => s.a.y === s.b.y,
            sameAxis =
              horizontal(sa) === horizontal(sb) &&
              (horizontal(sa) ? sa.a.y === sb.a.y : sa.a.x === sb.a.x);
          if (sameAxis) {
            const [a0, a1] = horizontal(sa)
                ? [sa.a.x, sa.b.x].sort((m, n) => m - n)
                : [sa.a.y, sa.b.y].sort((m, n) => m - n),
              [b0, b1] = horizontal(sb)
                ? [sb.a.x, sb.b.x].sort((m, n) => m - n)
                : [sb.a.y, sb.b.y].sort((m, n) => m - n);
            if (Math.min(a1, b1) - Math.max(a0, b0) >= 0)
              conflicts.add(`${name(a.k)} nakłada się na ${name(b.k)}`);
          }
          for (const end of [sb.a, sb.b])
            if (on(end, sa))
              conflicts.add(`${name(b.k)} dotyka linii ${name(a.k)}`);
        }
      for (const port of b.ports)
        if (a.segments.some((s) => on(port, s)))
          conflicts.add(`${name(a.k)} przechodzi przez zacisk ${name(b.k)}`);
    }
  // A line drawn straight through a symbol would short its two terminals.
  for (const s of symbols)
    for (const line of lines) {
      const from = net({ deviceId: s.d.id, terminalId: s.c.from }),
        to = net({ deviceId: s.d.id, terminalId: s.c.to });
      if (from === to) continue;
      const body = { a: { x: s.x + 20, y: s.y }, b: { x: s.x + 100, y: s.y } };
      if (
        line.segments.some(
          (seg) =>
            seg.a.y === seg.b.y &&
            seg.a.y === s.y &&
            Math.min(Math.max(seg.a.x, seg.b.x), body.b.x) -
              Math.max(Math.min(seg.a.x, seg.b.x), body.a.x) >
              0,
        )
      )
        conflicts.add(
          `${name(line.k)} przechodzi przez symbol ${s.designation}`,
        );
    }
  return [...conflicts];
}

import { catalog } from "@catalog/index";
import {
  terminalKey,
  type ProjectDocument,
  type TerminalRef,
} from "@model/index";
// Trace actual wire/bridge connectivity, never enclosure or trunk membership.
export function measurementWirePath(
  p: ProjectDocument,
  red?: TerminalRef,
  black?: TerminalRef,
): Set<string> {
  if (!red || !black) return new Set();
  const edges = new Map<string, { to: string; wire?: string }[]>();
  const add = (a: string, b: string, wire?: string) => {
    edges.set(a, [...(edges.get(a) ?? []), { to: b, wire }]);
    edges.set(b, [...(edges.get(b) ?? []), { to: a, wire }]);
  };
  // Trace physical wiring. Hidden faults must not reveal their location through highlighting.
  for (const w of p.circuit.conductors)
    add(terminalKey(w.from), terminalKey(w.to), w.id);
  for (const b of p.circuit.bridges)
    add(terminalKey(b.from), terminalKey(b.to));
  for (const d of p.circuit.devices)
    for (const c of catalog[d.productId].topology.connections)
      if (c.kind === "bridge") add(`${d.id}:${c.from}`, `${d.id}:${c.to}`);
  const start = terminalKey(red),
    end = terminalKey(black),
    queue = [start],
    visited = new Map<string, { from: string; wire?: string }>();
  visited.set(start, { from: start });
  for (let i = 0; i < queue.length && !visited.has(end); i++)
    for (const edge of edges.get(queue[i]) ?? [])
      if (!visited.has(edge.to)) {
        visited.set(edge.to, { from: queue[i], wire: edge.wire });
        queue.push(edge.to);
      }
  const result = new Set<string>();
  if (visited.has(end)) {
    for (let at = end; at !== start;) {
      const edge = visited.get(at)!;
      if (edge.wire) result.add(edge.wire);
      at = edge.from;
    }
  } else
    for (const w of p.circuit.conductors)
      if (
        [terminalKey(w.from), terminalKey(w.to)].some(
          (key) => key === start || key === end,
        )
      )
        result.add(w.id);
  return result;
}

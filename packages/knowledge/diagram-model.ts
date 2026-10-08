import { catalog } from "@catalog/index";
import {
  terminalKey,
  type ProjectDocument,
  type TerminalRef,
} from "@model/index";
export const deviceByName = (p: ProjectDocument, name: string) => {
  const d = p.circuit.devices.find((d) => d.designation === name);
  if (!d) throw Error(`Brak aparatu ${name}`);
  return d;
};
export function permanentNets(p: ProjectDocument) {
  const parent = new Map<string, string>();
  const root = (k: string): string => {
    const next = parent.get(k);
    if (!next) {
      parent.set(k, k);
      return k;
    }
    if (next === k) return k;
    const r = root(next);
    parent.set(k, r);
    return r;
  };
  const join = (a: TerminalRef, b: TerminalRef) =>
    parent.set(root(terminalKey(a)), root(terminalKey(b)));
  for (const w of [...p.circuit.conductors, ...p.circuit.bridges])
    join(w.from, w.to);
  for (const d of p.circuit.devices)
    for (const c of catalog[d.productId].topology.connections)
      if (
        c.kind === "bridge" &&
        !catalog[d.productId].behaviorId.startsWith("source-")
      )
        join(
          { deviceId: d.id, terminalId: c.from },
          { deviceId: d.id, terminalId: c.to },
        );
  return (ref: TerminalRef) => root(terminalKey(ref));
}

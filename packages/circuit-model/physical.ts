import type { Point, ProjectDocument } from "./index";

type SizeOf = (productId: string) => { width: number; height: number };
export const PHYSICAL_SCALE = 2.2;
export function enclosureFor(project: ProjectDocument, deviceId: string) {
  return project.physical.enclosures?.find((e) =>
    e.deviceIds.includes(deviceId),
  );
}
export function physicalTerminalAccessible(
  project: ProjectDocument,
  deviceId: string,
) {
  return !enclosureFor(project, deviceId)?.closed;
}
export function assertPhysicalLayout(project: ProjectDocument, sizeOf: SizeOf) {
  const devices = new Map(project.circuit.devices.map((d) => [d.id, d]));
  const wires = new Set(project.circuit.conductors.map((w) => w.id));
  const ids = new Set([
    ...devices.keys(),
    ...wires,
    ...project.circuit.bridges.map((b) => b.id),
    ...(project.physical.rails ?? []).map((r) => r.id),
  ]);
  const members = new Set<string>();
  for (const e of project.physical.enclosures ?? []) {
    if (ids.has(e.id)) throw new Error("Powtórzony identyfikator obudowy.");
    ids.add(e.id);
    if (ids.has(`handle:${e.id}`))
      throw new Error("Identyfikator aparatu koliduje z uchwytem obudowy.");
    ids.add(`handle:${e.id}`);
    if (ids.has(`cover:${e.id}`))
      throw new Error("Identyfikator aparatu koliduje z pokrywą obudowy.");
    ids.add(`cover:${e.id}`);
    if (
      e.window &&
      (e.kind !== "distribution" ||
        e.window.x + e.window.width > e.width ||
        e.window.y + e.window.height > e.height)
    )
      throw new Error(`${e.name}: okno musi mieścić się w rozdzielnicy.`);
    for (const id of e.deviceIds) {
      const d = devices.get(id);
      if (!d || members.has(id))
        throw new Error(
          `${e.name}: nieistniejący lub powtórzony element obudowy.`,
        );
      members.add(id);
      const at = project.physical.devices[id],
        size = sizeOf(d.productId);
      if (
        at.x < e.position.x ||
        at.y < e.position.y ||
        at.x + size.width * PHYSICAL_SCALE > e.position.x + e.width ||
        at.y + size.height * PHYSICAL_SCALE > e.position.y + e.height
      )
        throw new Error(
          `${d.designation}: aparat nie mieści się w obudowie ${e.name}. Wyjmij go przed przeniesieniem poza obudowę.`,
        );
    }
  }
  for (const t of project.physical.trunking ?? []) {
    if (ids.has(t.id)) throw new Error("Powtórzony identyfikator korytka.");
    ids.add(t.id);
    if (
      new Set(t.conductorIds).size !== t.conductorIds.length ||
      t.conductorIds.some((id) => !wires.has(id))
    )
      throw new Error(`${t.name}: nieistniejąca lub powtórzona żyła.`);
    t.points.slice(1).forEach((p, i) => {
      const a = t.points[i];
      if ((a.x !== p.x && a.y !== p.y) || (a.x === p.x && a.y === p.y))
        throw new Error(
          `${t.name}: segmenty korytka muszą być poziome lub pionowe i mieć długość.`,
        );
    });
  }
}
export function translateEnclosure(
  project: ProjectDocument,
  id: string,
  position: Point,
) {
  const e = project.physical.enclosures?.find((e) => e.id === id);
  if (!e) throw new Error("Obudowa już nie istnieje.");
  const dx = position.x - e.position.x,
    dy = position.y - e.position.y;
  const translate = (p: Point) => ({ x: p.x + dx, y: p.y + dy });
  for (const id of e.deviceIds)
    project.physical.devices[id] = translate(project.physical.devices[id]);
  // Only wholly internal routes and rails travel with the enclosure. Wall trunking stays fixed.
  for (const w of project.circuit.conductors)
    if (
      e.deviceIds.includes(w.from.deviceId) &&
      e.deviceIds.includes(w.to.deviceId) &&
      project.physical.routes[w.id]
    )
      project.physical.routes[w.id] =
        project.physical.routes[w.id].map(translate);
  for (const r of project.physical.rails ?? [])
    if (
      r.x >= e.position.x &&
      r.x + r.width <= e.position.x + e.width &&
      r.y >= e.position.y &&
      r.y <= e.position.y + e.height
    ) {
      r.x += dx;
      r.y += dy;
    }
  e.position = position;
}

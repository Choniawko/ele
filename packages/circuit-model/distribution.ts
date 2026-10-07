import {
  clone,
  projectLimits,
  type PhysicalEnclosure,
  type Point,
  type ProjectDocument,
  type DistributionPlacement,
} from "./index";

// Deliberately didactic geometry; no manufacturer SKU or compliance claim.
export const distributionProfile = {
  id: "edu-modular-v1",
  revision: "1",
  moduleMm: 18,
  scale: 2.2,
  margin: 40,
  rowSpacing: 250,
  terminalSpacing: 90,
  terminalRows: 2,
} as const;
export const distributionLimits = {
  rows: projectLimits.distributionRows,
  modules: projectLimits.distributionModules,
};
export type MountingInfo = {
  width: number;
  height: number;
  zone?: "modules" | "terminals";
};
export type MountingResolver = (productId: string) => MountingInfo;
export function distributionGeometry(rows: number, modules: number) {
  const p = distributionProfile;
  return {
    width: 2 * p.margin + modules * p.moduleMm * p.scale,
    height:
      2 * p.margin + rows * p.rowSpacing + p.terminalRows * p.terminalSpacing,
  };
}
export function occupiedModules(info: MountingInfo) {
  return Math.ceil(info.width / distributionProfile.moduleMm - 1e-9);
}
export function placementPoint(
  e: PhysicalEnclosure,
  at: DistributionPlacement,
): Point {
  const p = distributionProfile,
    config = e.distribution!;
  return {
    x: e.position.x + p.margin + at.slot * p.moduleMm * p.scale,
    y:
      e.position.y +
      p.margin +
      (at.zone === "modules"
        ? at.row * p.rowSpacing
        : config.rows * p.rowSpacing + at.row * p.terminalSpacing),
  };
}
export function distributionRails(e: PhysicalEnclosure) {
  if (!e.distribution) return [];
  return Array.from({ length: e.distribution.rows }, (_, row) => ({
    id: `din:${e.id}:${row}`,
    x: e.position.x + distributionProfile.margin,
    y: placementPoint(e, { zone: "modules", row, slot: 0 }).y + 65,
    width:
      e.distribution!.modulesPerRow *
      distributionProfile.moduleMm *
      distributionProfile.scale,
  }));
}
export function enclosureWindows(e: PhysicalEnclosure) {
  if (!e.distribution) return e.window ? [e.window] : [];
  return Array.from({ length: e.distribution.rows }, (_, row) => ({
    x: distributionProfile.margin,
    y: distributionProfile.margin + row * distributionProfile.rowSpacing + 45,
    width:
      e.distribution!.modulesPerRow *
      distributionProfile.moduleMm *
      distributionProfile.scale,
    height: 110,
  }));
}
export function rowOccupancy(
  project: ProjectDocument,
  e: PhysicalEnclosure,
  zone: DistributionPlacement["zone"],
  row: number,
  resolve: MountingResolver,
) {
  const occupied = new Set<number>();
  for (const [id, at] of Object.entries(e.distribution?.placements ?? {})) {
    if (at.zone !== zone || at.row !== row) continue;
    const d = project.circuit.devices.find((d) => d.id === id);
    if (!d) throw new Error("Nieistniejący aparat w rozdzielnicy.");
    for (
      let i = at.slot;
      i < at.slot + occupiedModules(resolve(d.productId));
      i++
    )
      occupied.add(i);
  }
  return occupied;
}
export function assertMountAccess(project: ProjectDocument, ids: string[]) {
  for (const id of ids) {
    const e = project.physical.enclosures?.find((e) =>
      e.deviceIds.includes(id),
    );
    if (e?.distribution && e.closed)
      throw new Error(`${e.name}: zdejmij maskownicę przed zmianą montażu.`);
  }
}
export function overlapsDistribution(
  project: ProjectDocument,
  info: MountingInfo,
  point: Point,
) {
  return (
    project.physical.enclosures?.some(
      (e) =>
        e.distribution &&
        point.x < e.position.x + e.width &&
        point.x + info.width * distributionProfile.scale > e.position.x &&
        point.y < e.position.y + e.height &&
        point.y + info.height * distributionProfile.scale > e.position.y,
    ) ?? false
  );
}
export function detachFromEnclosures(project: ProjectDocument, id: string) {
  for (const e of project.physical.enclosures ?? []) {
    e.deviceIds = e.deviceIds.filter((member) => member !== id);
    if (e.distribution) delete e.distribution.placements[id];
  }
}
export function mountInDistribution(
  project: ProjectDocument,
  enclosureId: string,
  deviceId: string,
  zone: DistributionPlacement["zone"],
  row: number,
  resolve: MountingResolver,
  slot?: number,
) {
  const e = project.physical.enclosures?.find((e) => e.id === enclosureId),
    d = project.circuit.devices.find((d) => d.id === deviceId);
  if (!e?.distribution || !d)
    throw new Error("Wybierz aparat i rozdzielnicę modułową.");
  if (e.closed)
    throw new Error(`${e.name}: zdejmij maskownicę przed montażem.`);
  const info = resolve(d.productId),
    width = occupiedModules(info);
  if (info.zone !== zone)
    throw new Error(
      `${d.designation}: profil montażu nie pasuje do tej strefy. Wybierz strefę przyłączeń lub pozostaw aparat na tablicy.`,
    );
  const rows =
    zone === "modules" ? e.distribution.rows : distributionProfile.terminalRows;
  if (!Number.isInteger(row) || row < 0 || row >= rows)
    throw new Error("Wybierz istniejący rząd.");
  assertMountAccess(project, [deviceId]);
  detachFromEnclosures(project, deviceId);
  const used = rowOccupancy(project, e, zone, row, resolve);
  const free = (start: number) =>
    Number.isInteger(start) &&
    start >= 0 &&
    start + width <= e.distribution!.modulesPerRow &&
    Array.from({ length: width }, (_, i) => start + i).every(
      (i) => !used.has(i),
    );
  const start =
    slot ??
    Array.from({ length: e.distribution.modulesPerRow }, (_, i) => i).find(
      free,
    );
  if (start === undefined || !free(start))
    throw new Error(
      `${e.name}, rząd ${row + 1}: brak ${width} kolejnych wolnych pól. Wybierz inne pole lub rząd, powiększ rozdzielnicę albo zamontuj aparat poza nią.`,
    );
  const at: DistributionPlacement = { zone, row, slot: start };
  e.distribution.placements[deviceId] = at;
  e.deviceIds.push(deviceId);
  project.physical.devices[deviceId] = placementPoint(e, at);
}
export function resizeDistribution(
  project: ProjectDocument,
  id: string,
  rows: number,
  modulesPerRow: number,
  reserve: number,
  name: string,
) {
  const e = project.physical.enclosures?.find((e) => e.id === id);
  if (!e?.distribution) throw new Error("Wybierz rozdzielnicę modułową.");
  if (
    name.length < projectLimits.designation.minLength ||
    name.length > projectLimits.designation.maxLength
  )
    throw new Error(
      `Nazwa rozdzielnicy musi mieć od ${projectLimits.designation.minLength} do ${projectLimits.designation.maxLength} znaków.`,
    );
  e.name = name;
  Object.assign(e.distribution, { rows, modulesPerRow, reserve });
  Object.assign(e, distributionGeometry(rows, modulesPerRow));
  for (const [deviceId, at] of Object.entries(e.distribution.placements))
    project.physical.devices[deviceId] = placementPoint(e, at);
}
export function previewDistribution(
  project: ProjectDocument,
  id: string,
  rows: number,
  modules: number,
  reserve: number,
  name: string,
) {
  const draft = clone(project);
  resizeDistribution(draft, id, rows, modules, reserve, name);
  return draft;
}
export function assertDistribution(
  project: ProjectDocument,
  e: PhysicalEnclosure,
  resolve: MountingResolver,
) {
  const config = e.distribution;
  if (!config) return;
  const geometry = distributionGeometry(config.rows, config.modulesPerRow);
  if (
    e.kind !== "distribution" ||
    e.window ||
    Math.abs(e.width - geometry.width) > 1e-6 ||
    Math.abs(e.height - geometry.height) > 1e-6
  )
    throw new Error(
      `${e.name}: geometria jest niezgodna z profilem rozdzielnicy.`,
    );
  if (config.reserve > config.rows * config.modulesPerRow)
    throw new Error("Rezerwa nie może przekroczyć pojemności rozdzielnicy.");
  if (
    Object.keys(config.placements).length !== e.deviceIds.length ||
    e.deviceIds.some((id) => !config.placements[id])
  )
    throw new Error(`${e.name}: niekompletne przypisania montażowe.`);
  for (const other of project.physical.enclosures ?? []) {
    if (
      other.id !== e.id &&
      e.position.x < other.position.x + other.width &&
      e.position.x + e.width > other.position.x &&
      e.position.y < other.position.y + other.height &&
      e.position.y + e.height > other.position.y
    )
      throw new Error(
        `${e.name}: obudowa nakłada się na ${other.name}. Przesuń skrzynkę lub wybierz inne położenie.`,
      );
  }
  for (const d of project.circuit.devices) {
    if (e.deviceIds.includes(d.id)) continue;
    const at = project.physical.devices[d.id],
      info = resolve(d.productId);
    if (
      at &&
      at.x < e.position.x + e.width &&
      at.x + info.width * distributionProfile.scale > e.position.x &&
      at.y < e.position.y + e.height &&
      at.y + info.height * distributionProfile.scale > e.position.y
    )
      throw new Error(
        `${d.designation}: korpus nakłada się na ${e.name}. Zamontuj go w obudowie albo przesuń poza nią.`,
      );
  }
  const used = new Set<string>();
  for (const [id, at] of Object.entries(config.placements)) {
    const d = project.circuit.devices.find((d) => d.id === id);
    if (!d || !e.deviceIds.includes(id))
      throw new Error("Nieistniejący aparat w rozdzielnicy.");
    const info = resolve(d.productId),
      width = occupiedModules(info),
      point = placementPoint(e, at),
      actual = project.physical.devices[id];
    if (info.zone !== at.zone)
      throw new Error(`${d.designation}: niezgodny profil montażu.`);
    if (
      at.row >=
        (at.zone === "modules"
          ? config.rows
          : distributionProfile.terminalRows) ||
      at.slot + width > config.modulesPerRow
    )
      throw new Error(
        `${d.designation}: aparat nie mieści się w wybranej konfiguracji. Przenieś go przed zmniejszeniem rozdzielnicy.`,
      );
    if (
      !actual ||
      Math.abs(actual.x - point.x) > 1e-6 ||
      Math.abs(actual.y - point.y) > 1e-6
    )
      throw new Error(
        `${d.designation}: pozycja jest niezgodna z polem montażowym.`,
      );
    if (
      info.height * distributionProfile.scale >
      (at.zone === "modules"
        ? distributionProfile.rowSpacing
        : distributionProfile.terminalSpacing)
    )
      throw new Error("Korpus nie mieści się między rzędami.");
    for (let slot = at.slot; slot < at.slot + width; slot++) {
      const key = `${at.zone}:${at.row}:${slot}`;
      if (used.has(key))
        throw new Error(
          `${e.name}: pola montażowe są zajęte przez więcej niż jeden aparat.`,
        );
      used.add(key);
    }
  }
}

export function distributionAtPoint(project: ProjectDocument, point: Point) {
  const e = project.physical.enclosures?.find(
    (e) =>
      e.distribution &&
      point.x >= e.position.x &&
      point.x <= e.position.x + e.width &&
      point.y >= e.position.y &&
      point.y <= e.position.y + e.height,
  );
  if (!e?.distribution) return null;
  const y = point.y - e.position.y - distributionProfile.margin;
  const zone =
    y >= e.distribution.rows * distributionProfile.rowSpacing
      ? "terminals"
      : "modules";
  const row = Math.round(
    (zone === "modules"
      ? y
      : y - e.distribution.rows * distributionProfile.rowSpacing) /
      (zone === "modules"
        ? distributionProfile.rowSpacing
        : distributionProfile.terminalSpacing),
  );
  const slot = Math.round(
    (point.x - e.position.x - distributionProfile.margin) /
      (distributionProfile.moduleMm * distributionProfile.scale),
  );
  return { enclosure: e, zone, row, slot } as const;
}

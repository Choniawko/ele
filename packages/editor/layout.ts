import { distributionRails, overlapsDistribution } from "@model/distribution";
import { catalog } from "@catalog/index";
import {
  projectLimits,
  type MountingRail,
  type Point,
  type ProjectDocument,
} from "@model/index";

export const RAIL_OFFSET = 65;
export const RAIL_SPACING = 295;
const SCALE = 2.2;
const sizeFor = (productId: string) => catalog[productId].dimensions.value!;

// Old documents have implicit rows. Keep their mounting positions on import.
export function mountingRails(project: ProjectDocument): MountingRail[] {
  return [
    ...globalMountingRails(project),
    ...(project.physical.enclosures?.flatMap(distributionRails) ?? []),
  ];
}
export function globalMountingRails(project: ProjectDocument): MountingRail[] {
  if (project.physical.rails) return project.physical.rails;
  const bottom = Math.max(
    385,
    ...project.circuit.devices
      .filter((d) => catalog[d.productId].mounting === "DIN")
      .map((d) => project.physical.devices[d.id]?.y ?? 90),
  );
  return Array.from(
    {
      length: Math.min(
        projectLimits.rails,
        Math.max(2, Math.round((bottom - 90) / RAIL_SPACING) + 1),
      ),
    },
    (_, i) => ({
      id: `rail-${i + 1}`,
      x: 60,
      y: 155 + i * RAIL_SPACING,
      width: 970,
    }),
  );
}

export function nearestRail(
  project: ProjectDocument,
  point: Point,
): MountingRail {
  return globalMountingRails(project).reduce((best, rail) =>
    Math.abs(rail.y - RAIL_OFFSET - point.y) <
    Math.abs(best.y - RAIL_OFFSET - point.y)
      ? rail
      : best,
  );
}

export function snapMounting(
  project: ProjectDocument,
  productId: string,
  point: Point,
): Point {
  const product = catalog[productId];
  const next = {
    x: Math.max(40, Math.round(point.x / 10) * 10),
    y: Math.max(60, Math.round(point.y / 10) * 10),
  };
  if (product.mounting === "DIN") {
    const rail = nearestRail(project, next);
    next.y = rail.y - RAIL_OFFSET;
    next.x = Math.max(
      rail.x,
      Math.min(
        next.x,
        rail.x + rail.width - product.dimensions.value!.width * SCALE,
      ),
    );
  }
  return next;
}

export function mountingCollision(
  project: ProjectDocument,
  productId: string,
  point: Point,
  ignored: string[] = [],
): boolean {
  const size = catalog[productId].dimensions.value!;
  return project.circuit.devices.some((other) => {
    if (ignored.includes(other.id)) return false;
    const at = project.physical.devices[other.id],
      dim = catalog[other.productId].dimensions.value!;
    return (
      at &&
      point.x < at.x + dim.width * SCALE + 8 &&
      point.x + size.width * SCALE + 8 > at.x &&
      point.y < at.y + dim.height * SCALE &&
      point.y + size.height * SCALE > at.y
    );
  });
}

export function freeMountingPosition(
  project: ProjectDocument,
  productId: string,
  point: Point,
  ignored: string[] = [],
): Point | null {
  const start = snapMounting(project, productId, point),
    product = catalog[productId];
  const rail = nearestRail(project, start),
    width = product.dimensions.value!.width * SCALE;
  for (
    let distance = 0;
    distance <= (product.mounting === "DIN" ? rail.width : 1600);
    distance += 10
  ) {
    for (const sign of distance === 0 ? [1] : [1, -1]) {
      const next = { ...start, x: start.x + distance * sign };
      if (
        product.mounting === "DIN" &&
        (next.x < rail.x || next.x + width > rail.x + rail.width)
      )
        continue;
      if (
        next.x < 40 ||
        overlapsDistribution(project, sizeFor(productId), next) ||
        mountingCollision(project, productId, next, ignored)
      )
        continue;
      return next;
    }
  }
  return null;
}

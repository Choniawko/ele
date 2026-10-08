import type { Point } from "@model/index";
// A drawing route for one already-resolved net. It never creates electrical
// connections: members are obtained exclusively from permanentNets(project).
export function routedNet(points: Point[], trunk: Point[]) {
  const attachments = points.map((p) => {
    const candidates = trunk.slice(1).map((b, i) => {
      const a = trunk[i];
      return a.x === b.x
        ? {
            x: a.x,
            y: Math.max(Math.min(a.y, b.y), Math.min(Math.max(a.y, b.y), p.y)),
          }
        : {
            y: a.y,
            x: Math.max(Math.min(a.x, b.x), Math.min(Math.max(a.x, b.x), p.x)),
          };
    });
    return candidates.sort(
      (a, b) =>
        Math.abs(a.x - p.x) +
        Math.abs(a.y - p.y) -
        Math.abs(b.x - p.x) -
        Math.abs(b.y - p.y),
    )[0];
  });
  const path = `M${trunk.map((p) => `${p.x} ${p.y}`).join("L")} ${points.map((p, i) => `M${p.x} ${p.y}H${attachments[i].x}V${attachments[i].y}`).join(" ")}`;
  const junctions = attachments
    .filter(
      (a) =>
        !trunk.some(
          (p, i) =>
            (i === 0 || i === trunk.length - 1) && a.x === p.x && a.y === p.y,
        ),
    )
    .filter(
      (a, i, all) => all.findIndex((b) => b.x === a.x && b.y === a.y) === i,
    );
  return { path, junctions };
}

import { g, routers, type dia } from "@joint/core";
import { catalog } from "@catalog/index";
import type { Conductor, DeviceInstance, TerminalRef } from "@model/index";

type Side = "top" | "bottom";
const CLEARANCE = 14;
const BUCKET_SIZE = 128;
type Obstacle = { id: dia.Cell.ID; box: g.Rect };

function terminalSide(
  ref: TerminalRef,
  devices: Map<string, DeviceInstance>,
): Side {
  const product = catalog[devices.get(ref.deviceId)!.productId],
    terminal = product.topology.terminals.find((t) => t.id === ref.terminalId)!;
  return terminal.y > product.dimensions.value!.height / 2 ? "bottom" : "top";
}

function exit(anchor: g.Point, box: g.Rect, side: Side, gap: number): g.Point {
  return new g.Point(
    anchor.x,
    side === "bottom" ? box.y + box.height + gap : box.y - gap,
  );
}

function simplify(points: g.Point[]): g.Point[] {
  const result: g.Point[] = [];
  for (const point of points) {
    const last = result.at(-1);
    if (last && last.distance(point) < 0.15) continue;
    while (result.length > 1) {
      const a = result.at(-2)!,
        b = result.at(-1)!;
      const ab = { x: b.x - a.x, y: b.y - a.y },
        bc = { x: point.x - b.x, y: point.y - b.y };
      if (
        Math.abs(ab.x * bc.y - ab.y * bc.x) > 0.1 ||
        ab.x * bc.x + ab.y * bc.y < 0
      )
        break;
      result.pop();
    }
    result.push(point);
  }
  return result;
}

// Use live element bounds, including during a drag. A narrow corridor lets each
// wire leave its own terminal; every other part of the case remains an obstacle.
function obstacleTest(
  view: dia.LinkView,
  sourceSide: Side,
  targetSide: Side,
  obstacles: Obstacle[],
) {
  const ends = [
    { id: view.model.source().id, anchor: view.sourceAnchor, side: sourceSide },
    { id: view.model.target().id, anchor: view.targetAnchor, side: targetSide },
  ];
  const buckets = new Map<string, Obstacle[]>();
  for (const item of obstacles) {
    const { box } = item;
    for (
      let x = Math.floor(box.x / BUCKET_SIZE);
      x <= Math.floor((box.x + box.width) / BUCKET_SIZE);
      x++
    )
      for (
        let y = Math.floor(box.y / BUCKET_SIZE);
        y <= Math.floor((box.y + box.height) / BUCKET_SIZE);
        y++
      ) {
        const key = `${x}:${y}`,
          list = buckets.get(key) ?? [];
        list.push(item);
        buckets.set(key, list);
      }
  }
  return (point: dia.Point) => {
    const list =
      buckets.get(
        `${Math.floor(point.x / BUCKET_SIZE)}:${Math.floor(point.y / BUCKET_SIZE)}`,
      ) ?? [];
    return list.some(({ id, box }) => {
      if (
        point.x <= box.x + 0.1 ||
        point.x >= box.x + box.width - 0.1 ||
        point.y <= box.y + 0.1 ||
        point.y >= box.y + box.height - 0.1
      )
        return false;
      return !ends.some(
        (end) =>
          end.id === id &&
          Math.abs(point.x - end.anchor.x) < 1 &&
          (end.side === "bottom"
            ? point.y >= end.anchor.y - 0.1
            : point.y <= end.anchor.y + 0.1),
      );
    });
  };
}

// Most board connections need only one gutter. Try short orthogonal paths
// first; reserve grid search for routes that need several obstacle detours.
function gutterRoute(
  source: g.Point,
  target: g.Point,
  obstacles: Obstacle[],
  sourceSide: Side,
  targetSide: Side,
  offset: number,
): g.Point[] | null {
  const xs = new Set([source.x, target.x, (source.x + target.x) / 2]),
    ys = new Set([source.y, target.y, (source.y + target.y) / 2]);
  for (const { box } of obstacles) {
    xs.add(box.x - offset);
    xs.add(box.x + box.width + offset);
    ys.add(box.y - offset);
    ys.add(box.y + box.height + offset);
  }
  const candidates = [
    [source, new g.Point(source.x, target.y), target],
    [source, new g.Point(target.x, source.y), target],
    ...Array.from(xs, (x) => [
      source,
      new g.Point(x, source.y),
      new g.Point(x, target.y),
      target,
    ]),
    ...Array.from(ys, (y) => [
      source,
      new g.Point(source.x, y),
      new g.Point(target.x, y),
      target,
    ]),
  ]
    .map((points) => {
      const path = simplify(points),
        length = path.reduce(
          (total, p, i) => total + (i ? path[i - 1].distance(p) : 0),
          0,
        );
      return { path, cost: length + path.length * 12 };
    })
    .sort((a, b) => a.cost - b.cost);
  for (const { path } of candidates) {
    if (path.length < 2) return path;
    const firstDy = path[1].y - path[0].y,
      lastDy = path.at(-1)!.y - path.at(-2)!.y;
    if (
      (sourceSide === "bottom" ? firstDy < -0.1 : firstDy > 0.1) ||
      (targetSide === "bottom" ? lastDy > 0.1 : lastDy < -0.1)
    )
      continue;
    const blocked = path.some((b, i) => {
      if (!i) return false;
      const a = path[i - 1];
      return obstacles.some(({ box }) => {
        const left = box.x + 0.1,
          right = box.x + box.width - 0.1,
          top = box.y + 0.1,
          bottom = box.y + box.height - 0.1;
        return Math.abs(a.x - b.x) < 0.1
          ? a.x > left &&
              a.x < right &&
              Math.max(a.y, b.y) > top &&
              Math.min(a.y, b.y) < bottom
          : a.y > top &&
              a.y < bottom &&
              Math.max(a.x, b.x) > left &&
              Math.min(a.x, b.x) < right;
      });
    });
    if (!blocked) return path;
  }
  return null;
}

export function physicalWireRouters(
  devices: DeviceInstance[],
  wires: Conductor[],
): Map<string, routers.Router> {
  const deviceMap = new Map(devices.map((d) => [d.id, d]));
  type End = {
    wire: Conductor;
    end: "from" | "to";
    side: Side;
    x: number;
    key: string;
  };
  const groups = new Map<string, End[]>(),
    endpoints = new Map<string, { side: Side; gap: number }>();
  for (const wire of wires) {
    for (const end of ["from", "to"] as const) {
      const ref = wire[end],
        side = terminalSide(ref, deviceMap),
        product = catalog[deviceMap.get(ref.deviceId)!.productId],
        terminal = product.topology.terminals.find(
          (t) => t.id === ref.terminalId,
        )!,
        key = `${ref.deviceId}|${side}`,
        list = groups.get(key) ?? [];
      list.push({ wire, end, side, x: terminal.x, key: `${wire.id}|${end}` });
      groups.set(key, list);
    }
  }
  for (const group of groups.values()) {
    // Reserve separate exits along each edge, including wires to different
    // devices. The physical order of terminals determines the lane order.
    group.sort((a, b) => a.x - b.x || a.key.localeCompare(b.key));
    group.forEach((end, lane) =>
      endpoints.set(end.key, {
        side: end.side,
        gap: CLEARANCE + 6 + Math.min(lane, 5) * 8,
      }),
    );
  }
  const result = new Map<string, routers.Router>();
  for (const wire of wires) {
    const sourceEnd = endpoints.get(`${wire.id}|from`)!,
      targetEnd = endpoints.get(`${wire.id}|to`)!,
      sourceSide = sourceEnd.side,
      targetSide = targetEnd.side;
    let cached: { key: string; points: g.Point[] } | undefined;
    result.set(wire.id, (vertices, _args, view) => {
      if (!view) return vertices;
      const source = view.model.getSourceElement(),
        target = view.model.getTargetElement();
      if (!source || !target) return vertices;
      const sourceExit = exit(
          view.sourceAnchor,
          source.getBBox(),
          sourceSide,
          sourceEnd.gap,
        ),
        targetExit = exit(
          view.targetAnchor,
          target.getBBox(),
          targetSide,
          targetEnd.gap,
        );
      const waypoints = [
        sourceExit,
        ...vertices.map((p) => new g.Point(p)),
        targetExit,
      ];
      const obstacles = (view.paper?.model.getElements() ?? []).map(
        (element) => ({
          id: element.id,
          box: element.getBBox().inflate(CLEARANCE),
        }),
      );
      // Reuse geometry across paint/state updates; a moved case, terminal or
      // manual point invalidates it, including changes during dragging.
      const key = [
        view.sourceAnchor.toString(),
        view.targetAnchor.toString(),
        ...vertices.map((p) => `${p.x},${p.y}`),
        ...obstacles.map(
          ({ id, box }) => `${id}:${box.x},${box.y},${box.width},${box.height}`,
        ),
      ].join("|");
      if (cached?.key === key) return cached.points.map((p) => p.clone());
      const direct = vertices.length
        ? null
        : gutterRoute(
            sourceExit,
            targetExit,
            obstacles,
            sourceSide,
            targetSide,
            Math.max(sourceEnd.gap, targetEnd.gap) - CLEARANCE - 6,
          );
      const route =
        direct ??
        routers.manhattan(
          waypoints,
          {
            step: 8,
            maximumLoops: 5000,
            perpendicular: false,
            padding: { top: 0, right: 0, bottom: 0, left: 0 },
            startDirections: [sourceSide],
            endDirections: [targetSide],
            isPointObstacle: obstacleTest(
              view,
              sourceSide,
              targetSide,
              obstacles,
            ),
            // Overlapping cases during dragging, or a manual point placed inside
            // a case, may have no clear path. Keep those user points editable.
            fallbackRouter: (points) =>
              routers.orthogonal(points, { padding: 0 }, view),
          },
          view,
        );
      const points = simplify([
        view.sourceAnchor,
        ...route.map((p) => new g.Point(p)),
        view.targetAnchor,
      ]).slice(1, -1);
      cached = { key, points };
      return points.map((p) => p.clone());
    });
  }
  return result;
}

import { g, routers, dia } from "@joint/core";
import { catalog } from "@catalog/index";
import { MM } from "@renderers/index";
import type {
  Conductor,
  DeviceInstance,
  TerminalRef,
  PhysicalEnclosure,
  ProjectDocument,
  Point,
} from "@model/index";

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
      // A collinear return retraces the same wire. Dropping the middle point
      // only removes overlapping geometry; saved editing points stay intact.
      if (Math.abs(ab.x * bc.y - ab.y * bc.x) > 0.1) break;
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
  enclosures: PhysicalEnclosure[] = [],
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
      const clampExit = (point: g.Point, deviceId: string) => {
        const e = enclosures.find((e) => e.deviceIds.includes(deviceId));
        if (e) {
          const clipped = Math.max(
            e.position.y + 4,
            Math.min(e.position.y + e.height - 4, point.y),
          );
          const box = (
            deviceId === wire.from.deviceId ? source : target
          ).getBBox();
          // A tight teaching enclosure must not push an exit back inside the
          // device's obstacle margin: grid search then falls back through its body.
          if (
            clipped <= box.y - CLEARANCE ||
            clipped >= box.y + box.height + CLEARANCE
          )
            point.y = clipped;
        }
      };
      clampExit(sourceExit, wire.from.deviceId);
      clampExit(targetExit, wire.to.deviceId);
      const waypoints = vertices.map((p) => new g.Point(p));
      const obstacles = (view.paper?.model.getElements() ?? [])
        .filter(
          (element) =>
            !element.get("data")?.enclosure || !!element.get("data")?.device,
        )
        .map((element) => ({
          id: element.id,
          box: element.getBBox().inflate(CLEARANCE),
        }));
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
      // Route between exits outside the device bodies. Letting Manhattan start
      // at an internal terminal can cut through the case near its final bend.
      const routingView = Object.create(view) as dia.LinkView;
      Object.defineProperties(routingView, {
        sourceAnchor: { value: sourceExit },
        targetAnchor: { value: targetExit },
        sourceBBox: {
          value: new g.Rect(sourceExit.x - 0.5, sourceExit.y - 0.5, 1, 1),
        },
        targetBBox: {
          value: new g.Rect(targetExit.x - 0.5, targetExit.y - 0.5, 1, 1),
        },
      });
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
              routers.orthogonal(points, { padding: 0 }, routingView),
          },
          routingView,
        );
      const rawPoints = [
        view.sourceAnchor,
        sourceExit,
        ...route.map((p) => new g.Point(p)),
        targetExit,
        view.targetAnchor,
      ];
      // Manhattan snaps fractional port coordinates to its grid. Keep the
      // original anchors and add a tiny right-angle bend instead of a diagonal.
      const orthogonal = rawPoints.flatMap((b, i) => {
        if (!i) return [b];
        const a = rawPoints[i - 1],
          dx = Math.abs(a.x - b.x),
          dy = Math.abs(a.y - b.y);
        if (dx && dy)
          return [new g.Point(dx < dy ? a.x : b.x, dx < dy ? b.y : a.y), b];
        return [b];
      });
      const points = simplify(orthogonal).slice(1, -1);
      cached = { key, points };
      return points.map((p) => p.clone());
    });
  }
  return result;
}

// Read-only SVG lessons use the same anchors, obstacles and router as the board.
// This graph is rendering geometry derived from CircuitModel, never a solver netlist.
export function physicalWirePaths(
  project: ProjectDocument,
): Record<string, Point[]> {
  const graph = new dia.Graph();
  for (const d of project.circuit.devices) {
    const dim = catalog[d.productId].dimensions.value!;
    graph.addCell(
      new dia.Element({
        type: "device",
        id: d.id,
        position: project.physical.devices[d.id],
        size: { width: dim.width * MM, height: dim.height * MM },
      }),
    );
  }
  const anchor = (r: TerminalRef) => {
    const d = project.circuit.devices.find((d) => d.id === r.deviceId)!,
      t = catalog[d.productId].topology.terminals.find(
        (t) => t.id === r.terminalId,
      )!,
      at = project.physical.devices[d.id];
    return new g.Point(at.x + t.x * MM, at.y + t.y * MM);
  };
  const routing = physicalWireRouters(
    project.circuit.devices,
    project.circuit.conductors,
    project.physical.enclosures,
  );
  return Object.fromEntries(
    project.circuit.conductors.map((w) => {
      const link = new dia.Link({
        type: "wire",
        id: w.id,
        source: { id: w.from.deviceId, port: w.from.terminalId },
        target: { id: w.to.deviceId, port: w.to.terminalId },
      });
      graph.addCell(link);
      const sourceAnchor = anchor(w.from),
        targetAnchor = anchor(w.to);
      // The router needs only this geometric subset of LinkView.
      // It does not require a mounted paper or DOM.
      const view = {
        model: link,
        paper: { model: graph },
        options: {},
        sourceAnchor,
        targetAnchor,
        sourceBBox: (graph.getCell(w.from.deviceId) as dia.Element).getBBox(),
        targetBBox: (graph.getCell(w.to.deviceId) as dia.Element).getBBox(),
      } as unknown as dia.LinkView;
      const points = [
        sourceAnchor,
        ...routing.get(w.id)!(project.physical.routes[w.id] ?? [], {}, view),
        targetAnchor,
      ].map(({ x, y }) => ({ x, y }));
      link.remove();
      return [w.id, points];
    }),
  );
}

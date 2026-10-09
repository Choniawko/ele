import { describe, expect, it } from "vitest";
import { dia, g } from "@joint/core";
import { catalog } from "@catalog/index";
import type { Conductor, ProjectDocument, TerminalRef } from "@model/index";
import { scenarios, scenarioProject } from "@training/index";
import { physicalWireRouters, physicalWirePaths } from "@editor/wire-routing";
import example101 from "../examples/physical/ELE02_101_stanowisko.json";
import example108 from "../examples/physical/ELE02_108_stanowisko.json";
import { validateProjectDocument } from "@catalog/project-validation";

function fixture(project: ProjectDocument) {
  const graph = new dia.Graph();
  for (const device of project.circuit.devices) {
    const dim = catalog[device.productId].dimensions.value!;
    graph.addCell(
      new dia.Element({
        type: "device",
        id: device.id,
        position: project.physical.devices[device.id],
        size: { width: dim.width * 2.2, height: dim.height * 2.2 },
      }),
    );
  }
  const anchor = (ref: TerminalRef) => {
    const device = project.circuit.devices.find((d) => d.id === ref.deviceId)!,
      terminal = catalog[device.productId].topology.terminals.find(
        (t) => t.id === ref.terminalId,
      )!,
      at = (graph.getCell(device.id) as dia.Element).position();
    return new g.Point(at.x + terminal.x * 2.2, at.y + terminal.y * 2.2);
  };
  const routing = physicalWireRouters(
    project.circuit.devices,
    project.circuit.conductors,
  );
  function route(wire: Conductor, vertices: g.Point[] = []) {
    const link = new dia.Link({
      type: "wire",
      id: wire.id,
      source: { id: wire.from.deviceId, port: wire.from.terminalId },
      target: { id: wire.to.deviceId, port: wire.to.terminalId },
    });
    graph.addCell(link);
    const sourceAnchor = anchor(wire.from),
      targetAnchor = anchor(wire.to);
    const view = {
      model: link,
      paper: { model: graph },
      options: {},
      sourceAnchor,
      targetAnchor,
      sourceBBox: new g.Rect(sourceAnchor.x - 0.5, sourceAnchor.y - 0.5, 1, 1),
      targetBBox: new g.Rect(targetAnchor.x - 0.5, targetAnchor.y - 0.5, 1, 1),
    } as unknown as dia.LinkView;
    const points = [
      sourceAnchor,
      ...routing.get(wire.id)!(vertices, {}, view).map((p) => new g.Point(p)),
      targetAnchor,
    ];
    link.remove();
    return points;
  }
  return { graph, anchor, route };
}

function verify(project: ProjectDocument, wire: Conductor, points: g.Point[]) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    expect(
      Math.min(Math.abs(a.x - b.x), Math.abs(a.y - b.y)),
      `${wire.marking}: ukośny odcinek`,
    ).toBeLessThan(0.2);
    if (i > 1) {
      const prev = points[i - 2],
        dot = (a.x - prev.x) * (b.x - a.x) + (a.y - prev.y) * (b.y - a.y),
        lengths = prev.distance(a) * a.distance(b);
      expect(
        lengths ? dot / lengths : 0,
        `${wire.marking}: zbędny nawrót`,
      ).toBeGreaterThan(-0.2);
    }
    const length = a.distance(b);
    for (let t = 0; t <= length; t += 2) {
      const point = new g.Point(
        a.x + ((b.x - a.x) * t) / length,
        a.y + ((b.y - a.y) * t) / length,
      );
      for (const device of project.circuit.devices) {
        const at = project.physical.devices[device.id],
          product = catalog[device.productId],
          dim = product.dimensions.value!;
        if (
          point.x <= at.x + 0.3 ||
          point.x >= at.x + dim.width * 2.2 - 0.3 ||
          point.y <= at.y + 0.3 ||
          point.y >= at.y + dim.height * 2.2 - 0.3
        )
          continue;
        const accessible = [wire.from, wire.to].some((ref) => {
          if (ref.deviceId !== device.id) return false;
          const terminal = product.topology.terminals.find(
            (t) => t.id === ref.terminalId,
          )!;
          return (
            Math.abs(point.x - at.x - terminal.x * 2.2) < 1 &&
            (terminal.y > dim.height / 2
              ? point.y >= at.y + terminal.y * 2.2 - 0.2
              : point.y <= at.y + terminal.y * 2.2 + 0.2)
          );
        });
        expect(
          accessible,
          `${wire.marking}: przejście przez obudowę ${device.designation} w ${point}`,
        ).toBe(true);
      }
    }
  }
}

describe("prowadzenie przewodów poza obudowami", () => {
  it("108: current catalog and shared routing preserve every conductor and its exact endpoints", () => {
    const p = validateProjectDocument(example108),
      before = structuredClone(p);
    const paths = physicalWirePaths(p),
      f = fixture(p);
    expect(Object.keys(paths)).toHaveLength(p.circuit.conductors.length);
    for (const w of p.circuit.conductors) {
      const points = paths[w.id].map((p) => new g.Point(p));
      expect(points[0]).toEqual(f.anchor(w.from));
      expect(points.at(-1)).toEqual(f.anchor(w.to));
      verify(p, w, points);
    }
    expect(p).toEqual(before);
  });
  it("101 / R7: lesson projection uses board routing for all 33 wires, including automatic internal routes", () => {
    const p = validateProjectDocument(example101),
      before = structuredClone(p);
    const paths = physicalWirePaths(p),
      f = fixture(p);
    expect(Object.keys(paths)).toHaveLength(33);
    for (const w of p.circuit.conductors) {
      const points = paths[w.id].map((p) => new g.Point(p));
      expect(points[0]).toEqual(f.anchor(w.from));
      expect(points.at(-1)).toEqual(f.anchor(w.to));
      verify(p, w, points);
    }
    expect(p).toEqual(before);
  });
  it.each(scenarios)(
    "$title: prostokątne trasy bez nawrotów i przechodzenia przez aparaty",
    (scenario) => {
      const project = scenario.create(),
        f = fixture(project);
      for (const wire of project.circuit.conductors)
        verify(project, wire, f.route(wire));
    },
  );
  it("kolejność niezależnych przewodów nie zmienia trasy ani zacisków", () => {
    const project = scenarioProject("three-phase"),
      before = structuredClone(project),
      f = fixture(project);
    const paths = project.circuit.conductors.map((wire) => f.route(wire));
    project.circuit.conductors.reverse();
    const reordered = fixture(project);
    before.circuit.conductors.forEach((wire, i) =>
      expect(reordered.route(wire)).toEqual(paths[i]),
    );
    project.circuit.conductors.reverse();
    expect(project).toEqual(before);
  });
  it("ręczny punkt pozostaje na ścieżce bez zmieniania dokumentu", () => {
    const project = scenarioProject("lamp"),
      before = structuredClone(project),
      f = fixture(project),
      wire = project.circuit.conductors[0],
      waypoint = new g.Point(900, 620),
      points = f.route(wire, [waypoint]);
    expect(
      points.some(
        (p, i) => i > 0 && new g.Line(points[i - 1], p).containsPoint(waypoint),
      ),
    ).toBe(true);
    expect(project).toEqual(before);
  });
  it("zmiana położenia innego aparatu unieważnia zapamiętaną trasę", () => {
    const project = scenarioProject("lamp"),
      f = fixture(project),
      wire = project.circuit.conductors[0],
      before = f.route(wire),
      obstacle = project.circuit.devices.find((d) => d.designation === "S1")!;
    expect(f.route(wire)).toEqual(before);
    const position = { x: 170, y: 250 };
    (f.graph.getCell(obstacle.id) as dia.Element).position(
      position.x,
      position.y,
    );
    project.physical.devices[obstacle.id] = position;
    const after = f.route(wire);
    expect(after).not.toEqual(before);
    verify(project, wire, after);
  });
});

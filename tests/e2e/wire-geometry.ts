import type { Page } from "@playwright/test";
import type { ProjectDocument } from "../../packages/circuit-model/index";

// Check the rendered SVG, including rounded corners and the current board zoom.
export async function wireGeometry(page: Page, project: ProjectDocument) {
  return page.getByTestId("board-physical").evaluate((host, document) => {
    const devices = new Map(
        Array.from(
          host.querySelectorAll<SVGRectElement>("[data-device-body]"),
        ).map((el) => [
          el.getAttribute("data-device-body")!,
          el.getBoundingClientRect(),
        ]),
      ),
      terminals = new Map(
        Array.from(host.querySelectorAll<SVGGElement>("[data-terminal]")).map(
          (el) => {
            // The first circle is the enlarged click target; the second one
            // is the visible ring that a learner reads as the terminal.
            const circles = el.querySelectorAll<SVGCircleElement>("circle"),
              ring = circles[1] ?? circles[0],
              matrix = ring.getScreenCTM()!,
              point = new DOMPoint(
                ring.cx.baseVal.value,
                ring.cy.baseVal.value,
              ).matrixTransform(matrix),
              stroke = parseFloat(ring.getAttribute("stroke-width") ?? "0");
            return [
              el.getAttribute("data-terminal")!,
              {
                point,
                radius: (ring.r.baseVal.value + stroke / 2) * matrix.a,
              },
            ];
          },
        ),
      ),
      byId = new Map(
        document.circuit.devices.map((d) => [d.id, d.designation]),
      ),
      intrusions: string[] = [],
      detached: string[] = [];
    let checked = 0;
    for (const overlay of host.querySelectorAll<SVGGElement>("[data-wire]")) {
      const wire = document.circuit.conductors.find(
        (w) => w.id === overlay.getAttribute("data-wire"),
      )!;
      const path = overlay.querySelector<SVGPathElement>("path")!,
        matrix = path.getScreenCTM()!,
        length = path.getTotalLength(),
        // The first path is the light halo; the second one is the conductor.
        core = overlay.querySelectorAll<SVGPathElement>("path")[1] ?? path,
        width =
          parseFloat(core.getAttribute("stroke-width") ?? "3.2") * matrix.a,
        own = [wire.from, wire.to].map(
          (ref) => `${byId.get(ref.deviceId)}:${ref.terminalId}`,
        ),
        ends = [wire.from, wire.to].map((ref) => ({
          designation: byId.get(ref.deviceId)!,
          point: terminals.get(`${byId.get(ref.deviceId)}:${ref.terminalId}`)!
            .point,
        }));
      checked++;
      for (const [i, end] of ends.entries()) {
        const p = path
          .getPointAtLength(i === 0 ? 0 : length)
          .matrixTransform(matrix);
        if (Math.hypot(p.x - end.point.x, p.y - end.point.y) > 1.5)
          detached.push(`${wire.marking}: ${end.designation}`);
      }
      const samples: DOMPoint[] = [];
      for (let distance = 0; distance <= length; distance += 2)
        samples.push(path.getPointAtLength(distance).matrixTransform(matrix));
      const inside = (p: DOMPoint, box: DOMRect) =>
        p.x > box.left + 0.7 &&
        p.x < box.right - 0.7 &&
        p.y > box.top + 0.7 &&
        p.y < box.bottom - 0.7;
      const found = new Set<string>();
      for (const [designation, box] of devices) {
        // A wire may run inside its own case only on the exit corridor: the
        // contiguous run from its terminal to the first point outside the case.
        const allowed = new Set<number>();
        for (const [i, end] of ends.entries()) {
          if (end.designation !== designation) continue;
          const order =
            i === 0 ? samples.keys() : [...samples.keys()].reverse();
          for (const k of order) {
            if (!inside(samples[k], box)) break;
            allowed.add(k);
          }
        }
        for (const [k, p] of samples.entries())
          if (!found.has(designation) && inside(p, box) && !allowed.has(k)) {
            intrusions.push(`${wire.marking} przez ${designation}`);
            found.add(designation);
          }
      }
      // A wire drawn over another terminal's ring reads as a connection to it.
      for (const [label, terminal] of terminals) {
        if (own.includes(label)) continue;
        if (
          samples.some(
            (p) =>
              Math.hypot(p.x - terminal.point.x, p.y - terminal.point.y) <
              terminal.radius + width / 2,
          )
        )
          intrusions.push(`${wire.marking} dotyka ${label}`);
      }
    }
    return { checked, intrusions, detached };
  }, project);
}

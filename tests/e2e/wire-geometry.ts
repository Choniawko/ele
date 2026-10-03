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
            const circle = el.querySelector<SVGCircleElement>("circle")!,
              point = new DOMPoint(
                circle.cx.baseVal.value,
                circle.cy.baseVal.value,
              ).matrixTransform(circle.getScreenCTM()!);
            return [el.getAttribute("data-terminal")!, point];
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
        ends = [wire.from, wire.to].map((ref) => ({
          designation: byId.get(ref.deviceId)!,
          point: terminals.get(`${byId.get(ref.deviceId)}:${ref.terminalId}`)!,
        }));
      checked++;
      for (const [i, end] of ends.entries()) {
        const p = path
          .getPointAtLength(i === 0 ? 0 : length)
          .matrixTransform(matrix);
        if (Math.hypot(p.x - end.point.x, p.y - end.point.y) > 1.5)
          detached.push(`${wire.marking}: ${end.designation}`);
      }
      const found = new Set<string>();
      for (let distance = 0; distance <= length; distance += 2) {
        const p = path.getPointAtLength(distance).matrixTransform(matrix);
        for (const [designation, box] of devices) {
          if (
            found.has(designation) ||
            p.x <= box.left + 0.7 ||
            p.x >= box.right - 0.7 ||
            p.y <= box.top + 0.7 ||
            p.y >= box.bottom - 0.7
          )
            continue;
          const terminalExit = ends.some(
            (end) =>
              end.designation === designation &&
              Math.abs(p.x - end.point.x) < 1.5 &&
              (end.point.y > box.top + box.height / 2
                ? p.y >= end.point.y - 0.5
                : p.y <= end.point.y + 0.5),
          );
          if (!terminalExit) {
            intrusions.push(`${wire.marking} przez ${designation}`);
            found.add(designation);
          }
        }
      }
    }
    return { checked, intrusions, detached };
  }, project);
}

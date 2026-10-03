import { describe, expect, it } from "vitest";
import { clone, projectSchema } from "@model/index";
import { scenarioProject } from "@training/index";
import {
  mountingRails,
  snapMounting,
  freeMountingPosition,
  RAIL_OFFSET,
} from "@editor/layout";
import { parseProject } from "../apps/web/src/persistence";
import { advance, initialRuntime } from "@simulation/index";

describe("montaż szyn i zgodność zapisanych projektów", () => {
  it("odtwarza starsze projekty z trzecią implicitną szyną bez zmiany położeń", () => {
    const p = scenarioProject("distribution"),
      old = clone(p);
    const rcd = p.circuit.devices.find((d) => d.designation === "FI1")!;
    p.physical.devices[rcd.id].y = 680;
    const restored = parseProject(JSON.stringify(p));
    expect(mountingRails(restored)).toHaveLength(3);
    expect(restored.physical.devices[rcd.id].y).toBe(680);
    expect(restored.circuit).toEqual(old.circuit);
  });
  it("zapisuje dodatkowe szyny i punkty trasy oraz przyciąga aparat do trzeciej szyny", () => {
    const p = scenarioProject("distribution"),
      rcd = p.circuit.devices.find((d) => d.designation === "FI1")!;
    p.physical.rails = [
      ...mountingRails(p),
      { id: "rail-extra", x: 60, y: 745, width: 970 },
    ];
    p.physical.routes[p.circuit.conductors[0].id] = [{ x: 120, y: 620 }];
    const at = snapMounting(p, rcd.productId, { x: 225, y: 720 });
    expect(at).toEqual({ x: 230, y: 745 - RAIL_OFFSET });
    p.physical.devices[rcd.id] = at;
    expect(parseProject(JSON.stringify(p))).toEqual(p);
  });
  it("znajduje wolne miejsce na wskazanym rzędzie i utrzymuje aparat w obrębie szyny", () => {
    const p = scenarioProject("distribution"),
      rcd = p.circuit.devices.find((d) => d.designation === "FI1")!;
    const at = freeMountingPosition(
      p,
      rcd.productId,
      p.physical.devices[rcd.id],
    );
    expect(at).not.toBeNull();
    expect(at!.y).toBe(p.physical.devices[rcd.id].y);
    expect(at!.x).not.toBe(p.physical.devices[rcd.id].x);
    expect(snapMounting(p, rcd.productId, { x: 9000, y: 90 }).x).toBeLessThan(
      1030,
    );
  });
  it("odrzuca zduplikowane szyny i niepoprawne wymiary w imporcie", () => {
    const p = scenarioProject("lamp");
    p.physical.rails = mountingRails(p);
    p.physical.rails[1].id = p.physical.rails[0].id;
    expect(projectSchema.safeParse(p).success).toBe(false);
    p.physical.rails[1].id = "other";
    p.physical.rails[1].width = Infinity;
    expect(projectSchema.safeParse(p).success).toBe(false);
  });
  it("przeniesienie RCD, dodatkowa szyna i nowa trasa nie zmieniają wyniku solvera", () => {
    const p = scenarioProject("distribution"),
      moved = clone(p);
    const rcd = p.circuit.devices.find((d) => d.designation === "FI1")!;
    moved.physical.rails = [
      ...mountingRails(p),
      { id: "extra", x: 60, y: 745, width: 970 },
    ];
    moved.physical.devices[rcd.id] = { x: 120, y: 680 };
    moved.physical.routes[p.circuit.conductors[0].id] = [{ x: 400, y: 500 }];
    const before = advance(p, initialRuntime(p), { type: "power", on: true });
    const after = advance(moved, initialRuntime(moved), {
      type: "power",
      on: true,
    });
    expect(after.devices).toEqual(before.devices);
    expect(after.solution.voltages).toEqual(before.solution.voltages);
    expect(moved.circuit).toEqual(p.circuit);
  });
});

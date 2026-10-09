import { describe, it, expect } from "vitest";
import {
  referenceById,
  referenceCopy,
  boundReference,
  validateReference,
} from "../packages/knowledge/reference-examples";
import { validateProjectDocument } from "@catalog/project-validation";
import { permanentNets } from "../packages/knowledge/diagram-model";
import { schematicProjection } from "@editor/schematic-projection";
import { fragmentClosed } from "@renderers/fragment";
import { advance, initialRuntime } from "@simulation/index";
import { measure } from "@measurements/index";
const r = referenceById("ele02-108")!;
const pin = (s: string) => {
  const i = s.lastIndexOf(":");
  return { deviceId: s.slice(0, i), terminalId: s.slice(i + 1) };
};
const on = (p = r.create()) =>
  advance(p, initialRuntime(p), { type: "power", on: true });
describe("01b / ELE.02-108 source and projection gates", () => {
  it("R1/R2/R6: all current profiles, bindings, source fragments and cable/assembly objects resolve", () => {
    const p = r.create();
    expect(validateReference(r)).toEqual([]);
    expect(r.profiles).toHaveLength(11);
    expect(r.bindings.map((b) => b.deviceId)).toEqual(
      p.circuit.devices.map((d) => d.id),
    );
    expect(new Set(r.fragments.flatMap((f) => f.conductorIds))).toEqual(
      new Set(p.circuit.conductors.map((w) => w.id)),
    );
    expect(p.circuit.devices).toHaveLength(15);
    expect(p.circuit.conductors).toHaveLength(37);
    expect(p.circuit.cables.map((c) => c.designation)).toEqual([
      "OWY 5×2,5 mm²",
      "OWY 4×2,5 mm²",
      "YLY 5×1,5 mm²",
    ]);
    expect(
      r.profiles.find((p) => p.productId === "schneider-lc1d09p7")!
        .measurements,
    ).toContain("unsupported");
    expect(r.limitations.join(" ")).toContain("4,35 A");
  });
  it("R3: independently read power, STOP chain, right/left branches, N/PE and spare nets", () => {
    const net = permanentNets(r.create());
    const groups = [
      ["PZ:L1", "Q2:1", "Q1:1"],
      ["PZ:L2", "Q2:3"],
      ["PZ:L3", "Q2:5"],
      ["Q2:2", "K1:1L1", "K2:1L1"],
      ["Q2:4", "K1:3L2", "K2:3L2"],
      ["Q2:6", "K1:5L3", "K2:5L3"],
      ["K1:2T1", "K2:6T3", "M:U"],
      ["K1:4T2", "K2:4T2", "M:V"],
      ["K1:6T3", "K2:2T1", "M:W"],
      ["Q1:2", "Q2.AUX:13"],
      ["Q2.AUX:14", "S1:1"],
      ["S1:2", "S3:1"],
      ["S3:2", "S3:3", "S1:3", "S2:3", "S4:3", "K1:13"],
      ["S1:4", "S3:4", "K1:14", "K2:21"],
      ["S2:4", "S4:4", "K1:21"],
      ["K2:22", "K1:A1"],
      ["K1:22", "K2:A1"],
      ["PZ:N", "ZS.N:1", "ZS.N:2", "K1:A2", "K2:A2"],
      ["PZ:PE", "ZS.PE:1", "ZS.PE:2", "M:PE"],
      ["ZS.RES1:1", "ZS.RES1:2", "ZS.RES2:1", "ZS.RES2:2"],
      ["K2:13"],
      ["K2:14"],
    ];
    for (const g of groups)
      expect(new Set(g.map((s) => net(pin(s)))), g.join(",")).toHaveProperty(
        "size",
        1,
      );
    expect(new Set(groups.map((g) => net(pin(g[0])))).size).toBe(groups.length);
  });
  it("R7/R8: expanded symbols have unique real ports, share apparatus identity and survive edits/roundtrip", () => {
    const p = referenceCopy(r.id),
      projection = schematicProjection(p);
    expect(p.schematic.symbolFragments!.version).toBe("1");
    expect(
      projection.elements
        .filter((e) => e.device.id === "K1")
        .map((e) => e.fragmentId),
    ).toEqual(
      expect.arrayContaining([
        "coil",
        "pole1",
        "pole2",
        "pole3",
        "auxNO",
        "auxNC",
      ]),
    );
    expect(projection.endpoint(pin("K1:A1")).id).toBe("symbol:K1:coil");
    expect(projection.endpoint(pin("K1:13")).id).toBe("symbol:K1:auxNO");
    const circuit = structuredClone(p.circuit);
    p.schematic.symbolFragments!.placements["symbol:K1:coil"].position.x += 100;
    expect(
      validateProjectDocument(JSON.parse(JSON.stringify(p))).schematic,
    ).toEqual(p.schematic);
    expect(p.circuit).toEqual(circuit);
    expect(boundReference(p)).toBe(r);
    p.circuit.conductors = p.circuit.conductors.filter((w) => w.id !== "W24");
    const edited = validateProjectDocument(p);
    expect(boundReference(edited)).toBeUndefined();
    for (const w of edited.circuit.conductors) {
      expect(schematicProjection(edited).endpoint(w.from)).toBeDefined();
      expect(schematicProjection(edited).endpoint(w.to)).toBeDefined();
    }
    const legacy = structuredClone(p);
    delete legacy.schematic.symbolFragments;
    expect(
      schematicProjection(validateProjectDocument(legacy)).elements,
    ).toHaveLength(15);
  });
  it("R1/R7: invalid layout versions, missing fragments, duplicate terminals and dangling device bindings fail closed", () => {
    const p = r.create();
    const f = p.schematic.symbolFragments!.placements;
    f["symbol:K1:coil"].fragmentId = "missing";
    expect(() => validateProjectDocument(p)).toThrow(/fragmentu/);
    const q = r.create();
    q.schematic.symbolFragments!.placements["copy:coil"] = {
      ...q.schematic.symbolFragments!.placements["symbol:K1:coil"],
    };
    expect(() => validateProjectDocument(q)).toThrow(/Powtórzony/);
    const incomplete = r.create();
    delete incomplete.schematic.symbolFragments!.placements["symbol:K1:coil"];
    expect(() => validateProjectDocument(incomplete)).toThrow(
      /wszystkich zacisków/,
    );
    const invalid = r.create();
    Object.assign(invalid.schematic.symbolFragments!, { version: "2" });
    expect(() => validateProjectDocument(invalid)).toThrow();
    const collision = r.create();
    collision.schematic.symbolFragments!.placements.W1 =
      collision.schematic.symbolFragments!.placements["symbol:K1:coil"];
    delete collision.schematic.symbolFragments!.placements["symbol:K1:coil"];
    expect(() => validateProjectDocument(collision)).toThrow(/koliduje/);
  });
  it("R4/R7: all graphical K1 contacts follow its coil; Q2.AUX follows actual protection owner", () => {
    const p = r.create();
    let rt = advance(p, on(p), {
      type: "operate",
      deviceId: "S1",
      actuator: "start",
      state: true,
    });
    rt = advance(p, rt, {
      type: "operate",
      deviceId: "S1",
      actuator: "start",
      state: false,
    });
    expect(rt.devices.M.direction).toBe("123");
    for (const c of catalog["schneider-lc1d09p7"].topology.connections.filter(
      (c) => c.kind !== "coil",
    ))
      expect(fragmentClosed(c, rt.devices.K1)).toBe(c.id !== "auxNC");
    const aux = auxConnection();
    expect(fragmentClosed(aux, rt.devices["Q2.AUX"])).toBe(true);
    rt = advance(p, rt, { type: "operate", deviceId: "Q2", state: false });
    expect(fragmentClosed(aux, rt.devices["Q2.AUX"])).toBe(false);
    expect(rt.devices.K1.coil).toBe(false);
  });
  it("R5: removing holding wire loses right latch; bypassed opposite NC produces a power short and protection trip", () => {
    const p = r.create();
    p.circuit.conductors = p.circuit.conductors.filter((w) => w.id !== "W23");
    let rt = advance(p, on(p), {
      type: "operate",
      deviceId: "S1",
      actuator: "start",
      state: true,
    });
    expect(rt.devices.K1.mechanism).toBe(true);
    rt = advance(p, rt, {
      type: "operate",
      deviceId: "S1",
      actuator: "start",
      state: false,
    });
    expect(rt.devices.K1.mechanism).toBe(false);
    const q = r.create();
    q.circuit.bridges.push({
      id: "wrong-interlock",
      from: pin("K1:21"),
      to: pin("K1:22"),
    });
    rt = advance(q, on(q), {
      type: "operate",
      deviceId: "S1",
      actuator: "start",
      state: true,
    });
    rt = advance(q, rt, { type: "operate", deviceId: "S2", state: true });
    expect(rt.devices.Q2.tripped).toBe(true);
  });
  it("R4/R5: missing PE fails continuity and cewka Ω explicitly stays unsupported", () => {
    const p = r.create();
    const parameters = {
      function: "continuity" as const,
      red: pin("PZ:PE"),
      black: pin("M:PE"),
      testVoltageV: 500 as const,
      compensateLeads: true,
      rcdMultiplier: 1 as const,
    };
    expect(measure(p, initialRuntime(p), parameters).status).toBe("valid");
    p.circuit.conductors = p.circuit.conductors.filter((w) => w.id !== "W19");
    expect(measure(p, initialRuntime(p), parameters).status).toBe(
      "open-circuit",
    );
    expect(
      measure(p, initialRuntime(p), {
        ...parameters,
        red: pin("K1:A1"),
        black: pin("K1:A2"),
      }).status,
    ).toBe("unsupported");
  });
});
import { catalog } from "@catalog/index";
const auxConnection = () => catalog["edu-motor-aux-no"].topology.connections[0];

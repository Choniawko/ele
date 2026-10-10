import { describe, expect, it } from "vitest";
import {
  referenceById,
  referenceByTask,
  referenceCopy,
  boundReference,
  validateReference,
} from "../packages/knowledge/reference-examples";
import { validateProjectDocument } from "@catalog/project-validation";
import { advance, initialRuntime } from "@simulation/index";
import { permanentNets } from "../packages/knowledge/examples";
import { measure } from "@measurements/index";
const reference = referenceById("ele02-101")!;
const energized = (p = reference.create()) =>
  advance(p, initialRuntime(p), { type: "power", on: true });
const pin = (s: string) => {
  const i = s.lastIndexOf(":");
  return { deviceId: s.slice(0, i), terminalId: s.slice(i + 1) };
};
describe("01a / ELE.02-101 reference gates", () => {
  it("R1/R2/R6: canonical data, profiles, all terminals/symbols/routes and lesson references are valid", () => {
    const p = reference.create();
    expect(validateReference(reference)).toEqual([]);
    expect(p.circuit.devices).toHaveLength(24);
    expect(p.circuit.conductors).toHaveLength(33);
    expect(reference.bindings.map((b) => b.deviceId)).toEqual(
      p.circuit.devices.map((d) => d.id),
    );
    expect(reference.profiles).toHaveLength(12);
    expect(new Set(reference.fragments.flatMap((f) => f.conductorIds))).toEqual(
      new Set(p.circuit.conductors.map((w) => w.id)),
    );
    expect(p.circuit.bridges).toHaveLength(0);
    expect(Object.keys(p.physical.routes)).toHaveLength(23);
    for (const route of Object.values(p.physical.routes))
      expect(route.length).toBeGreaterThan(0);
    // Ten internal connections use the board's obstacle-aware router.
    expect(
      p.circuit.conductors.filter((w) => !p.physical.routes[w.id]),
    ).toHaveLength(10);
    for (const b of reference.bindings) {
      expect(p.physical.devices[b.deviceId]).toBeDefined();
      expect(p.schematic.devices[b.deviceId]).toBeDefined();
    }
    const broken = {
      ...reference,
      bindings: reference.bindings.map((b) => ({
        ...b,
        terminalIds: [...b.terminalIds, "missing"],
      })),
    };
    expect(validateReference(broken).length).toBeGreaterThan(0);
    expect(referenceById("missing")).toBeUndefined();
    expect(referenceByTask("ELE.02-108")?.id).toBe("ele02-108");
    expect(() => referenceCopy("missing")).toThrow("Nieznany wzorzec");
  });
  it("R3: independently read phase branches, parallel lamps, correspondences and N/PE separation", () => {
    const net = permanentNets(reference.create());
    const groups = [
      ["RCD:2", "B10:1", "B6:1"],
      ["B10:2", "H1:L", "GW:L"],
      ["B6:2", "H2:L", "Q1:COM"],
      ["Q1:1", "P1.T1:1", "P2.T1:2", "Q2:1"],
      ["Q1:2", "P1.T2:1", "Q2:2"],
      ["Q2:COM", "P2.Ls:1", "OP1:L", "OP2:L"],
      ["RCD:N-out", "H1:N", "H2:N", "GW:N", "OP1:N", "OP2:N"],
      ["PZ:PE", "R.PE:1", "GW:PE", "OP1:PE", "OP2:PE"],
    ];
    for (const group of groups)
      expect(new Set(group.map((r) => net(pin(r)))).size).toBe(1);
    expect(new Set(groups.map((group) => net(pin(group[0])))).size).toBe(
      groups.length,
    );
  });
  it("101-QA-01 / R4: changing either switch reverses both lamps in all four states; H2 stays upstream", () => {
    const p = reference.create();
    for (const q1 of [false, true])
      for (const q2 of [false, true]) {
        p.circuit.devices.find((d) => d.id === "Q1")!.settings.position = q1;
        p.circuit.devices.find((d) => d.id === "Q2")!.settings.position = q2;
        const rt = energized(p);
        expect(rt.status).toBe("valid");
        expect(rt.devices.OP1.powered).toBe(q1 === q2);
        expect(rt.devices.OP2.powered).toBe(q1 === q2);
        expect(rt.devices.H2.powered).toBe(true);
      }
  });
  it.each([
    ["101-QA-02", "B6"],
    ["101-QA-03", "B10"],
  ])("%s / R4: %s isolates only its own branch", (_, id) => {
    const p = reference.create(),
      rt = advance(p, energized(p), {
        type: "operate",
        deviceId: id,
        state: false,
      });
    expect(rt.devices.OP1.powered).toBe(id !== "B6");
    expect(rt.devices.OP2.powered).toBe(id !== "B6");
    expect(rt.devices.H1.powered).toBe(id !== "B10");
    expect(rt.devices.H2.powered).toBe(id !== "B6");
    const v = measure(p, rt, {
      function: "voltage-ac",
      red: pin("GW:test-L"),
      black: pin("GW:test-N"),
      testVoltageV: 500,
      compensateLeads: true,
      rcdMultiplier: 1,
    });
    expect((v.value ?? 0) > 225).toBe(id !== "B10");
  });
  it("101-QA-04 / R4/R5: PE continuity to every class-I load; an open branch fails only that path", () => {
    for (const [endpoint, cut] of [
      ["GW", "W18"],
      ["OP1", "W31"],
      ["OP2", "W33"],
    ]) {
      const p = reference.create();
      const request = {
        function: "continuity" as const,
        red: pin("PZ:PE"),
        black: pin(`${endpoint}:PE`),
        testVoltageV: 500 as const,
        compensateLeads: true,
        rcdMultiplier: 1 as const,
      };
      expect(measure(p, initialRuntime(p), request).value).toBeLessThan(1);
      p.faults.push({
        id: "open-pe",
        kind: "open-wire",
        targetId: cut,
        hidden: false,
        activeAtMs: 0,
      });
      expect(measure(p, initialRuntime(p), request).status).toBe(
        "open-circuit",
      );
    }
  });
  it("101-QA-05 / R4: TEST trips both circuits; supply return alone never resets the RCD", () => {
    const p = reference.create();
    let rt = advance(p, energized(p), { type: "test-rcd", deviceId: "RCD" });
    expect(rt.devices.RCD.tripped).toBe(true);
    for (const id of ["OP1", "OP2", "H1", "H2"])
      expect(rt.devices[id].powered).toBe(false);
    rt = advance(p, rt, { type: "power", on: false });
    rt = advance(p, rt, { type: "power", on: true });
    expect(rt.devices.OP1.powered).toBe(false);
    expect(rt.devices.RCD.tripped).toBe(true);
  });
  it.each(["W21", "W28"])(
    "R5: open %s changes operation rather than displaying a canned result",
    (wire) => {
      const p = reference.create();
      p.faults.push({
        id: "open",
        kind: "open-wire",
        targetId: wire,
        hidden: false,
        activeAtMs: 0,
      });
      const rt = energized(p);
      expect(rt.devices.OP1.powered).toBe(false);
      expect(rt.devices.H2.powered).toBe(true);
      expect(rt.devices.OP2.powered).toBe(wire === "W28");
    },
  );
  it("R5: a lamp connected upstream of the switches breaks simultaneous control", () => {
    const p = reference.create();
    p.circuit.conductors.find((w) => w.id === "W27")!.from = pin("P1.T1:2");
    p.circuit.devices.find((d) => d.id === "Q2")!.settings.position = true;
    const rt = energized(validateProjectDocument(p));
    expect(rt.devices.OP1.powered).toBe(false);
    expect(rt.devices.OP2.powered).toBe(true);
  });
  it("R6/R8: fresh independent copies, OFF runtime, exact round-trip and stale-binding rejection", () => {
    const original = reference.create(),
      a = referenceCopy(reference.id),
      b = referenceCopy(reference.id);
    expect(a.circuit.projectId).not.toBe(b.circuit.projectId);
    expect(a.circuit.projectId).not.toBe(original.circuit.projectId);
    expect(a.circuit.devices).toEqual(original.circuit.devices);
    expect(a.circuit.conductors).toEqual(original.circuit.conductors);
    expect(initialRuntime(a).energized).toBe(false);
    expect(boundReference(a)?.id).toBe(reference.id);
    expect(validateProjectDocument(JSON.parse(JSON.stringify(a)))).toEqual(a);
    a.physical.devices.Q1.x += 20;
    expect(boundReference(a)?.id).toBe(reference.id);
    a.circuit.conductors.find((w) => w.id === "W21")!.to = pin("Q2:2");
    expect(boundReference(a)).toBeUndefined();
    expect(reference.create()).toEqual(original);
  });
});

describe("rysunki lekcji nie pokazują nieistniejących połączeń", () => {
  it("każdy rysunek 101 i 108 rysuje różne sieci rozłącznie", async () => {
    const { referenceExamples } =
      await import("../packages/knowledge/reference-examples");
    const { diagramConflicts } =
      await import("../packages/knowledge/diagram-geometry");
    for (const r of referenceExamples)
      for (const scope of r.diagrams)
        expect(diagramConflicts(r.create(), scope), scope.title).toEqual([]);
  });
  it("wykrywa dawny błąd: H1 w szeregu z gniazdem i linia L na linii N", async () => {
    const { diagramConflicts } =
      await import("../packages/knowledge/diagram-geometry");
    const p = reference.create();
    // Layout used before the fix: H1 on the L row, N trunk at the left edge.
    const old = {
      title: "stary układ",
      width: 1100,
      height: 500,
      symbols: [
        { designation: "H1", fragmentId: "light", x: 520, y: 150, label: "" },
      ],
      ports: [
        { designation: "B10", terminalId: "2", x: 80, y: 150, label: "" },
        { designation: "GW", terminalId: "L", x: 800, y: 150, label: "" },
        { designation: "GW", terminalId: "N", x: 800, y: 300, label: "" },
        { designation: "R.N", terminalId: "1", x: 80, y: 300, label: "" },
      ],
    };
    const conflicts = diagramConflicts(p, old);
    expect(conflicts).toContain("B10:2 przechodzi przez symbol H1");
    expect(conflicts.some((c) => c.includes("nakłada się"))).toBe(true);
  });
});

describe("ćwiczenia czytania schematu zgadzają się z modelem", () => {
  it("101: liczba żył na każdym odcinku odpowiada przewodom modelu", async () => {
    const { drills } = await import("../packages/knowledge/schematic-course");
    const drill = drills.find((d) => d.referenceId === "ele02-101")!;
    const p = reference.create();
    for (const q of drill.questions) {
      expect(q.wires, q.id).toBeDefined();
      expect(Number(q.options[q.correct]), q.id).toBe(q.wires!.length);
      for (const id of q.wires!)
        expect(
          p.circuit.conductors.some((w) => w.id === id),
          `${q.id}:${id}`,
        ).toBe(true);
      for (const spot of q.spots) {
        expect(spot.x).toBeLessThan(drill.figure.width);
        expect(spot.y).toBeLessThan(drill.figure.height);
      }
    }
    const role = (id: string) =>
      p.circuit.conductors.find((w) => w.id === id)!.declaredRole;
    const q = (id: string) => drill.questions.find((q) => q.id === id)!.wires!;
    // Five between the boxes: two travellers, switched line, N and PE.
    expect(q("p1-p2").map(role).sort()).toEqual(
      ["CONTROL", "CONTROL", "L1", "N", "PE"].sort(),
    );
    expect(q("h1").map(role).sort()).toEqual(["L1", "N"]);
    expect(
      q("q1")
        .map(role)
        .filter((r) => r === "N"),
    ).toEqual([]);
  });
  it("108: odpowiedzi o połączeniach wynikają z sieci modelu", async () => {
    const { referenceById: byId } =
      await import("../packages/knowledge/reference-examples");
    const r = byId("ele02-108")!,
      p = r.create(),
      net = permanentNets(p);
    const same = (a: string, b: string) => net(pin(a)) === net(pin(b));
    // STOPs in series: S1:2 feeds S3:1 and nothing else joins them.
    expect(same("S1:2", "S3:1")).toBe(true);
    expect(same("S1:1", "S3:1")).toBe(false);
    // START S1, START S3 and K1 13–14 in parallel.
    for (const t of ["S1:3", "S3:3", "K1:13"])
      expect(same(t, "S1:3")).toBe(true);
    for (const t of ["S1:4", "S3:4", "K1:14"])
      expect(same(t, "S1:4")).toBe(true);
    // K2 NC in series right before K1:A1; K2 has no self-holding contact used.
    expect(same("K2:22", "K1:A1")).toBe(true);
    expect(same("K2:13", "S2:3")).toBe(false);
    // K2 swaps L1 and L3: K2 2T1 → W, 6T3 → U, 4T2 → V.
    expect(same("K2:2T1", "M:W")).toBe(true);
    expect(same("K2:6T3", "M:U")).toBe(true);
    expect(same("K2:4T2", "M:V")).toBe(true);
    // Control is fed through Q1 and Q2 auxiliary 13–14.
    expect(same("Q1:2", "Q2.AUX:13")).toBe(true);
    expect(same("Q2.AUX:14", "S1:1")).toBe(true);
  });
});

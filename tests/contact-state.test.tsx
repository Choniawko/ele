import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { catalog } from "@catalog/index";
import {
  advance,
  compile,
  initialRuntime,
  type RuntimeSnapshot,
} from "@simulation/index";
import { measure } from "@measurements/index";
import { DeviceFragment } from "@renderers/fragment";
import { DeviceSchematic } from "@renderers/index";
import { FunctionalDiagram } from "../packages/knowledge/Diagram";
import { reference108 } from "../packages/knowledge/reference-108";
import type { ProjectDocument } from "@model/index";

function svgState(markup: string, id: string) {
  const tag = (markup.match(/<g\b[^>]*>/g) ?? []).find((s) =>
    s.includes(`data-symbol-fragment="${id}"`),
  );
  expect(tag).toBeDefined();
  return tag!.includes('data-closed="true"');
}
function check(
  p: ProjectDocument,
  rt: RuntimeSnapshot,
  deviceId: string,
  fragmentId: string,
  expected: boolean,
) {
  const device = p.circuit.devices.find((d) => d.id === deviceId)!;
  const product = catalog[device.productId];
  const connection = product.topology.connections.find(
    (c) => c.id === fragmentId,
  )!;
  expect(compile(p, rt).some((b) => b.id === `${deviceId}/${fragmentId}`)).toBe(
    expected,
  );
  const fragment = renderToStaticMarkup(
    <svg>
      <DeviceFragment
        device={device}
        product={product}
        connection={connection}
        state={rt.devices[deviceId]}
      />
    </svg>,
  );
  expect(svgState(fragment, fragmentId)).toBe(expected);
  const whole = renderToStaticMarkup(
    <svg>
      <DeviceSchematic
        device={device}
        product={product}
        state={rt.devices[deviceId]}
      />
    </svg>,
  );
  expect(svgState(whole, fragmentId)).toBe(expected);
  const scope = {
    title: "Próba rzeczywistego styku",
    width: 500,
    height: 300,
    symbols: [
      {
        designation: device.designation,
        fragmentId,
        x: 100,
        y: 100,
        label: "Styk",
      },
    ],
    ports: [],
  };
  const functional = renderToStaticMarkup(
    <FunctionalDiagram
      project={p}
      runtime={rt}
      scope={scope}
      live
      highlight={{ deviceIds: [], terminals: [] }}
      onHighlight={() => {}}
    />,
  );
  expect(svgState(functional, fragmentId)).toBe(expected);
  // Check the actual line geometry as well as the group's state attribute.
  if (connection.kind === "contact")
    expect(fragment).toContain(`d="M40 0L80 ${expected ? 0 : -20}"`);
}
function weld(p: ProjectDocument, hidden = false, activeAtMs = 0) {
  p.faults.push({
    id: "weld",
    kind: "welded-contact",
    targetId: "K1",
    from: { deviceId: "K1", terminalId: "1L1" },
    to: { deviceId: "K1", terminalId: "2T1" },
    hidden,
    activeAtMs,
  });
}
describe("QA-01: real SVG contact state agrees with the solver and measurement", () => {
  it("healthy NO/NC at rest and after START/release/STOP", () => {
    const p = reference108.create();
    let rt = advance(p, initialRuntime(p), { type: "power", on: true });
    check(p, rt, "K1", "pole1", false);
    check(p, rt, "K1", "auxNO", false);
    check(p, rt, "K1", "auxNC", true);
    rt = advance(p, rt, { type: "operate", deviceId: "S1", state: true });
    rt = advance(p, rt, { type: "operate", deviceId: "S1", state: false });
    check(p, rt, "K1", "pole1", true);
    check(p, rt, "K1", "auxNO", true);
    check(p, rt, "K1", "auxNC", false);
    rt = advance(p, rt, {
      type: "operate",
      deviceId: "S3",
      state: true,
      actuator: "stop",
    });
    check(p, rt, "K1", "pole1", false);
    check(p, rt, "K1", "auxNC", true);
  });
  it("only the selected welded pair conducts with the coil OFF; compensated continuity is 0.005 ohm", () => {
    const p = reference108.create();
    weld(p);
    const rt = advance(p, initialRuntime(p), { type: "solve" });
    expect(rt.devices.K1.coil).toBe(false);
    check(p, rt, "K1", "pole1", true);
    check(p, rt, "K1", "pole2", false);
    check(p, rt, "K1", "auxNO", false);
    check(p, rt, "K1", "auxNC", true);
    const result = measure(p, rt, {
      function: "continuity",
      red: { deviceId: "K1", terminalId: "1L1" },
      black: { deviceId: "K1", terminalId: "2T1" },
      compensateLeads: true,
      testVoltageV: 500,
      rcdMultiplier: 1,
    });
    expect(result.status).toBe("valid");
    expect(result.value).toBeCloseTo(0.005, 8);
  });
  it("scheduled welding follows simulation time, including before the first energization", () => {
    const p = reference108.create();
    weld(p, false, 100);
    let rt = initialRuntime(p);
    check(p, rt, "K1", "pole1", false);
    rt = advance(p, rt, { type: "step", deltaMs: 99 });
    check(p, rt, "K1", "pole1", false);
    rt = advance(p, rt, { type: "step", deltaMs: 1 });
    check(p, rt, "K1", "pole1", true);
  });
  it("Q2 auxiliary shares its parent's manual/tripped state at OFF and after reset", () => {
    const p = reference108.create();
    let rt = initialRuntime(p);
    const id =
      catalog[p.circuit.devices.find((d) => d.id === "Q2.AUX")!.productId]
        .topology.connections[0].id;
    check(p, rt, "Q2.AUX", id, true);
    rt.devices.Q2.tripped = true;
    rt = advance(p, rt, { type: "solve" });
    check(p, rt, "Q2.AUX", id, false);
    rt = advance(p, rt, { type: "operate", deviceId: "Q2", reset: true });
    check(p, rt, "Q2.AUX", id, false);
    rt = advance(p, rt, { type: "operate", deviceId: "Q2", state: true });
    check(p, rt, "Q2.AUX", id, true);
  });
  it("blocked mechanism leaves NO open and NC closed even when its coil is energized", () => {
    const p = reference108.create();
    p.faults.push({
      id: "blocked",
      kind: "blocked-mechanism",
      targetId: "K1",
      hidden: false,
      activeAtMs: 0,
    });
    let rt = advance(p, initialRuntime(p), { type: "power", on: true });
    rt = advance(p, rt, { type: "operate", deviceId: "S1", state: true });
    expect(rt.devices.K1.coil).toBe(true);
    expect(rt.devices.K1.mechanism).toBe(false);
    check(p, rt, "K1", "pole1", false);
    check(p, rt, "K1", "auxNC", true);
  });
  it("hidden faults use an explicitly labelled mechanical view for every device, without naming or locating the fault", () => {
    const p = reference108.create();
    weld(p, true);
    const rt = advance(p, initialRuntime(p), { type: "solve" });
    expect(compile(p, rt).some((b) => b.id === "K1/pole1")).toBe(true);
    for (const id of ["K1", "K2"]) {
      const device = p.circuit.devices.find((d) => d.id === id)!;
      const product = catalog[device.productId];
      const markup = renderToStaticMarkup(
        <svg>
          <DeviceFragment
            device={device}
            product={product}
            connection={product.topology.connections.find(
              (c) => c.id === "pole1",
            )!}
            state={rt.devices[id]}
          />
        </svg>,
      );
      expect(svgState(markup, "pole1")).toBe(false);
      expect(markup).toContain('data-state-view="mechanism"');
      expect(markup).toContain("ciągłość sprawdź pomiarem");
      expect(markup).not.toMatch(/sklejon|weld/);
    }
    const markup = renderToStaticMarkup(
      <FunctionalDiagram
        project={p}
        runtime={rt}
        scope={reference108.diagrams[0]}
        live={false}
        highlight={{ deviceIds: [], terminals: [] }}
        onHighlight={() => {}}
      />,
    );
    expect(markup).toContain("WIDOK DOKUMENTACYJNY");
    expect(markup).toContain('data-state-view="documentary"');
  });
});

// @vitest-environment jsdom
import { afterEach, it, expect } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { DevicePhysical } from "@renderers/index";
import { catalog } from "@catalog/index";
import { scenarioProject } from "@training/index";
import { advance, initialRuntime } from "@simulation/index";
import { readFileSync } from "node:fs";
import { validateProjectDocument } from "@catalog/project-validation";
afterEach(cleanup);
it("zespół START/STOP: niezależne sterowanie klawiaturą, zwolnienie po blur/cancel i utracie capture", () => {
  const p = validateProjectDocument(
    JSON.parse(
      readFileSync("examples/physical/ELE02_108_stanowisko.json", "utf8"),
    ),
  );
  const d = p.circuit.devices.find((d) => d.id === "S1")!;
  let rt = advance(p, initialRuntime(p), { type: "power", on: true });
  const view = () => (
    <svg>
      <DevicePhysical
        device={d}
        product={catalog[d.productId]}
        state={rt.devices[d.id]}
        onOperate={(state, actuator) => {
          rt = advance(p, rt, {
            type: "operate",
            deviceId: d.id,
            state,
            actuator,
          });
        }}
      />
    </svg>
  );
  const screen = render(view());
  const start = screen.getByRole("button", { name: "Przytrzymaj S1 START" });
  const stop = screen.getByRole("button", { name: "Przytrzymaj S1 STOP" });
  fireEvent.keyDown(start, { key: " " });
  expect(rt.devices.S1.manual).toBe(true);
  expect(rt.devices.S1.stopPressed).toBeFalsy();
  expect(rt.devices.K1.mechanism).toBe(true);
  fireEvent.keyDown(stop, { key: "Enter" });
  expect(rt.devices.S1.manual).toBe(true);
  expect(rt.devices.S1.stopPressed).toBe(true);
  expect(rt.devices.K1.mechanism).toBe(false);
  fireEvent.blur(start);
  expect(rt.devices.S1.manual).toBe(false);
  expect(rt.devices.S1.stopPressed).toBe(true);
  fireEvent.keyUp(stop, { key: "Enter" });
  expect(rt.devices.S1.stopPressed).toBe(false);
  fireEvent.keyDown(start, { key: "Enter" });
  fireEvent.pointerCancel(start);
  expect(rt.devices.S1.manual).toBe(false);
  fireEvent.keyDown(stop, { key: " " });
  fireEvent.lostPointerCapture(stop);
  expect(rt.devices.S1.stopPressed).toBe(false);
});
it("Q2: wskazanie TRIPPED, reset przez OFF oraz edytowalne pokrętło nastawy", () => {
  const p = validateProjectDocument(
    JSON.parse(
      readFileSync("examples/physical/ELE02_108_stanowisko.json", "utf8"),
    ),
  );
  const d = p.circuit.devices.find((d) => d.id === "Q2")!;
  let rt = advance(p, initialRuntime(p), { type: "power", on: true });
  rt.devices.Q2.tripped = true;
  let current = 0;
  const view = () => (
    <svg>
      <DevicePhysical
        device={d}
        product={catalog[d.productId]}
        state={rt.devices[d.id]}
        onOperate={(state) => {
          rt = advance(p, rt, { type: "operate", deviceId: d.id, state });
        }}
        onSetCurrent={(value) => {
          current = value;
        }}
      />
    </svg>
  );
  const screen = render(view());
  const lever = screen.getByRole("button", { name: "Przełącz Q2" });
  expect(lever.getAttribute("data-motor-protection")).toBe("tripped");
  fireEvent.keyDown(lever, { key: "Enter" });
  expect(rt.devices.Q2.tripped).toBe(false);
  expect(rt.devices.Q2.manual).toBe(false);
  screen.rerender(view());
  expect(lever.getAttribute("data-motor-protection")).toBe("off");
  fireEvent.click(lever);
  expect(rt.devices.Q2.manual).toBe(true);
  fireEvent.keyDown(screen.getByRole("button", { name: "Nastawa Q2 [A]" }), {
    key: "ArrowUp",
  });
  expect(current).toBe(4.45);
  fireEvent.click(screen.getByRole("button", { name: "Nastawa Q2 [A]" }), {
    shiftKey: true,
  });
  expect(current).toBe(4.25);
});
it("RCD ma niezależny TEST i dźwignię resetującą przez OFF, również z klawiatury", () => {
  const p = scenarioProject("distribution"),
    d = p.circuit.devices.find((d) => d.designation === "FI1")!;
  let rt = advance(p, initialRuntime(p), { type: "power", on: true });
  let selected = 0,
    tests = 0;
  const renderDevice = () => (
    <svg>
      <DevicePhysical
        device={d}
        product={catalog[d.productId]}
        state={rt.devices[d.id]}
        onSelect={() => selected++}
        onOperate={(state) => {
          rt = advance(p, rt, { type: "operate", deviceId: d.id, state });
        }}
        onRcdTest={() => {
          tests++;
          rt = advance(p, rt, { type: "test-rcd", deviceId: d.id });
        }}
      />
    </svg>
  );
  const screen = render(renderDevice());
  const lever = screen.getByRole("button", { name: "Przełącz FI1" });
  const test = screen.getByRole("button", { name: "TEST FI1" });
  expect(lever.getAttribute("data-rcd-lever")).toBe("on");
  fireEvent.click(test);
  expect(rt.devices[d.id].tripped).toBe(true);
  expect(selected).toBe(0);
  screen.rerender(renderDevice());
  expect(lever.getAttribute("data-rcd-lever")).toBe("tripped");
  fireEvent.click(lever);
  expect(rt.devices[d.id].manual).toBe(false);
  expect(rt.devices[d.id].tripped).toBe(false);
  screen.rerender(renderDevice());
  expect(lever.getAttribute("data-rcd-lever")).toBe("off");
  fireEvent.keyDown(lever, { key: "Enter" });
  screen.rerender(renderDevice());
  expect(lever.getAttribute("data-rcd-lever")).toBe("on");
  fireEvent.keyDown(test, { key: "Enter", repeat: true });
  expect(tests).toBe(1);
  fireEvent.keyDown(test, { key: " " });
  expect(tests).toBe(2);
  expect(rt.devices[d.id].tripped).toBe(true);
  expect(selected).toBe(0);
});
it("przycisk START jest chwilowy również z klawiatury i po utracie fokusu", () => {
  const p = scenarioProject("start-stop"),
    d = p.circuit.devices.find((d) => d.designation === "S1")!;
  let rt = advance(p, initialRuntime(p), { type: "power", on: true });
  const props = {
    device: d,
    product: catalog[d.productId],
    state: rt.devices[d.id],
    showTerminals: true,
    zoom: 1,
    onOperate: (state?: boolean) => {
      rt = advance(p, rt, { type: "operate", deviceId: d.id, state });
    },
  };
  const screen = render(
      <svg>
        <DevicePhysical {...props} />
      </svg>,
    ),
    button = screen.getByRole("button", { name: "Przytrzymaj S1" });
  fireEvent.keyDown(button, { key: " " });
  expect(rt.devices[d.id].manual).toBe(true);
  fireEvent.keyUp(button, { key: " " });
  expect(rt.devices[d.id].manual).toBe(false);
  fireEvent.keyDown(button, { key: " " });
  fireEvent.blur(button);
  expect(rt.devices[d.id].manual).toBe(false);
  expect(
    rt.devices[p.circuit.devices.find((d) => d.designation === "K1")!.id]
      .mechanism,
  ).toBe(true);
});
it("XB5AA35: jeden przycisk steruje NO/NC i wraca po puszczeniu klawisza", () => {
  const p = scenarioProject("exam-start-stop"),
    d = p.circuit.devices.find((d) => d.designation === "S1")!;
  let rt = advance(p, initialRuntime(p), { type: "power", on: true });
  const screen = render(
    <svg>
      <DevicePhysical
        product={catalog[d.productId]}
        device={d}
        state={rt.devices[d.id]}
        onOperate={(state) => {
          rt = advance(p, rt, { type: "operate", deviceId: d.id, state });
        }}
      />
    </svg>,
  );
  const button = screen.getByRole("button", { name: "Przytrzymaj S1" });
  fireEvent.keyDown(button, { key: "Enter" });
  expect(rt.devices[d.id].manual).toBe(true);
  expect(
    rt.devices[p.circuit.devices.find((d) => d.designation === "K1")!.id]
      .mechanism,
  ).toBe(true);
  fireEvent.keyUp(button, { key: "Enter" });
  expect(rt.devices[d.id].manual).toBe(false);
  expect(
    rt.devices[p.circuit.devices.find((d) => d.designation === "K1")!.id]
      .mechanism,
  ).toBe(true);
  fireEvent.keyDown(button, { key: " " });
  fireEvent.blur(button);
  expect(rt.devices[d.id].manual).toBe(false);
});

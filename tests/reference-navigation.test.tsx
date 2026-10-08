// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  act,
  cleanup,
} from "@testing-library/react";
import { referenceCopy } from "../packages/knowledge/reference-examples";
import { useApp } from "../apps/web/src/store";
import { initialRuntime } from "@simulation/index";
import {
  openKnowledge,
  boardCameras,
} from "../apps/web/src/knowledge-navigation";
import {
  openReferenceHelp,
  closeReferenceHelp,
  useReferenceHelp,
} from "../apps/web/src/reference-navigation";
import { ReferenceHelp } from "../apps/web/src/ReferenceHelp";
vi.mock("../apps/web/src/persistence", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../apps/web/src/persistence")>()),
  saveProject: vi.fn().mockResolvedValue(undefined),
}));
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "Worker",
    class {
      postMessage() {}
    },
  );
  location.hash = "workbench";
  const p = referenceCopy("ele02-101");
  useApp.setState({
    project: p,
    runtime: initialRuntime(p),
    selection: ["Q1"],
    knowledgeHighlight: [],
    wireStart: { deviceId: "Q1", terminalId: "1" },
    waypoints: [{ x: 100, y: 200 }],
    history: [],
    future: [],
    saveStatus: "saved",
    view: "split",
  });
  useReferenceHelp.setState({ context: null });
});
afterEach(() => {
  cleanup();
  closeReferenceHelp();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("R9: separate help gesture, started wire, solver, history, camera and focus survive help/return", async () => {
  const button = document.createElement("button");
  document.body.append(button);
  button.focus();
  boardCameras.physical = { scale: 1.4, x: 70, y: -100 };
  const before = useApp.getState();
  render(<ReferenceHelp />);
  await act(async () => {
    await openKnowledge("edu-changeover", "Q1", "1");
  });
  expect(location.hash).toBe("#workbench");
  expect(screen.getByRole("heading", { name: "Q1:1" })).toBe(
    document.activeElement,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Śledź: Korespondencja 1" }),
  );
  expect(useApp.getState().selection).toEqual(["W20", "W21", "W22"]);
  expect(useApp.getState().knowledgeHighlight).toContainEqual({
    deviceId: "Q2",
    terminalId: "1",
  });
  fireEvent.click(screen.getByRole("button", { name: "Schowaj pomoc" }));
  const after = useApp.getState();
  expect(after.project).toBe(before.project);
  expect(after.runtime).toBe(before.runtime);
  expect(after.history).toBe(before.history);
  expect(after.future).toBe(before.future);
  expect(after.wireStart).toBe(before.wireStart);
  expect(after.waypoints).toBe(before.waypoints);
  expect(after.selection).toEqual(before.selection);
  expect(after.view).toBe("split");
  expect(boardCameras.physical).toEqual({ scale: 1.4, x: 70, y: -100 });
  expect(document.activeElement).toBe(button);
  button.remove();
});
it("R6/R9: electrical edits invalidate an open panel; unknown and unbound objects never redirect", () => {
  render(<ReferenceHelp />);
  expect(openReferenceHelp({ deviceId: "missing" })).toBe(false);
  expect(openReferenceHelp({ wireId: "missing" })).toBe(false);
  act(() => {
    expect(openReferenceHelp({ wireId: "W21" })).toBe(true);
  });
  const p = structuredClone(useApp.getState().project);
  p.circuit.revision++;
  act(() => {
    useApp.setState({ project: p });
  });
  expect(screen.getByText(/Projekt został zmieniony/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Wskaż końce/ })).toBeNull();
  closeReferenceHelp();
  p.userMetadata = {};
  useApp.setState({ project: p });
  expect(openReferenceHelp({ deviceId: "Q1" })).toBe(false);
});

it("01b: contact/coil and real R2 wire help share the 108 apparatus and return to its own lesson", () => {
  const p = referenceCopy("ele02-108");
  useApp.setState({
    project: p,
    runtime: initialRuntime(p),
    selection: ["K1"],
  });
  render(<ReferenceHelp />);
  act(() => {
    expect(openReferenceHelp({ deviceId: "K1", symbolId: "auxNO" })).toBe(true);
  });
  expect(
    screen.getByRole("complementary", { name: "Pomoc w układzie ELE.02-108" }),
  ).toBeTruthy();
  expect(screen.getByText(/Własny NO 13–14/)).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "Lekcja i pełna tabela połączeń" })
      .getAttribute("href"),
  ).toBe("#/wiedza/uklady/ele02-108");
  closeReferenceHelp();
  act(() => {
    expect(openReferenceHelp({ wireId: "W35" })).toBe(true);
  });
  expect(screen.getByText(/S3:4/)).toBeTruthy();
});

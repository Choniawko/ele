import { catalog, type InternalConnection } from "@catalog/index";
import type { DeviceInstance, ProjectDocument } from "@model/index";
import type { DeviceRuntime, RuntimeSnapshot } from "./index";
import { auxiliaryMechanism, mechanismOwner } from "./mechanisms";

export interface InternalConnectionState {
  mechanicalClosed: boolean;
  conducting: boolean;
  displayClosed: boolean;
  displayMode: "continuity" | "mechanism";
}
type MechanismState = Pick<
  DeviceRuntime,
  "manual" | "stopPressed" | "mechanism" | "tripped"
>;

// The mechanism and the electrical path differ for a welded contact.
export function mechanicalConnectionClosed(
  c: Pick<InternalConnection, "condition">,
  s?: Partial<MechanismState>,
) {
  switch (c.condition) {
    case "manual":
      return !!s?.manual && !s?.tripped;
    case "manual-inverse":
      return !s?.manual;
    case "stop-inverse":
      return !s?.stopPressed;
    case "mechanism":
      return !!s?.mechanism;
    case "mechanism-inverse":
      return !s?.mechanism;
    case "healthy":
      return !s?.tripped;
    case "tripped":
      return !!s?.tripped;
    default:
      return true;
  }
}
export function resolveConnectionState(
  project: ProjectDocument,
  runtime: Pick<RuntimeSnapshot, "devices" | "timeMs">,
  device: DeviceInstance,
  connection: InternalConnection,
): InternalConnectionState {
  const state: Partial<MechanismState> = runtime.devices[device.id] ?? {
    manual: !!device.settings.position,
  };
  const mechanism =
    catalog[device.productId].behaviorId === "auxiliary"
      ? auxiliaryMechanism(project, runtime, device.id)
      : state.mechanism;
  const mechanicalClosed = mechanicalConnectionClosed(connection, {
    ...state,
    mechanism,
  });
  const active = project.faults.filter(
    (f) => f.targetId === device.id && f.activeAtMs <= runtime.timeMs,
  );
  const welded =
    connection.kind === "contact" &&
    active.some(
      (f) =>
        f.kind === "welded-contact" &&
        (f.from && f.to
          ? f.from.deviceId === device.id &&
            f.to.deviceId === device.id &&
            ((f.from.terminalId === connection.from &&
              f.to.terminalId === connection.to) ||
              (f.from.terminalId === connection.to &&
                f.to.terminalId === connection.from))
          : connection.condition === "mechanism" ||
            connection.condition === "manual"),
    );
  const conducting =
    connection.kind === "coil"
      ? !active.some((f) => f.kind === "open-coil")
      : welded || mechanicalClosed;
  // Use one mode for the entire diagnostic exercise, including before activation.
  // A per-contact mode would disclose the location/time of a hidden fault.
  const displayMode = project.faults.some((f) => f.hidden)
    ? "mechanism"
    : "continuity";
  return {
    mechanicalClosed,
    conducting,
    displayClosed: displayMode === "mechanism" ? mechanicalClosed : conducting,
    displayMode,
  };
}
export function refreshConnectionStates(
  project: ProjectDocument,
  runtime: RuntimeSnapshot,
) {
  for (const device of project.circuit.devices) {
    const state = runtime.devices[device.id];
    if (state)
      state.connections = Object.fromEntries(
        catalog[device.productId].topology.connections.map((c) => [
          c.id,
          resolveConnectionState(project, runtime, device, c),
        ]),
      );
  }
}
export function connectionDisplay(
  c: Pick<InternalConnection, "id" | "condition">,
  state?: DeviceRuntime,
) {
  return (
    state?.connections?.[c.id] ?? {
      displayClosed: mechanicalConnectionClosed(c, state),
      displayMode: "mechanism" as const,
    }
  );
}
export function documentaryConnectionClosed(
  project: ProjectDocument,
  device: DeviceInstance,
  c: InternalConnection,
) {
  const owner = mechanismOwner(project, device.id);
  return mechanicalConnectionClosed(c, {
    manual: !!device.settings.position,
    mechanism: owner
      ? !!project.circuit.devices.find((d) => d.id === owner)?.settings.position
      : false,
  });
}

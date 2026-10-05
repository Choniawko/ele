import { catalog } from "@catalog/index";
import {
  emptyProject,
  newId,
  type ProjectDocument,
  type Role,
  type DeviceSettings,
} from "@model/index";
export const colors: Record<Role, string> = {
  L1: "#755038",
  L2: "#35383d",
  L3: "#8d9398",
  N: "#3b87be",
  PE: "#3b9b55",
  CONTROL: "#e28148",
  DC_PLUS: "#cc514f",
  DC_MINUS: "#354355",
  UNSPECIFIED: "#a486b8",
};
export class Builder {
  project: ProjectDocument;
  constructor(name: string) {
    this.project = emptyProject(name);
  }
  add(
    productId: string,
    designation: string,
    x: number,
    y: number,
    settings: DeviceSettings = {},
  ) {
    const p = catalog[productId],
      id = newId("d");
    this.project.circuit.devices.push({
      id,
      productId,
      productRevision: p.revision,
      designation,
      settings: { ...p.defaults, ...settings },
    });
    this.project.productRevisions[productId] = p.revision;
    this.project.physical.devices[id] = { x, y };
    const n = this.project.circuit.devices.length - 1;
    this.project.schematic.devices[id] = {
      x: 80 + (n % 5) * 190,
      y: 80 + Math.floor(n / 5) * 520,
    };
    if (p.behaviorId.startsWith("source-"))
      this.project.circuit.supplySystems.push({
        id: newId("supply"),
        kind: p.behaviorId === "source-dc" ? "isolated-DC" : "TN-S",
        sourceId: id,
      });
    return id;
  }
  wire(a: string, ta: string, b: string, tb: string, role: Role = "L1") {
    const id = newId("w");
    this.project.circuit.conductors.push({
      id,
      from: { deviceId: a, terminalId: ta },
      to: { deviceId: b, terminalId: tb },
      declaredRole: role,
      insulationColor: colors[role],
      crossSectionMm2: 1.5,
      electricalLengthM: 2,
      material: "Cu",
      marking: `W${this.project.circuit.conductors.length + 1}`,
    });
    return id;
  }
  bus(
    source: string,
    terminal: string,
    role: "N" | "PE" | "L1",
    x: number,
    y: number,
  ) {
    const b = this.add(
      role === "PE" ? "edu-bus-pe" : "edu-bus-n",
      role === "PE" ? "XPE1" : role === "N" ? "XN1" : "XL1",
      x,
      y,
    );
    this.wire(source, terminal, b, "1", role);
    return b;
  }
}

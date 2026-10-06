import { catalog } from "@catalog/index";
import type { ProjectDocument } from "@model/index";
import type { RuntimeSnapshot } from "./index";

export function mechanismOwner(
  project: ProjectDocument,
  id: string,
): string | undefined {
  for (const assembly of project.circuit.mechanicalCouplings.filter(
    (c) => c.kind === "assembly" && c.deviceIds.includes(id),
  )) {
    const owner = assembly.deviceIds.find((other) => {
      const d = project.circuit.devices.find((d) => d.id === other);
      return (
        d &&
        (catalog[d.productId].topology.coil ||
          ["push-no", "push-nc", "push-multi"].includes(
            catalog[d.productId].behaviorId,
          ))
      );
    });
    if (owner) return owner;
  }
}
export function mechanicallyBlocked(
  project: ProjectDocument,
  rt: RuntimeSnapshot,
  id: string,
): boolean {
  return project.circuit.mechanicalCouplings.some(
    (c) =>
      c.kind === "interlock" &&
      c.deviceIds.includes(id) &&
      c.deviceIds.some((other) => other !== id && rt.devices[other]?.mechanism),
  );
}

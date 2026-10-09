import type { ProjectDocument } from "@model/index";
export const referenceTopology = (p: ProjectDocument) =>
  JSON.stringify({
    devices: p.circuit.devices.map(({ id, productId, productRevision }) => ({
      id,
      productId,
      productRevision,
    })),
    conductors: p.circuit.conductors.map(({ id, from, to }) => ({
      id,
      from,
      to,
    })),
    bridges: p.circuit.bridges,
    cables: p.circuit.cables,
    couplings: p.circuit.mechanicalCouplings,
    supplies: p.circuit.supplySystems,
  });

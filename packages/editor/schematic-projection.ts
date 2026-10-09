import { catalog } from "@catalog/index";
import type { ProjectDocument, TerminalRef } from "@model/index";
import { schematicGeometry } from "@renderers/index";
import { fragmentGeometry } from "@renderers/fragment";

export function schematicProjection(p: ProjectDocument) {
  const placements = p.schematic.symbolFragments?.placements ?? {};
  const elements = p.circuit.devices.flatMap((device) => {
    const fragments = Object.entries(placements).filter(
      ([, f]) => f.deviceId === device.id,
    );
    if (!fragments.length)
      return [
        {
          id: device.id,
          device,
          position: p.schematic.devices[device.id],
          geometry: schematicGeometry(catalog[device.productId]),
          fragmentId: undefined as string | undefined,
        },
      ];
    return fragments.map(([id, f]) => {
      const connection = catalog[device.productId].topology.connections.find(
        (c) => c.id === f.fragmentId,
      )!;
      return {
        id,
        device,
        position: f.position,
        fragmentId: f.fragmentId,
        geometry: {
          width: fragmentGeometry.width,
          height: fragmentGeometry.height,
          ports: {
            [connection.from]: fragmentGeometry.from,
            [connection.to]: fragmentGeometry.to,
          },
        },
      };
    });
  });
  const endpoint = (ref: TerminalRef) => {
    const cell = elements.find(
      (e) => e.device.id === ref.deviceId && e.geometry.ports[ref.terminalId],
    );
    if (!cell)
      throw Error(`Brak symbolu zacisku ${ref.deviceId}:${ref.terminalId}`);
    return { id: cell.id, port: ref.terminalId };
  };
  const point = (ref: TerminalRef) => {
    const end = endpoint(ref),
      cell = elements.find((e) => e.id === end.id)!;
    const at = cell.geometry.ports[ref.terminalId];
    return { x: cell.position.x + at.x, y: cell.position.y + at.y };
  };
  return { elements, endpoint, point };
}

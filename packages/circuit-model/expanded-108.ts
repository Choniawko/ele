import type { ProjectDocument } from "./index";

// Positions only. Every fragment resolves to the existing catalog topology;
// the circuit remains the sole owner of connections and mechanisms.
export function layout108(p: ProjectDocument) {
  p.schematic.symbolFragments = { version: "1", placements: {} };
  const put = (deviceId: string, fragmentId: string, x: number, y: number) => {
    p.schematic.symbolFragments!.placements[
      `symbol:${deviceId}:${fragmentId}`
    ] = { deviceId, fragmentId, position: { x, y } };
  };
  for (let i = 0; i < 3; i++) {
    put("Q2", `pole${i + 1}`, 310, 120 + i * 150);
    put("K1", `pole${i + 1}`, 550, 120 + i * 150);
    put("K2", `pole${i + 1}`, 790, 120 + i * 150);
  }
  put("Q1", "pole1", 80, 600);
  put("Q2.AUX", "no", 320, 600);
  put("S1", "stop", 560, 600);
  put("S3", "stop", 800, 600);
  put("S1", "start", 320, 830);
  put("S3", "start", 320, 960);
  put("K1", "auxNO", 320, 1090);
  put("K2", "auxNC", 640, 960);
  put("K1", "coil", 940, 960);
  put("S2", "no", 320, 1310);
  put("S4", "no", 320, 1440);
  put("K1", "auxNC", 640, 1310);
  put("K2", "coil", 940, 1310);
  // Unused K2 NO still exists on the real profile, but is not self-holding.
  put("K2", "auxNO", 800, 1590);
  Object.assign(p.schematic.devices, {
    PZ: { x: 60, y: 100 },
    M: { x: 1100, y: 100 },
    "ZS.PE": { x: 1110, y: 430 },
    "ZS.N": { x: 1200, y: 1440 },
    "ZS.RES1": { x: 60, y: 1590 },
    "ZS.RES2": { x: 300, y: 1590 },
  });
  for (const placement of Object.values(p.schematic.symbolFragments.placements))
    p.schematic.devices[placement.deviceId] = { ...placement.position };
  return p;
}

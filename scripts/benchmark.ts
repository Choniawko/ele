import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import {
  catalog,
  assertProjectCatalog,
} from "../packages/device-catalog/index";
import {
  emptyProject,
  type TerminalRef,
} from "../packages/circuit-model/index";
import { advance, initialRuntime } from "../packages/simulation/index";
const p = emptyProject("Benchmark · 100 aparatów / 300 żył"),
  count = new Map<string, number>();
function add(id: string, productId: string, designation: string) {
  const product = catalog[productId],
    n = p.circuit.devices.length;
  p.circuit.devices.push({
    id,
    productId,
    productRevision: product.revision,
    designation,
    settings: { ...product.defaults },
  });
  p.productRevisions[productId] = product.revision;
  p.physical.devices[id] = {
    x: 65 + (n % 10) * 200,
    y: 90 + Math.floor(n / 10) * 295,
  };
  p.schematic.devices[id] = {
    x: 80 + (n % 10) * 190,
    y: 80 + Math.floor(n / 10) * 520,
  };
}
add("g", "edu-source-ac", "G1");
for (let i = 0; i < 49; i++) {
  add(`l${i}`, "edu-bus-n", `XL${i + 1}`);
  add(`n${i}`, "edu-bus-n", `XN${i + 1}`);
}
add("h", "edu-lamp", "H1");
p.circuit.supplySystems.push({ id: "supply", kind: "TN-S", sourceId: "g" });
const pin = (id: string): TerminalRef => {
  const n = count.get(id) ?? 0;
  count.set(id, n + 1);
  return { deviceId: id, terminalId: String(Math.floor(n / 3) + 1) };
};
function wire(
  from: TerminalRef,
  to: TerminalRef,
  role: "L1" | "N" | "PE" = "L1",
) {
  p.circuit.conductors.push({
    id: `w${p.circuit.conductors.length}`,
    from,
    to,
    declaredRole: role,
    insulationColor:
      role === "N" ? "#4c7fac" : role === "PE" ? "#69a34b" : "#8b6353",
    crossSectionMm2: 2.5,
    electricalLengthM: 2,
    material: "Cu",
    marking: `W${p.circuit.conductors.length + 1}`,
  });
}
wire({ deviceId: "g", terminalId: "L" }, pin("l0"));
wire({ deviceId: "g", terminalId: "N" }, pin("n0"), "N");
for (const prefix of ["l", "n"])
  for (let i = 0; i < 49; i++)
    for (const offset of [1, 2, 3])
      wire(
        pin(`${prefix}${i}`),
        pin(`${prefix}${(i + offset) % 49}`),
        prefix === "l" ? "L1" : "N",
      );
wire(pin("l48"), { deviceId: "h", terminalId: "L" });
wire(pin("n48"), { deviceId: "h", terminalId: "N" }, "N");
wire(
  { deviceId: "g", terminalId: "PE" },
  { deviceId: "h", terminalId: "PE" },
  "PE",
);
wire(pin("l0"), pin("l25"));
assertProjectCatalog(p);
const times: number[] = [];
let rt = initialRuntime(p);
for (let i = 0; i < 30; i++) {
  const start = performance.now();
  rt = advance(
    p,
    rt,
    i === 0 ? { type: "power", on: true } : { type: "step", deltaMs: 200 },
  );
  times.push(performance.now() - start);
  if (rt.status !== "valid") throw new Error(rt.errors.join(";"));
}
times.sort((a, b) => a - b);
const result = {
  devices: p.circuit.devices.length,
  wires: p.circuit.conductors.length,
  runs: times.length,
  medianMs: times[15],
  p95Ms: times[28],
  maxMs: times[29],
  lampPowered: rt.devices.h.powered,
};
await mkdir("docs/qa", { recursive: true });
await writeFile("docs/qa/benchmark-project.json", JSON.stringify(p));
await writeFile(
  "docs/qa/solver-benchmark.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(result);

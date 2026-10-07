import { writeFileSync } from "node:fs";
import {
  emptyProject,
  type DeviceSettings,
  type Role,
  type Point,
} from "@model/index";
import { catalog } from "@catalog/index";
import { validateProjectDocument } from "@catalog/project-validation";
import { colors } from "@training/builder";

const p = emptyProject("ELE.02-101 · stanowisko montażowe");
p.circuit.projectId = "ele02-101-physical-v1";
p.userMetadata = {
  reference:
    "ele_02_101 (2).pdf: strony 1–3, 5, 7–8; zdjęcie stanowiska przekazane przez użytkownika",
  geometry:
    "Układ proporcjonalny, bez skali 1:1; obudowy i produkty dydaktyczne.",
};
function add(
  id: string,
  productId: string,
  x: number,
  y: number,
  settings: DeviceSettings = {},
) {
  const product = catalog[productId],
    n = p.circuit.devices.length;
  p.circuit.devices.push({
    id,
    designation: id,
    productId,
    productRevision: product.revision,
    settings: { ...product.defaults, ...settings },
  });
  p.productRevisions[productId] = product.revision;
  p.physical.devices[id] = { x, y };
  p.schematic.devices[id] = {
    x: 80 + (n % 5) * 200,
    y: 100 + Math.floor(n / 5) * 320,
  };
  return id;
}
add("PZ", "edu-source-ac", 146, 85);
p.circuit.supplySystems = [{ id: "supply-PZ", kind: "TN-S", sourceId: "PZ" }];
add("RCD", "edu-rcd", 115, 395);
add("B10", "edu-mcb-adjustable", 228, 395, { ratedCurrentA: 10 });
add("H1", "edu-indicator-green-230", 274, 395);
add("B6", "edu-mcb-adjustable", 320, 395, { ratedCurrentA: 6 });
add("H2", "edu-indicator-green-230", 366, 395);
add("R.L", "edu-phase-distribution", 115, 615);
add("R.L10", "edu-splice-3", 245, 615);
add("R.L6", "edu-splice-3", 365, 615);
add("R.N", "edu-bus-n", 115, 710);
add("R.PE", "edu-bus-pe", 345, 710);
add("OP1", "edu-bulkhead-40", 624, 55);
add("OP2", "edu-bulkhead-40", 974, 55);
add("Q1", "edu-changeover", 620, 790);
add("Q2", "edu-changeover", 970, 790);
add("GW", "edu-socket", 1284, 790);
for (const [box, x, names] of [
  ["P1", 622, ["T1", "T2", "N", "PE"]],
  ["P2", 972, ["T1", "Ls", "N", "PE"]],
] as const) {
  names.forEach((name, i) =>
    add(
      `${box}.${name}`,
      "edu-junction-terminal",
      x + (i % 2) * 96,
      422 + Math.floor(i / 2) * 83,
    ),
  );
}
p.physical.enclosures = [
  {
    id: "case-PZ",
    name: "PZ",
    kind: "supply",
    position: { x: 130, y: 50 },
    width: 190,
    height: 210,
    deviceIds: ["PZ"],
    closed: true,
  },
  {
    id: "case-R",
    name: "R · 8M",
    kind: "distribution",
    position: { x: 95, y: 340 },
    width: 460,
    height: 470,
    deviceIds: p.circuit.devices
      .filter(
        (d) =>
          ["RCD", "B10", "H1", "B6", "H2"].includes(d.id) ||
          d.id.startsWith("R."),
      )
      .map((d) => d.id),
    window: { x: 15, y: 102, width: 310, height: 106 },
    closed: true,
  },
  ...([1, 2] as const).map((i) => ({
    id: `case-P${i}`,
    name: `P${i}`,
    kind: "junction" as const,
    position: { x: i === 1 ? 602 : 952, y: 390 },
    width: 176,
    height: 176,
    deviceIds: p.circuit.devices
      .filter((d) => d.id.startsWith(`P${i}.`))
      .map((d) => d.id),
    closed: true,
  })),
];
p.physical.rails = [{ id: "rail-R", x: 110, y: 460, width: 310 }];
p.physical.presentation = "external";
p.physical.trunking = [
  {
    id: "trunk-main",
    name: "R–P1–P2–GW",
    points: [
      { x: 555, y: 478 },
      { x: 1390, y: 478 },
      { x: 1390, y: 790 },
    ],
    width: 36,
    conductorIds: [],
    closed: true,
  },
  {
    id: "trunk-supply",
    name: "PZ–R",
    points: [
      { x: 225, y: 260 },
      { x: 225, y: 340 },
    ],
    width: 36,
    conductorIds: [],
    closed: true,
  },
  ...([1, 2] as const).flatMap((i) => [
    {
      id: `trunk-OP${i}`,
      name: `OP${i}–P${i}`,
      points: [
        { x: i === 1 ? 690 : 1040, y: 264 },
        { x: i === 1 ? 690 : 1040, y: 390 },
      ],
      width: 36,
      conductorIds: [],
      closed: true,
    },
    {
      id: `trunk-Q${i}`,
      name: `P${i}–Q${i}`,
      points: [
        { x: i === 1 ? 690 : 1040, y: 566 },
        { x: i === 1 ? 690 : 1040, y: 790 },
      ],
      width: 36,
      conductorIds: [],
      closed: true,
    },
  ]),
];
function terminal(id: string, t: string): Point {
  const d = p.circuit.devices.find((d) => d.id === id)!,
    pin = catalog[d.productId].topology.terminals.find((pin) => pin.id === t)!;
  return {
    x: p.physical.devices[id].x + pin.x * 2.2,
    y: p.physical.devices[id].y + pin.y * 2.2,
  };
}
function wire(
  a: string,
  ta: string,
  b: string,
  tb: string,
  role: Role = "L1",
  section = 1.5,
) {
  const id = `W${p.circuit.conductors.length + 1}`;
  p.circuit.conductors.push({
    id,
    from: { deviceId: a, terminalId: ta },
    to: { deviceId: b, terminalId: tb },
    declaredRole: role,
    insulationColor: colors[role],
    crossSectionMm2: section,
    electricalLengthM: a.startsWith("R.") && b.startsWith("R.") ? 0.3 : 2,
    material: "Cu",
    marking: id,
  });
  const path: Point[] = [];
  const boxOf = (id: string) =>
    p.physical.enclosures!.find((e) => e.deviceIds.includes(id));
  const boxA = boxOf(a),
    boxB = boxOf(b);
  // Teaching length estimates, separate from screen geometry and not surveyed dimensions.
  p.circuit.conductors.at(-1)!.electricalLengthM =
    boxA && boxB && boxA.id === boxB.id
      ? 0.3
      : a === "PZ" || b === "PZ"
        ? 0.6
        : a === "GW" || b === "GW"
          ? 1.6
          : (a.startsWith("P2.") && b === "OP1") ||
              (a.startsWith("P1.") && b === "Q2")
            ? 0.95
            : a.startsWith("R.") && b === "Q1"
              ? 0.9
              : boxA?.id === "case-R" || boxB?.id === "case-R"
                ? 0.7
                : a.startsWith("P1.") && b.startsWith("P2.")
                  ? 0.5
                  : 0.6;
  const xBranch = (id: string) => (id.includes("1") ? 690 : 1040);
  const attach = (id: string, at: Point, outgoing: boolean) => {
    const box = boxOf(id),
      points: Point[] = [];
    if (box?.id === "case-PZ")
      points.push({ x: 225, y: 285 }, { x: 225, y: 320 });
    else if (box?.id === "case-R") {
      const product =
        catalog[p.circuit.devices.find((d) => d.id === id)!.productId];
      const pos = p.physical.devices[id],
        bottom = at.y > pos.y + product.dimensions.value!.height * 1.1;
      const exitY = bottom
        ? Math.min(
            pos.y + product.dimensions.value!.height * 2.2 + 30,
            box.position.y + box.height - 4,
          )
        : pos.y - 30;
      const sideX = box.position.x + box.width - 18;
      points.push({ x: sideX, y: exitY }, { x: sideX, y: 478 });
    } else if (box)
      points.push(
        { x: box.position.x + box.width / 2, y: at.y + 22 },
        { x: box.position.x + box.width / 2, y: 478 },
      );
    else if (id.startsWith("OP"))
      points.push({ x: xBranch(id), y: 290 }, { x: xBranch(id), y: 478 });
    else if (id.startsWith("Q")) {
      const sideX = p.physical.devices[id].x - 25;
      points.push(
        { x: at.x, y: at.y > 900 ? 976 : 766 },
        { x: sideX, y: at.y > 900 ? 976 : 766 },
        { x: sideX, y: 600 },
        { x: xBranch(id), y: 600 },
        { x: xBranch(id), y: 478 },
      );
    } else if (id === "GW")
      points.push(
        { x: at.x, y: 994 },
        { x: 1530, y: 994 },
        { x: 1530, y: 735 },
        { x: 1390, y: 735 },
        { x: 1390, y: 478 },
      );
    return outgoing ? points : points.reverse();
  };
  const from = terminal(a, ta),
    to = terminal(b, tb);
  if (boxA?.id !== boxB?.id || !boxA) {
    path.push(...attach(a, from, true), ...attach(b, to, false));
    const lane = (((p.circuit.conductors.length - 1) % 9) - 4) * 3;
    p.physical.routes[id] = path.map((point) => ({
      x: [690, 1040, 1390, 225].includes(point.x) ? point.x + lane : point.x,
      y: point.y === 478 ? point.y + lane : point.y,
    }));
  }
  for (const t of p.physical.trunking!) {
    const uses =
      t.id === "trunk-main"
        ? !(boxA?.id === boxB?.id) && a !== "PZ" && b !== "PZ"
        : t.id === "trunk-supply"
          ? a === "PZ" || b === "PZ"
          : t.id === `trunk-${a}` || t.id === `trunk-${b}`;
    if (uses) t.conductorIds.push(id);
  }
}
wire("PZ", "L", "RCD", "1", "L1", 2.5);
wire("PZ", "N", "RCD", "N-in", "N", 2.5);
wire("PZ", "PE", "R.PE", "1", "PE", 2.5);
wire("RCD", "2", "R.L", "1", "L1", 2.5);
wire("R.L", "2", "B10", "1", "L1", 2.5);
wire("R.L", "3", "B6", "1", "L1", 2.5);
wire("RCD", "N-out", "R.N", "1", "N", 2.5);
wire("B10", "2", "R.L10", "1", "L1", 2.5);
wire("R.L10", "2", "H1", "L", "L1", 2.5);
wire("R.L10", "3", "GW", "L", "L1", 2.5);
wire("B6", "2", "R.L6", "1", "L1", 2.5);
wire("R.L6", "2", "H2", "L", "L1", 2.5);
wire("R.L6", "3", "Q1", "COM");
wire("R.N", "2", "H1", "N", "N", 2.5);
wire("R.N", "3", "H2", "N", "N", 2.5);
wire("R.N", "4", "GW", "N", "N", 2.5);
wire("R.N", "5", "P1.N", "1", "N");
wire("R.PE", "2", "GW", "PE", "PE", 2.5);
wire("R.PE", "3", "P1.PE", "1", "PE");
wire("Q1", "1", "P1.T1", "1", "CONTROL");
wire("P1.T1", "2", "P2.T1", "1", "CONTROL");
wire("P2.T1", "2", "Q2", "1", "CONTROL");
wire("Q1", "2", "P1.T2", "1", "CONTROL");
wire("P1.T2", "2", "Q2", "2", "CONTROL"); // Passes P2 without an unnecessary splice.
wire("Q2", "COM", "P2.Ls", "1");
wire("P2.Ls", "2", "OP1", "L");
wire("P2.Ls", "2", "OP2", "L");
wire("P1.N", "2", "OP1", "N", "N");
wire("P1.N", "2", "P2.N", "1", "N");
wire("P2.N", "2", "OP2", "N", "N");
wire("P1.PE", "2", "OP1", "PE", "PE");
wire("P1.PE", "2", "P2.PE", "1", "PE");
wire("P2.PE", "2", "OP2", "PE", "PE");
writeFileSync(
  "examples/physical/ELE02_101_stanowisko.json",
  JSON.stringify(validateProjectDocument(p), null, 2) + "\n",
);
console.log(
  `${p.circuit.devices.length} urządzenia, ${p.circuit.conductors.length} żyły, 4 obudowy, 6 korytek`,
);

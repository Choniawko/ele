import { writeFileSync } from "node:fs";
import { emptyProject, type DeviceSettings, type Role } from "@model/index";
import { catalog } from "@catalog/index";
import { validateProjectDocument } from "@catalog/project-validation";
import { colors } from "@training/builder";

const p = emptyProject("ELE.02-108 · dwa kierunki z dwóch stanowisk");
p.circuit.projectId = "ele02-108-physical-v1";
p.userMetadata = {
  reference:
    "Zadanie-nr-8-silnik-3-fazowy-sterowany-z-2-miejsc-ele_02_108-shhsg9e.pdf: obie strony pliku (drukowane 2–3), rysunki 1 i 2.",
  motorAssumption:
    "Brak tabliczki silnika w PDF. Przyjęto wyłącznie do symulacji rezystancyjny silnik 3000 W, uzwojenie 230 V, ukryta gwiazda, In modelu = 3000/(3×230) = 4,3478 A. Nastawa Q2 4,35 A jest ZAŁOŻENIEM wymagającym uzupełnienia według rzeczywistej tabliczki, nie danymi zadania. 6 A dotyczy wyłącznie Q1 B6.",
  topology:
    "Q1 z L1 przed Q2. Q2 NO 13–14 w osobnym bloku Q2.AUX (assembly). Oba STOP-y szeregowo. K1 z podtrzymaniem; K2 tylko podczas S2/S4. K2 zamienia L1/L3 na wyjściu. Brak blokady mechanicznej.",
  contactorTerminals:
    "Wykorzystano istniejący LC1D09P7: 1/3/5 na PDF odpowiadają 1L1/3L2/5L3, 2/4/6 odpowiadają 2T1/4T2/6T3. Cewki A1/A2 230 V AC, styki NO 13–14 i NC 21–22.",
  wiring:
    "OWY 5×2,5 mm² zasilanie; LgY 2,5 mm² mocy; OWY 4×2,5 mm² silnik; YLY 5×1,5 mm² R2; LgY 1,5 mm² sterowanie. Żyły wielodrutowe wymagają tulejek: informacja wykonawcza, bez modelu mechanicznego tulejek.",
  cableR2:
    "Rysunek 2 wymaga czterech czynnych żył R2: STOP wejście, wspólny potencjał po STOP, powrót START prawy, powrót lewy. Piąta żyła YLY (zielono-żółta) pozostaje rezerwowa, izolowana na obu końcach przez ZS.RES1/ZS.RES2; brak dodanego połączenia PE/N do izolacyjnej obudowy. Nie wolno użyć jej do sterowania. Niebieska żyła kabla wielożyłowego opisana CONTROL, bez neutralnego w tym kablu.",
  geometry:
    "Relacje rozmieszczenia według rys. 1: M nad R1, R2 po prawej. Wymiary obudowy, pozycje i długości elektryczne są założeniami dydaktycznymi, nie skalą ani pomiarem stanowiska.",
  powerReturn:
    "Ze zwolnionym START-em prawy kierunek nie wraca samoczynnie. Przy trzymanym START/S2/S4 powrót zasilania lub Q2 może uruchomić silnik zgodnie z obwodem; brak ukrytej blokady ponownego rozruchu.",
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
    x: 80 + (n % 5) * 240,
    y: 100 + Math.floor(n / 5) * 650,
  };
}
add("PZ", "edu-source-3ph", 90, 80);
add("M", "edu-motor", 450, 80);
add("ZS.PE", "edu-rail-terminal", 90, 570);
add("ZS.N", "edu-rail-terminal", 135, 570);
add("ZS.RES1", "edu-rail-terminal", 180, 570);
add("Q1", "edu-mcb-adjustable", 228, 570, { ratedCurrentA: 6 });
add("Q2", "edu-motor-protection", 275, 570, {
  position: true,
  ratedCurrentA: 4.35,
});
add("Q2.AUX", "edu-motor-aux-no", 376, 570);
add("K1", "schneider-lc1d09p7", 410, 570);
add("K2", "schneider-lc1d09p7", 520, 570);
add("S1", "edu-start-stop-din", 635, 570);
add("S2", "edu-push-no-din", 725, 570);
add("S3", "edu-start-stop-panel", 880, 540);
add("S4", "edu-push-no-panel", 980, 540);
add("ZS.RES2", "edu-rail-terminal", 880, 745);
p.circuit.supplySystems = [{ id: "supply-PZ", kind: "TN-S", sourceId: "PZ" }];
p.circuit.mechanicalCouplings = [
  { id: "assembly-Q2", kind: "assembly", deviceIds: ["Q2", "Q2.AUX"] },
];
p.physical.rails = [
  { id: "R1", x: 80, y: 680, width: 700 },
  { id: "rail-R2", x: 870, y: 640, width: 160 },
];
p.physical.enclosures = [
  {
    id: "case-R2",
    name: "R2 · obudowa izolacyjna",
    kind: "distribution",
    position: { x: 850, y: 490 },
    width: 220,
    height: 330,
    deviceIds: ["S3", "S4", "ZS.RES2"],
    closed: true,
    window: { x: 20, y: 80, width: 180, height: 100 },
  },
];
p.physical.presentation = "external";
function wire(
  a: string,
  ta: string,
  b: string,
  tb: string,
  role: Role,
  section: number,
  length = 0.4,
) {
  const id = `W${p.circuit.conductors.length + 1}`;
  p.circuit.conductors.push({
    id,
    from: { deviceId: a, terminalId: ta },
    to: { deviceId: b, terminalId: tb },
    declaredRole: role,
    insulationColor: colors[role],
    crossSectionMm2: section,
    electricalLengthM: length,
    material: "Cu",
    marking: `${id} ${section === 2.5 ? "LgY 2,5" : "LgY 1,5"}`,
  });
  return id;
}
function cable(id: string, designation: string, coreIds: string[]) {
  p.circuit.cables.push({ id, designation, coreIds });
  coreIds.forEach((core, i) => {
    const w = p.circuit.conductors.find((w) => w.id === core)!;
    w.cableId = id;
    w.marking = `${id}.${i + 1}`;
  });
}
cable("C.SUPPLY", "OWY 5×2,5 mm²", [
  wire("PZ", "L1", "Q2", "1", "L1", 2.5, 1),
  wire("PZ", "L2", "Q2", "3", "L2", 2.5, 1),
  wire("PZ", "L3", "Q2", "5", "L3", 2.5, 1),
  wire("PZ", "N", "ZS.N", "1", "N", 2.5, 1),
  wire("PZ", "PE", "ZS.PE", "1", "PE", 2.5, 1),
]);
wire("Q2", "1", "Q1", "1", "L1", 1.5); // Upstream of Q2: no relocation behind its main poles.
for (const [i, role] of (["L1", "L2", "L3"] as const).entries()) {
  const input = ["1L1", "3L2", "5L3"][i];
  wire("Q2", String(2 * i + 2), "K1", input, role, 2.5);
  wire("Q2", String(2 * i + 2), "K2", input, role, 2.5);
}
wire("K2", "2T1", "K1", "6T3", "L1", 2.5);
wire("K2", "4T2", "K1", "4T2", "L2", 2.5);
wire("K2", "6T3", "K1", "2T1", "L3", 2.5);
cable("C.MOTOR", "OWY 4×2,5 mm²", [
  wire("K1", "2T1", "M", "U", "L1", 2.5, 1),
  wire("K1", "4T2", "M", "V", "L2", 2.5, 1),
  wire("K1", "6T3", "M", "W", "L3", 2.5, 1),
  wire("ZS.PE", "2", "M", "PE", "PE", 2.5, 1),
]);
wire("Q1", "2", "Q2.AUX", "13", "CONTROL", 1.5);
wire("Q2.AUX", "14", "S1", "1", "CONTROL", 1.5);
// At common nodes, daisy chains represent the drawing junctions without
// exceeding two conductors per terminal or inserting large fictitious buses.
wire("S1", "3", "S2", "3", "CONTROL", 1.5);
wire("S2", "3", "K1", "13", "CONTROL", 1.5);
wire("S1", "4", "K1", "14", "CONTROL", 1.5);
wire("K1", "14", "K2", "21", "CONTROL", 1.5);
wire("S2", "4", "K1", "21", "CONTROL", 1.5);
wire("K2", "22", "K1", "A1", "CONTROL", 1.5);
wire("K1", "22", "K2", "A1", "CONTROL", 1.5);
wire("ZS.N", "2", "K1", "A2", "N", 1.5);
wire("ZS.N", "2", "K2", "A2", "N", 1.5);
wire("S3", "2", "S3", "3", "CONTROL", 1.5);
wire("S3", "3", "S4", "3", "CONTROL", 1.5);
const remote = [
  wire("S1", "2", "S3", "1", "CONTROL", 1.5, 1),
  wire("S3", "2", "S1", "3", "CONTROL", 1.5, 1),
  wire("S3", "4", "K2", "21", "CONTROL", 1.5, 1),
  wire("S4", "4", "K1", "21", "CONTROL", 1.5, 1),
  wire("ZS.RES1", "1", "ZS.RES2", "1", "UNSPECIFIED", 1.5, 1),
];
// Four control cores, no neutral. Green/yellow core is isolated reserve.
remote.forEach(
  (id, i) =>
    (p.circuit.conductors.find((w) => w.id === id)!.insulationColor = [
      "#755038",
      "#35383d",
      "#8d9398",
      "#3b87be",
      "#3b9b55",
    ][i]),
);
cable("C.R2", "YLY 5×1,5 mm²", remote);
writeFileSync(
  "examples/physical/ELE02_108_stanowisko.json",
  JSON.stringify(validateProjectDocument(p), null, 2) + "\n",
);
console.log(
  `${p.circuit.devices.length} aparatów, ${p.circuit.conductors.length} żył, ${p.circuit.cables.length} kable`,
);

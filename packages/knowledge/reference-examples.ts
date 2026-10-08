import fixture from "../../examples/physical/ELE02_101_stanowisko.json";
import { catalog } from "@catalog/index";
import { validateProjectDocument } from "@catalog/project-validation";
import { clone, newId, type ProjectDocument } from "@model/index";
import type { DiagramScope } from "./types";

export interface LessonFragment {
  id: string;
  title: string;
  explanation: string;
  conductorIds: string[];
  bridgeIds: string[];
}
export interface DeviceProfile {
  productId: string;
  productRevision: string;
  topologyId: string;
  principle: string;
  symbol: string;
  referenceState: string;
  states: string[];
  test: string;
  articleId: string;
  terminals: { id: string; role: string }[];
  limitations: string[];
}
export interface LessonBinding {
  deviceId: string;
  productId: string;
  productRevision: string;
  topologyId: string;
  terminalIds: string[];
  symbolIds: string[];
  role: string;
}
export interface ReferenceExample {
  id: string;
  taskId: string;
  referenceRevision: string;
  circuitRevision: number;
  documentPath: string;
  title: string;
  sourceIds: string[];
  sourceIssueIds: string[];
  lessonId: string;
  sourceFigureIds: string[];
  fidelity: "educational";
  limitations: string[];
  fragments: LessonFragment[];
  bindings: LessonBinding[];
  profiles: DeviceProfile[];
  diagrams: DiagramScope[];
  create: () => ProjectDocument;
}
const create101 = () => validateProjectDocument(clone(fixture));
const project = create101();
const role = (id: string) => {
  const roles: Record<string, string> = {
    PZ: "Zasilanie TN-S: L i N przechodzą przez RCD; PE biegnie niezależnie.",
    RCD: "Wspólnie odłącza L i N obu gałęzi. Przycisk TEST nie zastępuje pomiaru RCD.",
    B10: "Chroni gałąź gniazda GW i kontrolki H1; nastawa modelu 10 A.",
    B6: "Chroni gałąź oświetlenia i kontrolki H2; nastawa modelu 6 A.",
    H1: "Sygnalizuje napięcie za B10 między L a N.",
    H2: "Sygnalizuje napięcie za B6 przed Q1/Q2. Może świecić przy zgaszonych oprawach.",
    "R.L": "Rozdziela fazę za RCD na B10 i B6.",
    "R.L10": "Rozdziela fazę za B10 na H1 i GW.",
    "R.L6": "Rozdziela fazę za B6 na H2 i COM Q1.",
    "R.N": "Wspólny N odbiorników za biegunem N RCD.",
    "R.PE":
      "Wspólny PE gniazda i opraw; nie jest rozłączany przez zabezpieczenia.",
    OP1: "Pierwsza oprawa L–N; połączona równolegle z OP2. PE ma osobny zacisk.",
    OP2: "Druga oprawa L–N; sterowana razem z OP1. PE ma osobny zacisk.",
    Q1: "COM otrzymuje fazę z B6; 1 i 2 to dwie odrębne korespondencje do Q2.",
    Q2: "Wybiera korespondencję; COM zasila obie oprawy przez P2.Ls.",
    GW: "Gniazdo L/N/PE zasilane niezależnie od łączników schodowych przez B10.",
    "P1.T1": "Pierwsza korespondencja Q1:1 → Q2:1 przez P2.T1.",
    "P1.T2": "Druga korespondencja Q1:2 → Q2:2; nie łączy się z pierwszą.",
    "P2.T1": "Dalszy odcinek pierwszej korespondencji do Q2:1.",
    "P2.Ls": "Rozgałęzia fazę za Q2:COM na OP1:L i OP2:L.",
    "P1.N": "Rozgałęzia N na OP1:N i P2.N; wspólna puszka nie zwiera z PE.",
    "P2.N": "Doprowadza N do OP2:N.",
    "P1.PE": "Rozgałęzia PE na OP1:PE i P2.PE; wspólna puszka nie zwiera z N.",
    "P2.PE": "Doprowadza PE do OP2:PE.",
  };
  return roles[id];
};
// This is explanatory data; the only netlist is the existing ProjectDocument.
const profileText: Record<
  string,
  [string, string, string, string[], string, string]
> = {
  "edu-source-ac": [
    "Źródło jednofazowe 230 V, układ TN-S.",
    "L, N i PE źródła.",
    "Energia globalna OFF.",
    [
      "OFF: brak napięcia roboczego.",
      "ON: źródło wymusza napięcie L–N; PE pozostaje torem ochronnym.",
    ],
    "Zmierz L–N po załączeniu; ciągłość PE badaj bez energii.",
    "n-pe-wezly",
  ],
  "edu-rcd": [
    "Różnicówka porównuje prądy L i N; mechanizm rozłącza oba bieguny.",
    "Dwa sprzężone styki 1–2 oraz N-in–N-out.",
    "Dźwignia ON, brak energii.",
    [
      "ON: oba bieguny zamknięte.",
      "OFF/TRIPPED: oba bieguny otwarte.",
      "TEST przy zasilaniu wyzwala mechanizm.",
    ],
    "Załącz źródło i użyj TEST: H1, H2, OP1, OP2 i GW tracą zasilanie.",
    "rcd",
  ],
  "edu-mcb-adjustable": [
    "Wyłącznik nadprądowy w jednej gałęzi; nastawa 6 A albo 10 A.",
    "Styk 1–2 sprzężony z mechanizmem zabezpieczenia.",
    "Dźwignia ON, brak energii.",
    ["ON: 1–2 połączone.", "OFF/TRIPPED: 1–2 rozłączone."],
    "Wyłącz B6 i B10 osobno; druga gałąź ma pozostać zasilana.",
    "mcb",
  ],
  "edu-indicator-green-230": [
    "Lampka dwuzaciskowa pobiera prąd między L i N (model 0,6 W / 230 V).",
    "Odbiornik między L i N.",
    "Brak energii: zgaszona.",
    ["Zasilanie L–N: świeci.", "Przerwa L lub N: nie świeci."],
    "H2 świeci także po przełączeniu Q1 tak, aby OP1/OP2 zgasły.",
    "lampy",
  ],
  "edu-bulkhead-40": [
    "Oprawa klasy I; odbiornik 40 W / 230 V między L i N; osobny PE.",
    "Symbol lampy L–N; PE poza obwodem roboczym.",
    "Brak energii: zgaszona.",
    [
      "Q1 i Q2 wybierają tę samą korespondencję: świeci.",
      "Wybierają różne korespondencje: zgaszona.",
    ],
    "Przełącz każdy łącznik w obu pozycjach drugiego; obie oprawy zmieniają stan razem.",
    "lampy",
  ],
  "edu-changeover": [
    "Jeden mechanizm przełącza COM między dwoma torami; nie ma cewki.",
    "Dwa fragmenty COM–1 i COM–2 jednego łącznika.",
    "Pozycja false: COM–1.",
    [
      "false: COM–1 zamknięty, COM–2 otwarty.",
      "true: COM–2 zamknięty, COM–1 otwarty.",
    ],
    "Sprawdź wszystkie cztery kombinacje Q1/Q2 i brak zwarcia korespondencji.",
    "laczniki",
  ],
  "edu-socket": [
    "Gniazdo udostępnia L, N i PE; punkty testowe są połączone z odpowiadającymi zaciskami.",
    "Trzy niezależne połączenia do test-L, test-N i test-PE.",
    "Bez energii: brak napięcia L–N.",
    [
      "B10 ON i źródło ON: około 230 V L–N.",
      "B10 OFF: brak napięcia roboczego; PE pozostaje ciągły.",
    ],
    "Zmierz test-L–test-N; osobno sprawdź ciągłość PE bez zasilania.",
    "gniazda",
  ],
};
for (const id of [
  "edu-phase-distribution",
  "edu-splice-3",
  "edu-bus-n",
  "edu-bus-pe",
  "edu-junction-terminal",
])
  profileText[id] = [
    "Stała złączka: jej zaciski należą do jednego węzła, niezależnie od obudowy.",
    "Mostki wewnętrzne z topologii katalogu; nie są dodatkowymi żyłami.",
    "Zaciski złączki zawsze połączone.",
    [
      "Bez i z energią: ta sama topologia.",
      "Różne złączki w jednej puszce pozostają oddzielnymi węzłami.",
    ],
    "Bez energii sprawdź ciągłość w obrębie złączki oraz rozdzielenie N i PE za źródłem.",
    "n-pe-wezly",
  ];
const profiles: DeviceProfile[] = [
  ...new Set(project.circuit.devices.map((d) => d.productId)),
].map((id) => {
  const p = catalog[id],
    [principle, symbol, referenceState, states, test, articleId] =
      profileText[id];
  return {
    productId: id,
    productRevision: p.revision,
    topologyId: p.topology.id,
    principle,
    symbol,
    referenceState,
    states,
    test,
    articleId,
    terminals: p.topology.terminals.map((t) => ({ id: t.id, role: t.role })),
    limitations: [
      "Profil dydaktyczny; numeracja zacisków nie potwierdza konkretnego SKU.",
      ...p.limitations,
    ],
  };
});
const fragment = (
  id: string,
  title: string,
  explanation: string,
  conductorIds: string[],
): LessonFragment => ({ id, title, explanation, conductorIds, bridgeIds: [] });
const symbols = (names: string[], x: number, y: number) =>
  names.flatMap((name, row) => {
    const d = project.circuit.devices.find((d) => d.id === name)!;
    return catalog[d.productId].topology.connections
      .filter((c) => c.kind !== "bridge")
      .map((c, i) => ({
        designation: d.designation,
        fragmentId: c.id,
        x: x + i * 220,
        y: y + row * 130,
        label: c.kind === "load" ? "odbiornik" : c.id,
      }));
  });
export const referenceExamples: ReferenceExample[] = [
  {
    id: "ele02-101",
    taskId: "ELE.02-101",
    referenceRevision: "1",
    circuitRevision: project.circuit.revision,
    documentPath: "examples/physical/ELE02_101_stanowisko.json",
    title: "Dwa łączniki schodowe, dwie oprawy i osobne gniazdo",
    sourceIds: ["pdf-ele02-101"],
    sourceIssueIds: ["101-ISSUE-01"],
    lessonId: "ele02-101",
    sourceFigureIds: ["ELE02_101_p1_ideowy", "ELE02_101_p2_rozmieszczenie"],
    fidelity: "educational",
    limitations: [
      "Geometria i długości żył są dydaktyczne, bez odwzorowania płyty 1:1 (101-ISSUE-01 pozostaje otwarte).",
      "Nie symulujemy momentu dokręcenia, rzeczywistego pomiaru RCD ani sprawności konkretnego zakupionego aparatu.",
    ],
    create: create101,
    profiles,
    bindings: project.circuit.devices.map((d) => ({
      deviceId: d.id,
      productId: d.productId,
      productRevision: d.productRevision,
      topologyId: catalog[d.productId].topology.id,
      terminalIds: catalog[d.productId].topology.terminals.map((t) => t.id),
      symbolIds: catalog[d.productId].topology.connections.map((c) => c.id),
      role: role(d.id),
    })),
    fragments: [
      fragment(
        "supply",
        "Zasilanie i rozdział",
        "RCD obejmuje L i N obu gałęzi; B10 i B6 mają osobne wyjścia.",
        ["W1", "W2", "W3", "W4", "W5", "W6", "W7"],
      ),
      fragment(
        "socket",
        "Gniazdo i H1",
        "Faza za B10 zasila GW i H1 niezależnie od Q1/Q2.",
        ["W8", "W9", "W10"],
      ),
      fragment(
        "lighting",
        "Oświetlenie i H2",
        "H2 jest przed łącznikami; COM Q2 rozdziela fazę do obu opraw równoległych.",
        ["W11", "W12", "W13", "W25", "W26", "W27"],
      ),
      fragment(
        "correspondence1",
        "Korespondencja 1",
        "Q1:1 → P1.T1 → P2.T1 → Q2:1. Nie łączy się z korespondencją 2.",
        ["W20", "W21", "W22"],
      ),
      fragment(
        "correspondence2",
        "Korespondencja 2",
        "Q1:2 → P1.T2 → Q2:2. W tym modelu nie ma dodatkowej złączki P2 dla tej żyły.",
        ["W23", "W24"],
      ),
      fragment(
        "neutral",
        "Powrót N",
        "N odbiorników wraca za RCD; nie omija jego bieguna N.",
        ["W2", "W7", "W14", "W15", "W16", "W17", "W28", "W29", "W30"],
      ),
      fragment(
        "protective",
        "Ciągłość PE",
        "PE biegnie niezależnie od RCD i łączników do GW, OP1 i OP2. Próba bez zasilania.",
        ["W3", "W18", "W19", "W31", "W32", "W33"],
      ),
    ],
    diagrams: [
      {
        title: "101 — źródło, RCD i osobne zabezpieczenia",
        width: 1100,
        height: 550,
        symbols: [
          {
            designation: "RCD",
            fragmentId: "pole1",
            x: 260,
            y: 130,
            label: "L",
          },
          {
            designation: "RCD",
            fragmentId: "poleN",
            x: 260,
            y: 360,
            label: "N",
          },
          ...symbols(["B10", "B6"], 660, 130),
        ],
        ports: [
          { designation: "PZ", terminalId: "L", x: 60, y: 130, label: "PZ:L" },
          { designation: "PZ", terminalId: "N", x: 60, y: 360, label: "PZ:N" },
        ],
      },
      {
        title: "101 — dwie korespondencje i oprawy równoległe",
        width: 1200,
        height: 700,
        symbols: [
          {
            designation: "Q1",
            fragmentId: "route1",
            x: 240,
            y: 160,
            label: "tor 1",
          },
          {
            designation: "Q1",
            fragmentId: "route2",
            x: 240,
            y: 310,
            label: "tor 2",
          },
          {
            designation: "Q2",
            fragmentId: "route1",
            reverse: true,
            x: 600,
            y: 160,
            label: "tor 1",
          },
          {
            designation: "Q2",
            fragmentId: "route2",
            reverse: true,
            x: 600,
            y: 310,
            label: "tor 2",
          },
          {
            designation: "OP1",
            fragmentId: "lamp",
            x: 900,
            y: 160,
            label: "oprawa",
          },
          {
            designation: "OP2",
            fragmentId: "lamp",
            x: 900,
            y: 460,
            label: "oprawa",
          },
          {
            designation: "H2",
            fragmentId: "light",
            x: 240,
            y: 580,
            label: "przed Q1/Q2",
          },
        ],
        ports: [
          { designation: "B6", terminalId: "2", x: 60, y: 160, label: "B6:2" },
          {
            designation: "R.N",
            terminalId: "1",
            x: 1100,
            y: 650,
            label: "N za RCD",
          },
        ],
      },
      {
        title: "101 — gniazdo, kontrolka H1 i niezależny PE",
        width: 1100,
        height: 500,
        symbols: symbols(["H1"], 520, 150),
        ports: [
          {
            designation: "B10",
            terminalId: "2",
            x: 80,
            y: 150,
            label: "B10:2",
          },
          { designation: "GW", terminalId: "L", x: 800, y: 150, label: "GW:L" },
          { designation: "GW", terminalId: "N", x: 800, y: 300, label: "GW:N" },
          {
            designation: "R.N",
            terminalId: "1",
            x: 80,
            y: 300,
            label: "N za RCD",
          },
          ...["PZ", "GW", "OP1", "OP2"].map((designation, i) => ({
            designation,
            terminalId: "PE",
            x: 80 + i * 290,
            y: 420,
            label: `${designation}:PE`,
          })),
        ],
      },
    ],
  },
];
export const referenceById = (id: string) =>
  referenceExamples.find((r) => r.id === id);
export const referenceByTask = (id: string) =>
  referenceExamples.find((r) => r.taskId === id);
export function referenceCopy(id: string): ProjectDocument {
  const r = referenceById(id);
  if (!r) throw new Error(`Nieznany wzorzec: ${id}`);
  const p = r.create();
  p.circuit.projectId = newId("project");
  p.name += " · moja kopia";
  p.userMetadata.examReference = r.id;
  p.userMetadata.examReferenceRevision = r.referenceRevision;
  return validateProjectDocument(p);
}
const topology = (p: ProjectDocument) =>
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
const referenceTopologies = new Map(
  referenceExamples.map((r) => [r.id, topology(r.create())]),
);
export function boundReference(p: ProjectDocument) {
  const r = referenceById(p.userMetadata.examReference);
  return r &&
    p.userMetadata.examReferenceRevision === r.referenceRevision &&
    topology(p) === referenceTopologies.get(r.id)
    ? r
    : undefined;
}
export function validateReference(r: ReferenceExample) {
  const p = r.create(),
    errors: string[] = [];
  if (
    new Set(r.bindings.map((b) => b.deviceId)).size !==
      p.circuit.devices.length ||
    r.bindings.length !== p.circuit.devices.length
  )
    errors.push("binding coverage");
  if (
    new Set(r.fragments.flatMap((f) => f.conductorIds)).size !==
    p.circuit.conductors.length
  )
    errors.push("wire coverage");
  if (p.circuit.revision !== r.circuitRevision) errors.push("circuitRevision");
  for (const b of r.bindings) {
    const d = p.circuit.devices.find((d) => d.id === b.deviceId),
      c = catalog[b.productId];
    if (
      !d ||
      d.productId !== b.productId ||
      d.productRevision !== b.productRevision ||
      !c?.published ||
      c.topology.id !== b.topologyId ||
      b.terminalIds.some(
        (id) => !c.topology.terminals.some((t) => t.id === id),
      ) ||
      b.symbolIds.some(
        (id) => !c.topology.connections.some((t) => t.id === id),
      ) ||
      !b.role
    )
      errors.push(`binding:${b.deviceId}`);
  }
  for (const f of r.fragments)
    if (
      f.conductorIds.some(
        (id) => !p.circuit.conductors.some((w) => w.id === id),
      ) ||
      f.bridgeIds.some((id) => !p.circuit.bridges.some((w) => w.id === id))
    )
      errors.push(`fragment:${f.id}`);
  for (const s of r.diagrams.flatMap((d) => d.symbols))
    if (
      !r.bindings.some(
        (b) =>
          p.circuit.devices.find((d) => d.id === b.deviceId)?.designation ===
            s.designation && b.symbolIds.includes(s.fragmentId),
      )
    )
      errors.push(`symbol:${s.designation}`);
  for (const pt of r.diagrams.flatMap((d) => d.ports))
    if (
      !r.bindings.some(
        (b) =>
          p.circuit.devices.find((d) => d.id === b.deviceId)?.designation ===
            pt.designation && b.terminalIds.includes(pt.terminalId),
      )
    )
      errors.push(`port:${pt.designation}`);
  for (const b of r.bindings)
    if (
      !r.profiles.some(
        (p) =>
          p.productId === b.productId &&
          p.productRevision === b.productRevision &&
          p.topologyId === b.topologyId &&
          p.terminals.length === b.terminalIds.length &&
          p.terminals.every((t) => b.terminalIds.includes(t.id)),
      )
    )
      errors.push(`profile:${b.productId}`);
  return errors;
}

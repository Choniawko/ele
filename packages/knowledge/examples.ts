import { deviceByName } from "./diagram-model";
import { validateProjectDocument } from "@catalog/project-validation";
import { clone, newId, type ProjectDocument } from "@model/index";
import { scenarios, arrangeProject } from "@training/index";
import { Builder } from "@training/builder";
import { advance, initialRuntime, type RuntimeAction } from "@simulation/index";
import type { DiagramScope, SymbolPlacement } from "./types";
export interface DemoStep {
  title: string;
  explanation: string;
  action:
    | { type: "power"; on: boolean }
    | { type: "operate"; designation: string; state: boolean }
    | { type: "step"; deltaMs: number };
}
export interface KnowledgeExample {
  id: string;
  title: string;
  create: () => ProjectDocument;
  diagrams: DiagramScope[];
  steps: DemoStep[];
  observe: string[];
}
const sym = (
  designation: string,
  fragmentId: string,
  x: number,
  y: number,
  label: string,
): SymbolPlacement => ({ designation, fragmentId, x, y, label });
const port = (
  designation: string,
  terminalId: string,
  x: number,
  y: number,
  label: string,
) => ({ designation, terminalId, x, y, label });
const step = (
  title: string,
  designation: string,
  state: boolean,
  explanation: string,
): DemoStep => ({
  title,
  explanation,
  action: { type: "operate", designation, state },
});
const power: DemoStep = {
  title: "Załącz zasilanie",
  explanation:
    "Źródło przykładu jest załączone. Odbiornik nadal zależy od położenia styków.",
  action: { type: "power", on: true },
};
const control = (two = false, reversing = false): DiagramScope => ({
  title: "Tor sterowania 230 V i sygnalizacja — bez torów mocy oraz PE",
  width: 1160,
  height: reversing ? 690 : 550,
  ports: [
    port("QF2", "2", 60, 130, "Faza za QF2"),
    port("XN1", "1", 1100, 130, "N"),
  ],
  symbols: [
    sym("S0", "NC", 150, 130, "STOP"),
    sym("F1", "nc", 340, 130, "Termik NC"),
    ...(two ? [sym("S3", "NC", 530, 130, "STOP 2")] : []),
    sym("S1", "no", two ? 740 : 540, 130, "START"),
    sym("KA1", "no", two ? 740 : 540, 260, "Podtrzymanie K1"),
    sym("K1", "coil", 900, 130, "Cewka"),
    sym("K1", "auxNO", 540, 400, "Sygnalizacja K1"),
    sym("H1", "load", 900, 400, "Lampka pracy"),
    ...(two ? [sym("S2", "no", 740, 330, "START 2")] : []),
    ...(reversing
      ? [
          sym("KA2", "nc", 730, 130, "Blokada NC K2"),
          sym("S2", "no", 540, 510, "START K2"),
          sym("KA2", "no", 540, 620, "Podtrzymanie K2"),
          sym("KA1", "nc", 730, 510, "Blokada NC K1"),
          sym("K2", "coil", 900, 510, "Cewka"),
        ]
      : []),
  ],
  netAnchors: [
    {
      designation: "XC0",
      terminalId: "1",
      point: { x: two ? 700 : 500, y: 130 },
    },
    {
      designation: "XC1",
      terminalId: "1",
      point: { x: two ? 880 : 690, y: 130 },
    },
  ],
});
const motorPower = (reversing = false): DiagramScope => ({
  title:
    "Tor mocy — trzy fazy, uzwojenia i mostki Y; sterowanie na osobnej zakładce",
  width: 1160,
  height: reversing ? 720 : 480,
  ports: ["L1", "L2", "L3"]
    .map((t, i) => port("G1", t, 60, 120 + i * 140, t))
    .concat([
      port("G1", "PE", 60, reversing ? 660 : 430, "PE — do korpusu"),
      port("M1", "PE", 1030, reversing ? 660 : 430, "PE"),
    ]),
  netAnchors: ["1L1", "3L2", "5L3"].map((terminalId, i) => ({
    designation: "F1",
    terminalId,
    point: { x: 710 - i * 20, y: 120 + i * 140 },
  })),
  symbols: [0, 1, 2].flatMap((i) => [
    sym("QF1", `pole${i + 1}`, 140, 120 + i * 140, "MCB 3P"),
    sym("K1", `pole${i + 1}`, 350, 120 + i * 140, "tory kierunku 1"),
    sym("F1", `pole${i + 1}`, 750, 120 + i * 140, "tor ciągły"),
    sym(
      "M1",
      `winding-${["U", "V", "W"][i]}`,
      950,
      120 + i * 140,
      `Uzw. ${["U", "V", "W"][i]}`,
    ),
    ...(reversing
      ? [sym("K2", `pole${i + 1}`, 530, 190 + i * 140, "zamiana L1/L3")]
      : []),
  ]),
});
function fromScenario(id: string) {
  return scenarios.find((s) => s.id === id)!.create();
}
function lamp() {
  const b = new Builder("Wiedza · lampa z rozgałęzieniem");
  const g = b.add("edu-source-ac", "G1", 60, 90),
    q = b.add("hager-mbn116e", "QF1", 300, 90),
    sw = b.add("edu-switch", "S1", 60, 385, { position: false }),
    xl = b.add("edu-splice-3", "XL2", 300, 385),
    n = b.bus(g, "N", "N", 570, 90),
    pe = b.bus(g, "PE", "PE", 800, 90);
  b.wire(g, "L", q, "1");
  b.wire(q, "2", sw, "1");
  b.wire(sw, "2", xl, "1");
  for (let i = 0; i < 2; i++) {
    const h = b.add("edu-lamp", `H${i + 1}`, 570 + i * 220, 385);
    b.wire(xl, String(i + 2), h, "L");
    b.wire(n, String(i + 2), h, "N", "N");
    b.wire(pe, String(i + 2), h, "PE", "PE");
  }
  return arrangeProject(b.project);
}
function twoPlaces() {
  const p = fromScenario("exam-start-stop");
  const b = new Builder("");
  b.project = p;
  const find = (name: string) =>
    p.circuit.devices.find((d) => d.designation === name)!.id;
  const start2 = b.add("schneider-xb5aa35", "S2", 900, 680),
    stop2 = b.add("edu-stop", "S3", 900, 975);
  b.wire(find("XC0"), "2", start2, "13", "CONTROL");
  b.wire(start2, "14", find("XC1"), "4", "CONTROL");
  const w = p.circuit.conductors.find(
    (w) => w.from.deviceId === find("F1") && w.from.terminalId === "96",
  )!;
  const end = clone(w.to);
  w.to = { deviceId: stop2, terminalId: "21" };
  b.wire(stop2, "22", end.deviceId, end.terminalId, "CONTROL");
  return arrangeProject(p);
}
export const examples: KnowledgeExample[] = [
  {
    id: "lampa",
    title: "Lampa i łącznik z rozgałęzieniem",
    create: lamp,
    observe: ["H1", "H2"],
    diagrams: [
      {
        title:
          "Faza rozdziela się po S1; N przecina tor fazowy bez połączenia; obie lampy mają własną żyłę N i PE",
        width: 1050,
        height: 500,
        ports: [
          port("G1", "L", 60, 150, "L"),
          port("G1", "N", 60, 260, "N"),
          port("G1", "PE", 60, 440, "PE"),
          port("H1", "PE", 780, 440, "PE H1"),
          port("H2", "PE", 990, 440, "PE H2"),
        ],
        symbols: [
          sym("QF1", "pole1", 170, 150, "MCB"),
          sym("S1", "pole1", 390, 150, "Łącznik"),
          sym("H1", "load", 780, 150, "Lampa 1"),
          sym("H2", "load", 780, 320, "Lampa 2"),
        ],
        netAnchors: [
          { designation: "XL2", terminalId: "1", point: { x: 650, y: 150 } },
          { designation: "G1", terminalId: "N", point: { x: 990, y: 260 } },
        ],
      },
    ],
    steps: [
      power,
      step(
        "Zamknij S1",
        "S1",
        true,
        "Obie lampy otrzymują napięcie przez wspólny węzeł.",
      ),
      step(
        "Otwórz S1",
        "S1",
        false,
        "Przerwa przed rozgałęzieniem odcina obie lampy. N i PE pozostają połączone.",
      ),
    ],
  },
  {
    id: "schodowy",
    title: "Oświetlenie schodowe",
    create: () => fromScenario("two-way"),
    observe: ["H1"],
    diagrams: [
      {
        title:
          "Dwa przełączniki i dwa przewody korespondencyjne; PE pokazany osobno",
        width: 1060,
        height: 530,
        ports: [
          port("QF1", "2", 60, 150, "L za MCB"),
          port("G1", "N", 1000, 150, "N"),
          port("G1", "PE", 60, 450, "PE"),
          port("H1", "PE", 900, 450, "PE H1"),
        ],
        symbols: [
          sym("S1", "route1", 180, 150, "S1 tor 1"),
          sym("S1", "route2", 180, 310, "S1 tor 2"),
          { ...sym("S2", "route1", 500, 150, "S2 tor 1"), reverse: true },
          { ...sym("S2", "route2", 500, 310, "S2 tor 2"), reverse: true },
          sym("H1", "load", 820, 150, "H1"),
        ],
      },
    ],
    steps: [
      power,
      step(
        "Przełącz S1",
        "S1",
        true,
        "S1 wybiera drugi przewód. Ciągła droga zależy także od S2.",
      ),
      step(
        "Przełącz S2",
        "S2",
        true,
        "S2 wybiera ten sam tor co S1: obwód znowu jest ciągły.",
      ),
      step(
        "Przełącz S1 z powrotem",
        "S1",
        false,
        "Przełączenie jednego aparatu zmienia stan lampy.",
      ),
    ],
  },
  {
    id: "bistabilny",
    title: "Oświetlenie bistabilne",
    create: () => fromScenario("bistable"),
    observe: ["H1"],
    diagrams: [
      {
        title:
          "Wejście impulsowe, zasilanie elektroniki i oddzielny styk lampy; bez PE",
        width: 1060,
        height: 650,
        ports: [
          port("XL1", "1", 60, 130, "L"),
          port("XN1", "1", 1000, 130, "N"),
        ],
        symbols: [
          sym("KT1", "electronics", 350, 130, "Zasilanie"),
          sym("S1", "NO", 180, 290, "Przycisk 1"),
          sym("S2", "NO", 180, 430, "Przycisk 2"),
          sym("KT1", "input", 540, 290, "Wejście impulsowe"),
          sym("KT1", "no", 350, 560, "Wyjście NO"),
          sym("H1", "load", 800, 560, "H1"),
        ],
      },
    ],
    steps: [
      power,
      step(
        "Wciśnij S1",
        "S1",
        true,
        "Zbocze rozpoczyna zmianę. Poczekaj 200 ms.",
      ),
      {
        title: "Odczekaj 200 ms",
        explanation:
          "Solver realizuje opóźnienie modelu, a nie gotowy wynik lekcji.",
        action: { type: "step", deltaMs: 200 },
      },
      step("Puść S1", "S1", false, "Stan wyjścia pozostaje zapamiętany."),
      step(
        "Wciśnij S2",
        "S2",
        true,
        "Kolejny impuls rozpoczyna zmianę na przeciwny stan.",
      ),
      {
        title: "Odczekaj kolejne 200 ms",
        explanation: "Odbiornik powinien zgasnąć.",
        action: { type: "step", deltaMs: 200 },
      },
      step("Puść S2", "S2", false, "Wejście jest gotowe na następne zbocze."),
    ],
  },
  {
    id: "start-stop",
    title: "START/STOP i podtrzymanie",
    create: () => fromScenario("exam-start-stop"),
    observe: ["K1", "H1", "M1"],
    diagrams: [control(), motorPower()],
    steps: [
      power,
      step(
        "Wciśnij START",
        "S1",
        true,
        "NO S1 zamyka drogę do A1. Mechanizm zamyka NO KA1 i NO sygnalizacji K1.",
      ),
      step(
        "Puść START",
        "S1",
        false,
        "Cewka nadal otrzymuje napięcie przez KA1:53–54, równoległy do START.",
      ),
      step(
        "Wciśnij STOP",
        "S0",
        true,
        "NC STOP otwiera wspólny szereg. Cewka odpada; podtrzymanie się rozłącza.",
      ),
      step(
        "Puść STOP",
        "S0",
        false,
        "Powrót NC nie uruchamia cewki: obie gałęzie NO są otwarte.",
      ),
    ],
  },
  {
    id: "dwa-miejsca",
    title: "Silnik sterowany z dwóch miejsc",
    create: twoPlaces,
    observe: ["K1", "M1"],
    diagrams: [control(true), motorPower()],
    steps: [
      power,
      step(
        "START z miejsca 2",
        "S2",
        true,
        "Równoległy START 2 zamyka drogę do cewki.",
      ),
      step("Puść START 2", "S2", false, "Podtrzymanie pozostaje zamknięte."),
      step(
        "STOP z miejsca 1",
        "S0",
        true,
        "Każdy STOP w szeregu może przerwać wszystkie drogi.",
      ),
      step("Puść STOP 1", "S0", false, "Silnik pozostaje zatrzymany."),
      step(
        "START z miejsca 1",
        "S1",
        true,
        "Pierwsze miejsce także uruchamia mechanizm.",
      ),
      step("Puść START 1", "S1", false, "Cewkę zasila teraz blok pomocniczy."),
      step("STOP z miejsca 2", "S3", true, "STOP 2 przerywa wspólny szereg."),
      step(
        "Puść STOP 2",
        "S3",
        false,
        "Ponowny start wymaga nowego polecenia.",
      ),
    ],
  },
  {
    id: "prawo-lewo",
    title: "Prawo/lewo z dwiema blokadami",
    create: () => fromScenario("exam-reversing"),
    observe: ["K1", "K2", "M1"],
    diagrams: [control(false, true), motorPower(true)],
    steps: [
      power,
      step(
        "START kierunku 1",
        "S1",
        true,
        "K1 zamyka tory mocy; KA1 NC otwiera drogę do K2.",
      ),
      step("Puść START 1", "S1", false, "Podtrzymanie K1 utrzymuje pracę."),
      step(
        "Spróbuj START 2",
        "S2",
        true,
        "NC KA1 i interlock uniemożliwiają załączenie drugiego mechanizmu.",
      ),
      step(
        "Puść START 2",
        "S2",
        false,
        "Polecenie przeciwnego kierunku znika.",
      ),
      step("Wciśnij STOP", "S0", true, "Oba szeregi sterowania tracą fazę."),
      step("Puść STOP", "S0", false, "Oba styczniki pozostają wyłączone."),
      step(
        "START kierunku 2",
        "S2",
        true,
        "K2 zmienia kolejność dwóch faz w torze mocy.",
      ),
      step(
        "Puść START 2 ponownie",
        "S2",
        false,
        "Podtrzymanie K2 utrzymuje pracę.",
      ),
    ],
  },
];
export function createDemo(id: string) {
  const p = examples.find((e) => e.id === id)!.create();
  p.scenarioId = undefined;
  p.training = undefined;
  p.faults = [];
  p.name = `Wiedza · ${examples.find((e) => e.id === id)!.title}`;
  return validateProjectDocument(p);
}
export function demoAction(p: ProjectDocument, step: DemoStep): RuntimeAction {
  const a = step.action;
  return a.type === "operate"
    ? {
        type: "operate",
        deviceId: deviceByName(p, a.designation).id,
        state: a.state,
      }
    : a;
}
export function referenceRuntime(p: ProjectDocument) {
  return advance(p, initialRuntime(p), { type: "solve" });
}
export function demoCopy(p: ProjectDocument) {
  const copy = clone(p);
  copy.circuit.projectId = newId("project");
  copy.circuit.revision = 0;
  copy.training = undefined;
  copy.scenarioId = undefined;
  copy.faults = [];
  return validateProjectDocument(copy);
}
// Only permanently conducting topology is collapsed. Moving contacts are symbols, never wires.

export { deviceByName, permanentNets } from "./diagram-model";

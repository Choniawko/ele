import fixture from "../../examples/physical/ELE02_108_stanowisko.json";
import { catalog } from "@catalog/index";
import { validateProjectDocument } from "@catalog/project-validation";
import { clone } from "@model/index";
import type {
  ReferenceExample,
  DeviceProfile,
  LessonFragment,
} from "./reference-examples";
import type { DiagramScope, SymbolPlacement } from "./types";
const create = () => validateProjectDocument(clone(fixture));
const p = create();
const roles: Record<string, string> = {
  PZ: "Źródło TN-S: 230 V fazowe, trzy fazy L1/L2/L3; N i PE mają odrębne powroty.",
  Q1: "B6 sterowania: zasilany z wejścia 1 Q2, przed jego torami mocy.",
  Q2: "Wyłącznik silnikowy wspólnie rozłącza trzy tory i zgodę Q2.AUX. 4,35 A jest założeniem, nie wartością z tabliczki.",
  "Q2.AUX":
    "NO 13–14 podąża za ON/OFF/TRIPPED Q2 przez assembly. Przewód nie zastępuje sprzężenia mechanizmu.",
  K1: "Prawy kierunek. Własny NO 13–14 podtrzymuje cewkę A1–A2; NC 21–22 blokuje K2. Wszystkie symbole należą do tego samego K1.",
  K2: "Lewy tylko podczas trzymania S2/S4. Zamienia L1/L3 na wyjściu; NC 21–22 blokuje K1. Jego NO 13–14 pozostaje niepodłączony.",
  S1: "Na TH35: niezależny STOP NC 1–2 w szeregu z S3; START NO 3–4 równolegle do S3 START i NO K1.",
  S3: "W obudowie R2: niezależny STOP NC 1–2 oraz START NO 3–4. START nie otwiera STOP.",
  S2: "Chwilowy NO 3–4 na TH35, równolegle do S4: żądanie K2 bez podtrzymania.",
  S4: "Chwilowy NO 3–4 w R2: K2 pozostaje załączony, dopóki S2 lub S4 jest trzymany.",
  M: "Dydaktyczny rezystancyjny silnik 3 kW z ukrytą gwiazdą; U/V/W i PE. Brak tabliczki i mostków Y/Δ w arkuszu.",
  "ZS.N": "Wspólny powrót obu cewek A2 do N źródła; nie jest PE obudowy.",
  "ZS.PE": "Ciągłość PE źródło–silnik, poza stykami Q2 i styczników.",
  "ZS.RES1":
    "Izolowany koniec piątej, rezerwowej żyły kabla R2. Nie jest torem sterowania, N ani PE silnika.",
  "ZS.RES2":
    "Drugi izolowany koniec rezerwy R2. Zakończenie tej żyły jest jawnym założeniem modelu.",
};
const texts: Record<string, [string, string, string[], string, string]> = {
  "edu-source-3ph": [
    "L1/L2/L3/N/PE; źródło nie jest stycznikiem.",
    "Energia OFF.",
    ["ON: napięcia trójfazowe.", "OFF: brak roboczego zasilania."],
    "Porównaj kolejność faz PZ i M po załączeniu K1/K2.",
    "n-pe-wezly",
  ],
  "edu-motor": [
    "M 3~: U/V/W i osobny PE; bez dodatkowego urządzenia dla każdego uzwojenia.",
    "Silnik OFF.",
    [
      "K1: prawy (123).",
      "K2: lewy (132) tylko przy trzymaniu.",
      "Brak pełnego zasilania: nie pracuje.",
    ],
    "Załącz oba kierunki osobno i porównaj kolejność faz.",
    "silniki",
  ],
  "edu-rail-terminal": [
    "Stały tor 1–2.",
    "Połączenie stałe.",
    [
      "N: powrót cewek.",
      "PE: ochrona silnika.",
      "RES: izolowana rezerwa, bez odbiornika.",
    ],
    "Przy OFF sprawdź PE PZ–M i izolację rezerwy od torów roboczych.",
    "zlaczki",
  ],
  "edu-mcb-adjustable": [
    "Styk 1–2 sprzężony z zabezpieczeniem.",
    "ON bez energii.",
    ["ON: 1–2 zamknięty.", "OFF/TRIPPED: obie cewki wyłączone."],
    "Wyłącz Q1 przy pracy K1; cewka odpada mimo zamkniętych torów mocy Q2.",
    "mcb",
  ],
  "edu-motor-protection": [
    "Trzy styki 1–2/3–4/5–6, wspólne oznaczenie Q2; NO pokazany osobno w sterowaniu.",
    "Q2 ON, energia OFF.",
    [
      "ON: trzy bieguny i Q2.AUX zamknięte.",
      "OFF/TRIPPED: wszystkie otwarte.",
      "RESET/OFF kasuje trip, potem potrzebne ON.",
    ],
    "Wyłącz Q2; sprawdź trzy tory oraz NO 13–14, nie tylko obrót silnika.",
    "ochrona-silnika",
  ],
  "edu-motor-aux-no": [
    "NO 13–14, odnośnik do wspólnego mechanizmu Q2.",
    "Podąża za nastawionym ON Q2.",
    ["Q2 ON: NO zamknięty.", "Q2 OFF/TRIPPED: NO otwarty."],
    "Otwórz Q2 podczas podtrzymania K1: cewka traci zgodę mimo zasilania Q1 przed Q2.",
    "ochrona-silnika",
  ],
  "schneider-lc1d09p7": [
    "Oddzielne symbole cewki, 1L1–2T1/3L2–4T2/5L3–6T3, NO 13–14 i NC 21–22; jedno oznaczenie K1 albo K2.",
    "Cewka bez pobudzenia: mocy/NO otwarte, NC zamknięty.",
    [
      "Pobudzenie: wszystkie mocy/NO zamknięte, NC otwarty.",
      "K1 NO: podtrzymanie K1.",
      "K1 NC: blokada K2; K2 NC: blokada K1.",
      "NO K2 istnieje, ale nie jest podłączony i nie podtrzymuje lewego.",
    ],
    "Zwolnij START prawego i sprawdź podtrzymanie; zażądaj przeciwnego kierunku. Pomiar Ω sprawnej cewki jest unsupported.",
    "stycznik",
  ],
};
for (const [id, mount] of [
  ["edu-start-stop-din", "TH35"],
  ["edu-start-stop-panel", "R2"],
])
  texts[id] = [
    "STOP 1–2 oraz START 3–4: wspólne oznaczenie zespołu, odrębne operatory.",
    "START zwolniony (NO otwarty), STOP zwolniony (NC zamknięty).",
    [
      "START wciśnięty: 3–4 zamknięty, STOP pozostaje niezależny.",
      "STOP wciśnięty: 1–2 otwarty; zatrzymanie obu kierunków.",
      "Przy trzymanym żądaniu zwolnienie STOP może ponownie uruchomić silnik.",
    ],
    `Sprawdź niezależny START/STOP stanowiska ${mount}.`,
    "start-stop",
  ];
for (const id of ["edu-push-no-din", "edu-push-no-panel"])
  texts[id] = [
    "NO 3–4, bez NC i bez własnego podtrzymania.",
    "Zwolniony: otwarty.",
    [
      "Wciśnięty: zamknięty.",
      "Zwolnienie obu lewych: K2 odpada.",
      "Zwolnienie jednego przy trzymanym drugim: K2 pozostaje.",
    ],
    "Przytrzymaj oba lewe, zwolnij jeden, potem drugi; anulowanie/blur zwalnia przycisk.",
    "przycisk",
  ];
const manual =
  "https://download.se.com/files?p_Doc_Ref=0381869_01A55&p_File_Name=0381869_01A55_04.pdf&p_enDocType=Instruction+sheet";
const profiles: DeviceProfile[] = [
  ...new Set(p.circuit.devices.map((d) => d.productId)),
].map((id) => {
  const product = catalog[id];
  const [symbol, referenceState, states, test, articleId] = texts[id];
  return {
    productId: id,
    productRevision: product.revision,
    topologyId: product.topology.id,
    symbol,
    referenceState,
    states,
    test,
    articleId,
    modelLabel: product.educational
      ? "Model dydaktyczny; nie identyfikuje zakupionego SKU"
      : "LC1D09P7: numeracja/cewka sprawdzone, zachowanie cewki uproszczone",
    mounting: `${product.mounting}; geometria i dostęp do zacisków są modelem, nie potwierdzeniem maskownicy lub montażu stanowiska.`,
    measurements:
      id === "schneider-lc1d09p7"
        ? "Napięcie A1–A2 i stan styków z solvera. Ω sprawnej cewki: unsupported, brak rezystancji DC w danych."
        : "Napięcia, prądy i ciągłość wyłącznie w zakresie modelu. Brak pomiarów fizycznego rozruchu, momentu i charakterystyki zabezpieczenia.",
    terminals: product.topology.terminals.map((t) => ({
      id: t.id,
      role: t.role,
      sourceLabel:
        id === "schneider-lc1d09p7"
          ? ((
              {
                "1L1": "1",
                "3L2": "3",
                "5L3": "5",
                "2T1": "2",
                "4T2": "4",
                "6T3": "6",
              } as Record<string, string>
            )[t.id] ?? t.id)
          : t.id,
    })),
    limitations: [
      ...product.limitations,
      "108-ISSUE-01/02/03 pozostają otwarte: tabliczka, długości i kolejność rzeczywistych aparatów są nieustalone.",
    ],
    sources:
      id === "schneider-lc1d09p7"
        ? [
            {
              title: "Schneider LC1D09P7 — karta produktu",
              url: "https://iportal2.schneider-electric.com/Contents/docs/SQD-LC1D09P7.PDF",
              locator:
                "15.07.2015, wszystkie 4 strony: cewka 230 V AC, 3 NO mocy, 1 NO + 1 NC; czasy ruchu nie są symulowane",
              verifiedAt: "2026-10-08",
            },
            {
              title: "Schneider — instrukcja z rysunkiem zacisków TeSys",
              url: manual,
              locator:
                "W9 0381869 01 11 A04, 06-2016, 4 strony. To instrukcja osprzętu LAD, rysunki LC1D; nie pełna instrukcja każdego SKU Q2/START/STOP.",
              verifiedAt: "2026-10-08",
            },
          ]
        : [
            {
              title: "Kontrakt modelu dydaktycznego w repozytorium",
              url: "https://github.com/Choniawko/ele/blob/feature/ele-knowledge-base/docs/ELE02_108.md",
              locator:
                "Topologia, nastawy, ograniczenia i wykonane testy; nie instrukcja nieznanego SKU.",
              verifiedAt: "2026-10-08",
            },
          ],
  };
});
const fragment = (
  id: string,
  title: string,
  explanation: string,
  conductorIds: string[],
): LessonFragment => ({ id, title, explanation, conductorIds, bridgeIds: [] });
const symbol = (
  designation: string,
  fragmentId: string,
  x: number,
  y: number,
  label: string,
): SymbolPlacement => ({ designation, fragmentId, x, y, label });
const diagrams: DiagramScope[] = [
  {
    title: "108 — trzy fazy mocy, K1/K2 i zamiana L1/L3",
    width: 1300,
    height: 1040,
    symbols: [0, 1, 2].flatMap((i) => [
      symbol("Q2", `pole${i + 1}`, 220, 160 + i * 260, `biegun ${i + 1}`),
      symbol("K1", `pole${i + 1}`, 560, 160 + i * 260, `moc ${i + 1}`),
      symbol("K2", `pole${i + 1}`, 560, 290 + i * 260, `moc ${i + 1}`),
    ]),
    ports: [
      ...["L1", "L2", "L3"].map((terminalId, i) => ({
        designation: "PZ",
        terminalId,
        x: 60,
        y: 160 + i * 260,
        label: `PZ:${terminalId}`,
      })),
      ...["U", "V", "W"].map((terminalId, i) => ({
        designation: "M",
        terminalId,
        x: 1180,
        y: 160 + i * 260,
        label: `M:${terminalId}`,
      })),
      { designation: "PZ", terminalId: "PE", x: 60, y: 950, label: "PZ:PE" },
      { designation: "M", terminalId: "PE", x: 1180, y: 950, label: "M:PE" },
    ],
    netAnchors: [
      { designation: "K1", terminalId: "1L1", point: { x: 440, y: 160 } },
      { designation: "K1", terminalId: "3L2", point: { x: 440, y: 420 } },
      { designation: "K1", terminalId: "5L3", point: { x: 440, y: 680 } },
      { designation: "M", terminalId: "U", point: { x: 900, y: 160 } },
      { designation: "M", terminalId: "V", point: { x: 1000, y: 420 } },
      { designation: "M", terminalId: "W", point: { x: 1100, y: 680 } },
    ],
  },
  {
    title: "108 — zgoda Q2, STOP-y, podtrzymanie K1 i chwilowy K2",
    width: 1560,
    height: 1250,
    symbols: [
      symbol("Q1", "pole1", 200, 140, "B6"),
      symbol("Q2.AUX", "no", 430, 140, "zgoda Q2"),
      symbol("S1", "stop", 660, 140, "STOP NC"),
      symbol("S3", "stop", 890, 140, "STOP NC R2"),
      symbol("S1", "start", 320, 400, "START prawy"),
      symbol("S3", "start", 320, 550, "START prawy R2"),
      symbol("K1", "auxNO", 320, 700, "podtrzymanie NO"),
      symbol("K2", "auxNC", 700, 550, "blokada prawego"),
      symbol("K1", "coil", 1080, 550, "cewka prawego"),
      symbol("S2", "no", 320, 960, "lewy chwilowy"),
      symbol("S4", "no", 320, 1110, "lewy R2"),
      symbol("K1", "auxNC", 700, 960, "blokada lewego"),
      symbol("K2", "coil", 1080, 960, "cewka lewego"),
    ],
    ports: [
      {
        designation: "Q2",
        terminalId: "1",
        x: 60,
        y: 140,
        label: "L1 przed Q2",
      },
      {
        designation: "ZS.N",
        terminalId: "2",
        x: 1460,
        y: 1160,
        label: "N obu A2",
      },
    ],
    netAnchors: [
      {
        designation: "S1",
        terminalId: "3",
        point: { x: 140, y: 400 },
        trunk: [
          { x: 1010, y: 140 },
          { x: 1240, y: 140 },
          { x: 1240, y: 260 },
          { x: 140, y: 260 },
          { x: 140, y: 1110 },
        ],
      },
      { designation: "K2", terminalId: "21", point: { x: 580, y: 400 } },
      { designation: "K1", terminalId: "21", point: { x: 580, y: 960 } },
      { designation: "ZS.N", terminalId: "2", point: { x: 1400, y: 550 } },
    ],
  },
];
export const reference108: ReferenceExample = {
  id: "ele02-108",
  taskId: "ELE.02-108",
  referenceRevision: "1",
  circuitRevision: p.circuit.revision,
  documentPath: "examples/physical/ELE02_108_stanowisko.json",
  title: "Prawy kierunek z podtrzymaniem, lewy chwilowy — dwa stanowiska",
  sourceIds: ["pdf-ele02-108"],
  sourceIssueIds: ["108-ISSUE-01", "108-ISSUE-02", "108-ISSUE-03"],
  lessonId: "ele02-108",
  sourceFigureIds: [
    "ELE02_108_p2_moc-i-sterowanie",
    "ELE02_108_p1_rozmieszczenie",
  ],
  fidelity: "educational",
  create,
  profiles,
  limitations: [
    "Brak tabliczki w dwustronicowym źródle. Silnik 3 kW, Q2 4,35 A, długości i geometria są założeniami dydaktycznymi, nie ustalonymi danymi arkusza.",
    "K1/K2 mają mapę zacisków LC1D09P7: 1/3/5 → 1L1/3L2/5L3; 2/4/6 → 2T1/4T2/6T3. Model cewki nie odtwarza rozruchu ani Ω DC.",
    "R1 jest szyną TH35, R2 obudową. Piąta żyła R2 jest izolowaną rezerwą. Jednoczesne żądanie i trzymane przyciski po powrocie zasilania nie dają gwarancji pierwszeństwa ani blokady rozruchu.",
  ],
  bindings: p.circuit.devices.map((d) => ({
    deviceId: d.id,
    productId: d.productId,
    productRevision: d.productRevision,
    topologyId: catalog[d.productId].topology.id,
    terminalIds: catalog[d.productId].topology.terminals.map((t) => t.id),
    symbolIds: catalog[d.productId].topology.connections.map((c) => c.id),
    role: roles[d.id],
  })),
  fragments: [
    fragment(
      "power",
      "Tor mocy i zamiana faz",
      "Q2 zasila K1/K2. K2 zamienia L1 i L3 na wyjściu. Oba styczniki mają wspólny silnik; PE omija styki.",
      ["W1", "W2", "W3", ...Array.from({ length: 12 }, (_, i) => `W${i + 7}`)],
    ),
    fragment(
      "permission",
      "Q1, zgoda Q2 i STOP-y",
      "Q1 otrzymuje L1 przed Q2. Q2.AUX 13–14 oraz STOP S1/S3 są szeregowo przed wspólnym punktem START-ów.",
      ["W6", "W20", "W21", "W31", "W33", "W34"],
    ),
    fragment(
      "right",
      "Podtrzymanie K1",
      "S1 START, S3 START i własny NO K1 są równoległe. NC K2 blokuje cewkę K1 przy lewym kierunku.",
      ["W23", "W24", "W25", "W27", "W35"],
    ),
    fragment(
      "left",
      "Lewy chwilowy K2",
      "S2/S4 równolegle; NC K1 blokuje K2. Nie ma podtrzymania K2: trzeba zwolnić oba lewe.",
      ["W22", "W26", "W28", "W32", "W36"],
    ),
    fragment(
      "neutral",
      "N obu cewek",
      "A2 obu styczników wracają do N przez ZS.N; nie do PE.",
      ["W4", "W29", "W30"],
    ),
    fragment(
      "protective",
      "Ciągłość PE silnika",
      "PE PZ → ZS.PE → M pozostaje ciągły przy OFF i otwartych Q2/K1/K2.",
      ["W5", "W19"],
    ),
    fragment(
      "reserve",
      "Izolowana rezerwa kabla R2",
      "Piąta żyła YLY jest izolowana z obu stron przez ZS.RES1/2. Nie jest to dodatkowy czynny tor.",
      ["W37"],
    ),
  ],
  diagrams,
};

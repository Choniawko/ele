import { catalog } from "@catalog/index";
import {
  newId,
  type ProjectDocument,
  type Fault,
  type TerminalRef,
} from "@model/index";
import { Builder } from "./builder";
import type { Scenario } from "./index";

export type ExerciseVariant = "reference" | "assembly" | "diagnosis";
export const practiceIds = [
  "exam-bistable",
  "exam-start-stop",
  "exam-reversing",
] as const;
const pair = (deviceId: string, terminalId: string): TerminalRef => ({
  deviceId,
  terminalId,
});
function auxiliary(b: Builder, owner: string, name: string) {
  const id = b.add(
    "edu-auxiliary",
    name,
    b.project.physical.devices[owner].x + 125,
    680,
  );
  b.project.circuit.mechanicalCouplings.push({
    id: newId("assembly"),
    kind: "assembly",
    deviceIds: [owner, id],
  });
  return id;
}
function light() {
  const b = new Builder("Bistabilny i gniazdo · ELE.02-106");
  const g = b.add("edu-source-ac", "G1", 60, 90),
    r = b.add("edu-rcd", "FI1", 265, 90),
    xl = b.bus(r, "2", "L1", 400, 90),
    n = b.bus(r, "N-out", "N", 610, 90),
    pe = b.bus(g, "PE", "PE", 830, 90);
  b.wire(g, "L", r, "1");
  b.wire(g, "N", r, "N-in", "N");
  const ql = b.add("edu-mcb-adjustable", "QF1", 60, 385, { ratedCurrentA: 6 }),
    qs = b.add("edu-mcb-adjustable", "QF2", 150, 385, { ratedCurrentA: 10 });
  b.wire(xl, "2", ql, "1");
  b.wire(xl, "3", qs, "1");
  const out = b.add("edu-bus-n", "XC1", 240, 385),
    signal = b.add("edu-bus-n", "XT1", 440, 385),
    k = b.add("edu-bistable", "K1", 650, 385);
  b.wire(ql, "2", out, "1");
  b.wire(out, "2", k, "3");
  b.wire(out, "3", k, "11");
  b.wire(n, "2", k, "1", "N");
  b.wire(signal, "1", k, "6", "CONTROL");
  for (let i = 0; i < 2; i++) {
    const s = b.add("schneider-xb5aa35", `S${i + 1}`, 80 + i * 125, 680);
    b.wire(out, String(4 + i), s, "13");
    b.wire(s, "14", signal, String(2 + i), "CONTROL");
  }
  const h = b.add("edu-lamp", "H1", 380, 680),
    x = b.add("edu-socket", "X1", 690, 680);
  b.wire(k, "12", h, "L");
  b.wire(n, "3", h, "N", "N");
  b.wire(pe, "2", h, "PE", "PE");
  b.wire(qs, "2", x, "L");
  b.wire(n, "4", x, "N", "N");
  b.wire(pe, "3", x, "PE", "PE");
  return b.project;
}
function motor(reversing: boolean) {
  const b = new Builder(
    reversing ? "Prawo/lewo · blokady kierunków" : "START/STOP · podtrzymanie",
  );
  const g = b.add("edu-source-3ph", "G1", 60, 90),
    q = b.add("edu-mcb3", "QF1", 265, 90, { ratedCurrentA: 16 }),
    qc = b.add("edu-mcb-adjustable", "QF2", 450, 90, { ratedCurrentA: 6 }),
    n = b.bus(g, "N", "N", 570, 90),
    pe = b.bus(g, "PE", "PE", 800, 90);
  ["L1", "L2", "L3"].forEach((p, i) =>
    b.wire(g, p, q, ["1", "3", "5"][i], p as "L1" | "L2" | "L3"),
  );
  b.wire(g, "L1", qc, "1");
  const stop = b.add("edu-stop", "S0", 60, 385),
    f = b.add("edu-thermal", "F1", 270, 385, { ratedCurrentA: 6 }),
    ctrl = b.add("edu-bus-n", "XC0", 520, 385);
  b.wire(qc, "2", stop, "21", "CONTROL");
  b.wire(stop, "22", f, "95", "CONTROL");
  b.wire(f, "96", ctrl, "1", "CONTROL");
  const m = b.add("edu-motor-six", "M1", 760, 680);
  b.wire(pe, "2", m, "PE", "PE");
  b.project.circuit.bridges.push(
    { id: newId("bridge"), from: pair(m, "U2"), to: pair(m, "V2") },
    { id: newId("bridge"), from: pair(m, "V2"), to: pair(m, "W2") },
  );
  const contactors: string[] = [],
    blocks: string[] = [];
  for (let i = 0; i < (reversing ? 2 : 1); i++) {
    const k = b.add("schneider-lc1d09p7", `K${i + 1}`, 60 + i * 150, 680),
      a = auxiliary(b, k, `KA${i + 1}`),
      s = b.add("schneider-xb5aa35", `S${i + 1}`, 360 + i * 110, 680),
      hold = b.add("edu-bus-n", `XC${i + 1}`, 60 + i * 300, 975),
      lamp = b.add("edu-lamp", `H${i + 1}`, 640 + i * 210, 975);
    contactors.push(k);
    blocks.push(a);
    // Both main contacts and built-in indication contact use the same mechanism.
    for (let p = 0; p < 3; p++) {
      b.wire(
        q,
        ["2", "4", "6"][p],
        k,
        ["1L1", "3L2", "5L3"][p],
        ["L1", "L2", "L3"][p] as "L1" | "L2" | "L3",
      );
      b.wire(
        k,
        ["2T1", "4T2", "6T3"][p],
        f,
        ["1L1", "3L2", "5L3"][i === 1 ? 2 - p : p],
        ["L1", "L2", "L3"][p] as "L1" | "L2" | "L3",
      );
    }
    b.wire(ctrl, String(i + 2), s, "13", "CONTROL");
    b.wire(s, "14", hold, "1", "CONTROL");
    b.wire(ctrl, String(i + 2), a, "53", "CONTROL");
    b.wire(a, "54", hold, "2", "CONTROL");
    b.wire(n, String(i + 2), k, "A2", "N");
    b.wire(ctrl, String(i + 4), k, "13", "CONTROL");
    b.wire(k, "14", lamp, "L", "CONTROL");
    b.wire(n, String(i + 4), lamp, "N", "N");
    b.wire(pe, String(i + 3), lamp, "PE", "PE");
    if (!reversing) b.wire(hold, "3", k, "A1", "CONTROL");
  }
  if (reversing) {
    for (let i = 0; i < 2; i++) {
      const hold = b.project.circuit.devices.find(
        (d) => d.designation === `XC${i + 1}`,
      )!.id;
      b.wire(hold, "3", blocks[1 - i], "61", "CONTROL");
      b.wire(blocks[1 - i], "62", contactors[i], "A1", "CONTROL");
    }
    b.project.circuit.mechanicalCouplings.push({
      id: newId("interlock"),
      kind: "interlock",
      deviceIds: contactors,
    });
  }
  ["2T1", "4T2", "6T3"].forEach((t, i) =>
    b.wire(
      f,
      t,
      m,
      ["U1", "V1", "W1"][i],
      ["L1", "L2", "L3"][i] as "L1" | "L2" | "L3",
    ),
  );
  // Explicit section for the power circuit; control and indicators remain 1.5.
  for (const w of b.project.circuit.conductors)
    if (
      w.to.deviceId === m ||
      ([q, f, ...contactors].includes(w.to.deviceId) &&
        ["1", "3", "5", "1L1", "3L2", "5L3"].includes(w.to.terminalId))
    )
      w.crossSectionMm2 = 2.5;
  return b.project;
}
const motorGoals = [
  "M1: U1/V1/W1 przez QF1, stycznik i F1; mostki U2–V2–W2 (gwiazda, uzwojenia 230 V). Tor mocy 2,5 mm².",
  "Sterowanie 230 V: QF2 B6 → STOP NC 21/22 → F1 NC 95/96 → START NO 13/14 równolegle z NO 53/54 przypisanego bloku KA. A2 do N.",
  "Przypisz KA do stycznika w inspektorze. Sygnalizacja przez NO 13/14 stycznika. Po STOP i zaniku napięcia nie może wystąpić samorozruch.",
  "Przy odłączonym zasilaniu zmierz PE: G1–XPE1 oraz XPE1–M1 i każda lampka. Pod napięciem sprawdź kolejność faz M1.",
];
export const practiceScenarios: Scenario[] = [
  {
    id: practiceIds[0],
    number: 14,
    title: "Bistabilny i gniazdo · ELE.02-106",
    description:
      "Dwa miejsca sterowania światłem, niezależne gniazdo, RCD i trzy pomiary ciągłości PE.",
    category: "ELE.02 · etap 1",
    duration: "25–40 min",
    difficulty: "Średni",
    practice: true,
    goals: [
      "FI1 zasila QF1 B6 i QF2 B10; neutralne za RCD, PE bezpośrednio z G1 przez XPE1.",
      "QF1 → XC1 → K1: L=3, N=1, COM=11. S1 i S2 NO 13/14 równolegle do wejścia 6 przez XT1. K1 NO 12 → H1.",
      "QF2 zasila X1 L; gniazdo nie zależy od przycisków lampy. Wciśnij i puść każdy przycisk, czekając ≥150 ms.",
      "Odłącz zasilanie i zmierz PE: G1–XPE1 (zacisk 1), XPE1–H1, XPE1–X1. Uruchom TEST FI1.",
    ],
    hints: [
      "Zbuduj osobne tory fazowe po RCD oraz wspólne N i PE.",
      "Przyciski chwilowe łącz równolegle; 11 jest COM, 10 NC, 12 NO.",
      "Zapisz trzy pomiary PE przy odłączonym zasilaniu, a następnie sprawdź TEST.",
    ],
    fidelity:
      "Części funkcjonalne ELE.02-106; BIS i zabezpieczenia to jawne profile dydaktyczne. Zweryfikowany przycisk XB5AA35.",
    create: light,
  },
  {
    id: practiceIds[1],
    number: 15,
    title: "Silnik START/STOP · montaż i diagnoza",
    description:
      "Cewka 230 V, podtrzymanie z osobnym blokiem, lampka pracy, termik i sześć zacisków silnika.",
    category: "ELE.02 / ELE.05 · adaptacja",
    duration: "30–45 min",
    difficulty: "Zaawansowany",
    practice: true,
    goals: motorGoals,
    hints: [
      "Najpierw połącz trzy tory mocy i gwiazdę silnika.",
      "NO bloku pomocniczego ma zastąpić puszczony START; STOP i 95/96 pozostają szeregowo.",
      "OL cewki może oznaczać przerwę. Sprawna cewka realnego SKU nie ma zmyślonej rezystancji DC.",
    ],
    fidelity:
      "Autorskie ćwiczenie umiejętności. LC1D09P7 i XB5AA35 zweryfikowane; blok, silnik i termik dydaktyczne.",
    create: () => motor(false),
  },
  {
    id: practiceIds[2],
    number: 16,
    title: "Silnik prawo/lewo · dwie blokady",
    description:
      "Zamiana dwóch faz, podtrzymanie obu kierunków, blokada elektryczna oraz osobna mechaniczna.",
    category: "ELE.02 / ELE.05 · rozszerzenie",
    duration: "40–60 min",
    difficulty: "Zaawansowany",
    practice: true,
    goals: [
      ...motorGoals,
      "K2 zamienia L1 i L3. NC 61/62 bloku KA2 w szeregu z A1 K1, NC KA1 w szeregu z A1 K2. Blokada musi działać elektrycznie także bez sprzężenia mechanicznego.",
      "Przypisz oba bloki KA i dodaj blokadę mechaniczną K1–K2 w inspektorze. START S1/S2 podtrzymuje wybrany kierunek; STOP przed zmianą kierunku.",
    ],
    hints: [
      "Zamień dokładnie dwa tory mocy na wyjściu K2.",
      "Sprawdź NC przeciwnego stycznika, również w gałęzi podtrzymania.",
      "Blokada mechaniczna nie zastępuje elektrycznej; sprawdź próbę drugiego START podczas pracy pierwszego.",
    ],
    fidelity:
      "Rozwinięcie umiejętności 23.06: jedno stanowisko i podtrzymanie obu kierunków. Nie odtwarza wymaganego tam lewego jog.",
    create: () => motor(true),
  },
];

export function practiceVariant(
  p: ProjectDocument,
  variant: ExerciseVariant,
  diagnosticCase = 0,
): ProjectDocument {
  p.userMetadata.exerciseVariant = variant;
  if (variant === "assembly") {
    p.circuit.conductors = [];
    p.circuit.bridges = [];
    p.circuit.mechanicalCouplings = [];
    return p;
  }
  if (variant !== "diagnosis") return p;
  const dev = (name: string) =>
    p.circuit.devices.find((d) => d.designation === name)!;
  const wire = (a: string, ta: string, b: string, tb: string) =>
    p.circuit.conductors.find(
      (w) =>
        (w.from.deviceId === dev(a).id &&
          w.from.terminalId === ta &&
          w.to.deviceId === dev(b).id &&
          w.to.terminalId === tb) ||
        (w.to.deviceId === dev(a).id &&
          w.to.terminalId === ta &&
          w.from.deviceId === dev(b).id &&
          w.from.terminalId === tb),
    )!;
  let fault: Omit<Fault, "id" | "hidden" | "activeAtMs">;
  const c = Math.abs(Math.trunc(diagnosticCase)) % 3;
  if (c === 2)
    fault = {
      kind: "open-wire",
      targetId: wire(
        "XPE1",
        "2",
        p.scenarioId === practiceIds[0] ? "H1" : "M1",
        "PE",
      ).id,
    };
  else if (p.scenarioId === practiceIds[0])
    fault =
      c === 0
        ? { kind: "open-wire", targetId: wire("S2", "14", "XT1", "3").id }
        : {
            kind: "welded-contact",
            targetId: dev("K1").id,
            from: pair(dev("K1").id, "11"),
            to: pair(dev("K1").id, "12"),
          };
  else if (c === 0)
    fault = {
      kind: "open-coil",
      targetId: dev(p.scenarioId === practiceIds[2] ? "K2" : "K1").id,
    };
  else if (p.scenarioId === practiceIds[1])
    fault = { kind: "open-wire", targetId: wire("KA1", "54", "XC1", "2").id };
  else
    fault = {
      kind: "welded-contact",
      targetId: dev("KA1").id,
      from: pair(dev("KA1").id, "61"),
      to: pair(dev("KA1").id, "62"),
    };
  p.faults.push({ ...fault, id: newId("fault"), hidden: true, activeAtMs: 0 });
  return p;
}
export function isPractice(p: ProjectDocument) {
  return (practiceIds as readonly string[]).includes(p.scenarioId ?? "");
}
export const behaviorOf = (p: ProjectDocument, id: string) =>
  catalog[p.circuit.devices.find((d) => d.id === id)!.productId].behaviorId;

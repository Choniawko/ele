import {
  practiceScenarios,
  practiceVariant,
  isPractice,
  type ExerciseVariant,
} from "./practice";
import { assessPractice } from "./assessment";
export type { ExerciseVariant } from "./practice";
import { catalog } from "@catalog/index";
import {
  newId,
  type Role,
  type ProjectDocument,
  type TerminalRef,
} from "@model/index";
import {
  advance,
  initialRuntime,
  compile,
  equivalentResistance,
  type RuntimeSnapshot,
} from "@simulation/index";
import type { MeasurementRecord } from "@measurements/index";
export { colors } from "./builder";
import { Builder, colors } from "./builder";
export interface Scenario {
  id: string;
  number: number;
  title: string;
  description: string;
  category: string;
  duration: string;
  difficulty: "Podstawy" | "Średni" | "Zaawansowany";
  goals: string[];
  hints: string[];
  fidelity: string;
  practice?: boolean;
  create: () => ProjectDocument;
}
function basic(
  kind:
    | "simple"
    | "stairs"
    | "cross"
    | "socket"
    | "distribution"
    | "diagnosis"
    | "fan",
): ProjectDocument {
  const simple = ["simple", "diagnosis", "fan"].includes(kind);
  const b = new Builder(
    kind === "simple"
      ? "Oświetlenie · pierwszy obwód"
      : kind === "diagnosis"
        ? "Diagnoza · obwód oświetlenia"
        : "Instalacja oświetleniowa",
  );
  const g = b.add("edu-source-ac", "G1", 80, 90),
    q = b.add("hager-mbn116e", "QF1", 300, 90);
  let out = q,
    ot = "2";
  if (kind === "distribution") {
    const iso = b.add("edu-isolator", "QS1", 270, 90),
      rcd = b.add("edu-rcd", "FI1", 420, 90);
    b.project.physical.devices[q] = { x: 565, y: 90 };
    b.wire(g, "L", iso, "1");
    b.wire(g, "N", iso, "N-in", "N");
    b.wire(iso, "2", rcd, "1");
    b.wire(iso, "N-out", rcd, "N-in", "N");
    b.wire(rcd, "2", q, "1");
    const n = b.bus(rcd, "N-out", "N", 710, 140);
    const pe = b.bus(g, "PE", "PE", 710, 360);
    const l = b.add("edu-lamp", "H1", 450, 390);
    b.wire(q, "2", l, "L");
    b.wire(n, "2", l, "N", "N");
    b.wire(pe, "2", l, "PE", "PE");
    return b.project;
  }
  b.wire(g, "L", q, "1");
  const n = b.bus(g, "N", "N", 450, 140),
    pe = b.bus(g, "PE", "PE", 710, 140);
  if (kind === "socket") {
    const x = b.add("edu-socket", "X1", 250, 385),
      h = b.add("edu-heater", "R1", 600, 385);
    b.wire(q, "2", x, "L");
    b.wire(n, "2", x, "N", "N");
    b.wire(pe, "2", x, "PE", "PE");
    b.wire(x, "L", h, "L");
    b.wire(x, "N", h, "N", "N");
    b.wire(x, "PE", h, "PE", "PE");
    return b.project;
  }
  const s = b.add(simple ? "edu-switch" : "edu-changeover", "S1", 180, 385);
  b.wire(out, ot, s, simple ? "1" : "COM");
  out = s;
  ot = "2";
  if (kind === "stairs" || kind === "cross") {
    const s2 = b.add("edu-changeover", "S2", 490, 385);
    if (kind === "cross") {
      const sx = b.add("edu-crossover", "S3", 335, 385);
      b.wire(s, "1", sx, "1", "CONTROL");
      b.wire(s, "2", sx, "2", "CONTROL");
      b.wire(sx, "3", s2, "1", "CONTROL");
      b.wire(sx, "4", s2, "2", "CONTROL");
    } else {
      b.wire(s, "1", s2, "1", "CONTROL");
      b.wire(s, "2", s2, "2", "CONTROL");
    }
    out = s2;
    ot = "COM";
  }
  const l = b.add(
    kind === "fan" ? "edu-fan" : "edu-lamp",
    kind === "fan" ? "M1" : "H1",
    simple ? 490 : 740,
    385,
  );
  b.wire(out, ot, l, "L");
  b.wire(n, "2", l, "N", "N");
  const peWire = b.wire(pe, "2", l, "PE", "PE");
  if (kind === "diagnosis")
    b.project.faults.push({
      id: newId("fault"),
      kind: "open-wire",
      targetId: peWire,
      hidden: true,
      activeAtMs: 0,
    });
  return b.project;
}
function automation(
  kind: "bistable" | "staircase" | "start-stop" | "dc" | "timer" | "three",
): ProjectDocument {
  const b = new Builder(
    kind === "start-stop"
      ? "START / STOP · podtrzymanie"
      : "Automatyka · układ sterowania",
  );
  const g = b.add(
    kind === "three" ? "edu-source-3ph" : "edu-source-ac",
    "G1",
    65,
    90,
  );
  const n = b.bus(g, "N", "N", 700, 140),
    pe = b.bus(g, "PE", "PE", 700, 385);
  const xl = b.bus(g, kind === "three" ? "L1" : "L", "L1", 450, 140);
  if (kind === "bistable" || kind === "staircase" || kind === "timer") {
    const k = b.add(
      kind === "bistable"
        ? "edu-bistable"
        : kind === "staircase"
          ? "edu-staircase"
          : "edu-timer",
      "KT1",
      320,
      90,
      kind === "bistable" ? {} : { timeS: kind === "staircase" ? 30 : 5 },
    );
    const lamp = b.add("edu-lamp", "H1", 520, 385);
    b.wire(xl, "2", k, kind === "timer" ? "1" : "3");
    b.wire(n, "2", k, kind === "timer" ? "3" : "1", "N");
    if (kind === "timer") {
      b.wire(xl, "3", k, "8");
      b.wire(k, "9", lamp, "L");
    } else {
      const s1 = b.add("edu-start", "S1", 100, 385),
        s2 = b.add("edu-start", "S2", 290, 385);
      const trigger = b.add("edu-bus-n", "XT1", 90, 625);
      b.wire(xl, "3", s1, "13");
      b.wire(xl, "4", s2, "13");
      b.wire(s1, "14", trigger, "1", "CONTROL");
      b.wire(s2, "14", trigger, "2", "CONTROL");
      b.wire(trigger, "3", k, "6", "CONTROL");
      if (kind === "bistable") {
        b.wire(xl, "5", k, "11");
        b.wire(k, "12", lamp, "L");
      } else b.wire(k, "5", lamp, "L");
    }
    b.wire(n, "3", lamp, "N", "N");
    b.wire(pe, "2", lamp, "PE", "PE");
    return b.project;
  }
  const dcMode = kind === "dc",
    k = b.add(dcMode ? "edu-contactor-dc" : "edu-contactor-ac", "K1", 300, 90);
  let cp = xl,
    pt = "2",
    cn = n,
    nt = "2";
  if (dcMode) {
    const ps = b.add("meanwell-hdr60-24", "PS1", 850, 90);
    b.wire(xl, "2", ps, "L");
    b.wire(n, "2", ps, "N", "N");
    cp = b.add("edu-bus-n", "XDC1", 850, 390);
    cn = b.add("edu-bus-n", "XDC2", 850, 575);
    b.wire(ps, "+V1", cp, "1", "DC_PLUS");
    b.wire(ps, "-V1", cn, "1", "DC_MINUS");
    pt = "2";
    nt = "2";
  }
  const stop = b.add("edu-stop", "S0", 100, 385),
    start = b.add("edu-start", "S1", 280, 385),
    junction = b.add("edu-bus-n", "XC1", 100, 625),
    returnJunction = b.add("edu-bus-n", "XC2", 380, 625);
  b.wire(cp, pt, stop, "21", dcMode ? "DC_PLUS" : "CONTROL");
  b.wire(stop, "22", junction, "1", "CONTROL");
  b.wire(junction, "2", start, "13", "CONTROL");
  b.wire(start, "14", returnJunction, "1", "CONTROL");
  b.wire(junction, "3", k, "13", "CONTROL");
  b.wire(k, "14", returnJunction, "2", "CONTROL");
  let controlOut = returnJunction,
    controlTerminal = "3";
  if (kind === "three") {
    const th = b.add("edu-thermal", "F1", 550, 90);
    b.wire(returnJunction, "3", th, "95", "CONTROL");
    controlOut = th;
    controlTerminal = "96";
    const m = b.add("edu-motor", "M1", 540, 385);
    for (const [a, x, y, z] of [
      ["L1", "1L1", "2T1", "U"],
      ["L2", "3L2", "4T2", "V"],
      ["L3", "5L3", "6T3", "W"],
    ]) {
      const role = a as Role;
      b.wire(a === "L1" ? xl : g, a === "L1" ? "3" : a, k, x, role);
      b.wire(k, y, th, x, role);
      b.wire(th, y, m, z, role);
    }
    b.wire(pe, "2", m, "PE", "PE");
  } else {
    const l = b.add("edu-lamp", "H1", 520, 385);
    b.wire(xl, dcMode ? "3" : "3", k, "1L1");
    b.wire(k, "2T1", l, "L");
    b.wire(n, "3", l, "N", "N");
    b.wire(pe, "2", l, "PE", "PE");
  }
  b.wire(controlOut, controlTerminal, k, "A1", "CONTROL");
  b.wire(cn, nt, k, "A2", dcMode ? "DC_MINUS" : "N");
  return b.project;
}
const hints = [
  "Sprawdź połączenia zacisków i prześledź tor roboczy od źródła do odbiornika.",
  "Dobierz pomiar napięcia na odbiorniku, następnie porównaj obie strony elementu łączeniowego.",
  "Przy odłączonych wszystkich źródłach zbadaj ciągłość toru powrotnego oraz osobno PE.",
  "Napraw przyczynę potwierdzoną pomiarem i powtórz test. Świecenie lampy nie potwierdza ciągłości PE.",
];
const defs: [string, string, string, string, () => ProjectDocument][] = [
  [
    "lamp",
    "Lampa i łącznik",
    "Zbuduj obwód oświetlenia z ochroną nadprądową. Sprawdź działanie łącznika i zmierz napięcie na lampie.",
    "Oświetlenie",
    () => basic("simple"),
  ],
  [
    "two-way",
    "Oświetlenie schodowe",
    "Steruj jedną lampą z dwóch miejsc. Każde przełączenie ma zmienić stan odbiornika.",
    "Oświetlenie",
    () => basic("stairs"),
  ],
  [
    "crossover",
    "Oświetlenie z trzech miejsc",
    "Wstaw krzyżowy pomiędzy dwa schodowe i zbadaj wszystkie osiem kombinacji.",
    "Oświetlenie",
    () => basic("cross"),
  ],
  [
    "socket",
    "Gniazdo i tor ochronny",
    "Rozdziel L, N i PE. Zbadaj napięcie w punktach użytkowych oraz ciągłość ochrony.",
    "Ochrona",
    () => basic("socket"),
  ],
  [
    "distribution",
    "Mała rozdzielnica",
    "Rozłącznik, RCD, MCB i osobne listwy. Prześledź tor N oraz wykonaj test RCD.",
    "Ochrona",
    () => basic("distribution"),
  ],
  [
    "bistable",
    "Sterowanie impulsowe",
    "Dwa przyciski równoległe i przekaźnik bez pamięci. Jedno zbocze ma wywołać jedną zmianę.",
    "Automatyka",
    () => automation("bistable"),
  ],
  [
    "staircase",
    "Automat schodowy",
    "Załącz oświetlenie przyciskiem i zweryfikuj wyłączenie po nastawionym czasie.",
    "Automatyka",
    () => automation("staircase"),
  ],
  [
    "start-stop",
    "START / STOP z podtrzymaniem",
    "Cewka, styk pomocniczy NO, START i STOP. Sprawdź podtrzymanie oraz brak samoczynnego restartu.",
    "Automatyka",
    () => automation("start-stop"),
  ],
  [
    "dc",
    "Sterowanie 24 V DC",
    "Zasilacz HDR-60-24 i stycznik DC. Wyjście pozostaje odizolowane od N/PE toru AC.",
    "Automatyka",
    () => automation("dc"),
  ],
  [
    "timer",
    "Przekaźnik czasowy A–D",
    "Zbadaj cykl rozpoczynany zasilaniem. Wybierz funkcję i czas, a następnie porównaj oba zestyki.",
    "Automatyka",
    () => automation("timer"),
  ],
  [
    "three-phase",
    "Trzy fazy i termik",
    "Uruchom silnik dydaktyczny. Przekaźnik przeciążeniowy ma przerwać tor cewki przez 95/96.",
    "Trzy fazy",
    () => automation("three"),
  ],
  [
    "diagnosis",
    "Diagnoza ukrytej usterki",
    "Odbiornik może działać mimo nieprawidłowego toru ochronnego. Zbierz dowód, postaw hipotezę i napraw układ.",
    "Diagnoza",
    () => basic("diagnosis"),
  ],
  [
    "fan",
    "Wentylator i łącznik",
    "Załącz wentylator i obserwuj łopatki. Rozłącz obwód łącznikiem lub wyłącznikiem nadprądowym i sprawdź, czy wentylator się zatrzymał.",
    "Odbiorniki",
    () => basic("fan"),
  ],
];
function arrangeProject(project: ProjectDocument): ProjectDocument {
  const p = project,
    occupied: { x: number; y: number; w: number; h: number }[] = [];
  let schematicY = 80;
  for (let row = 0; row < p.circuit.devices.length; row += 5) {
    const devices = p.circuit.devices.slice(row, row + 5);
    devices.forEach((d, i) => {
      p.schematic.devices[d.id] = { x: 80 + i * 190, y: schematicY };
    });
    schematicY +=
      Math.max(
        ...devices.map((d) => {
          const product = catalog[d.productId];
          const rows =
            product.topology.connections.length +
            (product.behaviorId.startsWith("source-")
              ? product.behaviorId === "source-3ph"
                ? 3
                : 1
              : product.behaviorId === "power-supply"
                ? 1
                : 0);
          return Math.max(90, rows * 45 + 75);
        }),
      ) + 70;
  }
  for (const d of p.circuit.devices) {
    const dimensions = catalog[d.productId].dimensions.value!,
      original = p.physical.devices[d.id];
    const w = dimensions.width * 2.2,
      h = dimensions.height * 2.2;
    let x = original.x,
      y =
        original.y < 300
          ? 90
          : isPractice(p)
            ? 90 + Math.round((original.y - 90) / 295) * 350
            : 385;
    for (let attempt = 0; attempt < 100; attempt++) {
      const collisions = occupied.filter(
        (o) =>
          x < o.x + o.w + 24 &&
          x + w + 24 > o.x &&
          y < o.y + o.h + 20 &&
          y + h + 20 > o.y,
      );
      if (!collisions.length && x + w < 1120) break;
      x = collisions.length
        ? Math.max(...collisions.map((o) => o.x + o.w + 24))
        : 65;
      if (x + w >= 1120) {
        x = 65;
        y += isPractice(p) ? 350 : 295;
      }
    }
    p.physical.devices[d.id] = { x, y };
    occupied.push({ x, y, w, h });
  }
  if (isPractice(p))
    p.physical.rails = Array.from(
      {
        length: Math.max(
          2,
          ...p.circuit.devices.map(
            (d) => Math.round((p.physical.devices[d.id].y - 90) / 350) + 1,
          ),
        ),
      },
      (_, i) => ({
        id: `exam-rail-${i + 1}`,
        x: 60,
        y: 155 + i * 350,
        width: 970,
      }),
    );
  return p;
}
export const scenarios: Scenario[] = [
  ...defs.map<Scenario>(([id, title, description, category, create], i) => ({
    id,
    number: i + 1,
    title,
    description,
    category,
    duration: i < 4 || id === "fan" ? "10–15 min" : "15–25 min",
    difficulty:
      i < 4 || id === "fan" ? "Podstawy" : i < 10 ? "Średni" : "Zaawansowany",
    goals: [
      "Sprawny obwód i poprawne stany",
      "Ciągłość toru PE oraz identyfikacja żył",
      "Pomiar z zapisanym wynikiem",
    ],
    hints,
    fidelity: [
      "bistable",
      "staircase",
      "timer",
      "start-stop",
      "three-phase",
    ].includes(id)
      ? "Wariant dydaktyczny: niezweryfikowane SKU zastąpione jawnymi elementami pracowni."
      : "Rzeczywisty MBN116E lub HDR-60-24 oraz elementy dydaktyczne.",
    create: () => {
      return arrangeProject(create());
    },
  })),
  ...practiceScenarios.map((s) => ({
    ...s,
    create: () => {
      const p = s.create();
      p.scenarioId = s.id;
      return arrangeProject(p);
    },
  })),
];
export function scenarioProject(
  id: string,
  training = false,
  variant: ExerciseVariant = "reference",
  diagnosticCase = 0,
): ProjectDocument {
  const scenario = scenarios.find((s) => s.id === id) ?? scenarios[0],
    p = scenario.create();
  p.scenarioId = scenario.id;
  p.name = scenario.title;
  if (training)
    p.training = {
      scenarioId: scenario.id,
      hintLevel: 0,
      observations: [],
      completedChecks: [],
      repaired: false,
    };
  return isPractice(p) ? practiceVariant(p, variant, diagnosticCase) : p;
}
export interface CheckResult {
  id: string;
  label: string;
  passed: boolean;
  explanation: string;
}
function functionalCheck(p: ProjectDocument): boolean {
  let rt = advance(p, initialRuntime(p), { type: "power", on: true });
  const loads = p.circuit.devices.filter((d) =>
    ["load", "motor"].includes(catalog[d.productId].behaviorId),
  );
  if (!loads.length) return false;
  const buttons = p.circuit.devices.filter(
    (d) => catalog[d.productId].behaviorId === "push-no",
  );
  if (buttons.length) {
    rt = advance(p, rt, {
      type: "operate",
      deviceId: buttons[0].id,
      state: true,
    });
    rt = advance(p, rt, { type: "step", deltaMs: 200 });
    rt = advance(p, rt, {
      type: "operate",
      deviceId: buttons[0].id,
      state: false,
    });
  }
  const timer = p.circuit.devices.find(
    (d) => catalog[d.productId].behaviorId === "timer",
  );
  if (timer)
    rt = advance(p, rt, {
      type: "step",
      deltaMs: (timer.settings.timeS ?? 5) * 1000 + 100,
    });
  if (rt.status !== "valid" || !loads.every((d) => rt.devices[d.id]?.powered))
    return false;
  const stop = p.circuit.devices.find(
    (d) => catalog[d.productId].behaviorId === "push-nc",
  );
  if (stop) {
    const off = advance(p, rt, {
      type: "operate",
      deviceId: stop.id,
      state: true,
    });
    if (loads.some((d) => off.devices[d.id].powered)) return false;
    const lost = advance(p, rt, { type: "power", on: false });
    const back = advance(p, lost, { type: "power", on: true });
    if (loads.some((d) => back.devices[d.id].powered)) return false;
  }
  const changes = p.circuit.devices.filter((d) =>
    ["changeover", "crossover"].includes(catalog[d.productId].behaviorId),
  );
  for (const d of changes) {
    const switched = advance(p, rt, { type: "operate", deviceId: d.id });
    if (
      loads.every(
        (l) => switched.devices[l.id].powered === rt.devices[l.id].powered,
      )
    )
      return false;
  }
  const simple = p.circuit.devices.find(
    (d) =>
      catalog[d.productId].behaviorId === "switch" &&
      catalog[d.productId].visualId === "switch",
  );
  if (simple) {
    const off = advance(p, rt, {
      type: "operate",
      deviceId: simple.id,
      state: false,
    });
    if (loads.some((d) => off.devices[d.id].powered)) return false;
  }
  return true;
}
export function checkScenario(
  p: ProjectDocument,
  rt: RuntimeSnapshot,
  measurements: MeasurementRecord[],
): CheckResult[] {
  if (isPractice(p)) return assessPractice(p, measurements);
  const inactive = { ...rt, energized: false };
  const protectionBranches = compile(p, inactive, { deenergized: true }).filter(
    (b) => b.kind === "wire" || b.kind === "bridge",
  );
  const source = p.circuit.devices.find(
    (d) =>
      catalog[d.productId].behaviorId === "source-ac" ||
      catalog[d.productId].behaviorId === "source-3ph",
  );
  const loads = p.circuit.devices.filter(
    (d) =>
      catalog[d.productId].topology.terminals.some((t) => t.id === "PE") &&
      !catalog[d.productId].behaviorId.startsWith("source"),
  );
  const pe =
    !!source &&
    loads.length > 0 &&
    loads.every((d) => {
      const r = equivalentResistance(
        protectionBranches,
        `${source.id}:PE`,
        `${d.id}:PE`,
      );
      return r !== null && r < 2;
    });
  const color = p.circuit.conductors.every(
    (w) => w.insulationColor === colors[w.declaredRole],
  );
  let measurement = measurements.some(
    (m) => m.revision === p.circuit.revision && m.result.status === "valid",
  );
  if (p.scenarioId === "diagnosis") {
    const protectionMeasure = (m: MeasurementRecord) =>
      m.function === "continuity" &&
      m.red?.terminalId === "PE" &&
      m.black?.terminalId === "PE";
    measurement =
      !!p.training?.diagnosis?.trim() &&
      !!p.training?.repaired &&
      measurements.some(
        (m) => protectionMeasure(m) && m.result.status === "open-circuit",
      ) &&
      measurements.some(
        (m) =>
          protectionMeasure(m) &&
          m.revision === p.circuit.revision &&
          m.result.status === "valid" &&
          (m.result.value ?? Infinity) < 2,
      );
  }
  return [
    {
      id: "function",
      label: "Działanie i przełączanie",
      passed: functionalCheck(p),
      explanation:
        "Test obwodu i sterowania wykonywany na kopii modelu; położenia aparatów nie wpływają na ocenę.",
    },
    {
      id: "pe",
      label: "Ciągłość toru ochronnego",
      passed: pe,
      explanation: pe
        ? "Wszystkie punkty PE odbiorników mają drogę do PE źródła."
        : "Nie potwierdzono ciągłości wszystkich punktów PE. Odłącz źródła i wykonaj pomiar.",
    },
    {
      id: "marking",
      label: "Identyfikacja przewodów",
      passed: color,
      explanation: color
        ? "Role i barwy żył są zgodne z profilem pracowni."
        : "Co najmniej jedna żyła ma barwę niezgodną z zadeklarowaną rolą.",
    },
    {
      id: "measurement",
      label: "Dowód pomiarowy",
      passed: measurement,
      explanation: measurement
        ? "Zapisano poprawny pomiar dla bieżącej rewizji."
        : "Wykonaj i zapisz pomiar po ostatniej zmianie obwodu.",
    },
  ];
}
export function suggestMeasurement(
  p: ProjectDocument,
  rt: RuntimeSnapshot,
): { red?: TerminalRef; black?: TerminalRef; text: string } {
  const load = p.circuit.devices.find(
    (d) => catalog[d.productId].behaviorId === "load",
  );
  if (!load)
    return {
      text: "Wybierz właściwe zaciski cewki lub odbiornika i porównaj napięcie między nimi.",
    };
  return {
    red: { deviceId: load.id, terminalId: "L" },
    black: { deviceId: load.id, terminalId: "N" },
    text: rt.devices[load.id]?.powered
      ? "Odbiornik działa. Odłącz źródła i zbadaj osobno ciągłość PE; działanie odbiornika jej nie potwierdza."
      : "Zmierz napięcie L–N na odbiorniku. Następnie porównaj napięcia przed i za elementem łączeniowym.",
  };
}

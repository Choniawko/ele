import { mountingInfo } from "./mounting-profiles";
import { assertPhysicalLayout } from "@model/physical";
import { installPhysicalProfiles } from "./physical-profiles";
import { installStageOne } from "./stage-one";
import { installMotorControls } from "./motor-controls";
import seed from "../../Symulator_Elektryczny_Pakiet_Codex/catalog-research-seed.json";
import { z } from "zod";
import {
  settingsSchema,
  projectLimits,
  type DeviceSettings,
  type ProjectDocument,
} from "@model/index";

export type BehaviorId =
  | "source-ac"
  | "source-dc"
  | "source-3ph"
  | "mcb"
  | "motor-protection"
  | "rccb"
  | "rcbo"
  | "switch"
  | "changeover"
  | "crossover"
  | "push-no"
  | "push-nc"
  | "push-multi"
  | "push-start-stop"
  | "auxiliary"
  | "contactor"
  | "relay"
  | "bistable"
  | "staircase"
  | "timer"
  | "thermal"
  | "load"
  | "motor"
  | "connector"
  | "socket"
  | "power-supply";
export type VisualId =
  | "hager-mcb"
  | "tesys-contactor"
  | "harmony-button"
  | "auxiliary"
  | "protection"
  | "motor-protection"
  | "start-stop"
  | "switch"
  | "button"
  | "contactor"
  | "relay"
  | "timer"
  | "wago"
  | "terminal"
  | "power-supply"
  | "source"
  | "bulkhead"
  | "indicator"
  | "splice"
  | "phase-distribution"
  | "lamp"
  | "heater"
  | "fan"
  | "motor"
  | "socket";
export type Readiness =
  | "research-seed"
  | "topology-verified"
  | "visual-verified"
  | "simulation-tested"
  | "published";
export interface Evidence {
  sourceId: string;
  locator: string;
  retrievedAt: string;
  verification:
    "manufacturer" | "manual-diagram" | "derived" | "assumed" | "unknown";
  derivation?: string;
}
export interface QualifiedValue<T> {
  value: T | null;
  evidence: Evidence[];
  confidence: "high" | "medium" | "low" | "unknown";
}
export interface Terminal {
  id: string;
  label: string;
  role: string;
  x: number;
  y: number;
  maxConductors: number;
  minMm2: number;
  maxMm2: number;
  printed: boolean;
}
export interface InternalConnection {
  id: string;
  from: string;
  to: string;
  kind: "bridge" | "contact" | "coil" | "load" | "electronics";
  condition?:
    | "manual"
    | "manual-inverse"
    | "stop-inverse"
    | "mechanism"
    | "mechanism-inverse"
    | "healthy"
    | "tripped";
  resistanceOhm?: number;
}
export interface TopologyDefinition {
  id: string;
  revision: string;
  terminals: Terminal[];
  connections: InternalConnection[];
  coil?: {
    plus: string;
    minus: string;
    voltageV: number;
    kind: "AC" | "DC";
    dcResistanceOhm?: number | null;
  };
  supply?: {
    plus: string;
    minus: string;
    kind: "AC" | "DC";
    voltageV: number;
    input?: string;
  };
  output?: { plus: string; minus: string };
  poles?: string[];
}
export interface Product {
  id: string;
  revision: string;
  manufacturer: string;
  family: string;
  manufacturerPartNumber: string;
  displayNamePl: string;
  category: string;
  readiness: Readiness;
  educational: boolean;
  published: boolean;
  behaviorId: BehaviorId;
  topologyId: string;
  visualId: VisualId;
  symbolGroupId: string;
  dimensions: QualifiedValue<{ width: number; height: number; depth: number }>;
  parameters: Record<string, QualifiedValue<number | string | boolean>>;
  topology: TopologyDefinition;
  defaults: DeviceSettings;
  sources: { id: string; title: string; url: string }[];
  blockers: string[];
  limitations: string[];
  gates: { topology: boolean; visual: boolean; simulation: boolean };
  mounting: "DIN" | "panel";
  designationPrefix: string;
}
export const evidence = (
  sourceId: string,
  locator: string,
  verification: Evidence["verification"] = "manufacturer",
  derivation?: string,
): Evidence => ({
  sourceId,
  locator,
  verification,
  retrievedAt: "2026-10-02",
  derivation,
});
export const qualified = <T>(
  value: T,
  source: Evidence,
): QualifiedValue<T> => ({
  value,
  evidence: [source],
  confidence: source.verification === "assumed" ? "low" : "high",
});
const edu = evidence("didactic-v1", "Jawny profil dydaktyczny v1", "assumed");
const terminal = (
  id: string,
  role: string,
  x: number,
  y: number,
  maxConductors = 1,
  printed = true,
): Terminal => ({
  id,
  label: id,
  role,
  x,
  y,
  maxConductors,
  minMm2: 0.14,
  maxMm2: 35,
  printed,
});
const connection = (
  id: string,
  from: string,
  to: string,
  kind: InternalConnection["kind"],
  condition?: InternalConnection["condition"],
  resistanceOhm?: number,
): InternalConnection => ({ id, from, to, kind, condition, resistanceOhm });
export const topologies: Record<string, TopologyDefinition> = {};
function topology(
  id: string,
  terminals: Terminal[],
  connections: InternalConnection[],
  extra: Partial<TopologyDefinition> = {},
): TopologyDefinition {
  const result = { id, revision: "1", terminals, connections, ...extra };
  topologies[id] = result;
  return result;
}
const ac = topology(
  "source-ac",
  [
    terminal("L", "Faza L", 14, 64, 8),
    terminal("N", "Neutralny N", 36, 64, 8),
    terminal("PE", "Ochronny PE", 58, 64, 8),
  ],
  [connection("bond", "N", "PE", "bridge")],
);
const dc = topology(
  "source-dc",
  [
    terminal("+", "Plus", 20, 64, 8),
    terminal("-", "Minus izolowany", 52, 64, 8),
  ],
  [],
);
const three = topology(
  "source-3ph",
  [
    terminal("L1", "Faza 1", 14, 70, 8),
    terminal("L2", "Faza 2", 36, 70, 8),
    terminal("L3", "Faza 3", 58, 70, 8),
    terminal("N", "Neutralny", 80, 70, 8),
    terminal("PE", "Ochronny", 102, 70, 8),
  ],
  [connection("bond", "N", "PE", "bridge")],
);
const sp = topology(
  "switch-1p",
  [
    terminal("1", "Styk wejściowy", 20, 4),
    terminal("2", "Styk wyjściowy", 20, 68),
  ],
  [connection("pole1", "1", "2", "contact", "manual")],
);
const twoWay = topology(
  "changeover",
  [
    terminal("COM", "Wspólny", 32, 4),
    terminal("1", "Tor 1", 16, 68),
    terminal("2", "Tor 2", 48, 68),
  ],
  [
    connection("route1", "COM", "1", "contact", "manual-inverse"),
    connection("route2", "COM", "2", "contact", "manual"),
  ],
);
const cross = topology(
  "crossover",
  [
    terminal("1", "Tor wejścia 1", 16, 4),
    terminal("2", "Tor wejścia 2", 48, 4),
    terminal("3", "Tor wyjścia 1", 16, 68),
    terminal("4", "Tor wyjścia 2", 48, 68),
  ],
  [
    connection("straight1", "1", "3", "contact", "manual-inverse"),
    connection("straight2", "2", "4", "contact", "manual-inverse"),
    connection("cross1", "1", "4", "contact", "manual"),
    connection("cross2", "2", "3", "contact", "manual"),
  ],
);
const no = topology(
  "push-no",
  [terminal("13", "NO", 16, 62), terminal("14", "NO", 48, 62)],
  [connection("NO", "13", "14", "contact", "manual")],
);
const nc = topology(
  "push-nc",
  [terminal("21", "NC", 16, 62), terminal("22", "NC", 48, 62)],
  [connection("NC", "21", "22", "contact", "manual-inverse")],
);
const mcb = topology(
  "hager-mcb-1p",
  [
    { ...terminal("1", "Zacisk górny", 8.75, 0), minMm2: 1 },
    { ...terminal("2", "Zacisk dolny", 8.75, 83), minMm2: 1 },
  ],
  [connection("pole1", "1", "2", "contact", "manual", 0.005)],
  { poles: ["pole1"] },
);
const rcd = topology(
  "rcd-2p",
  [
    terminal("1", "Faza wejściowa", 12, 0, 2),
    terminal("N-in", "Neutralny wejściowy", 36, 0, 2),
    terminal("2", "Faza wyjściowa", 12, 83, 2),
    terminal("N-out", "Neutralny wyjściowy", 36, 83, 2),
  ],
  [
    connection("pole1", "1", "2", "contact", "manual"),
    connection("poleN", "N-in", "N-out", "contact", "manual"),
  ],
  { poles: ["pole1", "poleN"] },
);
const mcb3 = topology(
  "mcb-3p",
  [
    terminal("1", "L1 in", 9, 0, 2),
    terminal("3", "L2 in", 27, 0, 2),
    terminal("5", "L3 in", 45, 0, 2),
    terminal("2", "L1 out", 9, 83, 2),
    terminal("4", "L2 out", 27, 83, 2),
    terminal("6", "L3 out", 45, 83, 2),
  ],
  [
    connection("pole1", "1", "2", "contact", "manual"),
    connection("pole2", "3", "4", "contact", "manual"),
    connection("pole3", "5", "6", "contact", "manual"),
  ],
  { poles: ["pole1", "pole2", "pole3"] },
);
const load = topology(
  "load",
  [
    terminal("L", "Tor roboczy", 20, 70, 3),
    terminal("N", "Tor powrotny", 48, 70, 3),
    terminal("PE", "Obudowa / PE", 76, 70, 2),
  ],
  [connection("load", "L", "N", "load")],
);
const socket = topology(
  "socket",
  [
    terminal("L", "Zacisk roboczy", 16, 70, 2),
    terminal("N", "Zacisk roboczy", 48, 70, 2),
    terminal("PE", "Zacisk ochronny", 80, 70, 2),
    terminal("test-L", "Punkt użytkowy 1", 30, 36, 0, false),
    terminal("test-N", "Punkt użytkowy 2", 66, 36, 0, false),
    terminal("test-PE", "Bolec ochronny", 48, 20, 0, false),
  ],
  [
    connection("l", "L", "test-L", "bridge"),
    connection("n", "N", "test-N", "bridge"),
    connection("pe", "PE", "test-PE", "bridge"),
  ],
);
function contactor(id: string, kind: "AC" | "DC", voltageV: number) {
  return topology(
    id,
    [
      terminal("1L1", "Tor mocy", 9, 0, 2),
      terminal("3L2", "Tor mocy", 27, 0, 2),
      terminal("5L3", "Tor mocy", 45, 0, 2),
      terminal("2T1", "Tor mocy", 9, 83, 2),
      terminal("4T2", "Tor mocy", 27, 83, 2),
      terminal("6T3", "Tor mocy", 45, 83, 2),
      terminal("A1", "Cewka", 63, 12, 3),
      terminal("A2", "Cewka", 63, 71, 3),
      terminal("13", "Pomocniczy NO", 78, 12, 3),
      terminal("14", "Pomocniczy NO", 78, 71, 3),
      terminal("21", "Pomocniczy NC", 93, 12, 2),
      terminal("22", "Pomocniczy NC", 93, 71, 2),
    ],
    [
      connection("coil", "A1", "A2", "coil", undefined, voltageV ** 2 / 4),
      connection("pole1", "1L1", "2T1", "contact", "mechanism"),
      connection("pole2", "3L2", "4T2", "contact", "mechanism"),
      connection("pole3", "5L3", "6T3", "contact", "mechanism"),
      connection("auxNO", "13", "14", "contact", "mechanism"),
      connection("auxNC", "21", "22", "contact", "mechanism-inverse"),
    ],
    { coil: { plus: "A1", minus: "A2", kind, voltageV } },
  );
}
const ca = contactor("contactor-ac", "AC", 230),
  cd = contactor("contactor-dc", "DC", 24);
const relay = topology(
  "relay-2co",
  [
    terminal("A1", "Cewka +", 8, 0, 3),
    terminal("A2", "Cewka −", 56, 0, 3),
    terminal("11", "COM 1", 8, 86, 3),
    terminal("12", "NC 1", 24, 86, 2),
    terminal("14", "NO 1", 40, 86, 2),
    terminal("21", "COM 2", 8, 70, 2),
    terminal("22", "NC 2", 24, 70, 2),
    terminal("24", "NO 2", 40, 70, 2),
  ],
  [
    connection("coil", "A1", "A2", "coil", undefined, 24 ** 2 / 0.65),
    connection("nc1", "11", "12", "contact", "mechanism-inverse"),
    connection("no1", "11", "14", "contact", "mechanism"),
    connection("nc2", "21", "22", "contact", "mechanism-inverse"),
    connection("no2", "21", "24", "contact", "mechanism"),
  ],
  { coil: { plus: "A1", minus: "A2", kind: "DC", voltageV: 24 } },
);
// E240129 manufacturer's connection graphic corrects the supplied seed: 11=COM, 10=NC.
const bis = topology(
  "bis-e240129",
  [
    terminal("1", "N (wariant impulsu L)", 3, 0),
    terminal("3", "L (wariant impulsu L)", 15, 0),
    terminal("6", "Wejście impulsu L", 15, 16),
    terminal("10", "NC", 3, 90),
    terminal("11", "COM", 9, 90),
    terminal("12", "NO", 15, 90),
  ],
  [
    connection(
      "electronics",
      "3",
      "1",
      "electronics",
      undefined,
      230 ** 2 / 0.6,
    ),
    connection("input", "6", "1", "electronics", undefined, 100000),
    connection("nc", "11", "10", "contact", "mechanism-inverse"),
    connection("no", "11", "12", "contact", "mechanism"),
  ],
  { supply: { plus: "3", minus: "1", voltageV: 230, kind: "AC", input: "6" } },
);
const stair = topology(
  "staircase",
  [
    terminal("1", "N", 3, 0, 3),
    terminal("3", "L", 15, 0, 3),
    terminal("6", "Wejście sterujące L", 15, 16, 3),
    terminal("5", "Wyjście fazy L", 9, 90, 3),
  ],
  [
    connection(
      "electronics",
      "3",
      "1",
      "electronics",
      undefined,
      230 ** 2 / 1.2,
    ),
    connection("input", "6", "1", "electronics", undefined, 100000),
    connection("out", "3", "5", "contact", "mechanism"),
  ],
  { supply: { plus: "3", minus: "1", voltageV: 230, kind: "AC", input: "6" } },
);
const timer = topology(
  "timer-duo",
  [
    terminal("1", "AC L · 230 V", 3, 0, 3),
    terminal("3", "Wspólny AC N / DC −", 15, 0, 3),
    terminal("4", "Alternatywne 24 V AC/DC +", 3, 16, 3),
    terminal("7", "NC 1", 3, 74, 3),
    terminal("8", "COM 1", 9, 74, 3),
    terminal("9", "NO 1", 15, 74, 3),
    terminal("10", "NC 2", 3, 90, 3),
    terminal("11", "COM 2", 9, 90, 3),
    terminal("12", "NO 2", 15, 90, 3),
  ],
  [
    connection(
      "electronics",
      "1",
      "3",
      "electronics",
      undefined,
      230 ** 2 / 0.8,
    ),
    connection("dc-input", "4", "3", "electronics", undefined, 24 ** 2 / 0.8),
    connection("nc1", "8", "7", "contact", "mechanism-inverse"),
    connection("no1", "8", "9", "contact", "mechanism"),
    connection("nc2", "11", "10", "contact", "mechanism-inverse"),
    connection("no2", "11", "12", "contact", "mechanism"),
  ],
  { supply: { plus: "1", minus: "3", voltageV: 230, kind: "AC" } },
);
const psu = topology(
  "hdr60",
  [
    terminal("L", "Wejście AC L · pin 5", 10.5, 82.5),
    terminal("N", "Wejście AC N · pin 6", 20.5, 82.5),
    terminal("-V1", "Wyjście −V · pin 1", 16.5, 7.5),
    terminal("-V2", "Wyjście −V · pin 2", 22, 7.5),
    terminal("+V1", "Wyjście +V · pin 3", 27.5, 7.5),
    terminal("+V2", "Wyjście +V · pin 4", 33, 7.5),
  ],
  [
    connection("input", "L", "N", "electronics", undefined, 230 ** 2 / 0.3),
    connection("minus", "-V1", "-V2", "bridge"),
    connection("plus", "+V1", "+V2", "bridge"),
  ],
  {
    supply: { plus: "L", minus: "N", voltageV: 230, kind: "AC" },
    output: { plus: "+V1", minus: "-V1" },
  },
);
const thermal = topology(
  "thermal",
  [
    terminal("1L1", "Tor mocy L1", 9, 0, 2),
    terminal("3L2", "Tor mocy L2", 27, 0, 2),
    terminal("5L3", "Tor mocy L3", 45, 0, 2),
    terminal("2T1", "Tor mocy L1", 9, 74, 2),
    terminal("4T2", "Tor mocy L2", 27, 74, 2),
    terminal("6T3", "Tor mocy L3", 45, 74, 2),
    terminal("95", "Pomocniczy NC", 63, 0, 2),
    terminal("96", "Pomocniczy NC", 63, 74, 2),
    terminal("97", "Pomocniczy NO", 80, 0, 2),
    terminal("98", "Pomocniczy NO", 80, 74, 2),
  ],
  [
    connection("pole1", "1L1", "2T1", "bridge", undefined, 0.01),
    connection("pole2", "3L2", "4T2", "bridge", undefined, 0.01),
    connection("pole3", "5L3", "6T3", "bridge", undefined, 0.01),
    connection("nc", "95", "96", "contact", "healthy"),
    connection("no", "97", "98", "contact", "tripped"),
  ],
  { poles: ["pole1", "pole2", "pole3"] },
);
const motor = topology(
  "motor",
  [
    terminal("U", "Faza U", 16, 80, 2),
    terminal("V", "Faza V", 40, 80, 2),
    terminal("W", "Faza W", 64, 80, 2),
    terminal("PE", "Obudowa", 88, 80, 2),
  ],
  [
    connection("u", "U", "star", "load"),
    connection("v", "V", "star", "load"),
    connection("w", "W", "star", "load"),
  ],
);
const bus = topology(
  "bus",
  [
    terminal("1", "Wspólny potencjał", 8, 26, 3),
    terminal("2", "Wspólny potencjał", 24, 26, 3),
    terminal("3", "Wspólny potencjał", 40, 26, 3),
    terminal("4", "Wspólny potencjał", 56, 26, 3),
    terminal("5", "Wspólny potencjał", 72, 26, 3),
  ],
  [
    connection("b2", "1", "2", "bridge"),
    connection("b3", "1", "3", "bridge"),
    connection("b4", "1", "4", "bridge"),
    connection("b5", "1", "5", "bridge"),
  ],
);

function teaching(
  id: string,
  name: string,
  behaviorId: BehaviorId,
  visualId: VisualId,
  top: TopologyDefinition,
  size: [number, number, number],
  defaults: DeviceSettings = {},
  prefix = "S",
  mounting: Product["mounting"] = "DIN",
): Product {
  return {
    id,
    revision: "1",
    manufacturer: "Pracownia",
    family: "Element dydaktyczny",
    manufacturerPartNumber: "",
    displayNamePl: name,
    category: behaviorId,
    readiness: "published",
    educational: true,
    published: true,
    behaviorId,
    topologyId: top.id,
    visualId,
    symbolGroupId: behaviorId,
    dimensions: qualified(
      { width: size[0], height: size[1], depth: size[2] },
      edu,
    ),
    parameters: {},
    topology: top,
    defaults,
    sources: [],
    blockers: [],
    limitations: [
      "Jawny model dydaktyczny; nie odwzorowuje konkretnego produktu.",
    ],
    gates: { topology: true, visual: true, simulation: true },
    mounting,
    designationPrefix: prefix,
  };
}
export const teachingProducts: Product[] = [
  teaching(
    "edu-source-ac",
    "Źródło sieciowe · 230 V AC",
    "source-ac",
    "source",
    ac,
    [72, 72, 40],
    { voltageV: 230, sourceResistanceOhm: 0.4 },
    "G",
    "panel",
  ),
  teaching(
    "edu-source-dc",
    "Źródło izolowane · 24 V DC",
    "source-dc",
    "source",
    dc,
    [72, 72, 40],
    { voltageV: 24, sourceResistanceOhm: 0.1 },
    "G",
    "panel",
  ),
  teaching(
    "edu-source-3ph",
    "Źródło trójfazowe · 230/398 V",
    "source-3ph",
    "source",
    three,
    [116, 80, 40],
    { voltageV: 230, sourceResistanceOhm: 0.4, phaseOrder: "123" },
    "G",
    "panel",
  ),
  teaching(
    "edu-lamp",
    "Lampa · 60 W / 230 V",
    "load",
    "lamp",
    load,
    [96, 80, 40],
    { powerW: 60, voltageV: 230 },
    "H",
    "panel",
  ),
  teaching(
    "edu-heater",
    "Grzałka rezystancyjna · 2300 W",
    "load",
    "heater",
    load,
    [96, 80, 40],
    { powerW: 2300, voltageV: 230 },
    "R",
    "panel",
  ),
  {
    ...teaching(
      "edu-fan",
      "Wentylator · 80 W / 230 V",
      "load",
      "fan",
      load,
      [96, 80, 40],
      { powerW: 80, voltageV: 230 },
      "M",
      "panel",
    ),
    limitations: [
      "Model dydaktyczny z rezystancyjnym odpowiednikiem poboru mocy; nie odwzorowuje konkretnego produktu.",
      "Obroty pokazują stan pracy, nie obliczoną prędkość ani rozruch silnika.",
    ],
  },
  teaching(
    "edu-switch",
    "Łącznik jednobiegunowy",
    "switch",
    "switch",
    sp,
    [40, 72, 40],
    { position: true },
    "S",
    "panel",
  ),
  teaching(
    "edu-changeover",
    "Łącznik schodowy · COM / 1 / 2",
    "changeover",
    "switch",
    twoWay,
    [64, 72, 40],
    { position: false },
    "S",
    "panel",
  ),
  teaching(
    "edu-crossover",
    "Łącznik krzyżowy",
    "crossover",
    "switch",
    cross,
    [64, 72, 40],
    { position: false },
    "S",
    "panel",
  ),
  teaching(
    "edu-start",
    "Przycisk START · chwilowy NO",
    "push-no",
    "button",
    no,
    [64, 72, 40],
    {},
    "S",
    "panel",
  ),
  teaching(
    "edu-stop",
    "Przycisk STOP · chwilowy NC",
    "push-nc",
    "button",
    nc,
    [64, 72, 40],
    {},
    "S",
    "panel",
  ),
  teaching(
    "edu-rcd",
    "RCD · 2P / 30 mA / sinus AC",
    "rccb",
    "protection",
    rcd,
    [48, 83, 70],
    { position: true },
    "FI",
  ),
  teaching(
    "edu-rcbo",
    "RCBO · B16 / 30 mA",
    "rcbo",
    "protection",
    rcd,
    [48, 83, 70],
    { position: true, ratedCurrentA: 16 },
    "QF",
  ),
  teaching(
    "edu-mcb3",
    "MCB trójfazowy · C16",
    "mcb",
    "protection",
    mcb3,
    [54, 83, 70],
    { position: true, ratedCurrentA: 16 },
    "QF",
  ),
  teaching(
    "edu-isolator",
    "Rozłącznik · 2P",
    "switch",
    "protection",
    rcd,
    [48, 83, 70],
    { position: true },
    "QS",
  ),
  teaching(
    "edu-contactor-ac",
    "Stycznik · cewka 230 V AC",
    "contactor",
    "contactor",
    ca,
    [104, 83, 70],
    {},
    "K",
  ),
  teaching(
    "edu-contactor-dc",
    "Stycznik · cewka 24 V DC",
    "contactor",
    "contactor",
    cd,
    [104, 83, 70],
    {},
    "K",
  ),
  teaching(
    "edu-relay",
    "Przekaźnik w gnieździe · 24 V DC",
    "relay",
    "relay",
    relay,
    [64, 92, 60],
    {},
    "K",
  ),
  teaching(
    "edu-bistable",
    "Przekaźnik impulsowy · profil BIS-411",
    "bistable",
    "timer",
    bis,
    [18, 90, 65],
    {},
    "K",
  ),
  teaching(
    "edu-staircase",
    "Automat schodowy · profil AS-212",
    "staircase",
    "timer",
    stair,
    [18, 90, 65],
    { timeS: 30 },
    "KT",
  ),
  teaching(
    "edu-timer",
    "Przekaźnik czasowy · profil PCU A–D",
    "timer",
    "timer",
    timer,
    [18, 90, 65],
    { timeS: 5, timerMode: "B" },
    "KT",
  ),
  teaching(
    "edu-thermal",
    "Termik · NC 95/96 / NO 97/98",
    "thermal",
    "contactor",
    thermal,
    [88, 74, 70],
    { ratedCurrentA: 6 },
    "F",
  ),
  teaching(
    "edu-motor",
    "Silnik trójfazowy · model rezystancyjny",
    "motor",
    "motor",
    motor,
    [104, 90, 80],
    { powerW: 3000, voltageV: 230, loadFactor: 1 },
    "M",
    "panel",
  ),
  teaching(
    "edu-bus-n",
    "Listwa N · 5 zacisków",
    "connector",
    "terminal",
    bus,
    [80, 32, 25],
    {},
    "XN",
  ),
  teaching(
    "edu-bus-pe",
    "Listwa PE · 5 zacisków",
    "connector",
    "terminal",
    bus,
    [80, 32, 25],
    {},
    "XPE",
  ),
  teaching(
    "edu-socket",
    "Gniazdo z bolcem · punkty użytkowe",
    "socket",
    "socket",
    socket,
    [96, 80, 40],
    {},
    "X",
    "panel",
  ),
];
export const realProducts: Product[] = seed.products.map((raw) => {
  const params: Product["parameters"] = {};
  for (const fact of raw.facts)
    if (
      typeof fact.value === "number" ||
      typeof fact.value === "string" ||
      typeof fact.value === "boolean"
    )
      params[fact.fieldPath] = qualified(
        fact.value,
        evidence(
          fact.evidence[0].sourceId,
          fact.evidence[0].locator ?? "Specyfikacja produktu",
          fact.evidence[0].verification === "derived"
            ? "derived"
            : "manufacturer",
        ),
      );
  return {
    id: raw.id,
    revision: raw.seedRevision,
    manufacturer: raw.manufacturer,
    family: raw.family,
    manufacturerPartNumber: raw.manufacturerPartNumber,
    displayNamePl: raw.displayNamePl,
    category: raw.category,
    readiness: "research-seed",
    educational: false,
    published: false,
    behaviorId: "switch",
    topologyId: "unverified",
    visualId: "switch",
    symbolGroupId: "unverified",
    dimensions: { value: null, evidence: [], confidence: "unknown" },
    parameters: params,
    topology: {
      id: "unverified",
      revision: "1",
      terminals: [],
      connections: [],
    },
    defaults: {},
    sources: seed.sources
      .filter((s) => raw.sourceIds.includes(s.id))
      .map((s) => ({ id: s.id, title: s.title, url: s.url })),
    blockers: [...raw.releaseBlockers],
    limitations: [...raw.notes],
    gates: { topology: false, visual: false, simulation: false },
    mounting: "DIN",
    designationPrefix: "Q",
  };
});
function release(
  id: string,
  behaviorId: BehaviorId,
  visualId: VisualId,
  top: TopologyDefinition,
  dimensions: [number, number, number],
  source: Evidence,
  defaults: DeviceSettings,
  prefix: string,
) {
  const p = realProducts.find((p) => p.id === id)!;
  Object.assign(p, {
    revision: "verified-1",
    published: true,
    readiness: "published",
    behaviorId,
    visualId,
    topology: top,
    topologyId: top.id,
    symbolGroupId: behaviorId,
    dimensions: qualified(
      { width: dimensions[0], height: dimensions[1], depth: dimensions[2] },
      source,
    ),
    defaults,
    designationPrefix: prefix,
    gates: { topology: true, visual: true, simulation: true },
    blockers: [],
  });
}
release(
  "hager-mbn116e",
  "mcb",
  "hager-mcb",
  mcb,
  [17.5, 83, 70],
  evidence(
    "hager-mbn116e",
    "Specyfikacja i fotografia MCN1XXE-MBN1XXE; front; wejście od góry / wyjście od dołu",
  ),
  { position: true, ratedCurrentA: 16 },
  "QF",
);
realProducts
  .find((p) => p.id === "hager-mbn116e")!
  .limitations.push(
    "Profil dydaktyczny B: magnetyczne 4×In, akumulacja cieplna. Nie jest pełną krzywą czasowo-prądową SKU. Punkty przyłączeniowe w nakładce zaciskowej; śruba nie jest otworem przewodu.",
  );
release(
  "meanwell-hdr60-24",
  "power-supply",
  "power-supply",
  psu,
  [52.5, 90, 54.5],
  evidence(
    "meanwell-hdr60",
    "Karta HDR-60-SPEC 2026-04-03, str. 4: obrys i przypisanie TB1/TB2",
  ),
  {},
  "PS",
);
realProducts
  .find((p) => p.id === "meanwell-hdr60-24")!
  .limitations.push(
    "Izolowany DC, zastępczy pobór mocy, sprawność 90%, uproszczone ograniczenie wyjścia. Bez modelu hiccup, udaru i tętnień. Jeden przewód na zacisk to konserwatywne ograniczenie profilu. Położenia skalowane z rysunku, bez wymiarowania producenta.",
  );
for (const [id, top, behaviorId, url, note] of [
  [
    "fif-bis411-230",
    bis,
    "bistable",
    "https://www.fif.com.pl/pl/index.php?controller=attachment&id_attachment=74",
    "Korekta seed: COM 11, NC 10, NO 12; w wariancie impulsu L: N 1, L 3. Instrukcja E240129 i schemat producenta.",
  ],
  [
    "fif-as212",
    stair,
    "staircase",
    "https://fif.com.pl/pliki/0/746/AS-212-instructions-for-use-pl-1.pdf",
    "Instrukcja E240306: N 1, L 3, sterowanie 6, wyjście 5; wyjście nie jest odizolowane.",
  ],
  [
    "fif-pcu510duo",
    timer,
    "timer",
    "https://www.fif.com.pl/pl/index.php?controller=attachment&id_attachment=361",
    "Korekta seed według E231117: 230 V 1–3; alternatywne 24 V 4–3; C start ON, D start OFF; COM 8 i 11.",
  ],
] as const) {
  const p = realProducts.find((p) => p.id === id)!;
  p.readiness = "topology-verified";
  p.topology = top;
  p.topologyId = top.id;
  p.behaviorId = behaviorId;
  p.gates.topology = true;
  p.sources.push({
    id: id + "-reviewed",
    title: "Instrukcja zweryfikowana 2026-10-03",
    url,
  });
  p.limitations.unshift(
    note,
    "Obudowa i współrzędne profilu dydaktycznego nie są dowodem geometrii rzeczywistego SKU. Produkt pozostaje zablokowany.",
  );
}
// Retain exact seed and reviewed data separately. No pending SKU may enter a circuit.
installStageOne(realProducts, teachingProducts, topologies);
installPhysicalProfiles(teachingProducts, topologies);
installMotorControls(teachingProducts, topologies);
export const products = [...realProducts, ...teachingProducts];
export const catalog = Object.fromEntries(products.map((p) => [p.id, p]));
export const availableProducts = products.filter((p) => p.published);
export const seedSources = seed.sources;
export function assertProjectCatalog(project: ProjectDocument): void {
  assertPhysicalLayout(project, (id) => mountingInfo(catalog[id]));
  if (
    project.circuit.devices.length > projectLimits.devices ||
    project.circuit.conductors.length > projectLimits.conductors
  )
    throw new Error(
      `Limit projektu: ${projectLimits.devices} aparatów i ${projectLimits.conductors} żył.`,
    );
  const seen = new Set<string>(),
    designations = new Set<string>();
  for (const d of project.circuit.devices) {
    const p = catalog[d.productId];
    if (!p?.published)
      throw new Error(
        `Niedostępny lub niezweryfikowany produkt: ${d.productId}. Zachowaj oryginalny plik.`,
      );
    settingsSchema.parse(d.settings);
    const allowed = new Set(Object.keys(p.defaults));
    if (p.behaviorId === "load") allowed.add("resistanceOhm");
    if (p.behaviorId.startsWith("source-")) allowed.add("independentSupply");
    for (const key of Object.keys(d.settings))
      if (!allowed.has(key))
        throw new Error(`${d.designation}: nieobsługiwana nastawa ${key}.`);
    if (!p.educational)
      for (const [key, value] of Object.entries(p.defaults))
        if (
          key !== "position" &&
          d.settings[key as keyof DeviceSettings] !== value
        )
          throw new Error(
            `${d.designation}: parametr znamionowy produktu jest stały.`,
          );
    if (
      d.productRevision !== p.revision ||
      project.productRevisions[d.productId] !== p.revision
    )
      throw new Error(
        `Brak zgodnej wersji katalogu dla ${d.designation}. Wymagana jawna migracja.`,
      );
    if (seen.has(d.id) || designations.has(d.designation))
      throw new Error("Powtórzony identyfikator lub oznaczenie aparatu.");
    seen.add(d.id);
    designations.add(d.designation);
    if (!project.physical.devices[d.id] || !project.schematic.devices[d.id])
      throw new Error(`Brak położenia ${d.designation}.`);
  }
  const validRef = (r: { deviceId: string; terminalId: string }) => {
    const d = project.circuit.devices.find((d) => d.id === r.deviceId);
    return (
      !!d &&
      catalog[d.productId].topology.terminals.some((t) => t.id === r.terminalId)
    );
  };
  const wireIds = new Set<string>();
  for (const w of [...project.circuit.conductors, ...project.circuit.bridges]) {
    if (
      wireIds.has(w.id) ||
      seen.has(w.id) ||
      !validRef(w.from) ||
      !validRef(w.to)
    )
      throw new Error("Powtórzony przewód lub nieistniejący zacisk.");
    wireIds.add(w.id);
  }
  for (const d of project.circuit.devices)
    for (const t of catalog[d.productId].topology.terminals) {
      const attached = project.circuit.conductors.filter(
        (w) =>
          (w.from.deviceId === d.id && w.from.terminalId === t.id) ||
          (w.to.deviceId === d.id && w.to.terminalId === t.id),
      );
      if (
        attached.length > t.maxConductors ||
        attached.some(
          (w) => w.crossSectionMm2 < t.minMm2 || w.crossSectionMm2 > t.maxMm2,
        )
      )
        throw new Error(
          `${d.designation}:${t.id}: przekroczono ograniczenie zacisku.`,
        );
    }
  for (const coupling of project.circuit.mechanicalCouplings)
    if (coupling.deviceIds.some((id) => !seen.has(id)))
      throw new Error("Sprzężenie odnosi się do nieistniejącego aparatu.");
  for (const d of project.circuit.devices.filter(
    (d) => catalog[d.productId].behaviorId === "auxiliary",
  )) {
    const groups = project.circuit.mechanicalCouplings.filter(
      (c) => c.kind === "assembly" && c.deviceIds.includes(d.id),
    );
    if (
      groups.length > 1 ||
      groups.some(
        (c) =>
          c.deviceIds.filter((id) => {
            const other = project.circuit.devices.find((x) => x.id === id)!;
            return (
              !!catalog[other.productId].topology.coil ||
              ["push-no", "push-nc", "push-multi", "motor-protection"].includes(
                catalog[other.productId].behaviorId,
              )
            );
          }).length !== 1,
      )
    )
      throw new Error(
        `${d.designation}: blok pomocniczy wymaga jednego mechanizmu nadrzędnego.`,
      );
  }
  for (const supply of project.circuit.supplySystems)
    if (
      !project.circuit.devices.some(
        (d) =>
          d.id === supply.sourceId &&
          catalog[d.productId].behaviorId.startsWith("source-"),
      )
    )
      throw new Error("Nieistniejące źródło zasilania.");
  for (const cable of project.circuit.cables)
    if (cable.coreIds.some((id) => !wireIds.has(id)))
      throw new Error("Kabel zawiera nieistniejącą żyłę.");
  for (const f of project.faults) {
    if ((f.from && !validRef(f.from)) || (f.to && !validRef(f.to)))
      throw new Error("Usterka odnosi się do nieistniejącego zacisku.");
    if (!seen.has(f.targetId) && !wireIds.has(f.targetId))
      throw new Error("Usterka odnosi się do nieistniejącego obiektu.");
  }
}
export function validateCatalog(): string[] {
  const errors: string[] = [];
  for (const p of products) {
    if (!p.published) continue;
    if (
      !p.gates.topology ||
      !p.gates.visual ||
      !p.gates.simulation ||
      !p.dimensions.value
    )
      errors.push(`${p.id}: bramka publikacji`);
    const ids = p.topology.terminals.map((t) => t.id);
    if (new Set(ids).size !== ids.length)
      errors.push(`${p.id}: powtórzony zacisk`);
    for (const c of p.topology.connections)
      for (const id of [c.from, c.to])
        if (!ids.includes(id) && id !== "star")
          errors.push(`${p.id}: nieistniejący zacisk ${id}`);
    if (!p.educational && (!p.sources.length || !p.dimensions.evidence.length))
      errors.push(`${p.id}: brak dowodów`);
    for (const t of p.topology.terminals)
      if (
        t.x < 0 ||
        t.y < 0 ||
        t.x > p.dimensions.value!.width ||
        t.y > p.dimensions.value!.height
      )
        errors.push(`${p.id}: geometria zacisku ${t.id}`);
  }
  return errors;
}
export const catalogInputSchema = z
  .object({
    seedSchemaVersion: z.literal("1.0.0"),
    productCount: z.number().int().min(1).max(500),
    products: z
      .array(
        z.object({
          id: z.string().min(1),
          manufacturer: z.string(),
          manufacturerPartNumber: z.string(),
          displayNamePl: z.string(),
          published: z.literal(false),
          readiness: z.literal("research-seed"),
          sourceIds: z.array(z.string()),
          facts: z.array(
            z.object({
              fieldPath: z.string(),
              value: z.unknown(),
              unit: z.string().nullable(),
              evidence: z
                .array(
                  z.object({ sourceId: z.string(), verification: z.string() }),
                )
                .min(1),
            }),
          ),
        }),
      )
      .max(500),
    sources: z
      .array(z.object({ id: z.string(), url: z.url(), title: z.string() }))
      .max(1000),
  })
  .superRefine((data, ctx) => {
    const ids = data.products.map((p) => p.id),
      sources = data.sources.map((s) => s.id);
    if (
      data.productCount !== data.products.length ||
      new Set(ids).size !== ids.length ||
      new Set(sources).size !== sources.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Niezgodna liczba produktów lub powtórzone identyfikatory.",
      });
    for (const p of data.products)
      for (const id of [
        ...p.sourceIds,
        ...p.facts.flatMap((f) => f.evidence.map((e) => e.sourceId)),
      ])
        if (!sources.includes(id))
          ctx.addIssue({
            code: "custom",
            message: `${p.id}: brak źródła ${id}.`,
          });
  });

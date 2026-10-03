import { catalog } from "@catalog/index";
import {
  clone,
  terminalKey,
  type ProjectDocument,
  type TerminalRef,
} from "@model/index";
import {
  advance,
  compile,
  magnitude,
  equivalentResistance,
  solveNetwork,
  voltageBetween,
  type RuntimeSnapshot,
  type Branch,
} from "@simulation/index";
export type MeasurementFunction =
  | "voltage-ac"
  | "voltage-dc"
  | "continuity"
  | "current"
  | "insulation"
  | "loop"
  | "rcd"
  | "phase-order";
export type MeasurementStatus =
  | "valid"
  | "open-circuit"
  | "floating"
  | "invalid-setup"
  | "out-of-range"
  | "unsupported"
  | "solver-error";
export interface MeasurementRequest {
  function: MeasurementFunction;
  red?: TerminalRef;
  black?: TerminalRef;
  wireId?: string;
  deviceId?: string;
  testVoltageV: 100 | 250 | 500;
  rcdMultiplier: 0.5 | 1 | 2 | 5;
  compensateLeads: boolean;
}
export interface MeasurementResult {
  status: MeasurementStatus;
  value: number | null;
  unit: string;
  explanation: string;
  details?: Record<string, number | string>;
  afterRuntime?: RuntimeSnapshot;
}
export interface MeasurementRecord {
  id: string;
  function: MeasurementFunction;
  red?: TerminalRef;
  black?: TerminalRef;
  wireId?: string;
  deviceId?: string;
  parameters: Omit<MeasurementRequest, "red" | "black" | "wireId" | "deviceId">;
  revision: number;
  timeMs: number;
  energized: boolean;
  result: Omit<MeasurementResult, "afterRuntime">;
}
export const measurementNames: Record<MeasurementFunction, string> = {
  "voltage-ac": "Napięcie AC",
  "voltage-dc": "Napięcie DC",
  continuity: "Ciągłość / rezystancja",
  current: "Prąd · cęgi",
  insulation: "Rezystancja izolacji",
  loop: "Pętla zwarcia",
  rcd: "Test RCD · sinus AC",
  "phase-order": "Kolejność faz",
};
const result = (
  status: MeasurementStatus,
  value: number | null,
  unit: string,
  explanation: string,
  details?: MeasurementResult["details"],
): MeasurementResult => ({ status, value, unit, explanation, details });
export function measure(
  project: ProjectDocument,
  rt: RuntimeSnapshot,
  request: MeasurementRequest,
): MeasurementResult {
  if (rt.status !== "valid")
    return result(
      "solver-error",
      null,
      "",
      "Najpierw usuń błąd rozwiązania obwodu.",
    );
  const energized = rt.solution.branches.some(
    (b) => b.voltage && magnitude(b.voltage) > 0,
  );
  const p = clone(project),
    nodes = p.circuit.devices.flatMap((d) =>
      catalog[d.productId].topology.terminals.map((t) => `${d.id}:${t.id}`),
    );
  if (request.function === "current") {
    if (
      !request.wireId ||
      !p.circuit.conductors.some((w) => w.id === request.wireId)
    )
      return result(
        "invalid-setup",
        null,
        "A",
        "Kliknij konkretną żyłę przewodu, na której chcesz założyć cęgi.",
      );
    const current = rt.solution.currents[request.wireId];
    if (!current)
      return result("valid", 0, "A", "Brak przepływu przez wybraną żyłę.");
    const wire = p.circuit.conductors.find((w) => w.id === request.wireId)!;
    const dc = rt.solution.domains[terminalKey(wire.from)] === "DC";
    return result(
      "valid",
      dc ? current.re : magnitude(current),
      "A",
      "Pomiar jednej żyły. Kierunek dodatni DC: od pierwszego do drugiego końca; AC: wartość skuteczna.",
    );
  }
  if (request.function === "phase-order") {
    if (!request.deviceId)
      return result(
        "invalid-setup",
        null,
        "",
        "Wybierz trójfazowe źródło lub silnik.",
      );
    const d = p.circuit.devices.find((d) => d.id === request.deviceId),
      state = rt.devices[request.deviceId];
    if (
      !d ||
      !["source-3ph", "motor"].includes(catalog[d.productId].behaviorId)
    )
      return result(
        "unsupported",
        null,
        "",
        "Wybierz aparat z trzema torami fazowymi.",
      );
    if (catalog[d.productId].behaviorId === "motor")
      return result(
        state.powered ? "valid" : "invalid-setup",
        null,
        "",
        state.powered
          ? `Kolejność ${state.direction}`
          : "Brak prawidłowego zasilenia wszystkich faz.",
        { kolejność: state.direction ?? "nieokreślona" },
      );
    const phases = ["L1", "L2", "L3"].map(
      (t) => rt.solution.voltages[`${d.id}:${t}`],
    );
    if (!phases.every((v) => v && magnitude(v) > 100))
      return result(
        "invalid-setup",
        null,
        "",
        "Nie wszystkie fazy są zasilone.",
      );
    const delta =
      Math.atan2(phases[1].im, phases[1].re) -
      Math.atan2(phases[0].im, phases[0].re);
    return result(
      "valid",
      null,
      "",
      Math.sin(delta) < 0 ? "Kolejność 1 → 2 → 3" : "Kolejność 1 → 3 → 2",
    );
  }
  if (!request.red || !request.black)
    return result(
      "invalid-setup",
      null,
      "",
      "Przypnij czerwoną i czarną sondę do zacisków.",
    );
  const red = terminalKey(request.red),
    black = terminalKey(request.black);
  if (!nodes.includes(red) || !nodes.includes(black))
    return result(
      "invalid-setup",
      null,
      "",
      "Sonda wskazuje nieistniejący zacisk.",
    );
  const voltage = voltageBetween(rt.solution, red, black);
  if (request.function === "voltage-ac" || request.function === "voltage-dc") {
    if (!voltage)
      return result(
        "floating",
        null,
        "V",
        "Punkty należą do niezależnych wysp. Potencjał między nimi jest nieokreślony.",
      );
    const domain = rt.solution.domains[red];
    if (
      domain !== "passive" &&
      (request.function === "voltage-ac") !== (domain === "AC")
    )
      return result(
        "invalid-setup",
        null,
        "V",
        `Wybierz funkcję napięcia ${domain}.`,
      );
    const shunt: Branch = {
      id: "voltmeter",
      from: red,
      to: black,
      resistanceOhm: 10e6,
      kind: "meter",
    };
    const solved = solveNetwork([...compile(project, rt), shunt], nodes),
      loaded = voltageBetween(solved, red, black);
    if (!loaded)
      return result(
        "solver-error",
        null,
        "V",
        "Nie udało się obliczyć obwodu z miernikiem.",
      );
    const value =
      request.function === "voltage-ac" ? magnitude(loaded) : loaded.re;
    return result(
      Math.abs(value) > 1000 ? "out-of-range" : "valid",
      Math.abs(value) > 1000 ? null : value,
      "V",
      "Impedancja wejściowa 10 MΩ; AC 50 Hz RMS, DC ze znakiem. Profil idealnego odczytu.",
    );
  }
  if (request.function === "continuity") {
    if (energized)
      return result(
        "invalid-setup",
        null,
        "Ω",
        "Pomiar rezystancji wymaga odłączenia wszystkich źródeł, również niezależnego DC.",
      );
    const branches = compile(project, rt, { deenergized: true });
    const r = equivalentResistance(branches, red, black);
    if (r === null)
      return result(
        "open-circuit",
        null,
        "Ω",
        "OL · Brak zamkniętej drogi dla prądu testowego.",
      );
    const leads = request.compensateLeads ? 0 : 0.2;
    return result(
      r > 1e6 ? "out-of-range" : "valid",
      r > 1e6 ? null : r + leads,
      "Ω",
      "Źródło testowe 1 V; rozwiązanie całej sieci uwzględnia równoległe drogi. Rezystancja przewodów pomiarowych: 0,2 Ω przed kompensacją.",
    );
  }
  if (request.function === "insulation") {
    if (energized)
      return result(
        "invalid-setup",
        null,
        "MΩ",
        "Odłącz wszystkie źródła przed testem izolacji.",
      );
    const electronics = p.circuit.devices.filter((d) =>
      ["power-supply", "timer", "bistable", "staircase", "relay"].includes(
        catalog[d.productId].behaviorId,
      ),
    );
    if (electronics.length && request.testVoltageV >= 250)
      return result(
        "invalid-setup",
        null,
        "MΩ",
        "Odłącz elektronikę i cewki od badanego obwodu. Profil nie dopuszcza ich testowania napięciem 250/500 V.",
      );
    const blackD = p.circuit.devices.find(
      (d) => d.id === request.black!.deviceId,
    )!;
    if (
      !catalog[blackD.productId].topology.terminals
        .find((t) => t.id === request.black!.terminalId)!
        .role.includes("PE") &&
      !blackD.productId.includes("bus-pe")
    )
      return result(
        "unsupported",
        null,
        "MΩ",
        "Profil v1 obsługuje izolację żyły względem PE. Przypnij czarną sondę do PE.",
      );
    const insulation: Branch[] = [];
    // Separate insulation network. Working resistance is never used as insulation.
    for (const w of p.circuit.conductors)
      if (w.declaredRole !== "PE")
        insulation.push({
          id: `iso/${w.id}`,
          from: terminalKey(w.from),
          to: black,
          resistanceOhm:
            p.circuit.installationConditions.insulationResistanceOhm,
        });
    for (const w of p.circuit.conductors)
      insulation.push({
        id: `iso-wire/${w.id}`,
        from: terminalKey(w.from),
        to: terminalKey(w.to),
        resistanceOhm: 0.01,
      });
    for (const f of p.faults)
      if (
        f.from &&
        f.to &&
        f.kind === "insulation" &&
        f.activeAtMs <= rt.timeMs
      )
        insulation.push({
          id: `iso-fault/${f.id}`,
          from: terminalKey(f.from),
          to: terminalKey(f.to),
          resistanceOhm: f.resistanceOhm ?? 100000,
        });
    const r = equivalentResistance(insulation, red, black);
    if (r === null || r > 200e6)
      return result(
        "out-of-range",
        null,
        "MΩ",
        "> 200 MΩ · Poza zakresem przyrządu; wynik nie oznacza nieskończonej rezystancji.",
      );
    return result(
      "valid",
      r / 1e6,
      "MΩ",
      `Oddzielna sieć izolacji; test ${request.testVoltageV} V DC. Profil dydaktyczny, bez oceny normatywnej.`,
      { testVoltageV: request.testVoltageV },
    );
  }
  if (request.function === "loop") {
    if (!voltage || magnitude(voltage) < 50)
      return result(
        "invalid-setup",
        null,
        "Ω",
        "Pętla wymaga aktywnego napięcia między badanymi punktami.",
      );
    if (rt.solution.domains[red] !== "AC")
      return result(
        "unsupported",
        null,
        "Ω",
        "Profil pętli obejmuje obwód AC 50 Hz.",
      );
    const resistance = equivalentResistance(compile(project, rt), red, black);
    if (resistance === null || resistance < 1e-8)
      return result(
        "unsupported",
        null,
        "Ω",
        "Brak skończonej impedancji Thévenina.",
      );
    return result(
      "valid",
      resistance,
      "Ω",
      "Impedancja Thévenina: źródła wyzerowane, rezystancje zachowane. X = 0 w modelu rezystancyjnym. Bez automatycznej oceny zgodności i bez modelu niskoprądowego testu RCD.",
      {
        R: resistance,
        X: 0,
        Z: resistance,
        Ik: magnitude(voltage) / resistance,
      },
    );
  }
  if (request.function === "rcd") {
    const d = p.circuit.devices.find((d) => d.id === request.deviceId);
    if (!d || !["rccb", "rcbo"].includes(catalog[d.productId].behaviorId))
      return result(
        "invalid-setup",
        null,
        "ms",
        "Wybierz RCD/RCBO i punkty: faza za aparatem oraz PE omijający przekładnik.",
      );
    if (!voltage || magnitude(voltage) < 100 || rt.devices[d.id].tripped)
      return result(
        "invalid-setup",
        null,
        "ms",
        "RCD wymaga zasilania i zamkniętych styków. Zresetuj aparat przed powtórzeniem.",
      );
    const redBranch = compile(project, rt).find(
      (b) =>
        b.deviceId === d.id &&
        b.kind === "contact" &&
        (b.to === red || b.from === red),
    );
    const blackRole =
      catalog[blackDProduct(p, request.black.deviceId)].topology.terminals.find(
        (t) => t.id === request.black!.terminalId,
      )?.role ?? "";
    const redRole = catalog[d.productId].topology.terminals.find(
      (t) => t.id === request.red!.terminalId,
    )?.role;
    if (!redBranch || redRole?.includes("N") || !blackRole.includes("PE"))
      return result(
        "invalid-setup",
        null,
        "ms",
        "Czerwona sonda: faza na wyjściu RCD. Czarna sonda: PE poza torem RCD.",
      );
    const i = request.rcdMultiplier * 0.03;
    // Calibrate the resistive current injector against the actual Thévenin
    // resistance, so its own voltage drop does not miss exactly 1 × IΔn.
    const sourceResistance =
      equivalentResistance(
        compile(project, rt, { shortSources: true }),
        red,
        black,
      ) ?? 0;
    p.faults.push({
      id: "rcd-test",
      targetId: d.id,
      kind: "leakage",
      from: request.red,
      to: request.black,
      resistanceOhm: Math.max(0.001, magnitude(voltage) / i - sourceResistance),
      hidden: false,
      activeAtMs: rt.timeMs,
    });
    const after = advance(p, rt, { type: "step", deltaMs: 50 });
    const tripped = after.devices[d.id].tripped;
    const restored = advance(project, after, { type: "solve" });
    return {
      ...result(
        tripped ? "valid" : "open-circuit",
        tripped ? 50 : null,
        "ms",
        tripped
          ? "Zadziałał po wprowadzeniu upływu. 50 ms to rozdzielczość testu dydaktycznego, nie charakterystyka producenta."
          : "Brak zadziałania w oknie testu. Przy 0,5× jest to oczekiwane; pozostałe próby wymagają diagnozy.",
        { testCurrentMA: i * 1000, multiplier: request.rcdMultiplier },
      ),
      afterRuntime: restored,
    };
  }
  return result("unsupported", null, "", "Nieobsługiwana funkcja.");
}
function blackDProduct(p: ProjectDocument, id: string) {
  return p.circuit.devices.find((d) => d.id === id)!.productId;
}
export function formatMeasurement(
  r: Pick<MeasurementResult, "status" | "value" | "unit">,
): string {
  if (r.status === "open-circuit") return "OL";
  if (r.status === "out-of-range") return "> zakres";
  if (r.value === null) return "—";
  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: r.unit === "Ω" ? 3 : r.unit === "A" ? 4 : 2,
  }).format(Math.abs(r.value) < 1e-7 ? 0 : r.value);
}

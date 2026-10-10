import { catalog } from "@catalog/index";
import type { ProjectDocument, TerminalRef } from "@model/index";
import type { RuntimeAction } from "@simulation/index";

export type LessonControl = {
  deviceId: string;
  kind: "toggle" | "momentary" | "test-rcd" | "reset";
  label: string;
  actuator?: "start" | "stop";
};
export interface LessonDefinition {
  steps: { title: "Zrozum" | "Połącz" | "Sprawdź"; instruction: string }[];
  controls: LessonControl[];
  indicators: {
    deviceId: string;
    kind:
      | "powered"
      | "mechanism"
      | "protection"
      | "auxiliary"
      | "direction"
      | "tripped";
  }[];
  probe: { label: string; red: TerminalRef; black: TerminalRef };
  trials: {
    id: string;
    question: string;
    answers: [string, string];
    correctAnswer: number;
    actions: RuntimeAction[];
    expected: {
      deviceId: string;
      field: "powered" | "mechanism" | "direction";
      value: boolean | string;
    }[];
    explanation: string;
  }[];
}
const toggles = (ids: string[]): LessonControl[] =>
  ids.map((deviceId) => ({
    deviceId,
    kind: "toggle",
    label: `Przełącz ${deviceId} w lekcji`,
  }));
export const lessonDefinitions: Record<string, LessonDefinition> = {
  "ele02-101": {
    steps: [
      {
        title: "Zrozum",
        instruction:
          "Wskaż gałąź oświetlenia i odrębną gałąź gniazda. Załącz energię, zmień Q1/Q2 i porównaj OP1/OP2 oraz H1/H2.",
      },
      {
        title: "Połącz",
        instruction:
          "Wybierz cały tor lub jedną żyłę. Porównaj identyczne oznaczenia zacisków na schemacie i tablicy: węzeł rozdziela się na osobne żyły przez złączki.",
      },
      {
        title: "Sprawdź",
        instruction:
          "Przewidź skutek zmiany Q1, wykonaj próbę i porównaj lampy z niezależną gałęzią gniazda.",
      },
    ],
    controls: [
      ...toggles(["Q1", "Q2", "B6", "B10", "RCD"]),
      { deviceId: "RCD", kind: "test-rcd", label: "TEST RCD w lekcji" },
    ],
    indicators: [
      ...["OP1", "OP2", "H1", "H2"].map((deviceId) => ({
        deviceId,
        kind: "powered" as const,
      })),
      { deviceId: "RCD", kind: "tripped" },
    ],
    probe: {
      label: "GW L–N",
      red: { deviceId: "GW", terminalId: "test-L" },
      black: { deviceId: "GW", terminalId: "test-N" },
    },
    trials: [
      {
        id: "lighting-switch",
        question:
          "Po resecie i załączeniu energii przełącz Q1. Co stanie się z obiema oprawami?",
        answers: ["Obie zgasną; gniazdo zachowa napięcie", "Zgaśnie tylko OP1"],
        correctAnswer: 0,
        actions: [
          { type: "power", on: true },
          { type: "operate", deviceId: "Q1", state: true },
        ],
        expected: [
          { deviceId: "OP1", field: "powered", value: false },
          { deviceId: "OP2", field: "powered", value: false },
          { deviceId: "H1", field: "powered", value: true },
        ],
        explanation:
          "Oprawy są równoległe za tym samym torem schodowym. Gałąź B10/gniazda jest niezależna od Q1/Q2.",
      },
    ],
  },
  "ele02-108": {
    steps: [
      {
        title: "Zrozum",
        instruction:
          "Załącz energię. Naciśnij i zwolnij START: własny NO K1 podtrzymuje prawy kierunek. Kliknij cewkę; przerywane obramowanie wiąże jej styki mechanicznie, bez dodawania przewodu.",
      },
      {
        title: "Połącz",
        instruction:
          "Prześledź oba STOP przed równoległymi START i własnym NO K1. NC przeciwnego stycznika blokuje drugi kierunek. Wybierz lewy tor mocy i porównaj zamianę dwóch faz.",
      },
      {
        title: "Sprawdź",
        instruction:
          "STOP usuwa zasilanie obu dróg prawego kierunku. Przytrzymaj S2 lub S4, potem zwolnij: lewy kierunek nie ma podtrzymania.",
      },
    ],
    controls: [
      ...toggles(["Q1", "Q2"]),
      ...["S1", "S3"].flatMap((deviceId) =>
        (["start", "stop"] as const).map((actuator) => ({
          deviceId,
          kind: "momentary" as const,
          actuator,
          label: `${deviceId} ${actuator.toUpperCase()} — przytrzymaj`,
        })),
      ),
      ...["S2", "S4"].map((deviceId) => ({
        deviceId,
        kind: "momentary" as const,
        label: `${deviceId} LEWY — przytrzymaj`,
      })),
      { deviceId: "Q2", kind: "reset", label: "RESET / OFF Q2 w lekcji" },
    ],
    indicators: [
      { deviceId: "K1", kind: "mechanism" },
      { deviceId: "K2", kind: "mechanism" },
      { deviceId: "M", kind: "direction" },
      { deviceId: "Q2", kind: "protection" },
      { deviceId: "Q2.AUX", kind: "auxiliary" },
    ],
    probe: {
      label: "K1 A1–A2",
      red: { deviceId: "K1", terminalId: "A1" },
      black: { deviceId: "K1", terminalId: "A2" },
    },
    trials: [
      {
        id: "left-release",
        question:
          "Po resecie, załączeniu energii, przytrzymaniu i zwolnieniu S2: co zrobi silnik?",
        answers: ["Zatrzyma się po zwolnieniu", "Pozostanie w lewym kierunku"],
        correctAnswer: 0,
        actions: [
          { type: "power", on: true },
          { type: "operate", deviceId: "S2", state: true },
          { type: "operate", deviceId: "S2", state: false },
        ],
        expected: [
          { deviceId: "K2", field: "mechanism", value: false },
          { deviceId: "M", field: "powered", value: false },
        ],
        explanation:
          "Lewy K2 ma tylko drogę przez trzymane S2/S4. Jego NO nie jest podłączony do podtrzymania.",
      },
    ],
  },
};
export function validateLessonDefinition(
  project: ProjectDocument,
  lesson: LessonDefinition,
) {
  const errors: string[] = [];
  const hasDevice = (id: string) =>
    project.circuit.devices.some((d) => d.id === id);
  for (const c of [
    ...lesson.controls,
    ...lesson.indicators,
    ...lesson.trials.flatMap((t) => t.expected),
  ])
    if (!hasDevice(c.deviceId)) errors.push(`device:${c.deviceId}`);
  for (const ref of [lesson.probe.red, lesson.probe.black]) {
    const d = project.circuit.devices.find((d) => d.id === ref.deviceId);
    if (
      !d ||
      !catalog[d.productId].topology.terminals.some(
        (t) => t.id === ref.terminalId,
      )
    )
      errors.push(`terminal:${ref.deviceId}:${ref.terminalId}`);
  }
  for (const t of lesson.trials)
    for (const a of t.actions)
      if ("deviceId" in a && !hasDevice(a.deviceId))
        errors.push(`trial:${t.id}:${a.deviceId}`);
  for (const c of lesson.controls.filter((c) => c.actuator)) {
    const d = project.circuit.devices.find((d) => d.id === c.deviceId);
    if (d && catalog[d.productId].behaviorId !== "push-start-stop")
      errors.push(`actuator:${c.deviceId}`);
  }
  return errors;
}

import type { Product, TopologyDefinition } from "./index";

// New IDs preserve every existing topology/revision. All dimensions and
// protection thresholds here are educational assumptions, never SKU data.
export function installMotorControls(
  teaching: Product[],
  tops: Record<string, TopologyDefinition>,
) {
  const pin = (
    id: string,
    role: string,
    x: number,
    y: number,
    maxConductors = 2,
  ) => ({
    id,
    label: id,
    role,
    x,
    y,
    maxConductors,
    minMm2: 0.5,
    maxMm2: 2.5,
    printed: true,
  });
  const add = (
    base: string,
    id: string,
    name: string,
    behavior: Product["behaviorId"],
    visual: Product["visualId"],
    width: number,
    height: number,
    topology: TopologyDefinition,
    mounting: Product["mounting"] = "DIN",
  ) => {
    const p = structuredClone(teaching.find((p) => p.id === base)!);
    Object.assign(p, {
      id,
      revision: "1",
      displayNamePl: name,
      behaviorId: behavior,
      visualId: visual,
      topology,
      topologyId: topology.id,
      symbolGroupId: topology.id,
      mounting,
      defaults: {},
      sources: [],
      parameters: {},
      dimensions: {
        value: { width, height, depth: 65 },
        confidence: "low",
        evidence: [
          {
            sourceId: "didactic-motor-controls-v1",
            locator: "Geometria i zaciski dydaktyczne, bez zweryfikowanego SKU",
            verification: "assumed",
            retrievedAt: "2026-10-07",
          },
        ],
      },
      limitations: [
        "Model edukacyjny, nie zweryfikowany produkt producenta. Wymiary i pojemności zacisków są założeniami.",
      ],
    });
    tops[topology.id] = topology;
    teaching.push(p);
    return p;
  };
  const q = add(
    "edu-mcb3",
    "edu-motor-protection",
    "Wyłącznik silnikowy · 3 tory · regulowany · dydaktyczny",
    "motor-protection",
    "motor-protection",
    45,
    83,
    {
      id: "motor-protection-3p-v1",
      revision: "1",
      terminals: [
        pin("1", "L1 in", 8, 0),
        pin("3", "L2 in", 22.5, 0),
        pin("5", "L3 in", 37, 0),
        pin("2", "L1 out", 8, 83),
        pin("4", "L2 out", 22.5, 83),
        pin("6", "L3 out", 37, 83),
      ],
      connections: [0, 1, 2].map((i) => ({
        id: `pole${i + 1}`,
        from: String(2 * i + 1),
        to: String(2 * i + 2),
        kind: "contact",
        condition: "manual",
      })),
      poles: ["pole1", "pole2", "pole3"],
    },
  );
  q.defaults = { position: false, ratedCurrentA: 4.35 };
  q.designationPrefix = "Q";
  q.limitations.push(
    "Nastawa musi odpowiadać In tabliczki silnika. Domyślne 4,35 A jest założeniem dydaktycznym. Model cieplny od maksymalnego prądu fazy; człon zwarciowy 12×nastawa, bez krzywych producenta, rozruchu, selektywności i osobnej detekcji zaniku fazy.",
  );
  const aux = add(
    "edu-auxiliary",
    "edu-motor-aux-no",
    "Blok pomocniczy · NO 13–14 · dydaktyczny",
    "auxiliary",
    "auxiliary",
    12,
    83,
    {
      id: "motor-aux-no-v1",
      revision: "1",
      terminals: [pin("13", "NO", 6, 0), pin("14", "NO", 6, 83)],
      connections: [
        {
          id: "no",
          from: "13",
          to: "14",
          kind: "contact",
          condition: "mechanism",
        },
      ],
    },
  );
  aux.designationPrefix = "QA";
  aux.limitations.push(
    "Przypisz przez assembly do wyłącznika silnikowego. NO otwiera się również po wyzwoleniu zabezpieczenia.",
  );
  const zs = add(
    "edu-junction-terminal",
    "edu-rail-terminal",
    "Złączka szynowa · jeden wspólny tor · dydaktyczna",
    "connector",
    "splice",
    18,
    30,
    {
      id: "rail-terminal-2-v1",
      revision: "1",
      terminals: [pin("1", "Wejście", 9, 0), pin("2", "Wyjście", 9, 30)],
      connections: [{ id: "bridge", from: "1", to: "2", kind: "bridge" }],
    },
  );
  zs.designationPrefix = "ZS";
  for (const mounting of ["DIN", "panel"] as const) {
    const p = add(
      "edu-start",
      `edu-start-stop-${mounting.toLowerCase()}`,
      `Zespół START / STOP · dwa niezależne przyciski · ${mounting === "DIN" ? "TH35" : "obudowa"}`,
      "push-start-stop",
      "start-stop",
      36,
      83,
      {
        id: `independent-start-stop-${mounting.toLowerCase()}-v1`,
        revision: "1",
        terminals: [
          pin("1", "STOP NC", 9, 0),
          pin("2", "STOP NC", 9, 83),
          pin("3", "START NO", 27, 0),
          pin("4", "START NO", 27, 83),
        ],
        connections: [
          {
            id: "stop",
            from: "1",
            to: "2",
            kind: "contact",
            condition: "stop-inverse",
          },
          {
            id: "start",
            from: "3",
            to: "4",
            kind: "contact",
            condition: "manual",
          },
        ],
      },
      mounting,
    );
    p.designationPrefix = "S";
    p.limitations.push(
      "START steruje wyłącznie NO 3–4, STOP wyłącznie NC 1–2. Przyciski chwilowe obsługiwane niezależnie; brak wspólnego mechanizmu.",
    );
    const left = add(
      "edu-start",
      `edu-push-no-${mounting.toLowerCase()}`,
      `Przycisk NO · 3–4 · ${mounting === "DIN" ? "TH35" : "obudowa"}`,
      "push-no",
      "start-stop",
      18,
      83,
      {
        id: `push-no-34-${mounting.toLowerCase()}-v1`,
        revision: "1",
        terminals: [pin("3", "NO", 9, 0), pin("4", "NO", 9, 83)],
        connections: [
          {
            id: "no",
            from: "3",
            to: "4",
            kind: "contact",
            condition: "manual",
          },
        ],
      },
      mounting,
    );
    left.designationPrefix = "S";
  }
}

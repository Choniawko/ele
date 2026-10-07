import type { Product, TopologyDefinition, VisualId } from "./index";

// Explicit teaching profiles. No manufacturer identity, geometry or consumption is claimed.
export function installPhysicalProfiles(
  teaching: Product[],
  tops: Record<string, TopologyDefinition>,
) {
  const pin = (id: string, x: number, y: number, maxConductors = 1) => ({
    id,
    label: id,
    role: id,
    x,
    y,
    printed: true,
    maxConductors,
    minMm2: 0.5,
    maxMm2: 2.5,
  });
  const add = (
    baseId: string,
    id: string,
    name: string,
    visualId: VisualId,
    size: [number, number, number],
    topology: TopologyDefinition,
    mounting: Product["mounting"] = "panel",
  ) => {
    const p = structuredClone(teaching.find((p) => p.id === baseId)!);
    Object.assign(p, {
      id,
      revision: "1",
      displayNamePl: name,
      visualId,
      topology,
      topologyId: topology.id,
      symbolGroupId: topology.id,
      mounting,
      dimensions: {
        value: { width: size[0], height: size[1], depth: size[2] },
        confidence: "low",
        evidence: [
          {
            sourceId: "didactic-physical-ele101",
            locator: "Geometria umowna, nie produkt producenta",
            retrievedAt: "2026-10-06",
            verification: "assumed",
          },
        ],
      },
    });
    p.limitations.push(
      "Wymiary i pojemność zacisków są założeniami profilu dydaktycznego; brak zweryfikowanego SKU.",
    );
    tops[topology.id] = topology;
    teaching.push(p);
    return p;
  };
  const op = add(
    "edu-lamp",
    "edu-bulkhead-40",
    "Oprawa z osłoną · klasa I · 40 W",
    "bulkhead",
    [60, 95, 40],
    {
      id: "didactic-bulkhead-lnpe-v1",
      revision: "1",
      terminals: [
        pin("L", 12, 92, 2),
        pin("N", 30, 92, 2),
        pin("PE", 48, 92, 2),
      ],
      connections: [{ id: "lamp", from: "L", to: "N", kind: "load" }],
    },
  );
  op.defaults = { powerW: 40, voltageV: 230 };
  op.designationPrefix = "OP";
  op.limitations.push(
    "Wygląd owalnej oprawy z osłoną jest ilustracją dydaktyczną zdjęcia stanowiska, bez odwzorowania SKU. Obciążenie rezystancyjne żarówki, bez nagrzewania i charakterystyki rozruchu.",
  );
  const indicator = add(
    "edu-lamp",
    "edu-indicator-green-230",
    "Lampka kontrolna DIN · zielona · 230 V AC",
    "indicator",
    [18, 80, 60],
    {
      id: "didactic-indicator-ln-v1",
      revision: "1",
      terminals: [pin("L", 9, 0, 2), pin("N", 9, 80, 2)],
      connections: [{ id: "light", from: "L", to: "N", kind: "load" }],
    },
    "DIN",
  );
  indicator.defaults = { voltageV: 230, powerW: 0.6 };
  indicator.designationPrefix = "H";
  indicator.limitations.push(
    "Pobór 0,6 W jest umownym obciążeniem solvera, nie daną producenta. Świecenie od 80% napięcia znamionowego; bez modelu LED i fotometrii.",
  );
  const junction = add(
    "edu-bus-n",
    "edu-junction-terminal",
    "Złączka puszkowa · dwa wejścia · wspólny tor",
    "splice",
    [18, 14, 15],
    {
      id: "didactic-junction-2-v1",
      revision: "1",
      terminals: [pin("1", 5, 0, 2), pin("2", 13, 14, 2)],
      connections: [{ id: "bridge", from: "1", to: "2", kind: "bridge" }],
    },
  );
  junction.designationPrefix = "X";
  const splice = add(
    "edu-bus-n",
    "edu-splice-3",
    "Złączka połączeniowa · 3 wejścia",
    "splice",
    [28, 20, 15],
    {
      id: "didactic-splice-3-v1",
      revision: "1",
      terminals: [pin("1", 5, 20), pin("2", 14, 20), pin("3", 23, 20)],
      connections: [
        { id: "b2", from: "1", to: "2", kind: "bridge" },
        { id: "b3", from: "1", to: "3", kind: "bridge" },
      ],
    },
  );
  splice.designationPrefix = "X";
  const phase = add(
    "edu-bus-n",
    "edu-phase-distribution",
    "Rozdział fazy L · 3 wejścia",
    "phase-distribution",
    [28, 20, 20],
    {
      id: "didactic-phase-3-v1",
      revision: "1",
      terminals: [pin("1", 5, 20), pin("2", 14, 20), pin("3", 23, 20)],
      connections: [
        { id: "b2", from: "1", to: "2", kind: "bridge" },
        { id: "b3", from: "1", to: "3", kind: "bridge" },
      ],
    },
  );
  phase.designationPrefix = "XL";
}

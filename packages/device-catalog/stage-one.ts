import type { Product, Terminal, TopologyDefinition, Evidence } from "./index";

// New revisions and IDs only: saved v1 teaching products keep their topology.
export function installStageOne(
  real: Product[],
  teaching: Product[],
  tops: Record<string, TopologyDefinition>,
) {
  const fact = <T>(
    value: T,
    sourceId: string,
    locator: string,
    verification: Evidence["verification"] = "manufacturer",
  ) => ({
    value,
    confidence:
      verification === "assumed" ? ("low" as const) : ("high" as const),
    evidence: [{ sourceId, locator, verification, retrievedAt: "2026-10-05" }],
  });
  const pin = (
    id: string,
    role: string,
    x: number,
    y: number,
    maxConductors = 2,
    minMm2 = 0.14,
    maxMm2 = 35,
  ): Terminal => ({
    id,
    label: id,
    role,
    x,
    y,
    maxConductors,
    minMm2,
    maxMm2,
    printed: true,
  });
  const addEdu = (
    baseId: string,
    id: string,
    name: string,
    top: TopologyDefinition,
    size: [number, number, number],
  ) => {
    const p = structuredClone(teaching.find((p) => p.id === baseId)!);
    Object.assign(p, {
      id,
      revision: "1",
      displayNamePl: name,
      topology: top,
      topologyId: top.id,
      symbolGroupId: top.id,
      dimensions: fact(
        { width: size[0], height: size[1], depth: size[2] },
        "didactic-stage-one",
        "Wymiary dydaktyczne, nie wymiary SKU",
        "assumed",
      ),
    });
    tops[top.id] = top;
    teaching.push(p);
    return p;
  };
  const motor: TopologyDefinition = {
    id: "motor-six-windings-v1",
    revision: "1",
    terminals: [
      pin("U1", "Początek U", 20, 85, 3),
      pin("V1", "Początek V", 52, 85, 3),
      pin("W1", "Początek W", 84, 85, 3),
      pin("W2", "Koniec W", 20, 105, 3),
      pin("U2", "Koniec U", 52, 105, 3),
      pin("V2", "Koniec V", 84, 105, 3),
      pin("PE", "Obudowa / PE", 103, 105, 3),
    ],
    connections: ["U", "V", "W"].map((t) => ({
      id: `winding-${t}`,
      from: `${t}1`,
      to: `${t}2`,
      kind: "load",
    })),
  };
  const m = addEdu(
    "edu-motor",
    "edu-motor-six",
    "Silnik · 6 zacisków · 230Δ/400Y",
    motor,
    [116, 110, 80],
  );
  m.limitations.push(
    "Mostki Y/Δ wynikają z okablowania. Napięcie znamionowe dotyczy pojedynczego uzwojenia. Model rezystancyjny: bez poślizgu, momentu i prądu rozruchowego.",
  );
  const aux: TopologyDefinition = {
    id: "auxiliary-1no1nc-v1",
    revision: "1",
    terminals: [
      pin("53", "NO", 9, 0, 3),
      pin("61", "NC", 27, 0, 3),
      pin("54", "NO", 9, 55, 3),
      pin("62", "NC", 27, 55, 3),
    ],
    connections: [
      {
        id: "no",
        from: "53",
        to: "54",
        kind: "contact",
        condition: "mechanism",
      },
      {
        id: "nc",
        from: "61",
        to: "62",
        kind: "contact",
        condition: "mechanism-inverse",
      },
    ],
  };
  const a = addEdu(
    "edu-contactor-ac",
    "edu-auxiliary",
    "Blok pomocniczy · 1NO + 1NC · dydaktyczny",
    aux,
    [36, 55, 35],
  );
  Object.assign(a, {
    behaviorId: "auxiliary",
    visualId: "auxiliary",
    defaults: {},
    designationPrefix: "KA",
  });
  a.limitations = [
    "Osobny blok, sterowany mechanizmem przypisanego stycznika lub przycisku. Nie jest opublikowanym SKU LADN11; geometria dydaktyczna.",
  ];
  a.sources.push({
    id: "se-ladn11-terminals",
    title: "Schneider: oznaczenia LADN11",
    url: "https://www.se.com/pl/pl/faqs/FA400841/",
  });
  const q = addEdu(
    "edu-mcb3",
    "edu-mcb-adjustable",
    "Wyłącznik B · nastawa dydaktyczna",
    {
      ...structuredClone(real.find((p) => p.id === "hager-mbn116e")!.topology),
      id: "mcb-adjustable-1p-v1",
    },
    [18, 83, 70],
  );
  q.defaults = { position: true, ratedCurrentA: 6 };
  // Dimensions and topology come from different documents. Pin overlay coordinates
  // are drawing-derived, rather than falsely advertised manufacturer measurements.
  const lcSource = {
    id: "se-lc1d09p7-datasheet",
    title: "LC1D09P7 — karta 15.07.2015",
    url: "https://iportal2.schneider-electric.com/Contents/docs/SQD-LC1D09P7.PDF",
  };
  const drawing = {
    id: "se-tesys-installation",
    title: "TeSys D — instrukcja 0381869_01A55",
    url: "https://download.se.com/files?p_Doc_Ref=0381869_01A55&p_File_Name=0381869_01A55_04.pdf&p_enDocType=Instruction+sheet",
  };
  const lc = real.find((p) => p.id === "schneider-lc1d09p7")!;
  const lcTop: TopologyDefinition = {
    id: "lc1d09p7-stage-one",
    revision: "1",
    terminals: [
      pin("1L1", "1/L1", 8, 0, 2, 1, 2.5),
      pin("3L2", "3/L2", 19, 0, 2, 1, 2.5),
      pin("5L3", "5/L3", 30, 0, 2, 1, 2.5),
      pin("2T1", "2/T1", 8, 77, 2, 1, 2.5),
      pin("4T2", "4/T2", 19, 77, 2, 1, 2.5),
      pin("6T3", "6/T3", 30, 77, 2, 1, 2.5),
      pin("13", "NO", 18, 24, 2, 1, 2.5),
      pin("14", "NO", 18, 61, 2, 1, 2.5),
      pin("21", "NC", 28, 24, 2, 1, 2.5),
      pin("22", "NC", 28, 61, 2, 1, 2.5),
      pin("A1", "Cewka 230 V AC", 38, 24, 2, 1, 2.5),
      pin("A2", "Cewka 230 V AC", 38, 61, 2, 1, 2.5),
    ],
    connections: structuredClone(
      teaching.find((p) => p.id === "edu-contactor-ac")!.topology.connections,
    ),
    coil: {
      plus: "A1",
      minus: "A2",
      kind: "AC",
      voltageV: 230,
      dcResistanceOhm: null,
    },
  };
  Object.assign(lc, {
    revision: "verified-20261005-1",
    published: true,
    readiness: "published",
    behaviorId: "contactor",
    visualId: "tesys-contactor",
    topologyId: lcTop.id,
    topology: lcTop,
    symbolGroupId: "contactor",
    defaults: {},
    designationPrefix: "K",
    dimensions: fact(
      { width: 45, height: 77, depth: 86 },
      lcSource.id,
      "s. 4: wymiary",
    ),
    parameters: {
      "coil.voltageV": fact(230, lcSource.id, "s. 1: cewka P7 50/60 Hz"),
      "contacts.ac3CurrentA": fact(9, lcSource.id, "s. 1: AC-3"),
      "contacts.mainNO": fact(3, lcSource.id, "s. 1"),
      "contacts.auxNO": fact(1, lcSource.id, "s. 1"),
      "contacts.auxNC": fact(1, lcSource.id, "s. 1"),
    },
    gates: { topology: true, visual: true, simulation: true },
    blockers: [],
    sources: [
      lcSource,
      drawing,
      {
        id: "se-lc1d09-front",
        title: "LC1D09 — fotografia frontu producenta",
        url: "https://download.se.com/files?p_Doc_Ref=LC1D09_FRONT&p_File_Type=rendition_369_jpg",
      },
    ],
    limitations: [
      "Geometria obrysu 45×77×86 mm z karty; front oparty na zdjęciu producenta i rysunku instrukcji. Współrzędne klikalnych zacisków są nakładką dydaktyczną.",
      "Cewka: równoważny rezystancyjny profil dydaktyczny 4 W, bez prądu przyciągania i indukcyjności. Rezystancja DC nieznana: pomiar sprawnej cewki zwraca brak modelu, nie zmyśloną rezystancję producenta.",
      "Próg przyciągania modelu 0,85 Uc i odpadania 0,3 Uc; nie modeluje całej charakterystyki katalogowej ani zużycia styków.",
    ],
  });
  tops[lcTop.id] = lcTop;
  const xbSource = {
    id: "se-xb5aa35-datasheet",
    title: "XB5AA35 — karta 07.09.2020",
    url: "https://iportal.se.com/Contents/docs/SQD-XB5AA35_DATASHEET.PDF",
  };
  const xbTop: TopologyDefinition = {
    id: "xb5aa35-1no1nc",
    revision: "1",
    terminals: [
      pin("13", "NO", 5, 0, 2, 1, 1.5),
      pin("21", "NC", 25, 0, 2, 1, 1.5),
      pin("14", "NO", 5, 42, 2, 1, 1.5),
      pin("22", "NC", 25, 42, 2, 1, 1.5),
    ],
    connections: [
      { id: "no", from: "13", to: "14", kind: "contact", condition: "manual" },
      {
        id: "nc",
        from: "21",
        to: "22",
        kind: "contact",
        condition: "manual-inverse",
      },
    ],
  };
  const printed: Record<string, string> = {
    "13": "3 · 13",
    "14": "4 · 14",
    "21": "1 · 21",
    "22": "2 · 22",
  };
  xbTop.terminals.forEach((t) => {
    t.label = printed[t.id];
    t.role += " · nadruk bloku / pełny numer ISO";
  });
  const xb: Product = {
    ...structuredClone(lc),
    id: "schneider-xb5aa35",
    revision: "verified-20261005-1",
    family: "Harmony XB5",
    manufacturerPartNumber: "XB5AA35",
    displayNamePl: "Przycisk zielony · XB5AA35 · 1NO + 1NC",
    category: "pushbutton",
    behaviorId: "push-multi",
    visualId: "harmony-button",
    topologyId: xbTop.id,
    topology: xbTop,
    symbolGroupId: "push-multi",
    mounting: "panel",
    designationPrefix: "S",
    dimensions: fact(
      { width: 30, height: 42, depth: 52 },
      xbSource.id,
      "s. 1: height / width / depth",
    ),
    parameters: {
      "contacts.NO": fact(1, xbSource.id, "s. 1"),
      "contacts.NC": fact(1, xbSource.id, "s. 1"),
      "mounting.diameterMm": fact(22, xbSource.id, "s. 1"),
      "operator.springReturn": fact(true, xbSource.id, "s. 1"),
      "operator.color": fact("green", xbSource.id, "s. 1: Operator profile"),
    },
    sources: [
      xbSource,
      ...["Front", "Rear"].map((side) => ({
        id: `se-xb5aa35-${side}`,
        title: `XB5AA35 — fotografia ${side}`,
        url: `https://download.schneider-electric.com/files?p_Doc_Ref=XB5AA35_${side}&p_File_Type=rendition_369_jpg`,
      })),
    ],
    limitations: [
      "Front zielony, otwór montażowy Ø22 mm; widok pokazuje nakładkę zacisków tylnych. Nadruki NO 3/4 i NC 1/2 przedstawiono obok pełnych numerów ISO 13/14 i 21/22. Nie jest widokiem dostępu do śrub od frontu.",
      "Wspólny przycisk dla NO 13/14 i NC 21/22. Model dwóch stabilnych położeń; bez drogi 1,5/2,6 mm i dynamiki odbicia.",
      "Konserwatywny profil zacisków: maks. 2×1,5 mm² z tulejkami.",
    ],
  };
  tops[xbTop.id] = xbTop;
  real.push(xb);
}

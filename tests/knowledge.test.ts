import { describe, it, expect } from "vitest";
import { articles, lessons, circuits } from "../packages/knowledge/content";
import { validateKnowledge, searchKnowledge } from "../packages/knowledge";
import {
  bindings,
  contextExplanation,
  resolveKnowledge,
  validContext,
} from "../packages/knowledge/bindings";
import {
  createDemo,
  examples,
  demoAction,
  demoCopy,
  deviceByName,
  permanentNets,
} from "../packages/knowledge/examples";
import { advance, initialRuntime } from "@simulation/index";
import { catalog } from "@catalog/index";
import { clone } from "@model/index";
import type { KnowledgeContext } from "../packages/knowledge/types";
const context = (
  p: ReturnType<typeof createDemo>,
  name: string,
): KnowledgeContext => {
  const d = deviceByName(p, name);
  return {
    projectId: p.circuit.projectId,
    revision: p.circuit.revision,
    deviceId: d.id,
    productId: d.productId,
    productRevision: d.productRevision,
    returnTo: "#workbench",
    selection: [d.id],
    view: "physical",
    cameras: { physical: { x: 1, y: 2, scale: 0.7 } },
  };
};
describe("wiedza: kontrakty, kontekst i izolacja", () => {
  it("publikuje komplet treści i waliduje wszystkie referencje, modele oraz rewizje", () => {
    expect(articles).toHaveLength(12);
    expect(lessons).toHaveLength(6);
    expect(circuits).toHaveLength(6);
    expect(validateKnowledge()).toEqual([]);
  });
  it("walidacja odrzuca brak terminala i nieaktualną rewizję snapshotu wiedzy", () => {
    const b = bindings[0],
      revision = b.topologyRevision;
    try {
      b.topologyRevision = "stale";
      expect(validateKnowledge()).toContain(`Rewizja bindingu ${b.productId}`);
    } finally {
      b.topologyRevision = revision;
    }
    b.terminals.bogus = { sectionId: "terminals", explanation: "bad" };
    try {
      expect(validateKnowledge()).toContain(`Zacisk ${b.productId}/bogus`);
    } finally {
      delete b.terminals.bogus;
    }
  });
  it("resolver rozdziela teorię od konkretnego produktu, zacisku i fragmentu", () => {
    expect(resolveKnowledge("schneider-lc1d09p7", "A1")).toMatchObject({
      articleId: "stycznik",
      exact: true,
      sectionId: "terminals",
    });
    expect(resolveKnowledge("edu-auxiliary", undefined, "no")).toMatchObject({
      articleId: "blok-pomocniczy",
      terminalIds: ["53", "54"],
    });
    expect(resolveKnowledge("schneider-lc1d09p7", "53")).toMatchObject({
      exact: false,
    });
    expect(resolveKnowledge("nonexistent")).toBeUndefined();
    const b = bindings.find((b) => b.productId === "schneider-lc1d09p7")!,
      rev = b.productRevision;
    try {
      b.productRevision = "old";
      expect(resolveKnowledge(b.productId, "A1")).toMatchObject({
        exact: false,
        articleId: "stycznik",
      });
    } finally {
      b.productRevision = rev;
    }
  });
  it("K1 i K2 dzielą teorię, ale wskazują różne instancje; usunięcie i rewizja unieważniają kontekst", () => {
    const p = createDemo("prawo-lewo"),
      k1 = context(p, "K1"),
      k2 = context(p, "K2");
    expect(resolveKnowledge(k1.productId)?.articleId).toBe(
      resolveKnowledge(k2.productId)?.articleId,
    );
    expect(validContext(p, k1)?.id).not.toBe(validContext(p, k2)?.id);
    const changed = clone(p);
    changed.circuit.devices = changed.circuit.devices.filter(
      (d) => d.id !== k1.deviceId,
    );
    expect(validContext(changed, k1)).toBeUndefined();
    expect(validContext(changed, k2)?.id).toBe(k2.deviceId);
    changed.circuit.revision++;
    expect(validContext(changed, k2)).toBeUndefined();
    expect(validContext(demoCopy(p), k1)).toBeUndefined();
  });
  it("synonimy i polskie znaki są wyszukiwane razem z nazwami produktów", () => {
    expect(
      searchKnowledge("roznicowka", "", "", "", "").map((a) => a.id),
    ).toContain("rcd");
    expect(
      searchKnowledge("różnicówka", "", "", "", "").map((a) => a.id),
    ).toContain("rcd");
    expect(
      searchKnowledge("LC1D09P7", "", "", "article", "").map((a) => a.id),
    ).toEqual(["stycznik"]);
    expect(
      searchKnowledge("podtrzymanie", "ELE.02", "Średni", "article", "").map(
        (a) => a.id,
      ),
    ).toContain("blok-pomocniczy");
  });
  it("START/STOP utrzymuje cewkę po puszczeniu START, wyłącza po STOP i nie zmienia dokumentu", () => {
    const p = createDemo("start-stop"),
      original = clone(p),
      e = examples.find((e) => e.id === "start-stop")!;
    let rt = initialRuntime(p);
    const states: boolean[] = [];
    for (const step of e.steps) {
      rt = advance(p, rt, demoAction(p, step));
      states.push(rt.devices[deviceByName(p, "K1").id].mechanism);
      expect(rt.status).toBe("valid");
    }
    expect(states).toEqual([false, true, true, false, false]);
    expect(p).toEqual(original);
    expect(advance(p, initialRuntime(p), { type: "solve" }).energized).toBe(
      false,
    );
    expect(p).toEqual(original);
    const copy = demoCopy(p);
    expect(copy.circuit.projectId).not.toBe(p.circuit.projectId);
    expect(copy.circuit.conductors).toEqual(p.circuit.conductors);
    expect(copy.training).toBeUndefined();
  });
  it("sygnalizacja i podtrzymanie mają różne jawne tory; assembly nie jest przewodem", () => {
    const p = createDemo("start-stop"),
      k = deviceByName(p, "K1"),
      a = deviceByName(p, "KA1"),
      s = deviceByName(p, "S1"),
      h = deviceByName(p, "H1"),
      net = permanentNets(p);
    expect(p.circuit.mechanicalCouplings).toContainEqual(
      expect.objectContaining({ kind: "assembly", deviceIds: [k.id, a.id] }),
    );
    expect(contextExplanation(p, context(p, "KA1"))).toContain(
      "mechanizm rodzica K1",
    );
    expect(contextExplanation(p, context(p, "K1"))).not.toContain(
      "mechanizm rodzica K1",
    );
    expect(net({ deviceId: a.id, terminalId: "53" })).toBe(
      net({ deviceId: s.id, terminalId: "13" }),
    );
    expect(net({ deviceId: a.id, terminalId: "54" })).toBe(
      net({ deviceId: s.id, terminalId: "14" }),
    );
    expect(net({ deviceId: k.id, terminalId: "14" })).toBe(
      net({ deviceId: h.id, terminalId: "L" }),
    );
    expect(net({ deviceId: k.id, terminalId: "14" })).not.toBe(
      net({ deviceId: a.id, terminalId: "54" }),
    );
  });
  it("każda próba używa solvera, a zmiana przewodu psuje rzeczywiste podtrzymanie", () => {
    const p = createDemo("start-stop"),
      a = deviceByName(p, "KA1");
    p.circuit.conductors = p.circuit.conductors.filter(
      (w) => w.from.deviceId !== a.id || w.from.terminalId !== "54",
    );
    let rt = initialRuntime(p);
    for (const step of examples
      .find((e) => e.id === "start-stop")!
      .steps.slice(0, 3))
      rt = advance(p, rt, demoAction(p, step));
    expect(rt.devices[deviceByName(p, "K1").id].mechanism).toBe(false);
  });
  it("dwa miejsca zatrzymują, a prawo/lewo blokuje drugi START i zmienia kolejność faz", () => {
    for (const id of ["dwa-miejsca", "prawo-lewo"]) {
      const p = createDemo(id);
      let rt = initialRuntime(p);
      const observed = [];
      for (const step of examples.find((e) => e.id === id)!.steps) {
        rt = advance(p, rt, demoAction(p, step));
        expect(rt.status).toBe("valid");
        observed.push(rt.devices[deviceByName(p, "K1").id].mechanism);
        if (id === "prawo-lewo")
          expect(
            rt.devices[deviceByName(p, "K1").id].mechanism &&
              rt.devices[deviceByName(p, "K2").id].mechanism,
          ).toBe(false);
      }
      if (id === "dwa-miejsca")
        expect(observed).toEqual([
          false,
          true,
          true,
          false,
          false,
          true,
          true,
          false,
          false,
        ]);
      else expect(rt.devices[deviceByName(p, "M1").id].direction).toBe("132");
    }
  });
  it("rysunek nie wymyśla dodatkowych zacisków produktów", () => {
    for (const b of bindings)
      for (const t of Object.keys(b.terminals))
        expect(
          catalog[b.productId].topology.terminals.some((x) => x.id === t),
        ).toBe(true);
  });
  it("rozgałęzienie, przełączniki schodowe i pamięć impulsowa wynikają z rzeczywistego obwodu", () => {
    const expected: Record<string, boolean[]> = {
      lampa: [false, true, false],
      schodowy: [true, false, true, false],
      bistabilny: [false, false, true, true, true, false, false],
    };
    for (const [id, states] of Object.entries(expected)) {
      const p = createDemo(id),
        original = clone(p);
      let rt = initialRuntime(p);
      const actual: boolean[] = [];
      for (const action of examples.find((e) => e.id === id)!.steps) {
        rt = advance(p, rt, demoAction(p, action));
        expect(rt.status).toBe("valid");
        actual.push(rt.devices[deviceByName(p, "H1").id].powered);
        if (id === "lampa")
          expect(rt.devices[deviceByName(p, "H2").id].powered).toBe(
            actual.at(-1),
          );
      }
      expect(actual).toEqual(states);
      expect(p).toEqual(original);
    }
  });
});

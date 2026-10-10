import { describe, expect, it } from "vitest";
import { controlCircuits } from "../packages/knowledge/control/circuits";
import { theoryArticles } from "../packages/knowledge/control/theory";
import { elementsOf } from "../packages/knowledge/control/model";
import {
  apply,
  flow,
  initialState,
  isOn,
} from "../packages/knowledge/control/simulator";
import { measurementTable } from "../packages/knowledge/control/measure";

describe("układy sterowania stykowego", () => {
  it.each(controlCircuits.map((c) => [c.id, c] as const))(
    "%s: scenariusz zgodny z symulacją",
    (_, c) => {
      const ids = new Set(c.devices.map((d) => d.id));
      for (const e of elementsOf(c.net)) expect(ids).toContain(e.device);
      let s = initialState(c);
      c.steps.forEach((step, i) => {
        for (const a of step.do) s = apply(c, s, a);
        const state = (id: string) => `${i + 1}. ${step.text} → ${id}`;
        expect(s.unstable && "niestabilny").toBe(false);
        expect(s.short && "zwarcie").toBe(false);
        for (const id of step.on ?? [])
          expect(isOn(c, s, id) ? "" : state(id)).toBe("");
        for (const id of step.off ?? [])
          expect(isOn(c, s, id) ? state(id) : "").toBe("");
      });
      flow(c, s);
      expect(measurementTable(c).length).toBeGreaterThan(0);
    },
  );
  it("odnośniki teorii i ćwiczeń wskazują istniejące treści", () => {
    const circuits = new Set(controlCircuits.map((c) => c.id));
    const theory = new Set(theoryArticles.map((t) => t.id));
    // Both share one URL namespace: #/wiedza/sterowanie/<id>.
    expect(circuits.size + theory.size).toBe(
      new Set([...circuits, ...theory]).size,
    );
    for (const c of controlCircuits)
      for (const id of c.concepts) expect(theory).toContain(id);
    for (const t of theoryArticles) {
      for (const id of t.practice) expect(circuits).toContain(id);
      for (const s of t.sections) if (s.demo) expect(circuits).toContain(s.demo);
    }
  });
});

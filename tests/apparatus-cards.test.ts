import { it, expect } from "vitest";
import { catalog } from "@catalog/index";
import {
  apparatusCard,
  apparatusCards,
  cardSection,
} from "../packages/knowledge/cards";
import { cardHref } from "../packages/knowledge/card-routes";
import { bindings, resolveKnowledge } from "../packages/knowledge/bindings";
import { searchExamKnowledge, examTasks } from "../packages/knowledge/exams";
it("every published profile has canonical theory; mappings remain tied to real revisions/sections", () => {
  expect(new Set(apparatusCards.map((c) => c.id)).size).toBe(
    apparatusCards.length,
  );
  for (const p of Object.values(catalog).filter((p) => p.published)) {
    const resolution = resolveKnowledge(p.id);
    expect(resolution, p.id).toBeDefined();
    expect(apparatusCard(resolution!.articleId), p.id).toBeDefined();
  }
  for (const b of bindings)
    for (const map of [
      ...Object.values(b.terminals),
      ...Object.values(b.fragments),
    ]) {
      expect(
        apparatusCard(b.articleId)?.sections.some(
          (s) => s.id === map.sectionId,
        ),
      ).toBe(true);
    }
  for (const id of [
    "edu-lamp",
    "edu-heater",
    "edu-fan",
    "edu-socket",
    "edu-bulkhead-40",
    "edu-indicator-green-230",
  ]) {
    expect(resolveKnowledge(id)).toMatchObject({ exact: false });
    expect(resolveKnowledge(id)?.explanation).toContain("modelu dydaktycznego");
  }
});
it("legacy article aliases resolve to one card and SKU/terminal queries return relevant apparatus and lessons", () => {
  expect(cardHref("silniki")).toBe(cardHref("silnik"));
  expect(cardHref("ochrona-silnika")).toBe(
    cardHref("zabezpieczenia-silnikowe"),
  );
  expect(cardSection("stycznik", "practice")).toContain("K1:13–14");
  expect(cardSection("stycznik", "practice")).not.toContain("KA1");
  for (const query of [
    "LC1D09P7",
    "XB5AA35",
    "stycznik",
    "A1/A2",
    "różnicówka",
  ]) {
    expect(searchExamKnowledge(query).articles.length, query).toBeGreaterThan(
      0,
    );
  }
  expect(searchExamKnowledge("LC1D09P7").articles.map((a) => a.id)).toContain(
    "stycznik",
  );
  expect(searchExamKnowledge("XB5AA35").articles.map((a) => a.id)).toContain(
    "laczniki",
  );
});
it("108 keeps unknown source nameplate separate from model and purchase parameters", () => {
  const motor = examTasks
    .find((t) => t.code === "108")!
    .bom.find((b) => b.componentId === "motor3-y")!;
  expect(motor.sourceName).not.toContain("230/400");
  expect(motor.sourceParameters).toContain("nie określa");
  expect(motor.sourceParameters).not.toMatch(/1,5|113|3 kW/);
  expect(motor.modelAssumptions).toContain("3 kW");
  expect(motor.purchaseVariant!).toContain("1,5");
});

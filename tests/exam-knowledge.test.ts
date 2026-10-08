import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  examTasks,
  examArticles,
  examComponents,
  examAvailability,
  examIssues,
  searchExamKnowledge,
  validateExamKnowledge,
  readyTaskCount,
  referenceIsReady,
  referenceSchema,
  componentArticle,
  currentMapping,
  examTaskBySlug,
} from "../packages/knowledge/exams";
import manifest from "../packages/knowledge/exam-data/figure-manifest.json";
import specs from "../docs/ele-exams/plan/data/qa-source-checks.json";

describe("source knowledge / stage 00a", () => {
  it("covers the exact supplied scope with linked explanations and pending model gates", () => {
    expect(examTasks.map((t) => t.code)).toEqual([
      "101",
      "103",
      "104",
      "105",
      "106",
      "107",
      "108",
      "109",
      "110",
      "112",
      "113",
      "114",
      "115",
      "116",
      "117",
      "L01",
      "L02",
    ]);
    expect(examArticles).toHaveLength(25);
    expect(examComponents).toHaveLength(60);
    expect(validateExamKnowledge()).toEqual([]);
    expect(readyTaskCount()).toBe(1);
    expect(examTaskBySlug("ele02-999")).toBeUndefined();
    expect(examTaskBySlug("ele02-l01")?.code).toBe("L01");
    for (const c of examComponents) {
      const a = componentArticle(c.id)!;
      expect(a.principle.length).toBeGreaterThan(35);
      expect(a.practiceCheck.length).toBeGreaterThan(35);
    }
  });
  it("keeps all 40 PNG/SVG source figures byte-identical and referenced, not bundled images", () => {
    const paths = examTasks.flatMap((t) =>
      t.schematics.flatMap((f) => [f.png, f.svg]),
    );
    expect(paths).toHaveLength(80);
    expect(new Set(paths)).toEqual(new Set(manifest.map((m) => m.path)));
    for (const m of manifest) {
      const bytes = readFileSync(`public/knowledge/ele02/${m.path}`);
      expect(bytes.length).toBe(m.size);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(m.sha256);
    }
  });
  it("searches Polish spellings, synonyms, model names and codes", () => {
    for (const query of [
      "RCD",
      "różnicówka",
      "roznicowka",
      "BIS-402",
      "BIS402",
      "podtrzymanie",
      "krańcówka",
      "krancowka",
      "L01",
    ]) {
      const r = searchExamKnowledge(query);
      expect(
        r.tasks.length + r.articles.length + r.components.length,
        query,
      ).toBeGreaterThan(0);
    }
    expect(searchExamKnowledge("roznicowka").tasks).toEqual(
      searchExamKnowledge("różnicówka").tasks,
    );
    expect(searchExamKnowledge("BIS402").tasks.map((t) => t.code)).toContain(
      "112",
    );
    expect(searchExamKnowledge("L01").tasks.map((t) => t.code)).toEqual([
      "L01",
    ]);
    expect(searchExamKnowledge("", "ELE.05")).toEqual({
      tasks: [],
      articles: [],
      components: [],
    });
  });
  it("never promotes supplied content or a partial gate set to a ready circuit", () => {
    const ref = structuredClone(examAvailability[0]);
    ref.status = "model-tested";
    ref.gates.R10 = "pending";
    expect(referenceIsReady(ref)).toBe(false);
    expect(
      validateExamKnowledge(examTasks, [ref, ...examAvailability.slice(1)]),
    ).toContain("Ungated reference ELE.02-101");
    ref.referenceRevision = "1";
    ref.documentPath = "examples/physical/ELE02_101_stanowisko.json";
    ref.fidelity = "educational";
    ref.evidence = ["real report"];
    for (const gate of Object.keys(ref.gates) as (keyof typeof ref.gates)[])
      ref.gates[gate] = "passed";
    expect(referenceIsReady(ref)).toBe(true);
    ref.gates.R5 = "unsupported";
    expect(referenceIsReady(ref)).toBe(false);
    const incomplete = { ...ref, gates: { R1: "passed" } };
    expect(referenceSchema.safeParse(incomplete).success).toBe(false);
  });
  it("rejects broken source pages, task references and category references", () => {
    const tasks = structuredClone(examTasks);
    tasks[0].schematics[0].sourcePage = 999;
    tasks[0].bom[0].componentId = "missing";
    const errors = validateExamKnowledge(tasks);
    expect(errors).toContain(`Figure ${tasks[0].schematics[0].id}`);
    expect(errors).toContain("BOM ELE.02-101/missing");
  });
  it("preserves unknown lengths, incomplete drawings and four unresolved 114 issues", () => {
    const t = examTasks.find((t) => t.code === "108")!;
    expect(t.materials.length).toBeGreaterThan(0);
    expect(t.materials.every((m) => m.quantity === null)).toBe(true);
    expect(
      examTasks
        .find((t) => t.code === "112")!
        .schematics.some((f) => f.isIncompleteInSource),
    ).toBe(true);
    expect(examIssues.filter((i) => i.taskId === "ELE.02-114")).toHaveLength(4);
    expect(examIssues.every((i) => i.resolution === null)).toBe(true);
    expect(currentMapping("bistable-box").matches).toBe(false);
    expect(currentMapping("rcd2").matches).toBe(true);
  });
  it("preserves all 82 source checks as specifications with no invented execution evidence", () => {
    expect(specs.checks).toHaveLength(82);
    expect(
      specs.checks.every(
        (c) => c.status === "specification" && !c.executionEvidence,
      ),
    ).toBe(true);
    expect(
      new Set(examTasks.flatMap((t) => t.acceptanceChecks.map((c) => c.id))),
    ).toEqual(new Set(specs.checks.map((c) => c.id)));
    expect(specs.checks.filter((c) => c.stageId === "00")).toHaveLength(0);
  });
});

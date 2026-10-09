import {
  referenceByTask,
  referenceExamples,
  validateReference,
} from "./reference-examples";
import { z } from "zod";
import { catalog } from "@catalog/index";
import { normalizeSearch } from "./search";
import { apparatusCards, apparatusCard, cardSection } from "./cards";
import { canonicalCardId, cardHref } from "./card-routes";
import { resolveKnowledge } from "./bindings";
import taskData from "./exam-data/ele02-tasks.json";
import articleData from "./exam-data/device-knowledge.json";
import mappingData from "./exam-data/component-catalog-map.json";
import issueData from "./exam-data/source-issues.json";
import kitData from "./exam-data/shopping-kit.json";
import availabilityData from "./exam-data/availability.json";

const text = z.string().min(1);
const strings = z.array(text);
const sourceSchema = z.object({
  id: text,
  fileName: text,
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  pageCount: z.number().int().positive(),
  pageNumbering: text,
});
const figureSchema = z.object({
  id: text,
  kind: text,
  png: text,
  svg: text,
  sourcePage: z.number().int().positive(),
  sourceCropPt: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  isIncompleteInSource: z.boolean(),
  derivation: text,
  alt: text,
});
const taskSchema = z.object({
  id: text,
  code: text,
  qualification: z.literal("ELE.02"),
  title: text,
  category: text,
  summary: text,
  sourceId: text,
  sourcePages: z.array(z.number().int().positive()),
  timeMinutes: z.number().positive(),
  referenceProjectStatus: text,
  bom: z.array(
    z.object({
      componentId: text,
      quantity: z.number().positive(),
      unit: text,
      sourceLocator: text,
      sourceKind: text,
      note: z.string(),
      sourceName: text.optional(),
      sourceParameters: text.optional(),
      modelAssumptions: text.optional(),
      purchaseVariant: text.optional(),
    }),
  ),
  learningGoals: strings,
  readingSteps: strings,
  acceptanceChecks: z.array(
    z.object({ id: text, action: text, expected: text, basis: text }),
  ),
  typicalMistakes: strings,
  openQuestions: strings,
  catalogGaps: strings,
  manufacturerSources: strings,
  schematics: z.array(figureSchema),
  materials: z.array(
    z.object({
      id: text,
      name: text,
      quantity: z.number().nonnegative().nullable(),
      unit: text,
      sourceLocator: text,
      scope: text,
      note: z.string(),
    }),
  ),
});
const articleSchema = z.object({
  id: text,
  title: text,
  componentIds: strings,
  principle: text,
  howToRead: text,
  classicUse: text,
  practiceCheck: text,
  commonMistake: text,
  taskCodes: strings,
  manufacturerSources: strings,
  evidence: text,
});
const mappingSchema = z.object({
  componentId: text,
  status: z.enum([
    "educational-model",
    "partial-adaptation",
    "missing-model",
    "physical-layout",
    "material-only",
  ]),
  note: text,
  productId: text.optional(),
  productRevision: text.optional(),
  topologyId: text.optional(),
  plannedProductId: text.optional(),
  requiredSettings: z
    .record(z.string(), z.union([z.number(), z.boolean(), z.string()]))
    .optional(),
});
export const referenceSchema = z.object({
  taskId: text,
  status: z.enum(["content-only", "draft", "model-tested", "source-verified"]),
  referenceRevision: text.nullable(),
  documentPath: text.nullable(),
  fidelity: z
    .enum(["educational", "adapted", "exact-selected-profile"])
    .nullable(),
  evidence: strings,
  gates: z.record(
    z.enum(["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10"]),
    z.enum(["pending", "passed", "unsupported"]),
  ),
});
export type ExamTask = z.infer<typeof taskSchema>;
export type SourceFigure = z.infer<typeof figureSchema>;
export type ExamArticle = z.infer<typeof articleSchema>;
export type ReferenceAvailability = z.infer<typeof referenceSchema>;
export const examSources = z.array(sourceSchema).parse(taskData.sources);
export const examTasks = z.array(taskSchema).parse(taskData.tasks);
export const examComponents = z
  .array(
    z.object({
      id: text,
      name: text,
      parameters: text,
      purchaseNotes: z.string(),
    }),
  )
  .parse(taskData.components);
export const examArticles = z.array(articleSchema).parse(
  articleData.articles.map((a) => ({
    ...a,
    title: apparatusCard(a.id)!.title,
    principle: cardSection(a.id, "operation"),
    howToRead: cardSection(a.id, "appearance"),
    classicUse: cardSection(a.id, "applications"),
    practiceCheck: cardSection(a.id, "practice"),
    commonMistake: cardSection(a.id, "mistakes"),
  })),
);
export const examMappings = z.array(mappingSchema).parse(mappingData.mappings);
export const examIssues = z
  .array(
    z.object({
      id: text,
      taskId: text,
      state: z.literal("open"),
      severity: text,
      description: text,
      sourceId: text,
      sourcePages: z.array(z.number()),
      resolution: z.string().nullable(),
    }),
  )
  .parse(issueData.issues);
export const manufacturerSources = z
  .array(
    z.object({
      id: text,
      title: text,
      url: z.url(),
      checkedAt: text,
      scope: text,
      notice: z.string().optional(),
    }),
  )
  .parse(taskData.manufacturerSources);
export const examAvailability = z
  .array(referenceSchema)
  .parse(availabilityData);
export const shoppingKit = kitData;
export const taskHref = (code: string) =>
  `#/wiedza/zadania/ele02-${code.toLowerCase()}`;
export const examArticleHref = cardHref;
export const componentHref = (id: string) => `#/wiedza/zestaw/${id}`;
export const examTaskBySlug = (slug: string) =>
  examTasks.find((t) => `ele02-${t.code.toLowerCase()}` === slug);
export const componentArticle = (id: string) =>
  examArticles.find((a) => a.componentIds.includes(id));
export function referenceIsReady(ref: ReferenceAvailability | undefined) {
  return (
    !!ref &&
    ["model-tested", "source-verified"].includes(ref.status) &&
    !!ref.referenceRevision &&
    !!ref.documentPath &&
    !!ref.fidelity &&
    ref.evidence.length > 0 &&
    Object.values(ref.gates).every((g) => g === "passed")
  );
}
export const readyTaskCount = () =>
  examAvailability.filter(referenceIsReady).length;
export function currentMapping(componentId: string) {
  const mapping = examMappings.find((m) => m.componentId === componentId);
  const product = mapping?.productId ? catalog[mapping.productId] : undefined;
  return {
    mapping,
    product,
    matches:
      !!product &&
      product.published &&
      product.revision === mapping?.productRevision &&
      product.topology.id === mapping?.topologyId,
  };
}
const aliases: Record<string, string> = {
  rcd: "różnicówka roznicowka różnicowoprądowy",
  bistabilny: "BIS-402 BIS402 BIS-413 BIS413 impulsowy",
  stycznik: "podtrzymanie",
  krancowka: "krańcówka krancowka",
};
export function searchExamKnowledge(query: string, qualification = "ELE.02") {
  if (qualification !== "ELE.02")
    return { tasks: [], articles: [], components: [], models: [] };
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  const match = (parts: unknown[]) => {
    const haystack = normalizeSearch(parts.join(" ")).replace(
      /bis (402|413)/g,
      "bis$1 bis $1",
    );
    return words.every((word) => haystack.includes(word));
  };
  const names = (id: string) =>
    Object.values(catalog)
      .filter(
        (p) =>
          p.published &&
          canonicalCardId(resolveKnowledge(p.id)?.articleId ?? "") ===
            canonicalCardId(id),
      )
      .map(
        (p) =>
          `${p.displayNamePl} ${p.manufacturer} ${p.manufacturerPartNumber} ${p.topology.terminals.map((t) => t.id).join(" ")}`,
      );
  const cardMatches = (id: string) => {
    const a = apparatusCard(id);
    return (
      !!a &&
      match([
        a.title,
        a.summary,
        ...a.synonyms,
        ...a.sections.flatMap((s) => s.paragraphs),
        aliases[a.id] ?? "",
        ...a.taskCodes,
        ...names(id),
      ])
    );
  };
  const matchingCards = apparatusCards.filter((a) => cardMatches(a.id));
  return {
    tasks: examTasks.filter((t) =>
      match([
        t.code,
        t.id,
        t.title,
        t.summary,
        ...t.readingSteps,
        ...(referenceByTask(t.id)?.profiles.map((p) => {
          const product = catalog[p.productId];
          return `${product.displayNamePl} ${product.manufacturer} ${product.manufacturerPartNumber} ${product.topology.terminals.map((t) => t.id).join(" ")}`;
        }) ?? []),
        ...t.bom.map((b) => {
          const c = examComponents.find((c) => c.id === b.componentId),
            a = componentArticle(b.componentId);
          return `${c?.name} ${b.sourceParameters} ${a ? `${aliases[a.id] ?? ""} ` : ""}`;
        }),
      ]),
    ),
    articles: matchingCards.map((a) => ({
      ...a,
      principle: cardSection(a.id, "operation"),
    })),
    models: referenceExamples.filter(
      (r) =>
        match([r.title, r.taskId]) ||
        r.profiles.some((p) => {
          const sku = catalog[p.productId];
          return match([
            sku.displayNamePl,
            sku.manufacturer,
            sku.manufacturerPartNumber,
            ...sku.topology.terminals.map((t) => t.id),
          ]);
        }),
    ),
    components: examComponents.filter((c) =>
      match([
        c.name,
        c.parameters,
        c.purchaseNotes,
        aliases[componentArticle(c.id)?.id ?? ""] ?? "",
        ...names(componentArticle(c.id)?.id ?? ""),
      ]),
    ),
  };
}
export function validateExamKnowledge(
  tasks = examTasks,
  refs = examAvailability,
) {
  const errors: string[] = [];
  const unique = (ids: string[], label: string) => {
    if (new Set(ids).size !== ids.length) errors.push(`Duplicate ${label}`);
  };
  unique(
    tasks.map((t) => t.id),
    "tasks",
  );
  unique(
    examArticles.map((a) => a.id),
    "articles",
  );
  unique(
    examComponents.map((c) => c.id),
    "components",
  );
  unique(
    refs.map((r) => r.taskId),
    "availability",
  );
  unique(
    tasks.flatMap((t) => t.schematics.map((f) => f.id)),
    "figures",
  );
  for (const t of tasks) {
    const s = examSources.find((s) => s.id === t.sourceId);
    if (!s || t.sourcePages.some((p) => p > s.pageCount))
      errors.push(`Source ${t.id}`);
    for (const f of t.schematics)
      if (
        !s ||
        f.sourcePage > s.pageCount ||
        ![f.png, f.svg].every((p) =>
          /^assets\/schematy\/[A-Za-z0-9_-]+\.(png|svg)$/.test(p),
        )
      )
        errors.push(`Figure ${f.id}`);
    for (const b of t.bom)
      if (
        !examComponents.some((c) => c.id === b.componentId) ||
        !componentArticle(b.componentId)
      )
        errors.push(`BOM ${t.id}/${b.componentId}`);
    if (!refs.some((r) => r.taskId === t.id))
      errors.push(`Availability ${t.id}`);
    for (const id of t.manufacturerSources)
      if (!manufacturerSources.some((s) => s.id === id))
        errors.push(`Manual ${t.id}/${id}`);
  }
  for (const c of examComponents)
    if (
      !componentArticle(c.id) ||
      !examMappings.some((m) => m.componentId === c.id)
    )
      errors.push(`Explanation ${c.id}`);
  for (const a of examArticles) {
    for (const code of a.taskCodes)
      if (!tasks.some((t) => t.code === code))
        errors.push(`Article task ${a.id}/${code}`);
    for (const id of a.manufacturerSources)
      if (!manufacturerSources.some((s) => s.id === id))
        errors.push(`Article manual ${a.id}/${id}`);
  }
  for (const issue of examIssues)
    if (
      !tasks.some((t) => t.id === issue.taskId && t.sourceId === issue.sourceId)
    )
      errors.push(`Issue ${issue.id}`);
  for (const r of refs) {
    const example = referenceByTask(r.taskId);
    if (
      referenceIsReady(r) &&
      (!example ||
        r.referenceRevision !== example.referenceRevision ||
        r.documentPath !== example.documentPath ||
        validateReference(example).length ||
        example.sourceFigureIds.some(
          (id) =>
            !tasks
              .find((t) => t.id === r.taskId)
              ?.schematics.some((f) => f.id === id),
        ))
    )
      errors.push(`Reference mismatch ${r.taskId}`);
    if (
      !tasks.some((t) => t.id === r.taskId) ||
      (["model-tested", "source-verified"].includes(r.status) &&
        !referenceIsReady(r))
    )
      errors.push(`Ungated reference ${r.taskId}`);
  }
  return errors;
}

import { referenceExamples } from "../packages/knowledge/reference-examples";
import { validateReferenceIdentity } from "../packages/knowledge/reference-identity";
import {
  lessonDefinitions,
  validateLessonDefinition,
} from "../packages/knowledge/lesson-definitions";
import guides from "../packages/training/scenario-guides.json";
import { scenarios } from "../packages/training";
import { apparatusCards } from "../packages/knowledge/cards";
import { validateKnowledge } from "../packages/knowledge";
import { articles, circuits, lessons } from "../packages/knowledge/content";
import {
  examTasks,
  examArticles,
  examComponents,
  validateExamKnowledge,
  readyTaskCount,
} from "../packages/knowledge/exams";
import manifest from "../packages/knowledge/exam-data/figure-manifest.json";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const errors = [...validateKnowledge(), ...validateExamKnowledge()];
for (const r of referenceExamples) {
  const p = r.create();
  if (!validateReferenceIdentity(r.id, r.referenceRevision, p, r.bindings))
    errors.push(
      `Nieaktualna tożsamość wzorca ${r.id}: uruchom tsx scripts/reference-identity.ts`,
    );
  const lesson = lessonDefinitions[r.id];
  if (!lesson) errors.push(`Brak deklaracji lekcji ${r.id}`);
  else
    errors.push(
      ...validateLessonDefinition(p, lesson).map((e) => `${r.id}/${e}`),
    );
}
const currentGuides = scenarios.map(
  ({ id, description, fidelity, practice, goals, hints }) => ({
    id,
    description,
    fidelity,
    practice,
    goals,
    hints,
  }),
);
if (JSON.stringify(guides) !== JSON.stringify(currentGuides))
  errors.push(
    "Nieaktualne opisy zapisanych ćwiczeń: uruchom tsx scripts/training-guides.ts",
  );
for (const c of apparatusCards) {
  if (!c.title || !c.summary || !c.sections.length || !c.sources.length)
    errors.push(`Niepełna karta ${c.id}`);
  for (const section of c.sections)
    if (
      !section.paragraphs.every((p) => p?.trim()) ||
      section.sourceIds.some((id) => !c.sources.some((s) => s.id === id))
    )
      errors.push(`Niepełna sekcja ${c.id}/${section.id}`);
}
for (const entry of manifest) {
  try {
    const bytes = readFileSync(`public/knowledge/ele02/${entry.path}`);
    if (
      bytes.length !== entry.size ||
      createHash("sha256").update(bytes).digest("hex") !== entry.sha256
    )
      errors.push(`Zmieniony rysunek źródłowy: ${entry.path}`);
  } catch {
    errors.push(`Brak rysunku źródłowego: ${entry.path}`);
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Artykuły katalogowe: ${articles.length}. Historyczne kontrakty regresji: ${circuits.length} układów, ${lessons.length} lekcji — referencje poprawne.`,
  );
if (!errors.length)
  console.log(
    `Materiały ELE.02: ${examTasks.length} zadań, ${examArticles.length} artykułów, ${examComponents.length} kategorii BOM, ${manifest.length / 2} oryginalnych rysunków PNG/SVG; ${readyTaskCount()}/${examTasks.length} gotowych wzorców.`,
  );

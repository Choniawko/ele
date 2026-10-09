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

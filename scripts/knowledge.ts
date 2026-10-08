import { validateKnowledge } from "../packages/knowledge";
import { articles, circuits, lessons } from "../packages/knowledge/content";
const errors = validateKnowledge();
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Baza wiedzy: ${articles.length} artykułów, ${circuits.length} układów, ${lessons.length} lekcji — referencje poprawne.`,
  );

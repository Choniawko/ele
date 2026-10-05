import { mkdir, writeFile } from "node:fs/promises";
import {
  products,
  realProducts,
  validateCatalog,
} from "../packages/device-catalog/index";
import { scenarios, scenarioProject } from "../packages/training/index";
import type { ExerciseVariant } from "../packages/training/index";
import { validateProjectDocument } from "../packages/device-catalog/project-validation";
import { normalizeResearch } from "../packages/device-catalog/research";
import seed from "../Symulator_Elektryczny_Pakiet_Codex/catalog-research-seed.json";
const errors = validateCatalog();
normalizeResearch(seed);
let variantCount = 0;
for (const scenario of scenarios) {
  const variants: ExerciseVariant[] = scenario.practice
    ? ["reference", "assembly", "diagnosis"]
    : ["reference"];
  for (const variant of variants)
    for (
      let diagnosticCase = 0;
      diagnosticCase < (variant === "diagnosis" ? 3 : 1);
      diagnosticCase++
    ) {
      try {
        validateProjectDocument(
          scenarioProject(scenario.id, true, variant, diagnosticCase),
        );
        variantCount++;
      } catch (e) {
        errors.push(
          `${scenario.id}/${variant}/${diagnosticCase}: ${String(e)}`,
        );
      }
    }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Walidacja OK: ${realProducts.length} SKU; ${realProducts.filter((p) => p.published).length} opublikowane, ${realProducts.filter((p) => !p.published).length} oczekujących; ${products.filter((p) => p.educational).length} osobnych profili dydaktycznych; ${variantCount} wariantów stanowisk.`,
  );
if (process.argv[2] === "report") {
  await mkdir("docs", { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    errors,
    products: products.map((p) => ({
      id: p.id,
      partNumber: p.manufacturerPartNumber,
      educational: p.educational,
      readiness: p.readiness,
      published: p.published,
      gates: p.gates,
      dimensions: p.dimensions,
      blockers: p.blockers,
      limitations: p.limitations,
      sources: p.sources,
    })),
  };
  await writeFile(
    "docs/catalog-report.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await writeFile(
    "docs/CATALOG_REPORT.md",
    `# Gotowość katalogu\n\nWygenerowano ${report.generatedAt}. Profile dydaktyczne nie zwiększają liczby ukończonych SKU.\n\n| SKU | Stan | Główna luka |\n|---|---|---|\n${realProducts.map((p) => `| ${p.manufacturer} ${p.manufacturerPartNumber} | ${p.readiness} | ${p.blockers.join("; ") || "profil gotowy, ograniczenia w raporcie JSON"} |`).join("\n")}\n`,
  );
}

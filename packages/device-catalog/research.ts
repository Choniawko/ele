import { catalogInputSchema } from "./index";
export function normalizeResearch(input: unknown) {
  const data = catalogInputSchema.parse(input);
  return {
    schemaVersion: 1 as const,
    importedAt: new Date().toISOString(),
    sources: data.sources,
    products: data.products.map((p) => ({
      id: p.id,
      manufacturer: p.manufacturer,
      manufacturerPartNumber: p.manufacturerPartNumber,
      displayNamePl: p.displayNamePl,
      readiness: "research-seed" as const,
      published: false as const,
      dimensions: { value: null, evidence: [], confidence: "unknown" },
      gates: { topology: false, visual: false, simulation: false },
      facts: p.facts.map((f) => ({
        fieldPath: f.fieldPath,
        value: f.value,
        unit: f.unit,
        evidence: f.evidence,
        confidence: "unreviewed",
      })),
      blockers: [
        "Wymagana niezależna weryfikacja źródeł, topologii, geometrii i zachowania.",
      ],
    })),
  };
}
export type ResearchPackage = ReturnType<typeof normalizeResearch>;

import { z } from "zod";
import { projectSchema, type ProjectDocument } from "@model/index";
import { assertProjectCatalog, catalog } from "./index";

const labels: Record<string, string> = {
  name: "Nazwa projektu",
  designation: "Oznaczenie aparatu",
  marking: "Opis przewodu",
  electricalLengthM: "Długość elektryczna przewodu [m]",
  length: "Długość nowego przewodu [m]",
  crossSectionMm2: "Przekrój przewodu [mm²]",
  section: "Przekrój przewodu [mm²]",
  powerW: "Moc [W]",
  voltageV: "Napięcie [V]",
  timeS: "Czas [s]",
  ratedCurrentA: "Prąd nastawy [A]",
  sourceResistanceOhm: "Rezystancja źródła [Ω]",
  resistanceOhm: "Rezystancja [Ω]",
  loadFactor: "Współczynnik obciążenia",
  x: "Współrzędna X trasy lub aparatu",
  y: "Współrzędna Y trasy lub aparatu",
  diagnosis: "Opis diagnozy",
  diagnosisHypothesis: "Opis diagnozy",
};
export function validationMessage(error: unknown): string {
  if (!(error instanceof z.ZodError))
    return error instanceof Error
      ? error.message
      : "Niepoprawny dokument projektu.";
  const issue = error.issues[0];
  const label =
    labels[String(issue.path.at(-1))] ??
    (issue.path.includes("routes") ? "Trasa przewodu" : "Pole projektu");
  if (issue.code === "too_big")
    return `${label}: maksymalnie ${issue.maximum}${issue.origin === "string" ? " znaków" : issue.origin === "array" ? " punktów lub elementów" : ""}. Zmiana została odrzucona.`;
  if (issue.code === "too_small")
    return `${label}: ${issue.inclusive ? "minimum" : "wartość większa niż"} ${issue.minimum}${issue.origin === "string" ? " znaków" : ""}. Zmiana została odrzucona.`;
  return `${label}: niepoprawna wartość lub format. Wymagana skończona wartość zgodna ze schematem projektu.`;
}
export function validateProjectDocument(input: unknown): ProjectDocument {
  try {
    const project = projectSchema.parse(input);
    assertProjectCatalog(project);
    for (const [id, revision] of Object.entries(project.productRevisions))
      if (!catalog[id]?.published || catalog[id].revision !== revision)
        throw new Error(
          `Brak zgodnej wersji katalogu: ${id}. Zachowaj oryginalny plik.`,
        );
    return project;
  } catch (error) {
    throw new Error(validationMessage(error), { cause: error });
  }
}

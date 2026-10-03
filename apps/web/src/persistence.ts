import Dexie, { type EntityTable } from "dexie";
import { projectSchema, type ProjectDocument } from "@model/index";
import { assertProjectCatalog, catalog, type Product } from "@catalog/index";
import type { MeasurementRecord } from "@measurements/index";
import type { RuntimeEvent } from "@simulation/index";
import { normalizeResearch, type ResearchPackage } from "@catalog/research";
export interface SavedProject {
  id: string;
  name: string;
  updatedAt: string;
  document: ProjectDocument;
  measurements: MeasurementRecord[];
  events: RuntimeEvent[];
}
const db = new Dexie("pracownia-elektryczna") as Dexie & {
  projects: EntityTable<SavedProject, "id">;
  research: EntityTable<ResearchPackage & { id: string }, "id">;
  snapshots: EntityTable<{ id: string; product: Product }, "id">;
};
db.version(1).stores({ projects: "id, name, updatedAt" });
db.version(2).stores({
  projects: "id, name, updatedAt",
  research: "id, importedAt",
});
db.version(3).stores({
  projects: "id, name, updatedAt",
  research: "id, importedAt",
  snapshots: "id",
});
export async function importResearch(input: unknown): Promise<ResearchPackage> {
  const normalized = normalizeResearch(input);
  await db.research.put({ ...normalized, id: "imported" });
  return normalized;
}
export async function getResearch() {
  return db.research.get("imported");
}
export async function saveProject(
  document: ProjectDocument,
  measurements: MeasurementRecord[],
  events: RuntimeEvent[],
  markLast = true,
): Promise<void> {
  await db.projects.put({
    id: document.circuit.projectId,
    name: document.name,
    updatedAt: new Date().toISOString(),
    document: structuredClone(document),
    measurements: structuredClone(measurements.slice(-500)),
    events: structuredClone(events.slice(-300)),
  });
  await db.snapshots.bulkPut(
    Object.keys(document.productRevisions)
      .filter((id) => catalog[id])
      .map((id) => ({
        id: id + "@" + catalog[id].revision,
        product: structuredClone(catalog[id]),
      })),
  );
  if (markLast)
    localStorage.setItem("ele-last-project", document.circuit.projectId);
}
export async function restoreProject(
  id?: string,
): Promise<SavedProject | undefined> {
  const key = id ?? localStorage.getItem("ele-last-project");
  if (!key) return undefined;
  const saved = await db.projects.get(key);
  if (!saved) return undefined;
  const parsed = projectSchema.parse(saved.document);
  assertProjectCatalog(parsed);
  return { ...saved, document: parsed };
}
export async function listProjects(): Promise<SavedProject[]> {
  return db.projects.orderBy("updatedAt").reverse().toArray();
}
export function parseProject(text: string): ProjectDocument {
  if (new TextEncoder().encode(text).byteLength > 5 * 1024 * 1024)
    throw new Error("Limit importu: 5 MB.");
  const input: unknown = JSON.parse(text),
    project = projectSchema.parse(input);
  assertProjectCatalog(project);
  return project;
}
export function safeExport(project: ProjectDocument): ProjectDocument {
  const copy = structuredClone(project);
  if (copy.faults.some((f) => f.hidden)) {
    copy.faults = [];
    delete copy.training;
    delete copy.scenarioId;
  }
  return copy;
}

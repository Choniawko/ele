import Dexie, { type EntityTable } from "dexie";
import { type ProjectDocument } from "@model/index";
import { catalog, type Product } from "@catalog/index";
import {
  validateProjectDocument,
  validationMessage,
} from "@catalog/project-validation";
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
export interface SavedProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  deviceCount: number;
}
export interface ProjectRecovery {
  id: string;
  message: string;
  json: string;
  protectedAnswers: boolean;
}
function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
// Recovery must work even when the source does not pass any project schema.
// Preserve the original row in IndexedDB; exported copies obey training privacy.
function recoveryCopy(
  saved: unknown,
  id: string,
  message: string,
): ProjectRecovery {
  const row = object(saved),
    document = object(structuredClone(row?.document));
  const faults = document?.faults;
  const protectedAnswers =
    !!document?.training ||
    !Array.isArray(faults) ||
    faults.some((f) => !object(f) || object(f)?.hidden !== false);
  let copy: unknown = document ?? row?.document;
  if (document && protectedAnswers) {
    // Only public project fields are retained, excluding unknown answer payloads.
    copy = Object.fromEntries(
      [
        "name",
        "circuit",
        "physical",
        "schematic",
        "userMetadata",
        "productRevisions",
      ]
        .filter((k) => k in document)
        .map((k) => [k, document[k]]),
    );
    (copy as Record<string, unknown>).faults = [];
  }
  return {
    id,
    message,
    protectedAnswers,
    json: JSON.stringify(copy ?? null, null, 2),
  };
}
export class ProjectReadError extends Error {
  readonly recovery: ProjectRecovery;
  constructor(saved: unknown, id: string, cause: unknown) {
    const message = `Nie można otworzyć zapisanego projektu: ${validationMessage(cause)} Oryginalne dane zachowano w bazie. Pobierz kopię do odzyskania.`;
    super(message, { cause });
    this.name = "ProjectReadError";
    this.recovery = recoveryCopy(saved, id, message);
  }
}
export const db = new Dexie("pracownia-elektryczna") as Dexie & {
  projects: EntityTable<SavedProject, "id">;
  research: EntityTable<ResearchPackage & { id: string }, "id">;
  snapshots: EntityTable<{ id: string; product: Product }, "id">;
  settings: EntityTable<{ id: string; projectId: string }, "id">;
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
db.version(4).stores({
  projects: "id, name, updatedAt",
  research: "id, importedAt",
  snapshots: "id",
  settings: "id",
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
  // Clone/validate before the first async boundary: callers may continue editing.
  const validated = validateProjectDocument(document);
  const row: SavedProject = {
    id: validated.circuit.projectId,
    name: validated.name,
    updatedAt: new Date().toISOString(),
    document: validated,
    measurements: structuredClone(measurements.slice(-500)),
    events: structuredClone(events.slice(-300)),
  };
  const snapshots = Object.keys(validated.productRevisions).map((id) => ({
    id: id + "@" + catalog[id].revision,
    product: structuredClone(catalog[id]),
  }));
  await db.transaction(
    "rw",
    db.projects,
    db.snapshots,
    db.settings,
    async () => {
      const existing = await db.projects.get(row.id);
      if (existing) readSaved(existing, row.id); // Never overwrite an unreadable original.
      await db.projects.put(row);
      if (snapshots.length) await db.snapshots.bulkPut(snapshots);
      if (markLast)
        await db.settings.put({ id: "last-project", projectId: row.id });
    },
  );
  // Legacy pointer is best-effort; the authoritative pointer is in the same DB transaction.
  if (markLast)
    try {
      localStorage.setItem("ele-last-project", row.id);
    } catch {
      /* IndexedDB commit succeeded. */
    }
}
function readSaved(saved: SavedProject, key: string): SavedProject {
  try {
    const parsed = validateProjectDocument(saved.document);
    if (
      parsed.circuit.projectId !== key ||
      !Array.isArray(saved.measurements) ||
      !Array.isArray(saved.events)
    )
      throw new Error("Niepoprawne metadane zapisu projektu.");
    return { ...saved, document: parsed };
  } catch (error) {
    throw new ProjectReadError(saved, key, error);
  }
}
export async function restoreProject(
  id?: string,
): Promise<SavedProject | undefined> {
  let key = id ?? (await db.settings.get("last-project"))?.projectId;
  if (!key)
    try {
      key = localStorage.getItem("ele-last-project") ?? undefined;
    } catch {
      /* No legacy pointer. */
    }
  if (!key) return undefined;
  const saved = await db.projects.get(key);
  if (!saved) return undefined;
  return readSaved(saved, key);
}
export async function listProjects(): Promise<SavedProjectSummary[]> {
  const rows = await db.projects.orderBy("updatedAt").reverse().toArray();
  return rows.map((row) => ({
    id: row.id,
    name: typeof row.name === "string" ? row.name : "Niepoprawny zapis",
    updatedAt: row.updatedAt,
    deviceCount: Array.isArray(object(object(row.document)?.circuit)?.devices)
      ? (object(object(row.document)?.circuit)!.devices as unknown[]).length
      : 0,
  }));
}
export function parseProject(text: string): ProjectDocument {
  if (new TextEncoder().encode(text).byteLength > 5 * 1024 * 1024)
    throw new Error("Limit importu: 5 MB.");
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new Error("Niepoprawny plik JSON projektu.");
  }
  return validateProjectDocument(input);
}
export function safeExport(project: ProjectDocument): ProjectDocument {
  const copy = validateProjectDocument(project);
  if (copy.faults.some((f) => f.hidden)) {
    copy.faults = [];
    delete copy.training;
    delete copy.scenarioId;
  }
  return copy;
}

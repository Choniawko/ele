import { z } from "zod";
import {
  emptyProject,
  newId,
  projectLimits,
  type ProjectDocument,
} from "@model/index";
import { catalog } from "@catalog/index";
import {
  validateProjectDocument,
  validationMessage,
} from "@catalog/project-validation";
import {
  db,
  readSaved,
  safeExport,
  LibraryConflictError,
  type SavedProject,
} from "./persistence";

export const libraryLimits = {
  importBytes: 20 * 1024 * 1024,
  projectsPerFolder: 100,
} as const;
export const libraryNameSchema = z
  .string()
  .min(projectLimits.name.minLength)
  .max(projectLimits.name.maxLength)
  .refine((value) => value.trim().length > 0, "Nazwa nie może być pusta.");
const functionSchema = z.enum([
  "voltage-ac",
  "voltage-dc",
  "continuity",
  "current",
  "insulation",
  "loop",
  "rcd",
  "phase-order",
]);
const reference = z
  .object({ deviceId: z.string().min(1), terminalId: z.string().min(1) })
  .strict();
export const measurementRecordSchema = z
  .object({
    id: z.string().min(1),
    function: functionSchema,
    red: reference.optional(),
    black: reference.optional(),
    wireId: z.string().optional(),
    deviceId: z.string().optional(),
    parameters: z
      .object({
        function: functionSchema,
        testVoltageV: z.union([z.literal(100), z.literal(250), z.literal(500)]),
        rcdMultiplier: z.union([
          z.literal(0.5),
          z.literal(1),
          z.literal(2),
          z.literal(5),
        ]),
        compensateLeads: z.boolean(),
      })
      .strict(),
    revision: z.number().int().nonnegative(),
    timeMs: z.number().finite().nonnegative(),
    energized: z.boolean(),
    result: z
      .object({
        status: z.enum([
          "valid",
          "open-circuit",
          "floating",
          "invalid-setup",
          "out-of-range",
          "unsupported",
          "solver-error",
        ]),
        value: z.number().finite().nullable(),
        unit: z.string(),
        explanation: z.string(),
        details: z
          .record(z.string(), z.union([z.number().finite(), z.string()]))
          .optional(),
      })
      .strict(),
  })
  .strict();
export const eventSchema = z
  .object({
    id: z.string().min(1),
    timeMs: z.number().finite().nonnegative(),
    deviceId: z.string().optional(),
    message: z.string(),
    type: z.enum(["info", "warning", "trip"]),
  })
  .strict();
const entrySchema = z
  .object({
    document: z.unknown(),
    measurements: z.array(measurementRecordSchema).max(500).default([]),
    events: z.array(eventSchema).max(300).default([]),
  })
  .strict();
const folderSchema = z
  .object({
    format: z.literal("ele-folder"),
    version: z.literal(1),
    folder: z.object({ name: libraryNameSchema }).strict(),
    projects: z.array(entrySchema).max(libraryLimits.projectsPerFolder),
  })
  .strict();
const singleSchema = z
  .object({
    format: z.literal("ele-project"),
    version: z.literal(1),
    project: entrySchema,
  })
  .strict();
export type LibraryEntry = {
  document: ProjectDocument;
  measurements: SavedProject["measurements"];
  events: SavedProject["events"];
};
export interface ImportPlan {
  kind: "project" | "folder";
  folderName?: string;
  entries: LibraryEntry[];
}
export function parseLibraryImport(text: string): ImportPlan {
  if (new TextEncoder().encode(text).byteLength > libraryLimits.importBytes)
    throw new Error("Limit importu biblioteki: 20 MB.");
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new Error("Niepoprawny JSON. Sprawdź format pliku.");
  }
  try {
    if (input && typeof input === "object" && "format" in input) {
      if (!(input.format === "ele-folder" || input.format === "ele-project"))
        throw new Error("Nieobsługiwany format paczki JSON.");
      if (!("version" in input) || input.version !== 1)
        throw new Error("Nieobsługiwana wersja paczki. Obsługiwana wersja: 1.");
      if (input.format === "ele-folder") {
        const folder = folderSchema.parse(input);
        const failures: string[] = [],
          entries: LibraryEntry[] = [];
        folder.projects.forEach((entry, index) => {
          try {
            entries.push(validateEntry(entry));
          } catch (e) {
            failures.push(`Projekt ${index + 1}: ${validationMessage(e)}`);
          }
        });
        if (failures.length) throw new Error(failures.join("\n"));
        return { kind: "folder", folderName: folder.folder.name, entries };
      }
      if (input.format === "ele-project") {
        const single = singleSchema.parse(input);
        return { kind: "project", entries: [validateEntry(single.project)] };
      }
      throw new Error("Nieobsługiwany format paczki JSON.");
    }
    return {
      kind: "project",
      entries: [
        {
          document: validateProjectDocument(input),
          measurements: [],
          events: [],
        },
      ],
    };
  } catch (e) {
    throw new Error("Import odrzucony: " + validationMessage(e), { cause: e });
  }
}
function validateEntry(input: z.infer<typeof entrySchema>): LibraryEntry {
  return { ...input, document: validateProjectDocument(input.document) };
}
function name(input: string) {
  const parsed = libraryNameSchema.safeParse(input);
  if (!parsed.success)
    throw new Error(
      `Nazwa musi mieć od 1 do ${projectLimits.name.maxLength} znaków i nie może być pusta.`,
    );
  return parsed.data;
}
const now = () => new Date().toISOString();
async function requireFolder(folderId: string | null) {
  if (folderId !== null && !(await db.folders.get(folderId)))
    throw new Error("Folder już nie istnieje. Wybierz inny folder.");
}
async function writeEntries(
  entries: LibraryEntry[],
  folderId: string | null,
): Promise<SavedProject[]> {
  await requireFolder(folderId);
  const rows = entries.map((entry) => {
    const document = validateProjectDocument(entry.document);
    document.circuit.projectId = newId("project");
    const validatedEntry = entrySchema.parse({
      document: entry.document,
      measurements: entry.measurements,
      events: entry.events,
    });
    return {
      ...structuredClone(validatedEntry),
      document,
      id: document.circuit.projectId,
      name: document.name,
      updatedAt: now(),
      folderId,
      libraryRevision: 0,
    };
  });
  await db.projects.bulkAdd(rows);
  const snapshots = new Map(
    rows.flatMap((row) =>
      Object.keys(row.document.productRevisions).map(
        (id) =>
          [
            id,
            {
              id: `${id}@${catalog[id].revision}`,
              product: structuredClone(catalog[id]),
            },
          ] as const,
      ),
    ),
  );
  if (snapshots.size) await db.snapshots.bulkPut([...snapshots.values()]);
  return rows;
}
const tables = () => [
  db.projects,
  db.folders,
  db.snapshots,
  db.settings,
  db.deletedProjects,
];
export async function createFolder(input: string) {
  const folder = { id: newId("folder"), name: name(input), updatedAt: now() };
  await db.folders.add(folder);
  return folder;
}
export async function renameFolder(id: string, input: string) {
  const validatedName = name(input);
  await db.transaction("rw", db.folders, async () => {
    if (!(await db.folders.get(id)))
      throw new Error("Folder już nie istnieje.");
    await db.folders.update(id, { name: validatedName, updatedAt: now() });
  });
}
export async function createProject(
  input: string,
  folderId: string | null,
  source?: ProjectDocument,
) {
  const document = source ? validateProjectDocument(source) : emptyProject();
  document.name = name(input);
  return db.transaction(
    "rw",
    tables(),
    async () =>
      (
        await writeEntries(
          [{ document, measurements: [], events: [] }],
          folderId,
        )
      )[0],
  );
}
export async function duplicateProject(id: string, input: string) {
  const validatedName = name(input);
  return db.transaction("rw", tables(), async () => {
    const row = await db.projects.get(id);
    if (!row) throw new Error("Projekt już nie istnieje.");
    const saved = readSaved(row, id);
    saved.document.name = validatedName;
    return (await writeEntries([saved], saved.folderId ?? null))[0];
  });
}
export async function editProjectMetadata(
  id: string,
  changes: { name?: string; folderId?: string | null },
) {
  const validatedName =
    changes.name === undefined ? undefined : name(changes.name);
  return db.transaction("rw", tables(), async () => {
    const row = await db.projects.get(id);
    if (!row) throw new LibraryConflictError();
    const saved = readSaved(row, id);
    if (changes.folderId !== undefined) {
      await requireFolder(changes.folderId);
      saved.folderId = changes.folderId;
    }
    if (validatedName !== undefined) {
      saved.name = validatedName;
      saved.document.name = validatedName;
    }
    saved.libraryRevision = (saved.libraryRevision ?? 0) + 1;
    saved.updatedAt = now();
    await db.projects.put(saved);
    return saved;
  });
}
async function removeProjects(ids: string[]) {
  if (!ids.length) return;
  await db.deletedProjects.bulkPut(ids.map((id) => ({ id })));
  await db.projects.bulkDelete(ids);
  const last = await db.settings.get("last-project");
  if (last && ids.includes(last.projectId))
    await db.settings.delete("last-project");
}
export async function deleteProject(id: string) {
  await db.transaction("rw", tables(), () => removeProjects([id]));
}
export async function deleteFolder(id: string, withProjects = false) {
  await db.transaction("rw", tables(), async () => {
    const rows = await db.projects.where("folderId").equals(id).toArray();
    if (withProjects) await removeProjects(rows.map((r) => r.id));
    else
      await db.projects.bulkPut(
        rows.map((r) => ({
          ...r,
          folderId: null,
          libraryRevision: (r.libraryRevision ?? 0) + 1,
        })),
      );
    await db.folders.delete(id);
  });
}
export async function commitImport(plan: ImportPlan, folderId: string | null) {
  // Revalidate even when the plan comes from a caller rather than the preview UI.
  const entries = plan.entries.map((entry) =>
    validateEntry(entrySchema.parse(entry)),
  );
  if (entries.length > libraryLimits.projectsPerFolder)
    throw new Error("Zbyt wiele projektów w paczce.");
  const folderName =
    plan.kind === "folder" ? name(plan.folderName ?? "") : undefined;
  return db.transaction("rw", tables(), async () => {
    let target = folderId;
    if (folderName !== undefined) {
      const folder = {
        id: newId("folder"),
        name: folderName,
        updatedAt: now(),
      };
      await db.folders.add(folder);
      target = folder.id;
    }
    const rows = await writeEntries(entries, target);
    return { folderId: target, rows };
  });
}
function publicEntry(saved: SavedProject): LibraryEntry {
  const original = readSaved(saved, saved.id);
  const protectedAnswers = original.document.faults.some((f) => f.hidden);
  return {
    document: safeExport(original.document),
    measurements: protectedAnswers ? [] : original.measurements,
    events: protectedAnswers ? [] : original.events,
  };
}
export async function exportProject(id: string) {
  const row = await db.projects.get(id);
  if (!row) throw new Error("Projekt już nie istnieje.");
  return encodePackage({
    format: "ele-project",
    version: 1,
    project: publicEntry(row),
  });
}
export async function exportFolder(id: string) {
  return db.transaction("r", db.folders, db.projects, async () => {
    const folder = await db.folders.get(id);
    if (!folder) throw new Error("Folder już nie istnieje.");
    const projects = await db.projects.where("folderId").equals(id).toArray();
    if (projects.length > libraryLimits.projectsPerFolder)
      throw new Error(
        `Eksport paczki obsługuje do ${libraryLimits.projectsPerFolder} projektów. Podziel folder.`,
      );
    return encodePackage({
      format: "ele-folder",
      version: 1,
      folder: { name: folder.name },
      projects: projects.map(publicEntry),
    });
  });
}

function encodePackage(value: unknown) {
  const json = JSON.stringify(value, null, 2);
  if (new TextEncoder().encode(json).byteLength > libraryLimits.importBytes)
    throw new Error(
      "Paczka przekracza limit importu. Podziel folder lub wyeksportuj pojedyncze dokumenty.",
    );
  return json;
}

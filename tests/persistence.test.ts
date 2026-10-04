// @vitest-environment jsdom
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { scenarioProject } from "@training/index";
import { catalog } from "@catalog/index";
import {
  db,
  saveProject,
  restoreProject,
  parseProject,
  listProjects,
  ProjectReadError,
  type SavedProject,
} from "../apps/web/src/persistence";
beforeEach(async () => {
  await db.delete();
  await db.open();
  localStorage.clear();
});
afterEach(async () => {
  vi.restoreAllMocks();
  await db.delete();
});
const row = (document: SavedProject["document"]): SavedProject => ({
  id: document.circuit.projectId,
  name: document.name,
  updatedAt: new Date().toISOString(),
  document,
  measurements: [],
  events: [],
});
describe("persystencja i odzyskiwanie", () => {
  it("zapis i odczyt stosują te same limity co import; błędny dokument nie zastępuje poprawnego", async () => {
    const p = scenarioProject("lamp");
    await saveProject(p, [], []);
    const original = await db.projects.get(p.circuit.projectId);
    for (const kind of ["name", "wire"]) {
      const invalid = structuredClone(p);
      if (kind === "name") invalid.name = "N".repeat(121);
      else invalid.circuit.conductors[0].electricalLengthM = 10001;
      await expect(saveProject(invalid, [], [])).rejects.toThrow();
      expect(() => parseProject(JSON.stringify(invalid))).toThrow();
      expect(await db.projects.get(p.circuit.projectId)).toEqual(original);
    }
    expect((await restoreProject())!.document).toEqual(p);
  });
  it("awaria zapisu snapshotu wycofuje projekt, snapshoty i wskaźnik ostatniego projektu", async () => {
    const p = scenarioProject("lamp");
    await saveProject(p, [], []);
    const original = await db.projects.get(p.circuit.projectId),
      snapshots = await db.snapshots.toArray();
    const modified = structuredClone(p),
      lamp = modified.circuit.devices.find((d) => d.designation === "H1")!;
    lamp.productId = "edu-fan";
    lamp.productRevision = catalog["edu-fan"].revision;
    lamp.settings = { ...catalog["edu-fan"].defaults };
    modified.productRevisions["edu-fan"] = catalog["edu-fan"].revision;
    modified.name = "Zmiana do wycofania";
    const fail = () => {
      throw new Error("Symulowany błąd snapshotu");
    };
    db.snapshots.hook("creating", fail);
    try {
      await expect(saveProject(modified, [], [])).rejects.toThrow(/snapshotu/);
    } finally {
      db.snapshots.hook("creating").unsubscribe(fail);
    }
    expect(await db.projects.get(p.circuit.projectId)).toEqual(original);
    expect(await db.snapshots.toArray()).toEqual(snapshots);
    expect((await restoreProject())!.document).toEqual(p);
  });
  it("niepoprawny istniejący zapis pozostaje nienaruszony, nawet przy próbie nadpisania", async () => {
    const p = scenarioProject("lamp"),
      invalid = structuredClone(p);
    invalid.name = "N".repeat(121);
    const original = row(invalid);
    await db.projects.put(original);
    localStorage.setItem("ele-last-project", original.id);
    let failure: unknown;
    try {
      await restoreProject();
    } catch (e) {
      failure = e;
    }
    expect(failure).toBeInstanceOf(ProjectReadError);
    const recovery = (failure as ProjectReadError).recovery;
    expect(JSON.parse(recovery.json)).toEqual(invalid);
    expect(recovery.message).toMatch(/zachowano.*Pobierz/);
    await expect(saveProject(p, [], [])).rejects.toBeInstanceOf(
      ProjectReadError,
    );
    expect(await db.projects.get(p.circuit.projectId)).toEqual(original);
  });
  it("kopia do odzyskania chroni ukryte odpowiedzi, oryginał w bazie pozostaje pełny", async () => {
    const p = scenarioProject("diagnosis", true);
    p.name = "N".repeat(121);
    const original = row(p);
    original.events = [
      { id: "secret", timeMs: 0, message: "UKRYTA-ODPOWIEDŹ", type: "info" },
    ];
    await db.projects.put(original);
    let error: unknown;
    try {
      await restoreProject(original.id);
    } catch (e) {
      error = e;
    }
    const recovery = (error as ProjectReadError).recovery,
      copy = JSON.parse(recovery.json);
    expect(recovery.protectedAnswers).toBe(true);
    expect(copy.faults).toEqual([]);
    expect(copy.training).toBeUndefined();
    expect(copy.scenarioId).toBeUndefined();
    expect(recovery.json).not.toContain("UKRYTA-ODPOWIEDŹ");
    expect(recovery.json).not.toContain(p.faults[0].id);
    expect(await db.projects.get(original.id)).toEqual(original);
  });
  it("malformed document może być wylistowany i pobrany, bez wyjątku w liście projektów", async () => {
    const original = { ...row(scenarioProject("lamp")), document: null };
    await db.projects.put(original as unknown as SavedProject);
    expect((await listProjects())[0].deviceCount).toBe(0);
    await expect(restoreProject(original.id)).rejects.toBeInstanceOf(
      ProjectReadError,
    );
    expect(await db.projects.get(original.id)).toEqual(original);
  });
  it("migracja v3 zachowuje zapis; wskaźnik Dexie działa także przy błędzie localStorage", async () => {
    await db.delete();
    const legacy = new Dexie(db.name);
    legacy.version(3).stores({
      projects: "id, name, updatedAt",
      research: "id, importedAt",
      snapshots: "id",
    });
    const p = scenarioProject("lamp");
    await legacy.table("projects").put(row(p));
    legacy.close();
    localStorage.setItem("ele-last-project", p.circuit.projectId);
    await db.open();
    expect((await restoreProject())!.document).toEqual(p);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage blocked");
    });
    p.name = "Zapis po migracji";
    await saveProject(p, [], []);
    expect((await restoreProject())!.document).toEqual(p);
    expect(await db.snapshots.count()).toBe(
      Object.keys(p.productRevisions).length,
    );
  });
});

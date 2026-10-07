// @vitest-environment jsdom
import { distributionGeometry, mountInDistribution } from "@model/distribution";
import { catalog } from "@catalog/index";
import { mountingInfo } from "@catalog/mounting-profiles";
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { scenarioProject } from "@training/index";
import { measure, type MeasurementRecord } from "@measurements/index";
import { initialRuntime } from "@simulation/index";
import {
  db,
  ProjectReadError,
  restoreProject,
  saveProject,
} from "../apps/web/src/persistence";
import {
  commitImport,
  createFolder,
  createProject,
  deleteFolder,
  deleteProject,
  duplicateProject,
  editProjectMetadata,
  exportFolder,
  exportProject,
  parseLibraryImport,
  renameFolder,
} from "../apps/web/src/library";

beforeEach(async () => {
  await db.delete();
  await db.open();
  localStorage.clear();
});
afterEach(async () => {
  await db.delete();
});
function record(
  document: ReturnType<typeof scenarioProject>,
): MeasurementRecord {
  const g = document.circuit.devices.find((d) => d.designation === "G1")!,
    h = document.circuit.devices.find((d) => d.designation === "H1")!;
  const parameters = {
    function: "continuity" as const,
    testVoltageV: 500 as const,
    rcdMultiplier: 1 as const,
    compensateLeads: true,
  };
  const red = { deviceId: g.id, terminalId: "PE" },
    black = { deviceId: h.id, terminalId: "PE" };
  return {
    id: "measurement-1",
    function: "continuity",
    parameters,
    red,
    black,
    revision: document.circuit.revision,
    timeMs: 0,
    energized: false,
    result: measure(document, initialRuntime(document), {
      ...parameters,
      red,
      black,
    }),
  };
}
const event = {
  id: "event-1",
  timeMs: 0,
  message: "Zapisane zdarzenie",
  type: "info" as const,
};
describe("biblioteka projektów", () => {
  it("migracja v4 przenosi poprawne i uszkodzone zapisy do Bez folderu, zachowując dokument, pomiary, zdarzenia, snapshoty i wskaźnik", async () => {
    await db.delete();
    const legacy = new Dexie(db.name);
    legacy.version(4).stores({
      projects: "id, name, updatedAt",
      research: "id, importedAt",
      snapshots: "id",
      settings: "id",
    });
    const document = scenarioProject("lamp");
    const good = {
      id: document.circuit.projectId,
      name: document.name,
      updatedAt: "2026-10-01T12:00:00.000Z",
      document,
      measurements: [record(document)],
      events: [event],
    };
    const broken = { ...structuredClone(good), id: "broken", document: null };
    await legacy.table("projects").bulkAdd([good, broken]);
    await legacy
      .table("snapshots")
      .put({ id: "preserved", product: { test: true } });
    await legacy
      .table("settings")
      .put({ id: "last-project", projectId: good.id });
    legacy.close();
    await db.open();
    expect(await db.projects.get(good.id)).toEqual({
      ...good,
      folderId: null,
      libraryRevision: 0,
    });
    expect(await db.projects.get("broken")).toEqual({
      ...broken,
      folderId: null,
      libraryRevision: 0,
    });
    expect((await restoreProject())!.measurements).toEqual(good.measurements);
    expect(await db.snapshots.get("preserved")).toEqual({
      id: "preserved",
      product: { test: true },
    });
  });
  it("folder i nazwa przetrwają autosave; opóźniony zapis sprzed przeniesienia/zmiany nazwy jest odrzucony", async () => {
    const folder = await createFolder("Projekty do egzaminu"),
      row = await createProject("Układ", folder.id, scenarioProject("lamp"));
    await saveProject(row.document, [record(row.document)], [event], true, 0);
    expect((await restoreProject(row.id))!.folderId).toBe(folder.id);
    const before = structuredClone(row.document);
    const edited = await editProjectMetadata(row.id, {
      name: "Ostatni egzamin",
      folderId: null,
    });
    await expect(saveProject(before, [], [], true, 0)).rejects.toThrow(
      /opóźniony zapis/,
    );
    expect((await restoreProject(row.id))!.document.name).toBe(
      "Ostatni egzamin",
    );
    edited.document.circuit.revision++;
    await saveProject(
      edited.document,
      edited.measurements,
      edited.events,
      true,
      edited.libraryRevision,
    );
    const restored = await restoreProject();
    expect(restored!.folderId).toBeNull();
    expect(restored!.measurements).toHaveLength(1);
    expect(restored!.events).toEqual([event]);
  });
  it("duplikat zachowuje układ i pomiary, ma nowe ID i jest niezależny od oryginału", async () => {
    const folder = await createFolder("Egzamin"),
      source = scenarioProject("lamp");
    const original = structuredClone(source);
    const row = await createProject("Oryginał", folder.id, source);
    expect(source).toEqual(original);
    await saveProject(row.document, [record(row.document)], [event]);
    const copy = await duplicateProject(row.id, "Duplikat");
    expect(copy.id).not.toBe(row.id);
    expect(copy.folderId).toBe(folder.id);
    expect(copy.measurements).toHaveLength(1);
    copy.document.circuit.conductors.pop();
    await saveProject(copy.document, copy.measurements, copy.events);
    expect((await restoreProject(row.id))!.document.circuit.conductors).toEqual(
      row.document.circuit.conductors,
    );
  });
  it("konflikty ID w importach, również wewnątrz paczki, zawsze tworzą nowe projekty", async () => {
    const row = await createProject("Oryginał", null, scenarioProject("lamp"));
    const plan = parseLibraryImport(JSON.stringify(row.document));
    const result = await commitImport(plan, null);
    const pack = parseLibraryImport(
      JSON.stringify({
        format: "ele-folder",
        version: 1,
        folder: { name: "Powtórki" },
        projects: [result.rows[0], result.rows[0]].map(({ document }) => ({
          document,
        })),
      }),
    );
    const imported = await commitImport(pack, null);
    expect(
      new Set([row.id, result.rows[0].id, ...imported.rows.map((r) => r.id)])
        .size,
    ).toBe(4);
    expect((await restoreProject(row.id))!.document).toEqual(row.document);
  });
  it("zły format, wersja, produkt, rewizja i zacisk są odrzucane bez utraty danych", async () => {
    const row = await createProject("Oryginał", null, scenarioProject("lamp")),
      before = await db.projects.toArray();
    const invalids: unknown[] = [
      "not-json",
      { format: "ele-folder", version: 2 },
      { format: "wrong", version: 1 },
    ];
    for (const field of ["product", "revision", "terminal"]) {
      const document = structuredClone(row.document);
      if (field === "product")
        document.circuit.devices[0].productId = "unknown-sku";
      if (field === "revision")
        document.circuit.devices[0].productRevision = "unknown-rev";
      if (field === "terminal")
        document.circuit.conductors[0].from.terminalId = "missing-terminal";
      invalids.push(document);
    }
    for (const invalid of invalids)
      expect(() =>
        parseLibraryImport(
          typeof invalid === "string" ? invalid : JSON.stringify(invalid),
        ),
      ).toThrow();
    expect(await db.projects.toArray()).toEqual(before);
    expect(await db.folders.count()).toBe(0);
  });
  it("folder importowany atomowo: invalid entry i awaria snapshotu nie zostawiają folderu ani części projektów", async () => {
    const document = scenarioProject("lamp"),
      invalid = structuredClone(document);
    invalid.name = "N".repeat(121);
    await expect(
      commitImport(
        {
          kind: "folder",
          folderName: "Invalid",
          entries: [
            { document, measurements: [], events: [] },
            { document: invalid, measurements: [], events: [] },
          ],
        },
        null,
      ),
    ).rejects.toThrow();
    const plan = parseLibraryImport(
      JSON.stringify({
        format: "ele-folder",
        version: 1,
        folder: { name: "Valid" },
        projects: [{ document }, { document }],
      }),
    );
    const fail = () => {
      throw new Error("Snapshot failure");
    };
    db.snapshots.hook("creating", fail);
    try {
      await expect(commitImport(plan, null)).rejects.toThrow(
        /Snapshot failure/,
      );
    } finally {
      db.snapshots.hook("creating").unsubscribe(fail);
    }
    expect(await db.projects.count()).toBe(0);
    expect(await db.folders.count()).toBe(0);
    expect(await db.snapshots.count()).toBe(0);
  });
  it("eksport/import folderu zachowuje połączenia, pomiary i zdarzenia; oryginały pozostają", async () => {
    const folder = await createFolder("Egzamin"),
      row = await createProject("Układ", folder.id, scenarioProject("lamp"));
    await saveProject(row.document, [record(row.document)], [event]);
    const result = await commitImport(
      parseLibraryImport(await exportFolder(folder.id)),
      null,
    );
    expect(result.folderId).not.toBe(folder.id);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].document.circuit.conductors).toEqual(
      row.document.circuit.conductors,
    );
    expect(result.rows[0].measurements).toEqual([record(row.document)]);
    expect(result.rows[0].events).toEqual([event]);
    const single = parseLibraryImport(await exportProject(row.id));
    expect(single.entries[0].measurements).toHaveLength(1);
    expect(await db.projects.count()).toBe(2);
  });
  it("eksport ukrytej diagnozy usuwa usterki i odpowiedzi także z logów/pomiarów, nie zmieniając zapisu", async () => {
    const folder = await createFolder("Diagnoza"),
      row = await createProject(
        "Ukryte",
        folder.id,
        scenarioProject("diagnosis", true),
      );
    await saveProject(row.document, [], [{ ...event, message: "SECRET" }]);
    const json = await exportFolder(folder.id),
      plan = parseLibraryImport(json);
    expect(json).not.toContain("SECRET");
    expect(plan.entries[0].document.faults).toEqual([]);
    expect(plan.entries[0].document.training).toBeUndefined();
    expect(plan.entries[0].events).toEqual([]);
    expect((await restoreProject(row.id))!.events[0].message).toBe("SECRET");
  });
  it("usunięcie folderu domyślnie zachowuje nawet nieczytelne projekty; usunięcie projektów blokuje spóźnione autosave", async () => {
    const folder = await createFolder("Test"),
      row = await createProject("Układ", folder.id, scenarioProject("lamp"));
    await renameFolder(folder.id, "Nowa nazwa");
    await db.projects.add({
      ...row,
      id: "broken",
      document: null,
    } as unknown as typeof row);
    await deleteFolder(folder.id);
    expect((await restoreProject(row.id))!.folderId).toBeNull();
    await expect(restoreProject("broken")).rejects.toBeInstanceOf(
      ProjectReadError,
    );
    expect((await db.projects.get("broken"))!.folderId).toBeNull();
    await deleteProject(row.id);
    await expect(saveProject(row.document, [], [], true, 0)).rejects.toThrow(
      /opóźniony zapis/,
    );
    expect(await db.projects.get(row.id)).toBeUndefined();
    const other = await createFolder("Usuwanie");
    const r = await createProject("Kasowany", other.id);
    await deleteFolder(other.id, true);
    await expect(saveProject(r.document, [], [])).rejects.toThrow();
    expect(await db.projects.get(r.id)).toBeUndefined();
  });
  it("nazwy i foldery są walidowane domenowo; operacje odrzucają brakujący folder", async () => {
    await expect(createFolder(" ")).rejects.toThrow();
    await expect(createFolder("N".repeat(121))).rejects.toThrow();
    await expect(createProject("Test", "missing")).rejects.toThrow();
    const row = await createProject("Układ", null);
    await expect(
      editProjectMetadata(row.id, {
        name: "N".repeat(121),
        folderId: "missing",
      }),
    ).rejects.toThrow();
    expect((await restoreProject(row.id))!.name).toBe("Układ");
  });
  it("udokumentowane przykładowe JSON-y przechodzą rzeczywistą walidację i otwierają się jako nowe projekty", async () => {
    for (const path of [
      "examples/import/minimal-project.json",
      "examples/import/exam-folder.json",
    ]) {
      const plan = parseLibraryImport(readFileSync(path, "utf8"));
      const result = await commitImport(plan, null);
      expect(result.rows.length).toBeGreaterThan(0);
      for (const row of result.rows)
        expect((await restoreProject(row.id))!.document).toEqual(row.document);
    }
  });
});

it("rozmieszczenie rozdzielnicy przechodzi zapis, odczyt, import projektu oraz całego folderu z pomiarami", async () => {
  const p = scenarioProject("lamp");
  const id = "modular-case";
  (p.physical.enclosures ??= []).push({
    id,
    name: "R1",
    kind: "distribution",
    position: { x: 1400, y: 100 },
    ...distributionGeometry(2, 12),
    closed: false,
    deviceIds: [],
    distribution: {
      profileId: "edu-modular-v1",
      revision: "1",
      rows: 2,
      modulesPerRow: 12,
      reserve: 4,
      placements: {},
    },
  });
  const d = p.circuit.devices.find(
    (d) => catalog[d.productId].behaviorId === "mcb",
  )!;
  mountInDistribution(
    p,
    id,
    d.id,
    "modules",
    1,
    (id) => mountingInfo(catalog[id]),
    3,
  );
  const folder = await createFolder("Rozdzielnice");
  const row = await createProject("Rozdzielnica", folder.id, p);
  const records = [record(row.document)];
  await saveProject(row.document, records, [event]);
  const restored = (await restoreProject(row.id))!;
  expect(restored.document.physical).toEqual(row.document.physical);
  expect((await db.projects.get(row.id))!.folderId).toBe(folder.id);
  expect(restored.measurements).toEqual(records);
  const imported = await commitImport(
    parseLibraryImport(await exportProject(row.id)),
    null,
  );
  expect(imported.rows[0].document.physical).toEqual(row.document.physical);
  const pack = await commitImport(
    parseLibraryImport(await exportFolder(folder.id)),
    null,
  );
  expect(pack.rows[0].document.physical).toEqual(row.document.physical);
  expect(pack.rows[0].measurements).toEqual(records);
  const corrupted = JSON.parse(await exportFolder(folder.id));
  corrupted.projects[0].document.physical.enclosures[0].distribution.placements[
    d.id
  ].slot = 12;
  const before = await db.projects.toArray();
  expect(() => parseLibraryImport(JSON.stringify(corrupted))).toThrow();
  expect(await db.projects.toArray()).toEqual(before);
});

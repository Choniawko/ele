import { useEffect, useState } from "react";
import {
  Folder,
  Plus,
  Search,
  Upload,
  Copy,
  Download,
  Eye,
  Pencil,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { DevicePhysical, MM } from "@renderers/index";
import { catalog } from "@catalog/index";
import {
  emptyProject,
  projectLimits,
  type ProjectDocument,
} from "@model/index";
import { scenarios, scenarioProject } from "@training/index";
import {
  db,
  listProjects,
  restoreProject,
  type SavedProjectSummary,
  type ProjectFolder,
  type SavedProject,
} from "./persistence";
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
  libraryLimits,
  parseLibraryImport,
  renameFolder,
  type ImportPlan,
} from "./library";
import { useApp } from "./store";

function download(name: string, json: string) {
  const url = URL.createObjectURL(
    new Blob([json], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ProjectMiniature({
  project,
}: {
  project: ProjectDocument | null;
}) {
  if (!project)
    return (
      <div className="project-miniature empty">
        Nieczytelny zapis · dostępna kopia do odzyskania
      </div>
    );
  const devices = project.circuit.devices;
  const bounds = devices.map((d) => ({
    d,
    p: project.physical.devices[d.id] ?? { x: 0, y: 0 },
    shape: catalog[d.productId]?.dimensions.value,
  }));
  const minX = Math.min(0, ...bounds.map(({ p }) => p.x)),
    minY = Math.min(0, ...bounds.map(({ p }) => p.y));
  const width =
    Math.max(
      600,
      ...bounds.map(({ p, shape }) => p.x + (shape?.width ?? 100) * MM + 30),
    ) - minX;
  const height =
    Math.max(
      300,
      ...bounds.map(({ p, shape }) => p.y + (shape?.height ?? 100) * MM + 30),
    ) - minY;
  const terminal = (deviceId: string, terminalId: string) => {
    const b = bounds.find(({ d }) => d.id === deviceId);
    const t =
      b &&
      catalog[b.d.productId]?.topology.terminals.find(
        (t) => t.id === terminalId,
      );
    return {
      x: (b?.p.x ?? 0) + (t?.x ?? 0) * MM,
      y: (b?.p.y ?? 0) + (t?.y ?? 0) * MM,
    };
  };
  return (
    <svg
      className="project-miniature"
      role="img"
      aria-label={`Miniatura: ${project.name}`}
      viewBox={`${minX - 20} ${minY - 20} ${width + 40} ${height + 40}`}
    >
      <rect
        x={minX - 20}
        y={minY - 20}
        width={width + 40}
        height={height + 40}
        fill="#eef2e9"
      />
      {(project.physical.rails ?? []).map((r) => (
        <rect
          key={r.id}
          x={r.x}
          y={r.y}
          width={r.width}
          height="20"
          fill="#bcc8bc"
        />
      ))}
      {project.circuit.conductors.map((w) => {
        const a = terminal(w.from.deviceId, w.from.terminalId),
          b = terminal(w.to.deviceId, w.to.terminalId);
        const points = [
          a,
          ...(project.physical.routes[w.id] ?? [{ x: a.x, y: b.y }]),
          b,
        ];
        return (
          <polyline
            key={w.id}
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={w.insulationColor}
            strokeWidth="5"
          />
        );
      })}
      {bounds.map(({ d, p }) => (
        <g key={d.id} transform={`translate(${p.x},${p.y})`}>
          <DevicePhysical product={catalog[d.productId]} device={d} thumbnail />
        </g>
      ))}
      {!devices.length && (
        <text x="60" y="160" fontSize="28" fill="#5e735e">
          Pusta tablica
        </text>
      )}
    </svg>
  );
}
type Form = {
  kind: "folder" | "rename-folder" | "new" | "example" | "rename" | "duplicate";
  id?: string;
  name: string;
};
export function MyProjects({
  onClose,
  onExamples,
  onTraining,
  initialImport = false,
}: {
  onClose: () => void;
  onExamples: () => void;
  onTraining: () => void;
  initialImport?: boolean;
}) {
  const [folders, setFolders] = useState<ProjectFolder[]>([]),
    [projects, setProjects] = useState<SavedProjectSummary[]>([]);
  const [scope, setScope] = useState("all"),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("date"),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [preview, setPreview] = useState<SavedProject | null>(null),
    [form, setForm] = useState<Form | null>(null),
    [exampleId, setExampleId] = useState(scenarios[0].id);
  const [importing, setImporting] = useState(initialImport),
    [json, setJson] = useState(""),
    [plan, setPlan] = useState<ImportPlan | null>(null);
  const [confirmation, setConfirmation] = useState<{
      kind: "project" | "folder";
      id: string;
      name: string;
    } | null>(null),
    [withProjects, setWithProjects] = useState(false);
  const current = useApp((s) => s.project),
    notice = useApp((s) => s.notice);
  const target = scope === "all" || scope === "none" ? null : scope;
  const folder = folders.find((f) => f.id === scope);
  async function refresh() {
    const [p, f] = await Promise.all([
      listProjects(),
      db.folders.orderBy("name").toArray(),
    ]);
    setProjects(p);
    setFolders(f);
  }
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        if (useApp.getState().saveStatus !== "error") {
          try {
            await useApp.getState().flushSave();
          } catch (e) {
            if (alive) setError(e instanceof Error ? e.message : String(e));
          }
        }
        if (alive) await refresh();
      } catch (e) {
        if (alive) setError(String(e instanceof Error ? e.message : e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  async function run(action: () => Promise<void>, flush = true) {
    setBusy(true);
    setError("");
    try {
      if (flush && useApp.getState().saveStatus !== "error")
        await useApp.getState().flushSave();
      await action();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  function open(row: SavedProject) {
    useApp
      .getState()
      .load(
        row.document,
        row.measurements,
        row.events,
        row.libraryRevision,
        true,
      );
    onClose();
  }
  async function syncCurrent() {
    const row = await restoreProject(
      useApp.getState().project.circuit.projectId,
    );
    if (row)
      useApp
        .getState()
        .load(
          row.document,
          row.measurements,
          row.events,
          row.libraryRevision,
          true,
        );
    else useApp.getState().load(emptyProject(), [], [], 0, true);
  }
  const shown = projects
    .filter(
      (p) =>
        (scope === "all" ||
          (scope === "none" ? p.folderId === null : p.folderId === scope)) &&
        p.name.toLocaleLowerCase("pl").includes(query.toLocaleLowerCase("pl")),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name, "pl")
        : b.updatedAt.localeCompare(a.updatedAt),
    );
  const changeScope = (id: string) => {
    setScope(id);
    setPreview(null);
    setForm(null);
    setImporting(false);
    setConfirmation(null);
    setError("");
  };
  return (
    <div className="project-library" aria-busy={busy || loading}>
      <aside className="library-sidebar">
        <button
          className={scope === "all" ? "active" : ""}
          onClick={() => changeScope("all")}
        >
          Wszystkie projekty <span>{projects.length}</span>
        </button>
        <button
          className={scope === "none" ? "active" : ""}
          onClick={() => changeScope("none")}
        >
          Bez folderu{" "}
          <span>{projects.filter((p) => p.folderId === null).length}</span>
        </button>
        <h3>Foldery</h3>
        {folders.map((f) => (
          <button
            key={f.id}
            className={scope === f.id ? "active" : ""}
            onClick={() => changeScope(f.id)}
          >
            <Folder size={16} />
            {f.name}
            <span>{projects.filter((p) => p.folderId === f.id).length}</span>
          </button>
        ))}
        <button onClick={() => setForm({ kind: "folder", name: "" })}>
          <Plus size={16} />
          Nowy folder
        </button>
        <p>
          Projekty są zapisane tylko w tej przeglądarce. Eksportuj kopie
          zapasowe.
        </p>
        <button onClick={onExamples}>Przykłady</button>
        <button onClick={onTraining}>Ćwiczenia</button>
      </aside>
      <main className="library-main">
        <div className="library-heading">
          <h3>
            {folder?.name ??
              (scope === "none" ? "Bez folderu" : "Wszystkie projekty")}
          </h3>
          {folder && (
            <div className="library-actions">
              <button
                onClick={() =>
                  setForm({
                    kind: "rename-folder",
                    id: folder.id,
                    name: folder.name,
                  })
                }
              >
                Zmień nazwę folderu
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  void run(async () =>
                    download("folder-ele.json", await exportFolder(folder.id)),
                  )
                }
              >
                <Download size={14} />
                Eksportuj folder
              </button>
              <button
                onClick={() => {
                  setConfirmation({
                    kind: "folder",
                    id: folder.id,
                    name: folder.name,
                  });
                  setWithProjects(false);
                }}
              >
                Usuń folder
              </button>
            </div>
          )}
        </div>
        <div className="library-actions">
          <button
            onClick={() => {
              setForm({ kind: "new", name: "Nowy projekt" });
              setPreview(null);
            }}
          >
            <Plus size={15} />
            Nowy projekt
          </button>
          <button
            onClick={() => {
              setImporting(true);
              setPlan(null);
              setPreview(null);
              setForm(null);
            }}
          >
            <Upload size={15} />
            Importuj JSON
          </button>
          <button
            onClick={() => {
              setForm({ kind: "example", name: "Kopia przykładu" });
              setPreview(null);
            }}
          >
            <Copy size={15} />
            Kopiuj przykład
          </button>
        </div>
        {target === null && (
          <p className="small-help">
            Nowe projekty trafią do „Bez folderu”. Wybierz folder z lewej, aby
            zapisać je w nim.
          </p>
        )}
        {error && (
          <p className="library-error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status">Wczytywanie projektów…</p>
        ) : (
          <>
            {form && (
              <form
                className="library-form"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    if (form.kind === "folder") {
                      const f = await createFolder(form.name);
                      setScope(f.id);
                    } else if (form.kind === "rename-folder")
                      await renameFolder(form.id!, form.name);
                    else if (form.kind === "new" || form.kind === "example") {
                      const row = await createProject(
                        form.name,
                        target,
                        form.kind === "example"
                          ? scenarioProject(exampleId)
                          : undefined,
                      );
                      open(row);
                    } else if (form.kind === "duplicate")
                      await duplicateProject(form.id!, form.name);
                    else {
                      await editProjectMetadata(form.id!, { name: form.name });
                      if (form.id === current.circuit.projectId)
                        await syncCurrent();
                    }
                    setForm(null);
                  });
                }}
              >
                <h4>
                  {
                    {
                      folder: "Nowy folder",
                      "rename-folder": "Zmień nazwę folderu",
                      new: "Nowy projekt",
                      example: "Kopiuj przykład",
                      rename: "Zmień nazwę projektu",
                      duplicate: "Duplikuj projekt",
                    }[form.kind]
                  }
                </h4>
                <label>
                  {form.kind.includes("folder")
                    ? "Nazwa folderu"
                    : "Nazwa nowego projektu"}
                  <input
                    autoFocus
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    pattern={`.{1,${projectLimits.name.maxLength}}`}
                  />
                </label>
                {form.kind === "example" && (
                  <label>
                    Przykład
                    <select
                      aria-label="Przykład"
                      value={exampleId}
                      onChange={(e) => setExampleId(e.target.value)}
                    >
                      {scenarios.map((s) => (
                        <option value={s.id} key={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <p className="small-help">
                  Miejsce: {folder?.name ?? "Bez folderu"}
                </p>
                <button
                  className="primary-button"
                  disabled={busy}
                  type="submit"
                >
                  Zapisz
                </button>
                <button type="button" onClick={() => setForm(null)}>
                  Anuluj
                </button>
              </form>
            )}
            {confirmation && (
              <div
                className="library-form"
                role="group"
                aria-label="Potwierdzenie usunięcia"
              >
                <h4>Usunąć „{confirmation.name}”?</h4>
                {confirmation.kind === "folder" ? (
                  <>
                    <p>
                      Domyślnie projekty zostaną przeniesione do „Bez folderu”.
                    </p>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={withProjects}
                        onChange={(e) => setWithProjects(e.target.checked)}
                      />
                      Usuń także wszystkie projekty z folderu — nie można tego
                      cofnąć
                    </label>
                  </>
                ) : (
                  <p>
                    Usunięcie projektu jest trwałe. Wcześniej możesz pobrać jego
                    JSON.
                  </p>
                )}
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      if (confirmation.kind === "project")
                        await deleteProject(confirmation.id);
                      else {
                        await deleteFolder(confirmation.id, withProjects);
                        setScope("none");
                      }
                      await syncCurrent();
                      setPreview(null);
                      setConfirmation(null);
                    })
                  }
                >
                  {confirmation.kind === "folder" && withProjects
                    ? "Potwierdzam usunięcie folderu i projektów"
                    : "Potwierdź usunięcie"}
                </button>
                <button onClick={() => setConfirmation(null)}>Anuluj</button>
              </div>
            )}
            {importing && (
              <div className="library-form">
                <h4>Import projektu lub folderu</h4>
                <label>
                  Plik JSON
                  <input
                    type="file"
                    accept=".json,application/json"
                    aria-label="Plik JSON"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setPlan(null);
                      setError("");
                      try {
                        if (file.size > libraryLimits.importBytes)
                          throw new Error("Limit importu: 20 MB.");
                        setJson(await file.text());
                      } catch (e) {
                        setError(String(e));
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
                <label>
                  Treść JSON
                  <textarea
                    aria-label="Treść JSON"
                    rows={6}
                    value={json}
                    onChange={(e) => {
                      setJson(e.target.value);
                      setPlan(null);
                    }}
                  />
                </label>
                <button
                  onClick={() => {
                    setError("");
                    setPlan(null);
                    try {
                      setPlan(parseLibraryImport(json));
                    } catch (e) {
                      setError(e instanceof Error ? e.message : String(e));
                    }
                  }}
                >
                  Sprawdź import
                </button>
                <button onClick={() => setImporting(false)}>Anuluj</button>
                {plan && (
                  <div className="import-summary" role="status">
                    <strong>
                      {plan.kind === "folder"
                        ? `Nowy folder: ${plan.folderName}`
                        : `Miejsce: ${folder?.name ?? "Bez folderu"}`}
                    </strong>
                    <p>
                      {plan.entries.length} projektów ·{" "}
                      {plan.entries.reduce(
                        (n, e) => n + e.document.circuit.devices.length,
                        0,
                      )}{" "}
                      aparatów. Wszystkie produkty, rewizje i zaciski są zgodne
                      z katalogiem. Każdy projekt otrzyma nowe ID.
                    </p>
                    <ul>
                      {plan.entries.map((e, i) => (
                        <li key={i}>
                          {e.document.name} ·{" "}
                          {e.document.circuit.devices.length} aparatów ·{" "}
                          {e.measurements.length} pomiarów
                        </li>
                      ))}
                    </ul>
                    <button
                      className="primary-button"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const result = await commitImport(plan, target);
                          setScope(result.folderId ?? "none");
                          setImporting(false);
                          setPlan(null);
                          setJson("");
                        })
                      }
                    >
                      Importuj jako nowe
                    </button>
                  </div>
                )}
              </div>
            )}
            {preview ? (
              <section className="library-preview">
                <button onClick={() => setPreview(null)}>
                  <ArrowLeft size={16} />
                  Wróć do listy
                </button>
                <h3>{preview.name}</h3>
                <ProjectMiniature project={preview.document} />
                <p>
                  {preview.document.circuit.devices.length} aparatów ·{" "}
                  {preview.document.circuit.conductors.length} przewodów ·{" "}
                  {preview.measurements.length} zapisanych pomiarów. Podgląd nie
                  zmienia projektu.
                </p>
                <button
                  className="primary-button"
                  onClick={() =>
                    void run(async () => {
                      const row = await restoreProject(preview.id);
                      if (!row) throw new Error("Projekt już nie istnieje.");
                      open(row);
                    })
                  }
                >
                  Otwórz w edytorze
                </button>
              </section>
            ) : (
              <>
                <div className="library-search">
                  <label>
                    <Search size={16} />
                    <input
                      aria-label="Szukaj projektów"
                      placeholder="Szukaj po nazwie…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <select
                    aria-label="Sortowanie projektów"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="date">Ostatnio zmienione</option>
                    <option value="name">Nazwa A–Z</option>
                  </select>
                </div>
                {!shown.length && (
                  <p className="empty-state">
                    {query
                      ? "Brak pasujących projektów."
                      : "Ten widok jest pusty. Utwórz projekt, importuj JSON lub skopiuj przykład."}
                  </p>
                )}
                <div className="project-cards">
                  {shown.map((p) => (
                    <article
                      className="project-card"
                      key={p.id}
                      data-project-id={p.id}
                    >
                      <button
                        className="saved-project"
                        onClick={() =>
                          void run(async () => {
                            try {
                              const row = await restoreProject(p.id);
                              if (!row)
                                throw new Error("Projekt już nie istnieje.");
                              setPreview(row);
                            } catch (e) {
                              useApp.getState().reportReadError(e);
                              onClose();
                            }
                          }, false)
                        }
                      >
                        <ProjectMiniature project={p.document} />
                        <strong>{p.name}</strong>
                        <small>
                          {p.deviceCount} aparatów ·{" "}
                          {new Date(p.updatedAt).toLocaleString("pl-PL", {
                            timeZone: "Europe/Warsaw",
                          })}
                        </small>
                        <span>
                          <Eye size={14} />
                          Podgląd
                        </span>
                      </button>
                      <div className="card-actions">
                        <button
                          aria-label={`Zmień nazwę ${p.name}`}
                          onClick={() =>
                            setForm({ kind: "rename", id: p.id, name: p.name })
                          }
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          aria-label={`Duplikuj ${p.name}`}
                          onClick={() =>
                            setForm({
                              kind: "duplicate",
                              id: p.id,
                              name: p.name,
                            })
                          }
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          aria-label={`Eksportuj ${p.name}`}
                          disabled={busy}
                          onClick={() =>
                            void run(async () =>
                              download(
                                "projekt-ele.json",
                                await exportProject(p.id),
                              ),
                            )
                          }
                        >
                          <Download size={15} />
                        </button>
                        <button
                          aria-label={`Usuń ${p.name}`}
                          onClick={() =>
                            setConfirmation({
                              kind: "project",
                              id: p.id,
                              name: p.name,
                            })
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <select
                        aria-label={`Folder projektu ${p.name}`}
                        disabled={busy}
                        value={p.folderId ?? "none"}
                        onChange={(e) => {
                          const folderId =
                            e.target.value === "none" ? null : e.target.value;
                          void run(async () => {
                            await editProjectMetadata(p.id, { folderId });
                            if (p.id === current.circuit.projectId)
                              await syncCurrent();
                          });
                        }}
                      >
                        <option value="none">Bez folderu</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </article>
                  ))}
                </div>
              </>
            )}
            <div className="project-rename">
              <label>
                Nazwa bieżącego projektu
                <input
                  key={`${current.circuit.projectId}:${current.name}`}
                  aria-label="Nazwa projektu"
                  defaultValue={current.name}
                  pattern={`.{1,${projectLimits.name.maxLength}}`}
                  onBlur={(e) => {
                    useApp.getState().rename(e.target.value);
                    e.currentTarget.value = useApp.getState().project.name;
                  }}
                />
              </label>
              <p className="small-help" role="status">
                {notice}
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

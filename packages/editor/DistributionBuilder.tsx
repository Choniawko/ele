import { useMemo, useState } from "react";
import { useApp, type MountingTarget } from "@/store";
import { catalog, availableProducts } from "@catalog/index";
import { mountingInfo } from "@catalog/mounting-profiles";
import {
  validateProjectDocument,
  validationMessage,
} from "@catalog/project-validation";
import {
  distributionGeometry,
  placementPoint,
  distributionLimits,
  distributionProfile,
  enclosureWindows,
  previewDistribution,
  rowOccupancy,
} from "@model/distribution";
import { projectLimits, type PhysicalEnclosure } from "@model/index";
const resolve = (id: string) => mountingInfo(catalog[id]);
function Capacity({ enclosure: e }: { enclosure: PhysicalEnclosure }) {
  const project = useApp((s) => s.project),
    target = useApp((s) => s.mountingTarget);
  const config = e.distribution!;
  const used = Array.from({ length: config.rows }, (_, row) =>
    rowOccupancy(project, e, "modules", row, resolve),
  );
  const free =
    config.rows * config.modulesPerRow -
    used.reduce((n, row) => n + row.size, 0);
  return (
    <div className="distribution-capacity" aria-label={`Pojemność ${e.name}`}>
      {[
        ...Array.from({ length: config.rows }, (_, row) => ({
          zone: "modules" as const,
          row,
        })),
        ...Array.from(
          { length: distributionProfile.terminalRows },
          (_, row) => ({ zone: "terminals" as const, row }),
        ),
      ].map((at) => {
        const count = rowOccupancy(project, e, at.zone, at.row, resolve).size;
        return (
          <button
            key={`${at.zone}-${at.row}`}
            aria-pressed={
              target?.enclosureId === e.id &&
              target.zone === at.zone &&
              target.row === at.row
            }
            onClick={() =>
              useApp.getState().setMountingTarget({ enclosureId: e.id, ...at })
            }
          >
            {at.zone === "modules"
              ? `Rząd ${at.row + 1}`
              : `Przyłącza ${at.row + 1}`}{" "}
            · {count}/{config.modulesPerRow} pól
          </button>
        );
      })}
      <span>
        {free} wolnych pól · rezerwa: {config.reserve}
        {free < config.reserve ? " — poniżej założenia" : ""}
      </span>
    </div>
  );
}
export function DistributionBuilder() {
  const project = useApp((s) => s.project),
    selected = useApp((s) => s.selection),
    target = useApp((s) => s.mountingTarget),
    focused = useApp((s) => s.focusedEnclosureId),
    notice = useApp((s) => s.notice);
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("R1"),
    [rows, setRows] = useState(1),
    [modules, setModules] = useState<8 | 12>(12),
    [reserve, setReserve] = useState(0),
    [x, setX] = useState(120),
    [y, setY] = useState(100),
    [slot, setSlot] = useState(1),
    [product, setProduct] = useState("hager-mbn116e");
  const cases =
    project.physical.enclosures?.filter((e) => e.distribution) ?? [];
  const e =
    cases.find((e) => e.id === (focused ?? target?.enclosureId)) ??
    cases.find((e) => selected.includes(e.id));
  const devices = selected.filter((id) =>
    project.circuit.devices.some((d) => d.id === id),
  );
  const preview = useMemo(() => {
    if (!open || !editing) return { error: "" };
    try {
      const draft = validateProjectDocument(
        previewDistribution(project, editing, rows, modules, reserve, name),
      );
      return {
        error: "",
        enclosure: draft.physical.enclosures!.find((e) => e.id === editing),
      };
    } catch (error) {
      return { error: validationMessage(error) };
    }
  }, [project, editing, rows, modules, reserve, name, open]);
  const geometry = distributionGeometry(rows, modules);
  const begin = (edit: boolean) => {
    setEditing(edit && e ? e.id : null);
    setName(edit && e ? e.name : `R${cases.length + 1}`);
    setRows(edit && e ? e.distribution!.rows : 1);
    setModules(edit && e ? e.distribution!.modulesPerRow : 12);
    setReserve(edit && e ? e.distribution!.reserve : 0);
    setOpen(true);
  };
  const activeTarget: MountingTarget | null =
    e && target?.enclosureId === e.id ? target : null;
  const choices = availableProducts.filter(
    (p) => mountingInfo(p).zone === activeTarget?.zone && !!activeTarget,
  );
  const chosen = choices.some((p) => p.id === product)
    ? product
    : choices[0]?.id;
  return (
    <div className="distribution-builder">
      <div className="distribution-toolbar">
        <button onClick={() => begin(false)}>+ Rozdzielnica</button>
        {!!cases.length && (
          <select
            aria-label="Rozdzielnica modułowa"
            value={e?.id ?? ""}
            onChange={(ev) =>
              useApp.getState().setMountingTarget({
                enclosureId: ev.target.value,
                zone: "modules",
                row: 0,
              })
            }
          >
            <option value="" disabled>
              Wybierz rozdzielnicę…
            </option>
            {cases.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} · {e.distribution!.rows}×
                {e.distribution!.modulesPerRow}M
              </option>
            ))}
          </select>
        )}
        {e && (
          <>
            <button onClick={() => begin(true)}>Konfiguracja {e.name}</button>
            <button onClick={() => useApp.getState().toggleEnclosure(e.id)}>
              {e.closed ? "Zdejmij" : "Załóż"} maskownicę
            </button>
            <button
              onClick={() =>
                useApp.getState().focusEnclosure(focused ? null : e.id)
              }
            >
              {focused ? "Wróć do instalacji" : `Edytuj wnętrze ${e.name}`}
            </button>
          </>
        )}
        {target && !focused && (
          <button onClick={() => useApp.getState().setMountingTarget(null)}>
            Montuj poza rozdzielnicą
          </button>
        )}
      </div>
      {e && (
        <details className="distribution-mounting" open={!!focused}>
          <summary>
            Montaż w {e.name} · {e.deviceIds.length} aparatów ·{" "}
            {e.distribution!.rows}×{e.distribution!.modulesPerRow}M
          </summary>
          <Capacity enclosure={e} />
          <div className="distribution-toolbar">
            <label>
              Aparat
              <select
                aria-label="Aparat do rozdzielnicy"
                value={chosen ?? ""}
                onChange={(ev) => setProduct(ev.target.value)}
              >
                {availableProducts
                  .filter((p) => mountingInfo(p).zone === activeTarget?.zone)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayNamePl}
                    </option>
                  ))}
              </select>
            </label>
            <button
              disabled={e.closed || !activeTarget || !chosen}
              onClick={() => chosen && useApp.getState().addDevice(chosen)}
            >
              Dodaj do wybranego rzędu
            </button>
            <label>
              Pierwsze pole
              <input
                aria-label="Pierwsze pole"
                type="number"
                min={1}
                max={e.distribution!.modulesPerRow}
                value={slot}
                onChange={(ev) => setSlot(ev.target.valueAsNumber)}
              />
            </label>
            <button
              disabled={!devices.length || !activeTarget || e.closed}
              onClick={() =>
                useApp.getState().mountDevices(activeTarget!, devices, slot - 1)
              }
            >
              Przenieś zaznaczone na pole
            </button>
            <button
              disabled={!devices.some((id) => e.deviceIds.includes(id))}
              onClick={() =>
                useApp.getState().setEnclosureMembers(
                  e.id,
                  devices.filter((id) => e.deviceIds.includes(id)),
                  false,
                )
              }
            >
              Wyjmij na tablicę
            </button>
          </div>
          <p>
            {e.closed
              ? "Zdejmij maskownicę, aby montować i podłączać aparaty."
              : "Kliknij rząd, a następnie aparat w katalogu. Przeciąganie przyciąga do pól; zajęte miejsce odrzuca zmianę."}
          </p>
          {notice && <p role="status">{notice}</p>}
        </details>
      )}
      {open && (
        <dialog
          open
          className="distribution-dialog"
          onKeyDown={(ev) => {
            if (ev.key === "Escape") {
              ev.stopPropagation();
              setOpen(false);
            }
          }}
          aria-label={
            editing ? "Konfiguracja rozdzielnicy" : "Nowa rozdzielnica"
          }
        >
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              const s = useApp.getState();
              const accepted = editing
                ? s.configureDistribution(editing, name, rows, modules, reserve)
                : s.createDistribution(name, rows, modules, reserve, { x, y });
              if (accepted) setOpen(false);
            }}
          >
            <h2>{editing ? "Rozbudowa rozdzielnicy" : "Nowa rozdzielnica"}</h2>
            <p>
              Profil dydaktyczny · siatka 18 mm · bez drzwi, ze zdejmowaną
              maskownicą. Strefa przyłączeń jest oddzielna; listwy i połączenia
              dodajesz samodzielnie.
            </p>
            <div className="physical-fields">
              <label>
                Nazwa rozdzielnicy
                <input
                  required
                  maxLength={projectLimits.designation.maxLength}
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                />
              </label>
              <label>
                Liczba rzędów
                <select
                  value={rows}
                  onChange={(ev) => setRows(Number(ev.target.value))}
                >
                  {Array.from(
                    { length: distributionLimits.rows.max },
                    (_, i) => i + 1,
                  ).map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                Moduły w rzędzie
                <select
                  value={modules}
                  onChange={(ev) =>
                    setModules(Number(ev.target.value) as 8 | 12)
                  }
                >
                  {distributionLimits.modules.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                Planowana rezerwa
                <input
                  type="number"
                  required
                  min={0}
                  max={rows * modules}
                  value={reserve}
                  onChange={(ev) => setReserve(ev.target.valueAsNumber)}
                />
              </label>
              {!editing && (
                <>
                  <label>
                    Położenie X
                    <input
                      type="number"
                      required
                      min={projectLimits.coordinate.min}
                      max={projectLimits.coordinate.max}
                      value={x}
                      onChange={(ev) => setX(ev.target.valueAsNumber)}
                    />
                  </label>
                  <label>
                    Położenie Y
                    <input
                      type="number"
                      required
                      min={projectLimits.coordinate.min}
                      max={projectLimits.coordinate.max}
                      value={y}
                      onChange={(ev) => setY(ev.target.valueAsNumber)}
                    />
                  </label>
                </>
              )}
            </div>
            <svg
              className="distribution-preview"
              viewBox={`0 0 ${geometry.width} ${geometry.height}`}
              role="img"
              aria-label={`Podgląd ${rows} rzędów po ${modules} modułów`}
            >
              <rect
                width={geometry.width}
                height={geometry.height}
                rx={12}
                fill="#e5eadd"
                stroke="#a7b1a1"
              />
              {enclosureWindows({
                ...(preview.enclosure ?? {
                  distribution: { rows, modulesPerRow: modules },
                }),
              } as PhysicalEnclosure).map((w, i) => (
                <g key={i}>
                  <rect {...w} fill="#c4cebc" />
                  {Array.from({ length: modules }, (_, n) => (
                    <rect
                      key={n}
                      x={
                        w.x +
                        n *
                          distributionProfile.moduleMm *
                          distributionProfile.scale +
                        2
                      }
                      y={w.y + 2}
                      width={
                        distributionProfile.moduleMm *
                          distributionProfile.scale -
                        4
                      }
                      height={w.height - 4}
                      fill="#f3f2eb"
                      stroke="#a7b1a1"
                    />
                  ))}
                </g>
              ))}
              {preview.enclosure?.deviceIds.map((id) => {
                const at = preview.enclosure!.distribution!.placements[id],
                  p = project.circuit.devices.find((d) => d.id === id)!;
                const point = placementPoint(preview.enclosure!, at);
                const w =
                  at.zone === "modules"
                    ? enclosureWindows(preview.enclosure!)[at.row]
                    : {
                        x:
                          point.x -
                          preview.enclosure!.position.x -
                          at.slot *
                            distributionProfile.moduleMm *
                            distributionProfile.scale,
                        y: point.y - preview.enclosure!.position.y,
                        height:
                          resolve(p.productId).height *
                          distributionProfile.scale,
                      };
                return (
                  <g key={id}>
                    <rect
                      x={
                        w.x +
                        at.slot *
                          distributionProfile.moduleMm *
                          distributionProfile.scale
                      }
                      y={w.y}
                      width={
                        resolve(p.productId).width * distributionProfile.scale
                      }
                      height={w.height}
                      fill="#8ca995"
                    />
                    <text
                      x={
                        w.x +
                        at.slot *
                          distributionProfile.moduleMm *
                          distributionProfile.scale +
                        4
                      }
                      y={w.y + 45}
                      fontSize={16}
                    >
                      {p.designation}
                    </text>
                  </g>
                );
              })}
              <text
                x={distributionProfile.margin}
                y={geometry.height - 30}
                fontSize={18}
                fill="#52684d"
              >
                Dwa rzędy przyłączeń N / PE / L
              </text>
            </svg>
            {preview.error && <p role="alert">{preview.error}</p>}
            {notice && <p role="status">{notice}</p>}
            <p>
              Podgląd nie sprawdza termiki, głębokości ani zgodności normowej.
              Zajęty rząd trzeba opróżnić przed jego usunięciem.
            </p>
            <div className="distribution-toolbar">
              <button type="submit" disabled={!!preview.error}>
                {editing ? "Zatwierdź konfigurację" : "Utwórz rozdzielnicę"}
              </button>
              <button type="button" onClick={() => setOpen(false)}>
                Anuluj
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}

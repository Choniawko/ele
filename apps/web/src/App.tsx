import { motorConnection } from "@simulation/motor";
import { mechanismOwner } from "@simulation/mechanisms";
import type { ExerciseVariant } from "@training/index";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Copy,
  Download,
  FilePlus2,
  FolderOpen,
  Gauge,
  Lightbulb,
  List,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Power,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  SkipForward,
  Trash2,
  Undo2,
  Redo2,
  X,
  Zap,
  Cable,
  LayoutGrid,
  GitBranch,
  PanelLeft,
  PanelRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  AlignHorizontalJustifyStart,
  ExternalLink,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Board } from "@editor/Board";
import { standaloneSvg } from "@editor/export";
import {
  catalog,
  products,
  realProducts,
  availableProducts,
  type Product,
} from "@catalog/index";
import { DeviceThumbnail, DevicePhysical } from "@renderers/index";
import {
  projectLimits,
  numericSettingLimits,
  type Role,
  type FaultKind,
  type TerminalRef,
} from "@model/index";
import { scenarios, colors, suggestMeasurement } from "@training/index";
import {
  formatMeasurement,
  measurementNames,
  type MeasurementFunction,
} from "@measurements/index";
import { useApp, measurementSelect, type Mode, type View } from "./store";
import {
  listProjects,
  restoreProject,
  parseProject,
  importResearch,
  getResearch,
  type SavedProjectSummary,
} from "./persistence";
import "./styles.css";
import "@renderers/effects.css";

const modeNames: Record<Mode, string> = {
  build: "Budowa",
  test: "Test",
  measure: "Pomiary",
  diagnosis: "Diagnoza",
  training: "Ćwiczenie",
};
const faultNames: Record<FaultKind, string> = {
  "open-wire": "Przerwa żyły",
  "loose-terminal": "Luźny zacisk",
  "short-circuit": "Zwarcie L–N",
  leakage: "Upływ L–PE",
  insulation: "Pogorszona izolacja",
  "welded-contact": "Sklejony styk NO",
  "open-coil": "Przerwa cewki",
  "blocked-mechanism": "Zablokowany mechanizm",
  "phase-loss": "Zanik fazy",
  "rcd-failure": "Uszkodzony RCD",
};
function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="icon-button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={17} />
    </button>
  );
}
// A pattern rejects overlong input without silently truncating pasted text.
function textConstraints(limits: { minLength?: number; maxLength: number }) {
  return {
    minLength: limits.minLength,
    pattern: `.{${limits.minLength ?? 0},${limits.maxLength}}`,
    title: `Maksymalnie ${limits.maxLength} znaków`,
  };
}
function download(filename: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const CatalogPanel = memo(function CatalogPanel({
  onProduct,
}: {
  onProduct: (p: Product) => void;
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [pending, setPending] = useState(false),
    adding = useApp((s) => s.adding);
  const categories = [
    { id: "all", name: "Wszystkie", icon: LayoutGrid },
    { id: "protection", name: "Ochrona", icon: ShieldCheck },
    { id: "switching", name: "Sterowanie", icon: Settings2 },
    { id: "load", name: "Odbiorniki", icon: Lightbulb },
    { id: "source", name: "Zasilanie", icon: Zap },
    { id: "connectors", name: "Połączenia", icon: Cable },
  ];
  const inCategory = (p: Product) =>
    filter === "all" ||
    (filter === "protection" &&
      ["mcb", "rccb", "rcbo", "thermal"].includes(p.behaviorId)) ||
    (filter === "switching" &&
      [
        "switch",
        "contactor",
        "relay",
        "bistable",
        "timer",
        "staircase",
        "push-no",
        "push-nc",
        "push-multi",
        "auxiliary",
        "changeover",
        "crossover",
      ].includes(p.behaviorId)) ||
    (filter === "load" && ["load", "motor", "socket"].includes(p.behaviorId)) ||
    (filter === "source" &&
      (p.behaviorId.startsWith("source-") ||
        p.behaviorId === "power-supply")) ||
    (filter === "connectors" && p.behaviorId === "connector");
  const matches = (pending ? products : availableProducts).filter(
    (p) =>
      `${p.displayNamePl} ${p.manufacturer} ${p.manufacturerPartNumber}`
        .toLocaleLowerCase("pl")
        .includes(query.toLocaleLowerCase("pl")) && inCategory(p),
  );
  return (
    <aside className="catalog-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">WYPOSAŻENIE PRACOWNI</span>
          <h2>Katalog aparatów</h2>
        </div>
        <span className="count-pill">{availableProducts.length}</span>
      </div>
      <label className="search-input">
        <Search size={16} />
        <input
          placeholder="Szukaj aparatu lub modelu…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Szukaj w katalogu"
        />
        <kbd>⌕</kbd>
      </label>
      <div className="catalog-categories">
        {categories.map(({ id, name, icon: Icon }) => (
          <button
            key={id}
            className={filter === id ? "active" : ""}
            onClick={() => setFilter(id)}
          >
            <Icon size={14} />
            {name}
          </button>
        ))}
      </div>
      <div className="catalog-list">
        {matches.length ? (
          matches.map((p) => (
            <div
              key={p.id}
              className={`catalog-item ${adding === p.id ? "chosen" : ""} ${!p.published ? "pending" : ""}`}
              draggable={p.published}
              onDragStart={(e) =>
                e.dataTransfer.setData("application/ele-product", p.id)
              }
            >
              <button
                className="product-main"
                onClick={() =>
                  p.published ? useApp.getState().setAdding(p.id) : onProduct(p)
                }
                aria-label={
                  p.published
                    ? `Dodaj ${p.displayNamePl}`
                    : `Sprawdź ${p.manufacturerPartNumber}`
                }
              >
                <div className="thumb-wrap">
                  <DeviceThumbnail product={p} />
                </div>
                <div>
                  <span className="product-brand">
                    {p.educational ? "ELEMENT DYDAKTYCZNY" : p.manufacturer}
                  </span>
                  <strong>
                    {p.manufacturerPartNumber ||
                      p.displayNamePl.split(" · ")[0]}
                  </strong>
                  <small>
                    {p.manufacturerPartNumber
                      ? p.displayNamePl
                      : p.displayNamePl.split(" · ").slice(1).join(" · ") ||
                        p.behaviorId}
                  </small>
                </div>
                {p.published ? (
                  <Plus className="add-icon" size={16} />
                ) : (
                  <CircleHelp size={16} />
                )}
              </button>
              <button
                className="product-info"
                onClick={() => onProduct(p)}
                aria-label={`Dane i źródła ${p.manufacturerPartNumber || p.displayNamePl}`}
              >
                <MoreHorizontal size={14} />
              </button>
            </div>
          ))
        ) : (
          <p className="empty-state">Brak pasujących aparatów.</p>
        )}
      </div>
      <div className="catalog-foot">
        <button className="pending-toggle" onClick={() => setPending(!pending)}>
          <CircleHelp size={15} />
          <span>
            {pending
              ? "Pokaż dostępne aparaty"
              : `${realProducts.filter((p) => !p.published).length} produktów czeka na weryfikację`}
          </span>
          <ChevronRight size={14} />
        </button>
        <p>
          Kliknij aparat i miejsce na tablicy.
          <br />
          Możesz też przeciągnąć go z katalogu.
        </p>
      </div>
    </aside>
  );
});
function Instrument() {
  const instrument = useApp((s) => s.instrument),
    measurement = useApp((s) => s.measurement),
    active = useApp((s) => s.activeProbe),
    p = useApp((s) => s.project),
    rt = useApp((s) => s.runtime);
  const name = (ref?: TerminalRef) =>
    ref
      ? `${p.circuit.devices.find((d) => d.id === ref.deviceId)?.designation ?? "?"} / ${ref.terminalId}`
      : "Wybierz punkt na tablicy";
  return (
    <div className="instrument-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">PRZYRZĄD SZKOLENIOWY</span>
          <h2>Pomiary</h2>
        </div>
        <Gauge size={20} />
      </div>
      <div className="meter-case">
        <div className="meter-top">
          <span>PRACOWNIA / M1</span>
          <span>IDEALNY ODCZYT</span>
        </div>
        <div
          className={`meter-display ${measurement?.status === "invalid-setup" ? "invalid" : ""}`}
        >
          <span className="meter-function">
            {measurementNames[instrument.function]}
          </span>
          <div className="meter-value" data-testid="meter-value">
            {measurement ? formatMeasurement(measurement) : "—"}
            <small>
              {measurement?.unit ??
                (instrument.function.startsWith("voltage") ? "V" : "")}
            </small>
          </div>
          <span className="meter-state">
            {measurement?.status === "valid"
              ? "● WYNIK OBLICZONY"
              : measurement?.status === "floating"
                ? "NIEOKREŚLONA REFERENCJA"
                : measurement?.status === "invalid-setup"
                  ? "SPRAWDŹ WARUNKI"
                  : "GOTOWY DO POMIARU"}
          </span>
        </div>
        <div className="meter-selector">
          <Gauge size={18} />
          <select
            aria-label="Funkcja miernika"
            value={instrument.function}
            onChange={(e) =>
              useApp.getState().setInstrument({
                function: e.target.value as MeasurementFunction,
              })
            }
          >
            {Object.entries(measurementNames).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="probe-list">
        {(["red", "black"] as const).map((probe) => (
          <button
            className={`probe-row ${active === probe ? "active" : ""}`}
            key={probe}
            onClick={() => useApp.getState().setProbe(probe)}
          >
            <span className={`probe-color ${probe}`} />
            <span>
              <small>
                {probe === "red" ? "SONDA CZERWONA" : "SONDA CZARNA"}
              </small>
              <strong>{name(instrument[probe])}</strong>
            </span>
            <ChevronRight size={16} />
          </button>
        ))}
      </div>
      {instrument.function === "current" && (
        <div className="form-field">
          <label>Cęgi na żyle</label>
          <select
            aria-label="Żyła do pomiaru prądu"
            value={instrument.wireId ?? ""}
            onChange={(e) =>
              useApp.getState().setInstrument({ wireId: e.target.value })
            }
          >
            <option value="">Wybierz przewód</option>
            {p.circuit.conductors.map((w) => (
              <option key={w.id} value={w.id}>
                {w.marking} · {name(w.from)} → {name(w.to)}
              </option>
            ))}
          </select>
        </div>
      )}
      {["rcd", "phase-order"].includes(instrument.function) && (
        <div className="form-field">
          <label>Badany aparat</label>
          <select
            aria-label="Badany aparat"
            value={instrument.deviceId ?? ""}
            onChange={(e) =>
              useApp.getState().setInstrument({ deviceId: e.target.value })
            }
          >
            <option value="">Wybierz aparat</option>
            {p.circuit.devices
              .filter((d) =>
                instrument.function === "rcd"
                  ? ["rccb", "rcbo"].includes(catalog[d.productId].behaviorId)
                  : ["source-3ph", "motor"].includes(
                      catalog[d.productId].behaviorId,
                    ),
              )
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.designation} · {catalog[d.productId].displayNamePl}
                </option>
              ))}
          </select>
        </div>
      )}
      {instrument.function === "continuity" && (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={instrument.compensateLeads}
            onChange={(e) =>
              useApp
                .getState()
                .setInstrument({ compensateLeads: e.target.checked })
            }
          />
          Kompensacja przewodów pomiarowych
        </label>
      )}
      {instrument.function === "insulation" && (
        <div className="form-field">
          <label>Napięcie testowe</label>
          <select
            aria-label="Napięcie testowe"
            value={instrument.testVoltageV}
            onChange={(e) =>
              useApp.getState().setInstrument({
                testVoltageV: Number(e.target.value) as 100 | 250 | 500,
              })
            }
          >
            {[100, 250, 500].map((v) => (
              <option key={v} value={v}>
                {v} V DC
              </option>
            ))}
          </select>
        </div>
      )}
      {instrument.function === "rcd" && (
        <div className="form-field">
          <label>Prąd testu · sinus AC</label>
          <select
            aria-label="Krotność testu RCD"
            value={instrument.rcdMultiplier}
            onChange={(e) =>
              useApp.getState().setInstrument({
                rcdMultiplier: Number(e.target.value) as 0.5 | 1 | 2 | 5,
              })
            }
          >
            {[0.5, 1, 2, 5].map((v) => (
              <option key={v} value={v}>
                {v}× IΔn
              </option>
            ))}
          </select>
        </div>
      )}
      <button
        className="primary-button full"
        onClick={() => useApp.getState().performMeasurement()}
      >
        <Play size={15} />
        Wykonaj i zapisz pomiar
      </button>
      {measurement && (
        <div
          className={`measurement-explanation ${measurement.status === "valid" ? "good" : ""}`}
        >
          <span>
            {measurement.status === "valid" ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
          </span>
          <p>{measurement.explanation}</p>
        </div>
      )}
      {measurement?.details && (
        <dl className="details-grid">
          {Object.entries(measurement.details).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{typeof v === "number" ? v.toFixed(3) : v}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="panel-note">
        <CircleHelp size={15} />
        <p>
          Wybierz sondę, następnie zacisk. Wynik dotyczy rewizji{" "}
          {p.circuit.revision}, t = {(rt.timeMs / 1000).toFixed(1)} s.
        </p>
      </div>
    </div>
  );
}
function Inspector() {
  const p = useApp((s) => s.project),
    rt = useApp((s) => s.runtime),
    ids = useApp((s) => s.selection),
    mode = useApp((s) => s.mode),
    [tab, setTab] = useState("terminals"),
    [fault, setFault] = useState<FaultKind>("open-wire"),
    [faultContact, setFaultContact] = useState("");
  const d = p.circuit.devices.find((d) => d.id === ids[0]),
    w = p.circuit.conductors.find((w) => w.id === ids[0]),
    product = d ? catalog[d.productId] : null;
  const allowedFaults: FaultKind[] = w
    ? ["open-wire", "loose-terminal"]
    : product
      ? [
          ...(["load", "socket"].includes(product.behaviorId)
            ? (["short-circuit", "leakage", "insulation"] as FaultKind[])
            : []),
          ...(product.topology.coil
            ? (["open-coil", "blocked-mechanism"] as FaultKind[])
            : []),
          ...(product.topology.connections.some((c) => c.kind === "contact")
            ? (["welded-contact"] as FaultKind[])
            : []),
          ...(["rccb", "rcbo"].includes(product.behaviorId)
            ? (["rcd-failure"] as FaultKind[])
            : []),
          ...(["source-ac", "source-3ph"].includes(product.behaviorId)
            ? (["phase-loss"] as FaultKind[])
            : []),
        ]
      : [];
  const availableFaultsKey = allowedFaults.join(",");
  useEffect(() => {
    if (allowedFaults.length && !allowedFaults.includes(fault))
      setFault(allowedFaults[0]);
  }, [availableFaultsKey, fault]);
  if (mode === "measure")
    return (
      <aside className="inspector-panel">
        <Instrument />
      </aside>
    );
  const hidden = p.faults.some((f) => f.hidden);
  const addFault = () => {
    if (!d && !w) return;
    const state = useApp.getState();
    if (["short-circuit", "leakage", "insulation"].includes(fault)) {
      const terminals = product?.topology.terminals ?? [];
      const l = terminals.find((t) => t.id === "L"),
        n = terminals.find((t) => t.id === "N"),
        pe = terminals.find((t) => t.id === "PE");
      if (!d || !l || !(fault === "short-circuit" ? n : pe)) {
        state.setNotice(
          "Dla tej usterki wybierz odbiornik z zaciskami L/N/PE.",
        );
        return;
      }
      state.addFault(
        fault,
        d.id,
        fault === "short-circuit" ? 0.02 : fault === "leakage" ? 4600 : 100000,
        { deviceId: d.id, terminalId: "L" },
        { deviceId: d.id, terminalId: fault === "short-circuit" ? "N" : "PE" },
      );
    } else if (fault === "welded-contact" && d && product) {
      const cn = product.topology.connections.find(
        (c) =>
          c.kind === "contact" &&
          c.id ===
            (faultContact ||
              product.topology.connections.find((c) => c.kind === "contact")
                ?.id),
      );
      if (cn)
        state.addFault(
          fault,
          d.id,
          undefined,
          { deviceId: d.id, terminalId: cn.from },
          { deviceId: d.id, terminalId: cn.to },
        );
    } else
      state.addFault(
        fault,
        (w ?? d)!.id,
        fault === "loose-terminal" ? 5 : undefined,
        fault === "phase-loss" && d
          ? { deviceId: d.id, terminalId: "L2" }
          : undefined,
      );
  };
  return (
    <aside className="inspector-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">INSPEKTOR</span>
          <h2>
            {d ? "Wybrany aparat" : w ? "Wybrany przewód" : "Właściwości"}
          </h2>
        </div>
        <Settings2 size={18} />
      </div>
      {p.circuit.conductors.length > 0 && (
        <div className="form-field">
          <label htmlFor="selected-wire">Wybierz przewód instalacji</label>
          <select
            id="selected-wire"
            aria-label="Wybierz przewód instalacji"
            value={w?.id ?? ""}
            onChange={(e) => useApp.getState().select(e.target.value || null)}
          >
            <option value="">Zaznacz przewód…</option>
            {p.circuit.conductors.map((wire) => {
              const a = p.circuit.devices.find(
                  (d) => d.id === wire.from.deviceId,
                )!,
                b = p.circuit.devices.find((d) => d.id === wire.to.deviceId)!;
              return (
                <option key={wire.id} value={wire.id}>
                  {wire.marking} · {a.designation}:{wire.from.terminalId} →{" "}
                  {b.designation}:{wire.to.terminalId}
                </option>
              );
            })}
          </select>
        </div>
      )}
      {!d && !w ? (
        <>
          <div className="inspector-empty">
            <div className="inspector-illustration">
              <Settings2 size={30} />
            </div>
            <h3>Spójrz na szczegóły</h3>
            <p>
              Zaznacz aparat lub przewód, aby sprawdzić jego zaciski, parametry
              i źródła.
            </p>
          </div>
          <div className="quick-guide">
            <span className="eyebrow">PIERWSZE KROKI</span>
            <ol>
              <li>
                <span>1</span>Wybierz aparat z katalogu.
              </li>
              <li>
                <span>2</span>Kliknij dwa zaciski, aby je połączyć.
              </li>
              <li>
                <span>3</span>Włącz zasilanie i zbadaj obwód.
              </li>
            </ol>
          </div>
        </>
      ) : null}
      {d && product && (
        <>
          <div className="selected-device">
            <div className="selected-thumb">
              <DeviceThumbnail product={product} />
            </div>
            <div>
              <span className="product-brand">
                {product.educational
                  ? "ELEMENT DYDAKTYCZNY"
                  : product.manufacturer}
              </span>
              <h3>{d.designation}</h3>
              <strong>
                {product.manufacturerPartNumber ||
                  product.displayNamePl.split(" · ")[0]}
              </strong>
              <p>{product.displayNamePl}</p>
            </div>
          </div>
          <div className="device-state">
            <span
              className={
                rt.devices[d.id]?.tripped
                  ? "status-dot red"
                  : rt.devices[d.id]?.powered || rt.devices[d.id]?.mechanism
                    ? "status-dot"
                    : "status-dot off"
              }
            />
            {rt.devices[d.id]?.tripped
              ? "WYZWOLONY"
              : rt.devices[d.id]?.mechanicallyBlocked
                ? "CEWKA ON · BLOKADA MECHANICZNA"
                : rt.devices[d.id]?.mechanism ||
                    rt.devices[d.id]?.powered ||
                    rt.devices[d.id]?.manual
                  ? "ON / AKTYWNY"
                  : "OFF / SPOCZYNEK"}
            <small>
              {rt.devices[d.id]?.voltageV !== null &&
              rt.devices[d.id]?.voltageV !== undefined
                ? `${rt.devices[d.id].voltageV!.toFixed(2)} V`
                : ""}
            </small>
          </div>
          {product.behaviorId === "motor" &&
            product.topology.terminals.some((t) => t.id === "U1") && (
              <div className="form-field">
                <label htmlFor="motor-links">Mostki zaciskowe silnika</label>
                <select
                  id="motor-links"
                  value={
                    motorConnection(p, d) === "invalid"
                      ? "none"
                      : motorConnection(p, d)
                  }
                  onChange={(e) =>
                    useApp
                      .getState()
                      .setMotorLinks(
                        d.id,
                        e.target.value as "star" | "delta" | "none",
                      )
                  }
                >
                  <option value="none">
                    Bez mostków / połączenie niepoprawne
                  </option>
                  <option value="star">Gwiazda Y — U2, V2, W2</option>
                  <option value="delta">Trójkąt Δ — trzy pary</option>
                </select>
                <p className="small-help">
                  To rzeczywiste mostki modelu obwodu. Narzędzie wymienia mostki
                  tego silnika; ręcznie dodane przewody pozostają. Uzwojenie 230
                  V: Y dla sieci 400 V, Δ dla 230 V międzyfazowo.
                </p>
              </div>
            )}
          {product.behaviorId === "auxiliary" && (
            <div className="form-field">
              <label htmlFor="aux-parent">Mechanizm nadrzędny</label>
              <select
                id="aux-parent"
                value={mechanismOwner(p, d.id) ?? ""}
                onChange={(e) =>
                  useApp
                    .getState()
                    .attachAuxiliary(d.id, e.target.value || undefined)
                }
              >
                <option value="">Nieprzypisany blok</option>
                {p.circuit.devices
                  .filter(
                    (other) =>
                      other.id !== d.id &&
                      (catalog[other.productId].topology.coil ||
                        ["push-no", "push-nc", "push-multi"].includes(
                          catalog[other.productId].behaviorId,
                        )),
                  )
                  .map((other) => (
                    <option key={other.id} value={other.id}>
                      {other.designation}
                    </option>
                  ))}
              </select>
              <p className="small-help">
                NO i NC podążają za wspólnym mechanizmem. Samo okablowanie nie
                przypisuje bloku.
              </p>
            </div>
          )}
          {product.behaviorId === "contactor" && (
            <div className="form-field">
              <label htmlFor="mechanical-interlock">
                Blokada mechaniczna z
              </label>
              <select
                id="mechanical-interlock"
                value={
                  p.circuit.mechanicalCouplings
                    .find(
                      (c) =>
                        c.kind === "interlock" && c.deviceIds.includes(d.id),
                    )
                    ?.deviceIds.find((id) => id !== d.id) ?? ""
                }
                onChange={(e) =>
                  useApp
                    .getState()
                    .setMechanicalInterlock(d.id, e.target.value || undefined)
                }
              >
                <option value="">Bez blokady mechanicznej</option>
                {p.circuit.devices
                  .filter(
                    (other) =>
                      other.id !== d.id &&
                      catalog[other.productId].behaviorId === "contactor",
                  )
                  .map((other) => (
                    <option key={other.id} value={other.id}>
                      {other.designation}
                    </option>
                  ))}
              </select>
              <p className="small-help">
                Osobne sprzężenie fizyczne. Nadal połącz NC przeciwnego
                stycznika w torze cewki.
              </p>
            </div>
          )}
          <div className="inspector-tabs">
            {[
              ["terminals", "Zaciski"],
              ["data", "Dane"],
              ["sources", "Źródła"],
            ].map(([id, name]) => (
              <button
                className={tab === id ? "active" : ""}
                key={id}
                onClick={() => setTab(id)}
              >
                {name}
              </button>
            ))}
          </div>
          {tab === "terminals" && (
            <>
              <p className="small-help">
                Kliknij zacisk, aby rozpocząć połączenie. Punkty są wspólne dla
                tablicy i schematu.
              </p>
              <div className="terminal-list">
                {product.topology.terminals.map((t) => (
                  <button
                    key={t.id}
                    onClick={() =>
                      useApp
                        .getState()
                        .terminalClick({ deviceId: d.id, terminalId: t.id })
                    }
                  >
                    <span className="terminal-number">{t.label}</span>
                    <span>
                      {t.role}
                      <small>
                        {t.maxConductors
                          ? t.maxConductors === 1
                            ? "1 miejsce na przewód"
                            : `${t.maxConductors} miejsca (profil)`
                          : "Punkt pomiarowy"}
                      </small>
                    </span>
                    <Plus size={14} />
                  </button>
                ))}
              </div>
            </>
          )}
          {tab === "data" && (
            <>
              <div className="form-field">
                <label>Oznaczenie aparatu</label>
                <input
                  key={`${d.id}-designation`}
                  defaultValue={d.designation}
                  {...textConstraints(projectLimits.designation)}
                  onBlur={(e) => {
                    if (e.target.value !== d.designation)
                      useApp.getState().updateDevice(d.id, {}, e.target.value);
                    e.currentTarget.value = useApp
                      .getState()
                      .project.circuit.devices.find(
                        (device) => device.id === d.id,
                      )!.designation;
                  }}
                  aria-label="Oznaczenie aparatu"
                />
              </div>
              {Object.keys(numericSettingLimits)
                .filter((key) => product.educational && key in d.settings)
                .map((key) => (
                  <div className="form-field" key={`${d.id}-${key}`}>
                    <label>
                      {
                        (
                          {
                            powerW: "Moc znamionowa [W]",
                            voltageV: "Napięcie znamionowe [V]",
                            timeS: "Czas [s]",
                            ratedCurrentA: "Prąd nastawy [A]",
                            sourceResistanceOhm: "Rezystancja źródła [Ω]",
                            resistanceOhm: "Rezystancja odbiornika [Ω]",
                            loadFactor: "Współczynnik obciążenia",
                          } as Record<string, string>
                        )[key]
                      }
                    </label>
                    <input
                      type="number"
                      min={
                        numericSettingLimits[
                          key as keyof typeof numericSettingLimits
                        ].min
                      }
                      max={
                        numericSettingLimits[
                          key as keyof typeof numericSettingLimits
                        ].max
                      }
                      step="any"
                      defaultValue={
                        d.settings[key as keyof typeof d.settings] as number
                      }
                      onBlur={(e) => {
                        const n = e.currentTarget.valueAsNumber;
                        if (n !== d.settings[key as keyof typeof d.settings])
                          useApp.getState().updateDevice(d.id, { [key]: n });
                        e.currentTarget.value = String(
                          useApp
                            .getState()
                            .project.circuit.devices.find(
                              (device) => device.id === d.id,
                            )!.settings[key as keyof typeof d.settings],
                        );
                      }}
                    />
                  </div>
                ))}
              {product.behaviorId === "timer" && (
                <div className="form-field">
                  <label>Funkcja od podania zasilania</label>
                  <select
                    aria-label="Funkcja przekaźnika czasowego"
                    value={d.settings.timerMode ?? "B"}
                    onChange={(e) =>
                      useApp.getState().updateDevice(d.id, {
                        timerMode: e.target.value as "A" | "B" | "C" | "D",
                      })
                    }
                  >
                    <option value="A">A · opóźnione wyłączenie</option>
                    <option value="B">B · opóźnione załączenie</option>
                    <option value="C">C · cykl od ON</option>
                    <option value="D">D · cykl od OFF</option>
                  </select>
                </div>
              )}
              {product.behaviorId.startsWith("source-") && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={d.settings.independentSupply ?? false}
                    onChange={(e) =>
                      useApp.getState().updateDevice(d.id, {
                        independentSupply: e.target.checked,
                      })
                    }
                  />
                  Źródło niezależne · pozostaje po wyłączeniu głównego
                </label>
              )}
              {product.behaviorId === "source-3ph" && (
                <div className="form-field">
                  <label>Kolejność faz źródła</label>
                  <select
                    aria-label="Kolejność faz źródła"
                    value={d.settings.phaseOrder ?? "123"}
                    onChange={(e) =>
                      useApp.getState().updateDevice(d.id, {
                        phaseOrder: e.target.value as "123" | "132",
                      })
                    }
                  >
                    <option value="123">L1–L2–L3</option>
                    <option value="132">L1–L3–L2</option>
                  </select>
                </div>
              )}
              <dl className="details-grid">
                <div>
                  <dt>Obudowa [mm]</dt>
                  <dd>
                    {Object.values(product.dimensions.value!).join(" × ")}
                  </dd>
                </div>
                <div>
                  <dt>Wersja modelu</dt>
                  <dd>{product.revision}</dd>
                </div>
                <div>
                  <dt>Moc obliczona</dt>
                  <dd>{rt.devices[d.id]?.powerW.toFixed(3) ?? 0} W</dd>
                </div>
                <div>
                  <dt>Prąd gałęzi</dt>
                  <dd>{rt.devices[d.id]?.currentA.toFixed(4) ?? 0} A</dd>
                </div>
              </dl>
              {product.limitations.map((l, i) => (
                <p className="small-help" key={i}>
                  {l}
                </p>
              ))}
            </>
          )}
          {tab === "sources" && (
            <>
              <p className="small-help">
                Dane producenta i przybliżenia symulacji pozostają oddzielone.
              </p>
              {product.sources.map((s) => (
                <a
                  className="source-link"
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={14} />
                  <span>{s.title}</span>
                </a>
              ))}
              {product.educational && (
                <p className="small-help">
                  Własny element dydaktyczny. Nie ma logo ani numeru
                  katalogowego producenta.
                </p>
              )}
              <p className="small-help">
                {product.dimensions.evidence[0]?.locator}
              </p>
            </>
          )}
          <div className="selection-actions">
            <button onClick={() => useApp.getState().duplicateSelection()}>
              <Copy size={14} />
              Powiel
            </button>
            <button onClick={() => useApp.getState().deleteSelection()}>
              <Trash2 size={14} />
              Usuń
            </button>
            {["mcb", "rccb", "rcbo", "thermal"].includes(
              product.behaviorId,
            ) && (
              <button
                onClick={() => useApp.getState().operate(d.id, false, true)}
              >
                <RotateCcw size={14} />
                Reset
              </button>
            )}
          </div>
        </>
      )}
      {w && (
        <>
          <div className="wire-summary">
            <span style={{ background: w.insulationColor }} />
            <div>
              <h3>{w.marking}</h3>
              <p>
                {w.crossSectionMm2} mm² · {w.material} · {w.electricalLengthM} m
              </p>
            </div>
          </div>
          <p className="small-help">
            {
              p.circuit.devices.find((d) => d.id === w.from.deviceId)
                ?.designation
            }
            /{w.from.terminalId} →{" "}
            {p.circuit.devices.find((d) => d.id === w.to.deviceId)?.designation}
            /{w.to.terminalId}
          </p>
          <div className="form-field">
            <label>Rola zadeklarowana</label>
            <select
              value={w.declaredRole}
              onChange={(e) =>
                useApp
                  .getState()
                  .updateWire(w.id, { declaredRole: e.target.value as Role })
              }
            >
              {Object.keys(colors).map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Barwa izolacji (nie zmienia potencjału)</label>
            <input
              type="color"
              value={w.insulationColor}
              onChange={(e) =>
                useApp
                  .getState()
                  .updateWire(w.id, { insulationColor: e.target.value })
              }
            />
          </div>
          <div className="form-field">
            <label>Długość elektryczna [m]</label>
            <input
              key={w.id + "length"}
              aria-label="Długość elektryczna przewodu"
              type="number"
              min={projectLimits.electricalLengthM.min}
              max={projectLimits.electricalLengthM.max}
              step="any"
              defaultValue={w.electricalLengthM}
              onBlur={(e) => {
                const n = e.currentTarget.valueAsNumber;
                if (n !== w.electricalLengthM)
                  useApp.getState().updateWire(w.id, { electricalLengthM: n });
                e.currentTarget.value = String(
                  useApp
                    .getState()
                    .project.circuit.conductors.find(
                      (wire) => wire.id === w.id,
                    )!.electricalLengthM,
                );
              }}
            />
          </div>
          <div className="form-field">
            <label>Opis przewodu</label>
            <input
              aria-label="Opis przewodu"
              key={w.id + "marking"}
              defaultValue={w.marking}
              {...textConstraints(projectLimits.marking)}
              onBlur={(e) => {
                if (e.currentTarget.value !== w.marking)
                  useApp
                    .getState()
                    .updateWire(w.id, { marking: e.currentTarget.value });
                e.currentTarget.value = useApp
                  .getState()
                  .project.circuit.conductors.find(
                    (wire) => wire.id === w.id,
                  )!.marking;
              }}
            />
          </div>
          <div className="form-field">
            <label>Przekrój [mm²]</label>
            <select
              value={w.crossSectionMm2}
              onChange={(e) =>
                useApp
                  .getState()
                  .updateWire(w.id, { crossSectionMm2: Number(e.target.value) })
              }
            >
              {[0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="selection-actions">
            <button onClick={() => measurementSelect("current")}>
              <Gauge size={14} />
              Zmierz prąd
            </button>
            <button onClick={() => useApp.getState().deleteSelection()}>
              <Trash2 size={14} />
              Usuń
            </button>
          </div>
        </>
      )}
      {(mode === "diagnosis" || d || w) && (
        <div className="fault-panel">
          <div className="section-title">
            <Activity size={15} />
            <h3>{hidden ? "Obserwacje i diagnoza" : "Usterki · sandbox"}</h3>
          </div>
          {hidden ? (
            <>
              <p className="small-help">
                Przyczyna jest ukryta. Zapisz pomiar, postaw hipotezę i sprawdź
                ją po naprawie.
              </p>
              <label className="form-field">
                Hipoteza diagnozy
                <textarea
                  aria-label="Hipoteza diagnozy"
                  key={p.circuit.projectId}
                  defaultValue={
                    p.training?.diagnosis ??
                    p.userMetadata.diagnosisHypothesis ??
                    ""
                  }
                  title={`Maksymalnie ${projectLimits.diagnosis.maxLength} znaków`}
                  onBlur={(e) => {
                    useApp.getState().recordHypothesis(e.target.value);
                    const current = useApp.getState().project;
                    e.currentTarget.value =
                      current.training?.diagnosis ??
                      current.userMetadata.diagnosisHypothesis ??
                      "";
                  }}
                />
              </label>
              <button
                className="secondary-button full"
                onClick={() => {
                  const suggestion = suggestMeasurement(p, rt);
                  if (suggestion) {
                    useApp.getState().setMode("measure");
                    useApp.getState().setInstrument({
                      function: "voltage-ac",
                      red: suggestion.red,
                      black: suggestion.black,
                    });
                  }
                }}
              >
                Zaproponuj punkty pomiaru napięcia
              </button>
              <button
                className="secondary-button full"
                onClick={() => useApp.getState().revealFaults()}
              >
                <Eye size={14} />
                Pokaż odpowiedź
              </button>
            </>
          ) : (
            <>
              {allowedFaults.length > 0 ? (
                <>
                  <select
                    aria-label="Rodzaj usterki"
                    value={fault}
                    onChange={(e) => setFault(e.target.value as FaultKind)}
                  >
                    {Object.entries(faultNames)
                      .filter(([id]) => allowedFaults.includes(id as FaultKind))
                      .map(([id, name]) => (
                        <option value={id} key={id}>
                          {name}
                        </option>
                      ))}
                  </select>
                  {fault === "welded-contact" && product && (
                    <select
                      aria-label="Styk uszkodzenia"
                      value={
                        product.topology.connections.some(
                          (c) => c.id === faultContact,
                        )
                          ? faultContact
                          : product.topology.connections.find(
                              (c) => c.kind === "contact",
                            )?.id
                      }
                      onChange={(e) => setFaultContact(e.target.value)}
                    >
                      {product.topology.connections
                        .filter((c) => c.kind === "contact")
                        .map((c) => (
                          <option value={c.id} key={c.id}>
                            {c.from}–{c.to} (
                            {c.condition?.includes("inverse") ? "NC" : "NO"})
                          </option>
                        ))}
                    </select>
                  )}
                  <button className="secondary-button full" onClick={addFault}>
                    <Plus size={14} />
                    Wprowadź usterkę
                  </button>
                </>
              ) : (
                <p className="small-help">
                  Zaznacz przewód lub aparat, aby wprowadzić usterkę.
                </p>
              )}
              {p.faults.map((f) => (
                <div className="fault-row" key={f.id}>
                  <AlertCircle size={14} />
                  {faultNames[f.kind]}
                </div>
              ))}
            </>
          )}
          {p.faults.length > 0 && (
            <button
              className="text-button"
              onClick={() => useApp.getState().repairFaults()}
            >
              <RotateCcw size={14} />
              {hidden
                ? "Napraw zaznaczony element"
                : "Usuń usterki zaznaczonego elementu"}
            </button>
          )}
        </div>
      )}
      {!d && !w && (
        <div className="panel-note">
          <ShieldCheck size={16} />
          <p>
            Pracownia służy do nauki. Zakres i przybliżenia każdego modelu
            znajdziesz w jego danych.
          </p>
        </div>
      )}
    </aside>
  );
}
function LogPanel() {
  const [tab, setTab] = useState("events"),
    [open, setOpen] = useState(false),
    rt = useApp((s) => s.runtime),
    records = useApp((s) => s.measurements),
    checks = useApp((s) => s.checks),
    p = useApp((s) => s.project);
  const archivedEvents = useApp((s) => s.archivedEvents);
  const events = [...archivedEvents, ...rt.events];
  return (
    <section className={`log-panel ${open ? "expanded" : ""}`}>
      <div className="log-tabs">
        {[
          { id: "events", name: "Zdarzenia", icon: List, count: events.length },
          {
            id: "measurements",
            name: "Pomiary",
            icon: Gauge,
            count: records.length,
          },
          {
            id: "problems",
            name: "Problemy",
            icon: AlertCircle,
            count: rt.errors.length,
          },
          {
            id: "training",
            name: "Ocena ćwiczenia",
            icon: ClipboardCheck,
            count: checks.length,
          },
        ].map(({ id, name, icon: Icon, count }) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => {
              setTab(id);
              setOpen(true);
            }}
          >
            <Icon size={15} />
            {name}
            <span>{count}</span>
          </button>
        ))}
        <button
          className="log-collapse"
          aria-label={open ? "Zwiń dziennik" : "Rozwiń dziennik"}
          onClick={() => setOpen(!open)}
        >
          <ChevronDown className={open ? "rotate" : ""} size={16} />
        </button>
      </div>
      {open && (
        <div className="log-content">
          {tab === "events" ? (
            events.length ? (
              events
                .slice(-20)
                .reverse()
                .map((e) => (
                  <div className="log-line" key={e.id}>
                    <time>{(e.timeMs / 1000).toFixed(2)} s</time>
                    <span className={e.type === "trip" ? "log-warning" : ""}>
                      {e.message}
                    </span>
                  </div>
                ))
            ) : (
              <p className="empty-state">
                Uruchom obwód, aby zobaczyć zdarzenia silnika.
              </p>
            )
          ) : tab === "measurements" ? (
            records.length ? (
              records
                .slice(-30)
                .reverse()
                .map((m) => (
                  <div className="log-line" key={m.id}>
                    <time>{(m.timeMs / 1000).toFixed(2)} s</time>
                    <strong>{measurementNames[m.function]}</strong>
                    <span>
                      {formatMeasurement(m.result)} {m.result.unit}
                    </span>
                    <small>
                      rew. {m.revision}
                      {m.revision !== p.circuit.revision
                        ? " · poprzednia topologia"
                        : ""}
                    </small>
                    <span>{m.result.explanation}</span>
                  </div>
                ))
            ) : (
              <p className="empty-state">Zapisane pomiary pojawią się tutaj.</p>
            )
          ) : tab === "problems" ? (
            rt.errors.length ? (
              rt.errors.map((e, i) => (
                <p className="log-warning" key={i}>
                  {e}
                </p>
              ))
            ) : (
              <p className="empty-state">
                Solver nie zgłasza problemów. To nie jest ocena bezpieczeństwa
                instalacji.
              </p>
            )
          ) : (
            <>
              <button
                className="text-button"
                onClick={() => useApp.getState().runChecks()}
              >
                <ClipboardCheck size={14} />
                Sprawdź układ
              </button>
              {checks.map((c) => (
                <div
                  className="check-line"
                  key={c.id}
                  data-check={c.id}
                  data-passed={String(c.passed)}
                >
                  {c.passed ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  <strong>{c.label}</strong>
                  <span>{c.explanation}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}
type Modal =
  "projects" | "examples" | "training" | "help" | "export" | "catalog" | null;
function ModalDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">PRACOWNIA ELEKTRYCZNA</span>
          <h2>{title}</h2>
        </div>
        <IconButton icon={X} label="Zamknij" onClick={onClose} />
      </div>
      {children}
    </dialog>
  );
}
function readLayoutPreference(key: string, fallback: boolean): boolean {
  try {
    const value = localStorage.getItem(`ele.ui.${key}`);
    return value === null ? fallback : value === "true";
  } catch {
    return fallback;
  }
}
function App() {
  const project = useApp((s) => s.project),
    rt = useApp((s) => s.runtime),
    mode = useApp((s) => s.mode),
    view = useApp((s) => s.view),
    saveStatus = useApp((s) => s.saveStatus),
    saveError = useApp((s) => s.saveError),
    recovery = useApp((s) => s.recovery),
    notice = useApp((s) => s.notice),
    paused = useApp((s) => s.paused),
    speed = useApp((s) => s.speed),
    history = useApp((s) => s.history),
    future = useApp((s) => s.future),
    wireRole = useApp((s) => s.role),
    section = useApp((s) => s.section),
    wireLength = useApp((s) => s.length),
    wireStart = useApp((s) => s.wireStart);
  const [modal, setModal] = useState<Modal>(null),
    [exerciseVariant, setExerciseVariant] = useState<ExerciseVariant | null>(
      null,
    ),
    [diagnosticCase, setDiagnosticCase] = useState(0),
    [info, setInfo] = useState<Product | null>(null),
    [hideCatalog, setHideCatalog] = useState(() =>
      readLayoutPreference("hideCatalog", window.innerWidth < 1280),
    ),
    [hideInspector, setHideInspector] = useState(() =>
      readLayoutPreference("hideInspector", true),
    ),
    [focusBoard, setFocusBoard] = useState(false),
    [showWireOptions, setShowWireOptions] = useState(false),
    [showLog, setShowLog] = useState(() =>
      readLayoutPreference("showLog", true),
    ),
    [saved, setSaved] = useState<SavedProjectSummary[]>([]),
    [researchImport, setResearchImport] = useState("");
  const importRef = useRef<HTMLInputElement>(null),
    catalogImportRef = useRef<HTMLInputElement>(null);
  const toggleCatalog = useCallback(() => {
    setHideCatalog((value) => !value);
    if (window.innerWidth < 1280) setHideInspector(true);
  }, []);
  const toggleInspector = useCallback(() => {
    setHideInspector((value) => !value);
    if (window.innerWidth < 1280) setHideCatalog(true);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("ele.ui.hideCatalog", String(hideCatalog));
      localStorage.setItem("ele.ui.hideInspector", String(hideInspector));
      localStorage.setItem("ele.ui.showLog", String(showLog));
    } catch {
      /* The editor remains usable when storage is unavailable. */
    }
  }, [hideCatalog, hideInspector, showLog]);
  useEffect(() => {
    if (mode === "measure" || mode === "diagnosis" || mode === "training") {
      setHideInspector(false);
      if (window.innerWidth < 1280) setHideCatalog(true);
      setFocusBoard(false);
    }
  }, [mode]);
  useEffect(() => {
    void useApp.getState().hydrate();
    void getResearch().then((r) => {
      if (r)
        setResearchImport(
          `Zapisany katalog badawczy: ${r.products.length} wpisów, import ${r.importedAt.slice(0, 10)}.`,
        );
    });
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      const s = useApp.getState();
      if (!s.paused && !s.busy && s.runtime.status === "valid")
        s.step(200 * s.speed);
    }, 200);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,select,dialog"))
        return;
      const s = useApp.getState();
      if (e.key === "Escape") {
        s.cancelWire();
        setFocusBoard(false);
      }
      if (e.key.toLowerCase() === "f" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setFocusBoard((value) => !value);
      }
      if (e.key === "Backspace" && s.wireStart) {
        e.preventDefault();
        s.popWaypoint();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        s.deleteSelection();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        s.duplicateSelection();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  const openProjects = () => {
    void listProjects()
      .then(setSaved)
      .catch((e) => useApp.getState().setNotice(String(e)));
    setModal("projects");
  };
  const exportSvg = () => {
    const element = document.querySelector<HTMLElement>(
      `.board-host.${view === "schematic" ? "schematic" : "physical"}`,
    );
    if (!element) {
      useApp.getState().setNotice("Nie znaleziono arkusza eksportu.");
      return;
    }
    const positions = Object.values(
      project[view === "schematic" ? "schematic" : "physical"].devices,
    );
    const svg = standaloneSvg(
      element,
      Math.max(1400, ...positions.map((p) => p.x + 350)),
      Math.max(1000, ...positions.map((p) => p.y + 550)),
    );
    download(
      view === "schematic" ? "schemat.svg" : "tablica.svg",
      svg,
      "image/svg+xml",
    );
  };
  const scenario = scenarios.find((s) => s.id === project.scenarioId),
    passed = project.training?.completedChecks.length ?? 0;
  return (
    <div className={`app-shell ${focusBoard ? "board-focused" : ""}`}>
      <header className="app-header">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          onClick={(e) => {
            e.preventDefault();
            setModal("help");
          }}
        >
          <span className="brand-icon">
            <Zap size={23} strokeWidth={1.8} />
          </span>
          <span>
            <strong>Pracownia</strong>
            <small>ELEKTRYCZNA</small>
          </span>
        </a>
        <span className="header-divider" />
        <button className="project-title" onClick={openProjects}>
          <FolderOpen size={17} />
          <span>{project.name}</span>
          <ChevronDown size={14} />
        </button>
        <span
          title={saveError || undefined}
          className={`save-state ${saveStatus === "error" ? "error" : ""}`}
        >
          {saveStatus === "saved" ? (
            <Check size={13} />
          ) : saveStatus === "error" ? (
            <AlertCircle size={13} />
          ) : (
            <span className="status-dot off" />
          )}
          {saveStatus === "saved"
            ? "Zapisano lokalnie"
            : saveStatus === "error"
              ? "Błąd zapisu"
              : saveStatus === "loading"
                ? "Odczytywanie…"
                : "Zapisywanie…"}
        </span>
        <nav className="header-nav">
          <button onClick={() => setModal("examples")}>
            <LayoutGrid size={16} />
            Przykłady
          </button>
          <button onClick={() => setModal("training")}>
            <BookOpen size={16} />
            Ćwiczenia
          </button>
          <button onClick={() => setModal("export")}>
            <ArrowDownToLine size={16} />
            Eksport
          </button>
          <IconButton
            icon={CircleHelp}
            label="Pomoc"
            onClick={() => setModal("help")}
          />
        </nav>
      </header>
      <div className="main-toolbar">
        <div className="view-switch">
          {[
            { id: "physical", name: "Tablica", icon: LayoutGrid },
            { id: "schematic", name: "Schemat", icon: GitBranch },
            { id: "split", name: "Dzielony", icon: PanelLeft },
          ].map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => useApp.getState().setView(id as View)}
            >
              <Icon size={15} />
              {name}
            </button>
          ))}
        </div>
        <span className="toolbar-divider" />
        <div className="history-buttons">
          <IconButton
            icon={Undo2}
            label="Cofnij"
            onClick={() => useApp.getState().undo()}
            disabled={!history.length}
          />
          <IconButton
            icon={Redo2}
            label="Ponów"
            onClick={() => useApp.getState().redo()}
            disabled={!future.length}
          />
        </div>
        <div className="panel-switch">
          <button
            aria-label="Pokaż lub ukryj katalog"
            aria-pressed={!hideCatalog && !focusBoard}
            className={!hideCatalog && !focusBoard ? "active" : ""}
            onClick={() => {
              setFocusBoard(false);
              if (focusBoard) {
                setHideCatalog(false);
                if (window.innerWidth < 1280) setHideInspector(true);
              } else toggleCatalog();
            }}
          >
            <PanelLeft size={15} />
            <span>Katalog</span>
          </button>
          <button
            aria-label="Pokaż lub ukryj inspektor"
            aria-pressed={!hideInspector && !focusBoard}
            className={!hideInspector && !focusBoard ? "active" : ""}
            onClick={() => {
              setFocusBoard(false);
              if (focusBoard) {
                setHideInspector(false);
                if (window.innerWidth < 1280) setHideCatalog(true);
              } else toggleInspector();
            }}
          >
            <PanelRight size={15} />
            <span>Właściwości</span>
          </button>
        </div>
        <button
          className={`focus-button ${focusBoard ? "active" : ""}`}
          aria-label={
            focusBoard ? "Zakończ skupienie na tablicy" : "Skup się na tablicy"
          }
          aria-pressed={focusBoard}
          title="Skupienie na tablicy (F), wyjście Esc"
          onClick={() => setFocusBoard(!focusBoard)}
        >
          {focusBoard ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <div className="mode-selector">
          <span>TRYB</span>
          <select
            aria-label="Tryb pracy"
            value={mode}
            onChange={(e) => useApp.getState().setMode(e.target.value as Mode)}
          >
            {Object.entries(modeNames).map(([id, name]) => (
              <option value={id} key={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="runtime-tools">
          <span className="clock">
            <Activity size={13} />
            {(rt.timeMs / 1000).toFixed(1)} <small>s</small>
          </span>
          <select
            aria-label="Prędkość symulacji"
            value={speed}
            onChange={(e) =>
              useApp.getState().setSpeed(Number(e.target.value) as 1 | 5 | 20)
            }
          >
            {[1, 5, 20].map((n) => (
              <option key={n} value={n}>
                {n}×
              </option>
            ))}
          </select>
          <IconButton
            icon={paused ? Play : Pause}
            label={paused ? "Wznów zegar" : "Pauza"}
            onClick={() => useApp.getState().setPaused(!paused)}
          />
          <IconButton
            icon={SkipForward}
            label="Krok symulacji 1 s"
            onClick={() => useApp.getState().step()}
          />
          <IconButton
            icon={RotateCcw}
            label="Reset symulacji"
            onClick={() => useApp.getState().reset()}
          />
          <button
            className={`power-button ${rt.energized ? "on" : ""}`}
            onClick={() => useApp.getState().power()}
          >
            <Power size={16} />
            {rt.energized ? "Zasilanie ON" : "Włącz zasilanie"}
          </button>
        </div>
      </div>
      <div
        className={`workspace ${hideCatalog || focusBoard ? "no-catalog" : ""} ${hideInspector || focusBoard ? "no-inspector" : ""}`}
      >
        {(!hideCatalog || !hideInspector) && !focusBoard && (
          <button
            className="panel-backdrop"
            aria-label="Zamknij panele boczne"
            onClick={() => {
              setHideCatalog(true);
              setHideInspector(true);
            }}
          />
        )}
        {!hideCatalog && !focusBoard && (
          <div className="side-panel-slot catalog-slot">
            <button
              className="panel-close"
              aria-label="Zamknij katalog"
              onClick={() => setHideCatalog(true)}
            >
              <X size={16} />
            </button>
            <CatalogPanel onProduct={setInfo} />
          </div>
        )}
        <main className="workbench">
          <div className="workbench-heading">
            <div>
              <h1>{project.name}</h1>
            </div>
            <span
              className={`circuit-status ${rt.energized ? "energized" : ""}`}
            >
              <span
                className={rt.energized ? "status-dot" : "status-dot off"}
              />
              {rt.energized ? "Obwód zasilany" : "Zasilanie odłączone"}
            </span>
            <div className="workbench-actions">
              <button
                className={showWireOptions ? "active" : ""}
                aria-label="Pokaż lub ukryj ustawienia przewodów"
                aria-expanded={showWireOptions || !!wireStart}
                onClick={() => setShowWireOptions(!showWireOptions)}
              >
                <Cable size={15} />
                <span>Przewody</span>
                <ChevronDown size={12} />
              </button>
              <button
                className={showLog ? "active" : ""}
                aria-label="Pokaż lub ukryj dziennik"
                aria-pressed={showLog}
                onClick={() => setShowLog(!showLog)}
              >
                <List size={15} />
                <span>Dziennik</span>
              </button>
            </div>
          </div>
          {project.training && (
            <div className="training-strip">
              <BookOpen size={17} />
              <div>
                <strong>{scenario?.description}</strong>
                <small>{scenario?.fidelity}</small>
              </div>
              <span>
                {passed}/
                {useApp.getState().checks.length ||
                  (scenario?.practice
                    ? scenario.id === "exam-reversing"
                      ? 8
                      : 7
                    : 4)}
              </span>
              <button onClick={() => useApp.getState().runChecks()}>
                Sprawdź
              </button>
              <button
                onClick={() => useApp.getState().hint()}
                aria-label="Podpowiedź"
              >
                <Lightbulb size={16} />
              </button>
            </div>
          )}
          {project.training && scenario?.practice && (
            <details className="practice-instructions">
              <summary>Wymagania i instrukcja montażu</summary>
              <ol>
                {scenario.goals.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ol>
              <p>
                W diagnozie zapisz pomiar uszkodzonego elementu, hipotezę i
                napraw zaznaczony element. Następnie ponów pomiary PE oraz próbę
                działania. Model nie ocenia jakości opisu diagnozy ani wykonania
                fizycznego.
              </p>
            </details>
          )}
          {project.training && project.training.hintLevel > 0 && (
            <div className="hint-strip">
              <Lightbulb size={14} />
              {scenario?.hints[Math.min(3, project.training.hintLevel - 1)]}
            </div>
          )}
          {(showWireOptions || wireStart) && !focusBoard && (
            <div className="wire-toolbar">
              <span>
                <Cable size={15} />
                Przewód
              </span>
              <div className="wire-colors">
                {(["L1", "N", "PE", "CONTROL", "DC_PLUS"] as Role[]).map(
                  (role) => (
                    <button
                      aria-label={`Przewód ${role}`}
                      title={role}
                      key={role}
                      className={wireRole === role ? "selected" : ""}
                      style={
                        { "--wire-color": colors[role] } as React.CSSProperties
                      }
                      onClick={() => useApp.getState().setWireOptions({ role })}
                    >
                      <i className={role === "PE" ? "pe-color" : ""} />
                    </button>
                  ),
                )}
              </div>
              <select
                aria-label="Rola przewodu"
                value={wireRole}
                onChange={(e) =>
                  useApp
                    .getState()
                    .setWireOptions({ role: e.target.value as Role })
                }
              >
                {Object.keys(colors).map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
              <select
                aria-label="Przekrój nowego przewodu"
                value={section}
                onChange={(e) =>
                  useApp
                    .getState()
                    .setWireOptions({ section: Number(e.target.value) })
                }
              >
                {[0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} mm²
                  </option>
                ))}
              </select>
              <label className="length-field">
                <input
                  aria-label="Długość nowego przewodu"
                  type="number"
                  min={projectLimits.electricalLengthM.min}
                  max={projectLimits.electricalLengthM.max}
                  step="any"
                  key={`wire-length-${wireLength}`}
                  defaultValue={wireLength}
                  onBlur={(e) => {
                    useApp.getState().setWireOptions({
                      length: e.currentTarget.valueAsNumber,
                    });
                    e.currentTarget.value = String(useApp.getState().length);
                  }}
                />
                m
              </label>
              <IconButton
                icon={AlignHorizontalJustifyStart}
                label="Wyrównaj zaznaczone"
                onClick={() => useApp.getState().alignSelection()}
              />
            </div>
          )}
          <div className={`board-container ${view === "split" ? "split" : ""}`}>
            {(view === "physical" || view === "split") && (
              <Board view="physical" />
            )}
            {(view === "schematic" || view === "split") && (
              <Board view="schematic" />
            )}
          </div>
          {(notice || rt.status !== "valid") && !focusBoard && (
            <div
              className={`workbench-notice ${rt.status !== "valid" ? "error" : ""}`}
            >
              <span>
                {rt.status !== "valid" ? (
                  <AlertCircle size={14} />
                ) : (
                  <CircleHelp size={14} />
                )}
              </span>
              <p>{rt.status !== "valid" ? rt.errors.join(" ") : notice}</p>
              {notice && (
                <button
                  aria-label="Zamknij wskazówkę"
                  onClick={() => useApp.getState().setNotice("")}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}
          {recovery && (
            <div
              className="workbench-notice error recovery-notice"
              role="alert"
            >
              <AlertCircle size={18} />
              <div>
                <p>{recovery.message}</p>
                {recovery.protectedAnswers && (
                  <p>
                    W kopii pominięto ukryte odpowiedzi ćwiczenia i jego sesję.
                    Oryginał pozostaje w bazie.
                  </p>
                )}
              </div>
              <button
                onClick={() =>
                  download("projekt-do-odzyskania.json", recovery.json)
                }
              >
                Pobierz kopię do odzyskania
              </button>
            </div>
          )}
          {showLog && !focusBoard && <LogPanel />}
        </main>
        {!hideInspector && !focusBoard && (
          <div className="side-panel-slot inspector-slot">
            <button
              className="panel-close"
              aria-label="Zamknij właściwości"
              onClick={() => setHideInspector(true)}
            >
              <X size={16} />
            </button>
            <Inspector />
          </div>
        )}
      </div>
      <footer className="app-footer">
        <span>
          <span className="status-dot" />
          Lokalna pracownia <span className="footer-divider">/</span> profil
          dydaktyczny v1
        </span>
        <span>
          TN-S · 50 Hz <span className="footer-divider">/</span> solver MNA ·{" "}
          {rt.durationMs.toFixed(1)} ms{" "}
          <span className="footer-divider">/</span> rewizja{" "}
          {project.circuit.revision}
        </span>
        <span>Wirtualna instalacja szkoleniowa</span>
      </footer>
      <input
        ref={importRef}
        type="file"
        accept=".json,application/json"
        hidden
        aria-label="Import projektu"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            if (file.size > 5 * 1024 * 1024)
              throw new Error("Plik przekracza 5 MB.");
            const p = parseProject(await file.text());
            useApp.getState().load(p);
            setModal(null);
          } catch (error) {
            useApp
              .getState()
              .setNotice(
                error instanceof Error ? error.message : "Niepoprawny import.",
              );
          }
          e.target.value = "";
        }}
      />
      <input
        ref={catalogImportRef}
        type="file"
        accept=".json"
        hidden
        aria-label="Import katalogu badawczego"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            if (file.size > 5 * 1024 * 1024) throw new Error("Limit 5 MB");
            const parsed = await importResearch(JSON.parse(await file.text()));
            setModal("catalog");
            setResearchImport(
              `Zapisano ${parsed.products.length} wpisów badawczych w IndexedDB. Publikacja wymaga sprawdzenia źródeł, topologii, geometrii oraz testów.`,
            );
          } catch (error) {
            setResearchImport(String(error));
          }
          e.target.value = "";
        }}
      />
      {modal === "projects" && (
        <ModalDialog title="Twoje projekty" onClose={() => setModal(null)}>
          <div className="project-start-options">
            <button
              onClick={() => {
                useApp.getState().newProject();
                setModal(null);
              }}
            >
              <FilePlus2 size={24} />
              <strong>Nowa instalacja</strong>
              <span>Pusta tablica do własnych eksperymentów</span>
            </button>
            <button onClick={() => setModal("examples")}>
              <LayoutGrid size={24} />
              <strong>Przykłady</strong>
              <span>Otwórz gotowy, działający układ</span>
            </button>
            <button onClick={() => setModal("training")}>
              <BookOpen size={24} />
              <strong>Ćwiczenia</strong>
              <span>Buduj i diagnozuj krok po kroku</span>
            </button>
          </div>
          <div className="project-rename">
            <label>Nazwa bieżącego projektu</label>
            <input
              defaultValue={project.name}
              {...textConstraints(projectLimits.name)}
              onBlur={(e) => {
                useApp.getState().rename(e.target.value);
                e.currentTarget.value = useApp.getState().project.name;
              }}
              aria-label="Nazwa projektu"
            />
            <p className="small-help" role="status">
              {notice}
            </p>
          </div>
          <h3 className="modal-subheading">Zapisane lokalnie</h3>
          {saved.map((p) => (
            <button
              className="saved-project"
              key={p.id}
              onClick={() => {
                void restoreProject(p.id)
                  .then((s) => {
                    if (s) {
                      useApp
                        .getState()
                        .load(s.document, s.measurements, s.events);
                      setModal(null);
                    }
                  })
                  .catch((e) => {
                    useApp.getState().reportReadError(e);
                    setModal(null);
                  });
              }}
            >
              <FolderOpen size={19} />
              <span>
                <strong>{p.name}</strong>
                <small>
                  {new Date(p.updatedAt).toLocaleString("pl-PL", {
                    timeZone: "Europe/Warsaw",
                  })}{" "}
                  · {p.deviceCount} aparatów
                </small>
              </span>
              <ChevronRight size={17} />
            </button>
          ))}
          <button
            className="secondary-button"
            onClick={() => importRef.current?.click()}
          >
            <ArrowUpFromLine size={16} />
            Importuj projekt JSON
          </button>
        </ModalDialog>
      )}
      {(modal === "examples" || modal === "training") && (
        <ModalDialog
          title={
            modal === "examples" ? "Wybierz przykład" : "Ćwiczenia w pracowni"
          }
          onClose={() => setModal(null)}
        >
          <p className="modal-intro">
            {modal === "examples"
              ? "Sprawdź połączenia, włącz zasilanie i eksperymentuj z działającym układem."
              : "Ćwicz montaż, uruchamianie i diagnozowanie. Ocena obejmuje funkcję obwodu, tor ochronny, oznaczenia i dowód pomiarowy."}
          </p>
          <div className="form-field">
            <label htmlFor="practice-variant">
              Nowe zestawy ELE.02 / ELE.05 — tryb
            </label>
            <select
              id="practice-variant"
              value={
                exerciseVariant ??
                (modal === "training" ? "assembly" : "reference")
              }
              onChange={(e) =>
                setExerciseVariant(e.target.value as ExerciseVariant)
              }
            >
              <option value="reference">Wzorzec — poprawnie zmontowany</option>
              <option value="assembly">Montaż — samodzielne wykonanie</option>
              <option value="diagnosis">Diagnoza — ukryta usterka</option>
            </select>
            {exerciseVariant === "diagnosis" && (
              <select
                aria-label="Wariant diagnostyczny"
                value={diagnosticCase}
                onChange={(e) => setDiagnosticCase(Number(e.target.value))}
              >
                {[0, 1, 2].map((i) => (
                  <option value={i} key={i}>
                    Wariant {i + 1}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="scenario-grid">
            {scenarios.map((s) => (
              <button
                className="scenario-card"
                key={s.id}
                data-scenario={s.id}
                onClick={() => {
                  const variant = s.practice
                    ? (exerciseVariant ??
                      (modal === "training" ? "assembly" : "reference"))
                    : "reference";
                  useApp
                    .getState()
                    .loadScenario(
                      s.id,
                      modal === "training" || variant !== "reference",
                      variant,
                      diagnosticCase,
                    );
                  setModal(null);
                }}
              >
                <span className="scenario-top">
                  <span>{String(s.number).padStart(2, "0")}</span>
                  <small>{s.category}</small>
                  <ChevronRight size={16} />
                </span>
                <strong>{s.title}</strong>
                <p>{s.description}</p>
                <span className="scenario-foot">
                  {s.difficulty}
                  <i /> {s.duration}
                </span>
              </button>
            ))}
          </div>
          <p className="small-help">
            Wybrane umiejętności ELE.02/ELE.05. Warianty dydaktyczne są
            oznaczone; nie stanowią pełnego egzaminu.
          </p>
        </ModalDialog>
      )}
      {modal === "export" && (
        <ModalDialog title="Zapis i eksport" onClose={() => setModal(null)}>
          <div className="export-options">
            <button
              onClick={() =>
                download(
                  "instalacja.json",
                  JSON.stringify(useApp.getState().exported(), null, 2),
                )
              }
            >
              <Download size={22} />
              <strong>Projekt JSON</strong>
              <span>Topologia, układy widoków i wersje produktów</span>
            </button>
            <button onClick={exportSvg}>
              <GitBranch size={22} />
              <strong>
                {view === "schematic" ? "Schemat" : "Tablica"} SVG
              </strong>
              <span>Edytowalna grafika wektorowa</span>
            </button>
            <button onClick={() => window.print()}>
              <ClipboardCheck size={22} />
              <strong>Raport / wydruk PDF</strong>
              <span>Zestawienie aparatów i połączeń</span>
            </button>
            <button onClick={() => importRef.current?.click()}>
              <ArrowUpFromLine size={22} />
              <strong>Import projektu</strong>
              <span>Otwórz i zwaliduj zapisany plik JSON</span>
            </button>
          </div>
          <p className="small-help">
            Eksport aktywnej diagnozy pomija ukryte usterki i odpowiedzi.
            Projekt otwierany jest z odłączonym głównym źródłem.
          </p>
        </ModalDialog>
      )}
      {modal === "help" && (
        <ModalDialog
          title="Twoja wirtualna pracownia"
          onClose={() => setModal(null)}
        >
          <div className="help-content">
            <p>
              Buduj instalację z aparatów, łącz rzeczywiste zaciski i obserwuj
              wyniki solvera. Tablica i schemat opisują ten sam obwód.
            </p>
            <dl>
              <dt>Dodaj aparat</dt>
              <dd>
                Kliknij go w katalogu i wskaż miejsce. Przeciąganie również
                działa.
              </dd>
              <dt>Podłącz przewód</dt>
              <dd>
                Kliknij pierwszy i drugi zacisk. Esc anuluje. Kliknięcie tła
                dodaje punkt trasy; Backspace go usuwa. Zaciski dostępne są
                także w panelu.
              </dd>
              <dt>Przenieś aparat i dodaj szynę</dt>
              <dd>
                Przeciągnij korpus aparatu, także podczas pracy układu. Aparaty
                DIN wskakują na najbliższą szynę. „+ Szyna DIN” dodaje kolejny
                rząd. Po zaznaczeniu aparatu można również wybrać „Przenieś na
                szynę…”.
              </dd>
              <dt>Popraw trasę i powiększ tablicę</dt>
              <dd>
                Zaznacz przewód i wybierz „Edytuj trasę”. Kliknięcia tła dodają
                punkty, przeciąganie je przesuwa, dwuklik usuwa. Zaznaczenie
                pokazuje oba końce przewodu. Przeciągaj puste tło, aby przesuwać
                widok; kółko myszy powiększa miejsce pod kursorem. F włącza
                skupienie na tablicy, Esc przywraca panele. V wybiera
                zaznaczanie, H przesuwanie widoku.
              </dd>
              <dt>Uruchom układ</dt>
              <dd>
                Włącz zasilanie. Klikaj dźwignie; przyciski START i STOP
                działają podczas przytrzymania. Dostępna pauza, krok i szybkość
                zegara.
              </dd>
              <dt>Wykonaj pomiar</dt>
              <dd>
                Wybierz tryb Pomiary, funkcję miernika i dwie sondy. Cęgi
                przypina się do konkretnego przewodu.
              </dd>
              <dt>Cofnij / powiel</dt>
              <dd>
                ⌘/Ctrl Z cofa transakcję. Shift ⌘/Ctrl Z ponawia. ⌘/Ctrl D
                powiela aparat. Shift+klik zaznacza kilka aparatów.
              </dd>
            </dl>
            <div className="help-scope">
              <ShieldCheck size={20} />
              <p>
                Model quasi-statyczny: rezystancje, fazory 50 Hz i jawne profile
                dydaktyczne. Wyniki nie zatwierdzają rzeczywistej instalacji.
                Uproszczenia znajdziesz w danych aparatu.
              </p>
            </div>
            <button
              className="secondary-button"
              onClick={() => setModal("catalog")}
            >
              <List size={16} />
              Stan katalogu i źródła
            </button>
          </div>
        </ModalDialog>
      )}
      {modal === "catalog" && (
        <ModalDialog title="Gotowość katalogu" onClose={() => setModal(null)}>
          <p className="modal-intro">
            {realProducts.filter((p) => p.published).length} z 31 rzeczywistych
            produktów opublikowanych. Pozostałe rekordy zachowują dane i źródła
            badania; ich braki blokują użycie w edytorze.
          </p>
          <div className="catalog-report">
            {realProducts.map((p) => (
              <button key={p.id} onClick={() => setInfo(p)}>
                <span>
                  {p.published ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <CircleHelp size={16} />
                  )}
                </span>
                <strong>{p.manufacturerPartNumber}</strong>
                <small>{p.readiness}</small>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
          <button
            className="secondary-button"
            onClick={() => catalogImportRef.current?.click()}
          >
            <ArrowUpFromLine size={16} />
            Importuj katalog badawczy JSON
          </button>
          {researchImport && <p className="small-help">{researchImport}</p>}
          {researchImport && (
            <button
              className="text-button"
              onClick={async () => {
                const r = await getResearch();
                if (r)
                  download(
                    "katalog-badawczy-normalized.json",
                    JSON.stringify(r, null, 2),
                  );
              }}
            >
              Eksportuj znormalizowany katalog badawczy
            </button>
          )}
        </ModalDialog>
      )}
      {info && (
        <ModalDialog
          title={info.manufacturerPartNumber || info.displayNamePl}
          onClose={() => setInfo(null)}
        >
          <div className="product-detail">
            <div className="large-product-preview">
              {info.dimensions.value ? (
                <svg
                  viewBox={`-20 -25 ${(info.dimensions.value.width + 20) * 2.2} ${(info.dimensions.value.height + 30) * 2.2}`}
                >
                  <DevicePhysical
                    product={info}
                    device={{
                      id: "preview",
                      productId: info.id,
                      productRevision: info.revision,
                      designation: "",
                      settings: info.defaults,
                    }}
                  />
                </svg>
              ) : (
                <CircleHelp size={64} />
              )}
            </div>
            <div>
              <span className="eyebrow">
                {info.educational ? "ELEMENT DYDAKTYCZNY" : info.manufacturer}
              </span>
              <h3>{info.displayNamePl}</h3>
              <p className="readiness-label">
                {info.published
                  ? "Dostępny w edytorze"
                  : `Oczekuje · ${info.readiness}`}
              </p>
              {info.blockers.map((b, i) => (
                <p className="small-help" key={i}>
                  {b}
                </p>
              ))}
              {info.limitations.map((l, i) => (
                <p className="small-help" key={i}>
                  {l}
                </p>
              ))}
            </div>
          </div>
          {Object.keys(info.parameters).length > 0 && (
            <dl className="details-grid">
              {Object.entries(info.parameters).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{String(v.value)}</dd>
                </div>
              ))}
            </dl>
          )}
          {info.sources.map((s) => (
            <a
              className="source-link"
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={14} />
              {s.title}
            </a>
          ))}
          {info.published && (
            <button
              className="primary-button"
              onClick={() => {
                useApp.getState().setAdding(info.id);
                setInfo(null);
                setModal(null);
              }}
            >
              <Plus size={16} />
              Dodaj do instalacji
            </button>
          )}
        </ModalDialog>
      )}
      <div className="print-report">
        <h1>{project.name}</h1>
        <p>
          Raport szkoleniowy · rewizja {project.circuit.revision} ·
          quasi-statyczny model rezystancyjny. Profile ochrony są dydaktyczne.
        </p>
        <h2>Zestawienie aparatów</h2>
        <table>
          <thead>
            <tr>
              <th>Oznaczenie</th>
              <th>Aparat</th>
              <th>Model</th>
            </tr>
          </thead>
          <tbody>
            {project.circuit.devices.map((d) => (
              <tr key={d.id}>
                <td>{d.designation}</td>
                <td>{catalog[d.productId].displayNamePl}</td>
                <td>
                  {catalog[d.productId].manufacturerPartNumber || "dydaktyczny"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>Pomiary szkoleniowe</h2>
        <table>
          <thead>
            <tr>
              <th>Funkcja / punkty</th>
              <th>Wynik</th>
              <th>Rewizja / czas</th>
              <th>Warunki</th>
            </tr>
          </thead>
          <tbody>
            {useApp.getState().measurements.map((m) => (
              <tr key={m.id}>
                <td>
                  {measurementNames[m.function]} · {m.red?.terminalId} /{" "}
                  {m.black?.terminalId}
                </td>
                <td>
                  {formatMeasurement(m.result)} {m.result.unit} ·{" "}
                  {m.result.status}
                </td>
                <td>
                  {m.revision} / {(m.timeMs / 1000).toFixed(2)} s
                </td>
                <td>{m.result.explanation}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>Połączenia</h2>
        <table>
          <thead>
            <tr>
              <th>Żyła</th>
              <th>Od</th>
              <th>Do</th>
              <th>Parametry</th>
            </tr>
          </thead>
          <tbody>
            {project.circuit.conductors.map((w) => (
              <tr key={w.id}>
                <td>{w.marking}</td>
                <td>
                  {
                    project.circuit.devices.find(
                      (d) => d.id === w.from.deviceId,
                    )?.designation
                  }
                  /{w.from.terminalId}
                </td>
                <td>
                  {
                    project.circuit.devices.find((d) => d.id === w.to.deviceId)
                      ?.designation
                  }
                  /{w.to.terminalId}
                </td>
                <td>
                  {w.crossSectionMm2} mm² · {w.electricalLengthM} m ·{" "}
                  {w.declaredRole}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default App;

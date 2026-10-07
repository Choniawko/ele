import { DistributionBuilder } from "./DistributionBuilder";
import { useState } from "react";
import { useApp } from "@/store";
import { projectLimits, type PhysicalEnclosure } from "@model/index";

export function PhysicalTools() {
  const notice = useApp((s) => s.notice);
  const project = useApp((s) => s.project),
    selection = useApp((s) => s.selection);
  const [open, setOpen] = useState(false),
    [name, setName] = useState("P3"),
    [kind, setKind] = useState<PhysicalEnclosure["kind"]>("junction");
  const [x, setX] = useState(400),
    [y, setY] = useState(400),
    [width, setWidth] = useState(176),
    [height, setHeight] = useState(176);
  const [enclosureId, setEnclosureId] = useState(""),
    [trunkId, setTrunkId] = useState(""),
    [direction, setDirection] = useState("horizontal"),
    [length, setLength] = useState(300);
  const e = project.physical.enclosures?.find((e) => e.id === enclosureId),
    t = project.physical.trunking?.find((t) => t.id === trunkId);
  const deviceIds = selection.filter((id) =>
      project.circuit.devices.some((d) => d.id === id),
    ),
    wireIds = selection.filter((id) =>
      project.circuit.conductors.some((w) => w.id === id),
    );
  return (
    <div className="physical-tools">
      <div
        className="physical-presentation"
        role="group"
        aria-label="Prezentacja tablicy"
      >
        <button
          className={
            project.physical.presentation === "external" ? "active" : ""
          }
          onClick={() => useApp.getState().setPhysicalPresentation("external")}
        >
          Widok zewnętrzny
        </button>
        <button
          className={
            project.physical.presentation === "connections" ? "active" : ""
          }
          onClick={() =>
            useApp.getState().setPhysicalPresentation("connections")
          }
        >
          Widok połączeń
        </button>
        <button aria-expanded={open} onClick={() => setOpen(!open)}>
          Obudowy i korytka
        </button>
        <DistributionBuilder />
      </div>
      {open && (
        <div className="physical-tools-panel">
          <p>
            Zaznacz aparaty lub żyły (Shift dodaje do zaznaczenia). Obudowę
            przeciągaj za oznaczenie nad jej korpusem.
          </p>
          <label>
            Obudowa
            <select
              aria-label="Wybrana obudowa"
              value={enclosureId}
              onChange={(ev) => setEnclosureId(ev.target.value)}
            >
              <option value="">Wybierz…</option>
              {project.physical.enclosures?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} · {e.deviceIds.length} elementów
                </option>
              ))}
            </select>
          </label>
          {e && (
            <div className="physical-actions">
              <button onClick={() => useApp.getState().toggleEnclosure(e.id)}>
                {e.closed ? "Otwórz" : "Zamknij"} {e.name}
              </button>
              <button
                disabled={!deviceIds.length}
                onClick={() =>
                  useApp.getState().setEnclosureMembers(e.id, deviceIds, true)
                }
              >
                Włóż zaznaczone
              </button>
              <button
                disabled={!deviceIds.some((id) => e.deviceIds.includes(id))}
                onClick={() =>
                  useApp.getState().setEnclosureMembers(
                    e.id,
                    deviceIds.filter((id) => e.deviceIds.includes(id)),
                    false,
                  )
                }
              >
                Wyjmij zaznaczone
              </button>
              <button onClick={() => useApp.getState().deleteEnclosure(e.id)}>
                Usuń samą obudowę
              </button>
            </div>
          )}
          <label>
            Korytko
            <select
              aria-label="Wybrane korytko"
              value={trunkId}
              onChange={(ev) => setTrunkId(ev.target.value)}
            >
              <option value="">Wybierz…</option>
              {project.physical.trunking?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.conductorIds.length} żył
                </option>
              ))}
            </select>
          </label>
          {t && (
            <div className="physical-actions">
              <button onClick={() => useApp.getState().toggleTrunk(t.id)}>
                {t.closed ? "Otwórz" : "Zamknij"} korytko
              </button>
              <button
                disabled={!wireIds.length}
                onClick={() => useApp.getState().assignTrunk(t.id, wireIds)}
              >
                Dodaj zaznaczone żyły
              </button>
              <button onClick={() => useApp.getState().deleteTrunk(t.id)}>
                Usuń korytko
              </button>
            </div>
          )}
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              useApp.getState().addEnclosure({
                name,
                kind,
                position: { x, y },
                width,
                height,
                closed: false,
                ...(kind === "distribution"
                  ? {
                      window: {
                        x: 15,
                        y: 40,
                        width: width - 30,
                        height: Math.min(120, height - 80),
                      },
                    }
                  : {}),
              });
            }}
          >
            <label>
              Nazwa obudowy / trasy
              <input
                value={name}
                maxLength={projectLimits.designation.maxLength}
                required
                onChange={(ev) => setName(ev.target.value)}
              />
            </label>
            <label>
              Typ obudowy
              <select
                value={kind}
                onChange={(ev) => {
                  const k = ev.target.value as PhysicalEnclosure["kind"];
                  setKind(k);
                  setWidth(
                    k === "distribution" ? 410 : k === "supply" ? 190 : 176,
                  );
                  setHeight(
                    k === "distribution" ? 470 : k === "supply" ? 210 : 176,
                  );
                }}
              >
                <option value="junction">Puszka rozgałęźna</option>
                <option value="distribution">Rozdzielnica natynkowa</option>
                <option value="supply">Puszka zasilająca</option>
              </select>
            </label>
            <div className="physical-fields">
              {(
                [
                  ["X", x, setX],
                  ["Y", y, setY],
                  ["Szerokość", width, setWidth],
                  ["Wysokość", height, setHeight],
                ] as const
              ).map(([label, value, update]) => (
                <label key={label}>
                  {label}
                  <input
                    type="number"
                    required
                    value={value}
                    onChange={(ev) => update(ev.target.valueAsNumber)}
                  />
                </label>
              ))}
            </div>
            <button type="submit">Dodaj obudowę</button>
          </form>
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              useApp.getState().addTrunk({
                name,
                width: 36,
                points: [
                  { x, y },
                  direction === "horizontal"
                    ? { x: x + length, y }
                    : { x, y: y + length },
                ],
                closed: false,
              });
            }}
          >
            <label>
              Kierunek korytka
              <select
                value={direction}
                onChange={(ev) => setDirection(ev.target.value)}
              >
                <option value="horizontal">Poziome</option>
                <option value="vertical">Pionowe</option>
              </select>
            </label>
            <label>
              Długość na tablicy
              <input
                type="number"
                required
                value={length}
                onChange={(ev) => setLength(ev.target.valueAsNumber)}
              />
            </label>
            <button type="submit">Dodaj korytko od X/Y</button>
          </form>
          <p role="status">{notice}</p>
          <p>
            Wymiary w jednostkach tablicy. Długość elektryczną żyły ustawiasz
            osobno w inspektorze.
          </p>
        </div>
      )}
    </div>
  );
}

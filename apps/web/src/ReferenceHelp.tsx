import { useEffect, useRef } from "react";
import { catalog } from "@catalog/index";
import { boundReference } from "../../../packages/knowledge/reference-examples";
import { useApp } from "./store";
import { useReferenceHelp, closeReferenceHelp } from "./reference-navigation";
import { openKnowledge } from "./knowledge-navigation";
import { resolveKnowledge } from "../../../packages/knowledge/bindings";
import "./reference.css";

export function ReferenceHelp() {
  const context = useReferenceHelp((s) => s.context),
    project = useApp((s) => s.project);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (context) heading.current?.focus();
  }, [context]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && useReferenceHelp.getState().context) {
        e.stopImmediatePropagation();
        e.preventDefault();
        closeReferenceHelp();
      }
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, []);
  if (!context) return null;
  const reference = boundReference(project),
    valid =
      reference &&
      context.projectId === project.circuit.projectId &&
      context.revision === project.circuit.revision;
  const binding = reference?.bindings.find(
    (b) => b.deviceId === context.deviceId,
  );
  const profile = reference?.profiles.find(
    (p) => p.productId === binding?.productId,
  );
  const device = project.circuit.devices.find((d) => d.id === context.deviceId);
  const wire = project.circuit.conductors.find((w) => w.id === context.wireId);
  const fragments =
    reference?.fragments.filter((f) =>
      wire
        ? f.conductorIds.includes(wire.id)
        : f.conductorIds.some((id) =>
            project.circuit.conductors.some(
              (w) =>
                w.id === id &&
                [w.from, w.to].some(
                  (r) =>
                    r.deviceId === context.deviceId &&
                    (!context.terminalId ||
                      r.terminalId === context.terminalId),
                ),
            ),
          ),
    ) ?? [];
  const highlight = (ids: string[]) => {
    if (!valid) return;
    const wires = project.circuit.conductors.filter((w) => ids.includes(w.id));
    useApp.setState({
      selection: wires.map((w) => w.id),
      knowledgeHighlight: wires.flatMap((w) => [w.from, w.to]),
    });
  };
  const navigate = async (hash?: string) => {
    closeReferenceHelp();
    const d =
      device ??
      project.circuit.devices.find((d) => d.id === wire?.from.deviceId);
    if (
      await openKnowledge(
        d?.productId,
        d?.id,
        context.terminalId,
        context.symbolId,
        true,
      )
    ) {
      if (hash) location.hash = hash;
    }
  };
  return (
    <aside className="reference-help" aria-label="Pomoc w układzie 101">
      <header>
        <h2 ref={heading} tabIndex={-1}>
          {wire
            ? `Żyła ${wire.id}`
            : `${device?.designation ?? "Aparat"}${context.terminalId ? `:${context.terminalId}` : ""}`}
        </h2>
        <button onClick={closeReferenceHelp}>Schowaj pomoc</button>
      </header>
      <p>
        ELE.02-101 · model dydaktyczny · lekcja v
        {reference?.referenceRevision ?? "1"}
      </p>
      {!valid ? (
        <p role="status">
          Projekt został zmieniony. Otwórz pomoc ponownie dla aktualnego
          obiektu; wcześniejsze odniesienia nie są podświetlane.
        </p>
      ) : (
        <>
          {binding && (
            <p>
              <strong>Rola w tym układzie:</strong> {binding.role}
            </p>
          )}
          {wire && (
            <>
              <p>
                {wire.from.deviceId}:{wire.from.terminalId} → {wire.to.deviceId}
                :{wire.to.terminalId} · {wire.declaredRole}
              </p>
              <button onClick={() => highlight([wire.id])}>
                Wskaż końce i trasę {wire.id}
              </button>
            </>
          )}
          {profile && (
            <>
              <p>{profile.principle}</p>
              <p>
                <strong>Symbol:</strong> {profile.symbol}
              </p>
              {context.symbolId && (
                <p>Fragment jednego aparatu: {context.symbolId}.</p>
              )}
              <p>
                <strong>Stan odniesienia:</strong> {profile.referenceState}
              </p>
              <ul>
                {profile.states.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <details open={!!context.terminalId}>
                <summary>Zaciski i nastawy profilu</summary>
                <dl>
                  {profile.terminals.map((t) => (
                    <div key={t.id}>
                      <dt>{t.id}</dt>
                      <dd>{t.role}</dd>
                    </div>
                  ))}
                </dl>
                <p>
                  Nastawy modelu:
                  {device?.settings.ratedCurrentA !== undefined &&
                    ` prąd ${device.settings.ratedCurrentA} A;`}
                  {device?.settings.voltageV !== undefined &&
                    ` napięcie ${device.settings.voltageV} V;`}
                  {device?.settings.sourceResistanceOhm !== undefined &&
                    ` rezystancja źródła ${device.settings.sourceResistanceOhm} Ω (założenie);`}
                  {device?.settings.powerW !== undefined &&
                    ` moc ${device.settings.powerW} W;`}
                  {device?.settings.position !== undefined &&
                    ` pozycja ${catalog[device.productId].behaviorId === "changeover" ? (device.settings.position ? "tor 2" : "tor 1") : device.settings.position ? "ON" : "OFF"};`}
                  {Object.keys(device?.settings ?? {}).length === 0 &&
                    " połączenia stałe, bez nastaw."}
                </p>
              </details>
              <p>
                <strong>Jak sprawdzić:</strong> {profile.test}
              </p>
              <details>
                <summary>Ograniczenia modelu</summary>
                {profile.limitations.map((l) => (
                  <p key={l}>{l}</p>
                ))}
              </details>
              <button
                onClick={() =>
                  void navigate(
                    resolveKnowledge(profile.productId)
                      ? undefined
                      : `/wiedza/aparaty/${profile.articleId}`,
                  )
                }
              >
                Pełny artykuł aparatu
              </button>
              <a
                href={`#/wiedza/aparaty/${profile.articleId}`}
                onClick={(e) => {
                  e.preventDefault();
                  void navigate(`/wiedza/aparaty/${profile.articleId}`);
                }}
              >
                Artykuł i materiały źródłowe
              </a>
            </>
          )}
          <h3>Tory powiązane z tym miejscem</h3>
          {fragments.map((f) => (
            <div key={f.id}>
              <p>{f.explanation}</p>
              <button onClick={() => highlight(f.conductorIds)}>
                Śledź: {f.title}
              </button>
            </div>
          ))}
          <a
            href="#/wiedza/uklady/ele02-101"
            onClick={(e) => {
              e.preventDefault();
              void navigate("/wiedza/uklady/ele02-101");
            }}
          >
            Lekcja i pełna tabela połączeń
          </a>
          {device && (
            <p className="small-help">
              {catalog[device.productId].displayNamePl}. Zwykłe kliknięcie
              zacisku nadal służy do łączenia. Na czas czytania zegar pracowni
              jest wstrzymany; zamknięcie pomocy przywraca wcześniejszy stan.
              Narzędzie i kamera pozostają zachowane.
            </p>
          )}
        </>
      )}
    </aside>
  );
}

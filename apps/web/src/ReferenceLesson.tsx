import { useState } from "react";
import type { CSSProperties } from "react";
import { catalog } from "@catalog/index";
import { advance, initialRuntime, type RuntimeAction } from "@simulation/index";
import { terminalKey } from "@model/index";
import { measure } from "@measurements/index";
import {
  FunctionalDiagram,
  PhysicalDiagram,
} from "../../../packages/knowledge/Diagram";
import {
  referenceById,
  referenceCopy,
  type ReferenceExample,
} from "../../../packages/knowledge/reference-examples";
import {
  examAvailability,
  referenceIsReady,
} from "../../../packages/knowledge/exams";
import type { Highlight } from "../../../packages/knowledge/types";
import { useApp } from "./store";
import "./reference.css";

export async function openReferenceCopy(id: string, wireId?: string) {
  const reference = referenceById(id);
  if (
    !reference ||
    !referenceIsReady(
      examAvailability.find((r) => r.taskId === reference.taskId),
    )
  )
    throw new Error("Wzorzec nie ma jeszcze pełnego odbioru.");
  // Wait for the user's previous transaction; load never overwrites its projectId.
  await useApp.getState().flushSave();
  const copy = referenceCopy(id);
  useApp.getState().load(copy);
  if (wireId) {
    const wire = copy.circuit.conductors.find((w) => w.id === wireId);
    if (wire)
      useApp.setState({
        selection: [wire.id],
        knowledgeHighlight: [wire.from, wire.to],
      });
  }
  await useApp.getState().flushSave();
  location.hash = "workbench";
}
export function ReferenceLesson({
  reference: r,
}: {
  reference: ReferenceExample;
}) {
  const [project] = useState(r.create),
    [runtime, setRuntime] = useState(() => initialRuntime(project));
  const [highlight, setHighlight] = useState<Highlight>({
    deviceIds: [],
    terminals: [],
  });
  const [fragmentId, setFragmentId] = useState(r.fragments[0].id),
    [error, setError] = useState("");
  const [opening, setOpening] = useState(false);
  const [diagramScale, setDiagramScale] = useState(1);
  const ready = referenceIsReady(
    examAvailability.find((ref) => ref.taskId === r.taskId),
  );
  const fragment = r.fragments.find((f) => f.id === fragmentId)!;
  const chooseWire = (id: string) => {
    const w = [...project.circuit.conductors, ...project.circuit.bridges].find(
      (w) => w.id === id,
    )!;
    setHighlight({
      wireId: id,
      deviceIds: [w.from.deviceId, w.to.deviceId],
      terminals: [w.from, w.to],
    });
  };
  const act = (action: RuntimeAction) =>
    setRuntime((rt) => advance(project, rt, action));
  const copy = async (wireId?: string) => {
    setOpening(true);
    setError("");
    try {
      await openReferenceCopy(r.id, wireId);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Nie udało się zapisać projektu.",
      );
    } finally {
      setOpening(false);
    }
  };
  const voltage = measure(project, runtime, {
    function: "voltage-ac",
    red: { deviceId: "GW", terminalId: "test-L" },
    black: { deviceId: "GW", terminalId: "test-N" },
    testVoltageV: 500,
    compensateLeads: true,
    rcdMultiplier: 1,
  });
  return (
    <section
      className="reference-lesson"
      aria-label="Lekcja układu 101"
      style={{ "--diagram-scale": diagramScale } as CSSProperties}
    >
      <h1 tabIndex={-1}>ELE.02-101 — {r.title}</h1>
      <p>
        Opracowanie modelu dydaktycznego · wersja {r.referenceRevision}.{" "}
        <a href="#/wiedza/zadania/ele02-101">
          Porównaj z oryginałem arkusza i źródłowym BOM
        </a>
        .
      </p>
      {r.limitations.map((l) => (
        <p className="knowledge-limit" key={l}>
          {l}
        </p>
      ))}
      {ready ? (
        <button disabled={opening} onClick={() => void copy()}>
          Otwórz gotowy układ jako nową kopię
        </button>
      ) : (
        <p role="status">
          Podgląd lekcji. Udostępnienie kopii czeka na pełny odbiór R1–R10.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <h2>Przeczytaj tor, potem sprawdź działanie</h2>
      <div className="reference-fragments">
        {r.fragments.map((f) => (
          <button
            key={f.id}
            aria-pressed={fragmentId === f.id}
            onClick={() => {
              setFragmentId(f.id);
              chooseWire(f.conductorIds[0]);
            }}
          >
            {f.title}
          </button>
        ))}
      </div>
      <p>{fragment.explanation}</p>
      <p>
        Żyły toru: {fragment.conductorIds.join(", ")}. Tabela poniżej podaje
        rzeczywiste końce każdej żyły, także połączenia wewnątrz puszek.
      </p>
      <h2>Próby modelu — wynik oblicza solver</h2>
      <p>
        Ta sesja jest oddzielona od Twojego projektu. Kopia w pracowni zawsze
        rozpoczyna się z energią OFF.
      </p>
      <div className="reference-fragments">
        <button onClick={() => act({ type: "power", on: !runtime.energized })}>
          {runtime.energized
            ? "Wyłącz energię lekcji"
            : "Załącz energię lekcji"}
        </button>
        {["Q1", "Q2", "B6", "B10", "RCD"].map((id) => (
          <button
            key={id}
            onClick={() =>
              act({
                type: "operate",
                deviceId: id,
                state: !runtime.devices[id].manual,
              })
            }
          >
            Przełącz {id} w lekcji
          </button>
        ))}
        <button onClick={() => act({ type: "test-rcd", deviceId: "RCD" })}>
          TEST RCD w lekcji
        </button>
        <button
          onClick={() => {
            setRuntime(initialRuntime(project));
            setHighlight({ deviceIds: [], terminals: [] });
          }}
        >
          Reset lekcji
        </button>
      </div>
      <p role="status">
        OP1: {runtime.devices.OP1.powered ? "świeci" : "zgaszona"} · OP2:{" "}
        {runtime.devices.OP2.powered ? "świeci" : "zgaszona"} · H1:{" "}
        {runtime.devices.H1.powered ? "świeci" : "zgaszona"} · H2:{" "}
        {runtime.devices.H2.powered ? "świeci" : "zgaszona"} · GW L–N:{" "}
        {voltage.value?.toFixed(1) ?? "brak odczytu"} V · RCD:{" "}
        {runtime.devices.RCD.tripped ? "wyzwolony" : "niewyzwolony"}.
      </p>
      <h2>Schemat z projektu — fragmenty jednego obwodu</h2>
      <label>
        Powiększenie rysunków modelu{" "}
        <select
          value={diagramScale}
          onChange={(e) => setDiagramScale(Number(e.target.value))}
        >
          {[1, 1.5, 2, 3].map((n) => (
            <option key={n} value={n}>
              {n * 100}%
            </option>
          ))}
        </select>
      </label>
      <p>
        RCD ma dwa sprzężone bieguny; oba symbole Q1/Q2 należą do tego samego
        łącznika. Kropka oznacza węzeł; skrzyżowanie z przerwą nie tworzy
        połączenia. N i PE nie są zamienne.
      </p>
      {r.diagrams.map((scope) => (
        <section key={scope.title}>
          <h3>{scope.title}</h3>
          <div className="reference-scroll">
            <FunctionalDiagram
              project={project}
              runtime={runtime}
              scope={scope}
              live={runtime.energized}
              highlight={highlight}
              onHighlight={setHighlight}
            />
          </div>
        </section>
      ))}
      <h2>Tablica połączeń — trasy z projektu</h2>
      <p>
        Podgląd pokazuje zaciski wewnątrz obudów. W pracowni można przełączać
        widok zewnętrzny/podgląd połączeń i zdejmować pokrywy.
      </p>
      <div className="reference-scroll">
        <PhysicalDiagram
          project={project}
          runtime={runtime}
          highlight={highlight}
          onHighlight={setHighlight}
        />
      </div>
      <h2>Tabela połączeń z obwodu</h2>
      <p>
        Wybierz żyłę: oba końce pojawią się w schemacie i na tablicy, a jej
        trasa zostanie wyróżniona. W schemacie funkcjonalnym podświetlamy cały
        węzeł; pojedynczą żyłę rozpoznasz na tablicy i w tabeli.
      </p>
      <div className="reference-scroll">
        <table className="reference-connections">
          <thead>
            <tr>
              <th>Żyła / mostek</th>
              <th>Od</th>
              <th>Do</th>
              <th>Rola</th>
              <th>Pracownia</th>
            </tr>
          </thead>
          <tbody>
            {[...project.circuit.conductors, ...project.circuit.bridges].map(
              (w) => (
                <tr key={w.id} aria-selected={highlight.wireId === w.id}>
                  <td>
                    <button
                      aria-pressed={highlight.wireId === w.id}
                      onClick={() => chooseWire(w.id)}
                    >
                      Śledź {w.id}
                    </button>
                  </td>
                  <td>{terminalKey(w.from)}</td>
                  <td>{terminalKey(w.to)}</td>
                  <td>
                    {"declaredRole" in w ? String(w.declaredRole) : "mostek"}
                  </td>
                  <td>
                    {ready && (
                      <button
                        disabled={opening}
                        onClick={() => void copy(w.id)}
                      >
                        Kopia z żyłą {w.id}
                      </button>
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      <h2>Modelowy BOM — rzeczywiste instancje</h2>
      <p>
        To wyposażenie modelu, oddzielone od ilości zakupowych w arkuszu.
        Złączki pomocnicze rozwijają węzły rysunku.
      </p>
      <div className="reference-scroll">
        <table className="reference-connections">
          <thead>
            <tr>
              <th>Aparat</th>
              <th>Model</th>
              <th>Rola</th>
            </tr>
          </thead>
          <tbody>
            {r.bindings.map((b) => (
              <tr key={b.deviceId}>
                <td>{b.deviceId}</td>
                <td>{catalog[b.productId].displayNamePl}</td>
                <td>{b.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Profile aparatów</h2>
      {r.profiles.map((profile) => (
        <details key={profile.productId}>
          <summary>{catalog[profile.productId].displayNamePl}</summary>
          <p>{profile.principle}</p>
          <p>Symbol: {profile.symbol}</p>
          <p>Stan odniesienia: {profile.referenceState}</p>
          <ul>
            {profile.states.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <dl>
            {profile.terminals.map((t) => (
              <div key={t.id}>
                <dt>{t.id}</dt>
                <dd>{t.role}</dd>
              </div>
            ))}
          </dl>
          <p>Próba: {profile.test}</p>
          {profile.limitations.map((l) => (
            <p key={l}>{l}</p>
          ))}
          <a href={`#/wiedza/aparaty/${profile.articleId}`}>
            Przeczytaj teorię i źródła
          </a>
        </details>
      ))}
    </section>
  );
}

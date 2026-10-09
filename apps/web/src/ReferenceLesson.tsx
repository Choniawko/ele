import { ReferenceControls } from "./ReferenceControls";
import { useState } from "react";
import type { CSSProperties } from "react";
import { catalog } from "@catalog/index";
import { advance, initialRuntime, type RuntimeAction } from "@simulation/index";
import { auxiliaryMechanism } from "@simulation/mechanisms";
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
import { cardSection } from "../../../packages/knowledge/cards";
import { resolveKnowledge } from "../../../packages/knowledge/bindings";
import { cardHref } from "../../../packages/knowledge/card-routes";
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
  const motor = r.taskId === "ELE.02-108";
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
    red: { deviceId: motor ? "K1" : "GW", terminalId: motor ? "A1" : "test-L" },
    black: {
      deviceId: motor ? "K1" : "GW",
      terminalId: motor ? "A2" : "test-N",
    },
    testVoltageV: 500,
    compensateLeads: true,
    rcdMultiplier: 1,
  });
  return (
    <section
      className="reference-lesson"
      aria-label={`Lekcja układu ${r.taskId}`}
      style={{ "--diagram-scale": diagramScale } as CSSProperties}
    >
      <h1 tabIndex={-1}>
        {r.taskId} — {r.title}
      </h1>
      <p>
        Opracowanie modelu dydaktycznego · wersja {r.referenceRevision}.{" "}
        <a href={`#/wiedza/zadania/${r.id}`}>
          Porównaj z oryginałem arkusza i listą elementów arkusza
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
        <ReferenceControls motor={motor} runtime={runtime} act={act} />
        <button
          onClick={() => {
            setRuntime(initialRuntime(project));
            setHighlight({ deviceIds: [], terminals: [] });
          }}
        >
          Reset lekcji
        </button>
      </div>
      {motor ? (
        <p role="status">
          K1: {runtime.devices.K1.mechanism ? "załączony" : "wyłączony"} · K2:{" "}
          {runtime.devices.K2.mechanism ? "załączony" : "wyłączony"} · M:{" "}
          {runtime.devices.M.powered
            ? runtime.devices.M.direction === "123"
              ? "prawy"
              : "lewy"
            : "stoi"}{" "}
          · Q2:{" "}
          {runtime.devices.Q2.tripped
            ? "TRIPPED"
            : runtime.devices.Q2.manual
              ? "ON"
              : "OFF"}{" "}
          · Q2.AUX:{" "}
          {auxiliaryMechanism(project, runtime, "Q2.AUX")
            ? "zamknięty"
            : "otwarty"}{" "}
          · K1 A1–A2: {voltage.value?.toFixed(1) ?? "brak odczytu"} V.
        </p>
      ) : (
        <>
          {" "}
          <p role="status">
            OP1: {runtime.devices.OP1.powered ? "świeci" : "zgaszona"} · OP2:{" "}
            {runtime.devices.OP2.powered ? "świeci" : "zgaszona"} · H1:{" "}
            {runtime.devices.H1.powered ? "świeci" : "zgaszona"} · H2:{" "}
            {runtime.devices.H2.powered ? "świeci" : "zgaszona"} · GW L–N:{" "}
            {voltage.value?.toFixed(1) ?? "brak odczytu"} V · RCD:{" "}
            {runtime.devices.RCD.tripped ? "wyzwolony" : "niewyzwolony"}.
          </p>
        </>
      )}
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
      {motor ? (
        <p>
          K1/K2 mają oddzielne symbole cewki, trzech torów mocy i NO/NC z tym
          samym oznaczeniem. To jeden mechanizm, nie nowe aparaty. Q2.AUX jest
          związany z Q2 przez assembly. K1 NO podtrzymuje prawy, K2 nie ma
          podtrzymania. Kropka oznacza węzeł; skrzyżowanie z przerwą nie łączy
          torów. N i PE są odrębne.
        </p>
      ) : (
        <>
          {" "}
          <p>
            RCD ma dwa sprzężone bieguny; oba symbole Q1/Q2 należą do tego
            samego łącznika. Kropka oznacza węzeł; skrzyżowanie z przerwą nie
            tworzy połączenia. N i PE nie są zamienne.
          </p>
        </>
      )}
      {r.diagrams.map((scope) => (
        <section key={scope.title}>
          <h3>{scope.title}</h3>
          <div className="reference-scroll">
            <FunctionalDiagram
              project={project}
              runtime={runtime}
              scope={scope}
              live={runtime.sequence > 0}
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
      <h2>Lista elementów modelu — rzeczywiste instancje</h2>
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
          <p>{profile.modelLabel}</p>
          <p>{cardSection(resolveKnowledge(profile.productId)?.articleId ?? profile.articleId, "operation")}</p>
          <p>{profile.mounting}</p>
          <p>{profile.measurements}</p>
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
                <dt>
                  {t.id}
                  {t.sourceLabel &&
                    t.sourceLabel !== t.id &&
                    ` (arkusz: ${t.sourceLabel})`}
                </dt>
                <dd>{t.role}</dd>
              </div>
            ))}
          </dl>
          <p>Próba: {profile.test}</p>
          {profile.sources?.map((source) => (
            <p key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
              </a>{" "}
              · {source.locator} · sprawdzono {source.verifiedAt}
            </p>
          ))}
          {profile.limitations.map((l) => (
            <p key={l}>{l}</p>
          ))}
          <a href={cardHref(resolveKnowledge(profile.productId)?.articleId ?? profile.articleId)}>
            Przeczytaj teorię i źródła
          </a>
        </details>
      ))}
    </section>
  );
}

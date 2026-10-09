import { ReferenceControls } from "./ReferenceControls";
import { useState, useEffect } from "react";
import { rememberLessonReturn } from "./knowledge-navigation";
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
import { type ReferenceExample } from "../../../packages/knowledge/reference-examples";
import {
  examAvailability,
  referenceIsReady,
} from "../../../packages/knowledge/exams";
import type { Highlight } from "../../../packages/knowledge/types";
import { cardSection } from "../../../packages/knowledge/cards";
import { resolveKnowledge } from "../../../packages/knowledge/bindings";
import { cardHref } from "../../../packages/knowledge/card-routes";
import "./reference.css";

export { openReferenceCopy } from "./reference-copy";
import { openReferenceCopy } from "./reference-copy";
import {
  lessonDefinitions,
  validateLessonDefinition,
} from "../../../packages/knowledge/lesson-definitions";
const lessonSessions = new Map<
  string,
  {
    project: ReturnType<ReferenceExample["create"]>;
    runtime: ReturnType<typeof initialRuntime>;
    highlight: Highlight;
    fragmentId: string;
    step: number;
    view: string;
    paused: boolean;
    diagramScale: number;
  }
>();
export function ReferenceLesson({
  reference: r,
}: {
  reference: ReferenceExample;
}) {
  const lesson = lessonDefinitions[r.id];
  const sessionKey = `${r.id}:${r.referenceRevision}:${r.circuitRevision}`;
  const previous = lessonSessions.get(sessionKey);
  const [project] = useState(() => previous?.project ?? r.create()),
    [runtime, setRuntime] = useState(
      () => previous?.runtime ?? initialRuntime(project),
    );
  const [highlight, setHighlight] = useState<Highlight>(
    previous?.highlight ?? {
      deviceIds: [],
      terminals: [],
    },
  );
  const [fragmentId, setFragmentId] = useState(
      previous?.fragmentId ?? r.fragments[0].id,
    ),
    [error, setError] = useState("");
  const [opening, setOpening] = useState(false);
  const [diagramScale, setDiagramScale] = useState(previous?.diagramScale ?? 1),
    [step, setStep] = useState(previous?.step ?? 0),
    [view, setView] = useState(previous?.view ?? "schematic"),
    [paused, setPaused] = useState(previous?.paused ?? false);
  const [prediction, setPrediction] = useState(-1),
    [trialId, setTrialId] = useState(lesson.trials[0].id),
    [trialResult, setTrialResult] = useState("");
  const trial = lesson.trials.find((t) => t.id === trialId)!;
  const errors = validateLessonDefinition(project, lesson);
  useEffect(() => {
    lessonSessions.set(sessionKey, {
      project,
      runtime,
      highlight,
      fragmentId,
      step,
      view,
      paused,
      diagramScale,
    });
  }, [
    sessionKey,
    project,
    runtime,
    highlight,
    fragmentId,
    step,
    view,
    paused,
    diagramScale,
  ]);
  useEffect(
    () => () => {
      const saved = lessonSessions.get(sessionKey);
      if (!saved) return;
      let rt = saved.runtime;
      for (const control of lesson.controls.filter(
        (c) => c.kind === "momentary",
      )) {
        rt = advance(project, rt, {
          type: "operate",
          deviceId: control.deviceId,
          actuator: control.actuator,
          state: false,
        });
      }
      lessonSessions.set(sessionKey, { ...saved, runtime: rt });
    },
    [sessionKey, project, lesson],
  );
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
  const chooseFragment = (id: string) => {
    const f = r.fragments.find((f) => f.id === id)!;
    const ids = [...f.conductorIds, ...f.bridgeIds];
    const wires = [
      ...project.circuit.conductors,
      ...project.circuit.bridges,
    ].filter((w) => ids.includes(w.id));
    setFragmentId(id);
    setHighlight({
      wireIds: ids,
      deviceIds: [
        ...new Set(wires.flatMap((w) => [w.from.deviceId, w.to.deviceId])),
      ],
      terminals: wires.flatMap((w) => [w.from, w.to]),
    });
  };
  const act = (action: RuntimeAction) => {
    // A paused lesson still releases held contacts and can disconnect energy.
    if (
      paused &&
      !("state" in action && action.state === false) &&
      !(action.type === "power" && !action.on)
    )
      return;
    setRuntime((rt) => advance(project, rt, action));
  };
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
    red: lesson.probe.red,
    black: lesson.probe.black,
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
      <h1 tabIndex={-1}>{r.taskId} — od schematu do zacisków</h1>
      <details>
        <summary>Źródło i ograniczenia wzorca</summary>
        <p>{r.title}</p>
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
      </details>
      {errors.length > 0 && (
        <p role="alert">Nieprawidłowe odwołania lekcji: {errors.join(", ")}</p>
      )}
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
      <nav className="reference-steps" aria-label="Kroki lekcji">
        {lesson.steps.map((s, i) => (
          <button
            key={s.title}
            aria-current={step === i ? "step" : undefined}
            onClick={() => setStep(i)}
          >
            {s.title}
          </button>
        ))}
      </nav>
      <p className="reference-instruction">{lesson.steps[step].instruction}</p>
      <div className="reference-workspace">
        <div className="reference-console">
          <h2 className="sr-only">Tor, sterowanie i wynik</h2>
          <div className="reference-fragments">
            {r.fragments.map((f) => (
              <button
                key={f.id}
                aria-pressed={fragmentId === f.id}
                onClick={() => {
                  chooseFragment(f.id);
                }}
              >
                {f.title}
              </button>
            ))}
          </div>
          <p>{fragment.explanation}</p>
          <p className="small-help">
            Cały tor: {fragment.conductorIds.length} żył /{" "}
            {fragment.bridgeIds.length} mostków. Pomarańczowa grubsza linia:
            połączenie; fioletowe przerywane obramowanie: wspólny mechanizm.
          </p>
          <div
            className="reference-controls reference-fragments"
            tabIndex={0}
            aria-label="Sterowanie lekcji"
          >
            <button
              disabled={paused}
              onClick={() => act({ type: "power", on: !runtime.energized })}
            >
              {runtime.energized
                ? "Wyłącz energię lekcji"
                : "Załącz energię lekcji"}
            </button>
            <ReferenceControls
              controls={lesson.controls}
              runtime={runtime}
              act={act}
              paused={paused}
            />
            <button
              onClick={() => {
                setRuntime(initialRuntime(project));
                setHighlight({ deviceIds: [], terminals: [] });
              }}
            >
              Reset lekcji
            </button>
          </div>
          <p role="status" className="reference-result">
            {lesson.indicators
              .map((indicator) => {
                const state = runtime.devices[indicator.deviceId];
                const text =
                  indicator.kind === "powered"
                    ? state.powered
                      ? "świeci"
                      : "zgaszona"
                    : indicator.kind === "mechanism"
                      ? state.mechanism
                        ? "załączony"
                        : "wyłączony"
                      : indicator.kind === "direction"
                        ? !state.powered
                          ? "stoi"
                          : state.direction === "123"
                            ? "prawy"
                            : "lewy"
                        : indicator.kind === "protection"
                          ? state.tripped
                            ? "TRIPPED"
                            : state.manual
                              ? "ON"
                              : "OFF"
                          : indicator.kind === "auxiliary"
                            ? auxiliaryMechanism(
                                project,
                                runtime,
                                indicator.deviceId,
                              )
                              ? "zamknięty"
                              : "otwarty"
                            : state.tripped
                              ? "wyzwolony"
                              : "niewyzwolony";
                return `${indicator.deviceId}: ${text}`;
              })
              .join(" · ")}{" "}
            · {lesson.probe.label}:{" "}
            {voltage.value?.toFixed(1) ?? "brak odczytu"} V.
          </p>
          <div className="reference-view-controls">
            <button
              aria-pressed={view === "schematic"}
              onClick={() => setView("schematic")}
            >
              Schemat lekcji
            </button>
            <button
              aria-pressed={view === "physical"}
              onClick={() => setView("physical")}
            >
              Tablica lekcji
            </button>
            <button aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
              {paused ? "Wznów lekcję" : "Pauza lekcji"}
            </button>
          </div>
          {highlight.terminals.length > 0 && (
            <p className="small-help" data-lesson-selection>
              Zaciski:{" "}
              {highlight.terminals
                .map(terminalKey)
                .filter((v, i, a) => a.indexOf(v) === i)
                .slice(0, 4)
                .join(", ")}
            </p>
          )}
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
        </div>
        <div
          className="reference-diagrams"
          data-view="schematic"
          hidden={view !== "schematic"}
        >
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
        </div>
        <div
          className="reference-diagrams"
          data-view="physical"
          hidden={view !== "physical"}
        >
          <h2 className="sr-only">Tablica połączeń — trasy z projektu</h2>
          <div className="reference-scroll">
            <PhysicalDiagram
              project={project}
              runtime={runtime}
              highlight={highlight}
              onHighlight={setHighlight}
            />
          </div>
        </div>
      </div>
      {step === 2 && (
        <section className="reference-trial">
          <h2>Przewidź i sprawdź</h2>
          <p>{trial.question}</p>
          <label>
            Próba
            <select
              value={trialId}
              onChange={(e) => {
                setTrialId(e.target.value);
                setPrediction(-1);
                setTrialResult("");
              }}
            >
              {lesson.trials.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.question}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Twoja odpowiedź</legend>
            {trial.answers.map((answer, i) => (
              <label key={answer}>
                <input
                  type="radio"
                  name="prediction"
                  checked={prediction === i}
                  onChange={() => setPrediction(i)}
                />
                {answer}
              </label>
            ))}
          </fieldset>
          <button
            disabled={paused || prediction < 0}
            onClick={() => {
              let rt = initialRuntime(project);
              for (const action of trial.actions)
                rt = advance(project, rt, action);
              setRuntime(rt);
              const matches = trial.expected.every(
                (e) => rt.devices[e.deviceId][e.field] === e.value,
              );
              setTrialResult(
                !matches
                  ? "Wynik solvera różni się od oczekiwania lekcji — próba wymaga sprawdzenia."
                  : `${prediction === trial.correctAnswer ? "Trafne przewidywanie." : "Porównaj swoje przewidywanie z wynikiem."} ${trial.explanation}`,
              );
            }}
          >
            Sprawdź przewidywanie
          </button>
          <p role="status">{trialResult}</p>
        </section>
      )}
      <details className="reference-wire-table">
        <summary>Tabela połączeń z obwodu</summary>
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
                  <tr
                    key={w.id}
                    aria-selected={
                      highlight.wireId === w.id ||
                      highlight.wireIds?.includes(w.id)
                    }
                  >
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
      </details>
      <details>
        <summary>Lista elementów modelu — rzeczywiste instancje</summary>
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
      </details>
      <details className="reference-profiles">
        <summary>Profile aparatów</summary>
        {r.profiles.map((profile) => (
          <details key={profile.productId}>
            <summary>{catalog[profile.productId].displayNamePl}</summary>
            <p>{profile.modelLabel}</p>
            <p>
              {cardSection(
                resolveKnowledge(profile.productId)?.articleId ??
                  profile.articleId,
                "operation",
              )}
            </p>
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
            <a
              onClick={() => rememberLessonReturn(r.id)}
              href={cardHref(
                resolveKnowledge(profile.productId)?.articleId ??
                  profile.articleId,
              )}
            >
              Przeczytaj teorię i źródła
            </a>
          </details>
        ))}
      </details>
    </section>
  );
}

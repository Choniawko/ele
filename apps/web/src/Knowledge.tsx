import { useEffect, useRef, useState } from "react";
import { catalog } from "@catalog/index";
import type { Conductor, Bridge } from "@model/index";
import { advance, initialRuntime } from "@simulation/index";
import {
  articles,
  lessons,
  circuits,
  coverage,
  glossary,
} from "../../../packages/knowledge/content";
import {
  examples,
  createDemo,
  demoAction,
  demoCopy,
  deviceByName,
} from "../../../packages/knowledge/examples";
import {
  FunctionalDiagram,
  PhysicalDiagram,
  ProductIllustration,
} from "../../../packages/knowledge/Diagram";
import {
  contextExplanation,
  resolveKnowledge,
  bindings,
  validContext,
} from "../../../packages/knowledge/bindings";
import {
  progressKey,
  readProgress,
  searchKnowledge,
} from "../../../packages/knowledge";
import type {
  ContentKind,
  Highlight,
  KnowledgeSource,
} from "../../../packages/knowledge/types";
import { sources } from "../../../packages/knowledge/sources";
import {
  readContext,
  readProductSelection,
  returnToWorkbench,
} from "./knowledge-navigation";
import { useApp } from "./store";
import "./knowledge.css";
const href = (kind: string, slug: string) => `#knowledge/${kind}/${slug}`;
const typeLabels = { article: "Aparat", lesson: "Lekcja", circuit: "Układ" };
function SourceList({ items }: { items: KnowledgeSource[] }) {
  return (
    <ol className="knowledge-sources">
      {items.map((s) => (
        <li key={s.id}>
          <a href={s.url} target="_blank" rel="noreferrer">
            {s.title}
          </a>
          <span>
            {s.locator} · sprawdzenie: {s.verifiedAt}
          </span>
        </li>
      ))}
    </ol>
  );
}
function Demo({ id }: { id: string }) {
  const [project] = useState(() => createDemo(id));
  const example = examples.find((e) => e.id === id)!;
  const [runtime, setRuntime] = useState(() =>
    advance(project, initialRuntime(project), { type: "solve" }),
  );
  const [stepIndex, setStepIndex] = useState(0),
    [live, setLive] = useState(false),
    [scopeIndex, setScopeIndex] = useState(0),
    [representation, setRepresentation] = useState("schematic"),
    [zoom, setZoom] = useState(false),
    [zoomPhysical, setZoomPhysical] = useState(false),
    [highlight, setHighlight] = useState<Highlight>({
      deviceIds: [],
      terminals: [],
    }),
    [copyError, setCopyError] = useState("");
  const zoomDialog = useRef<HTMLDialogElement>(null),
    zoomTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (zoom) zoomDialog.current?.showModal();
    else zoomDialog.current?.close();
  }, [zoom]);
  const scope = example.diagrams[scopeIndex];
  const currentStep = example.steps[stepIndex];
  const next = () => {
    if (!currentStep) return;
    setRuntime((rt) => advance(project, rt, demoAction(project, currentStep)));
    setStepIndex((i) => i + 1);
    setLive(true);
  };
  const reset = () => {
    setRuntime(advance(project, initialRuntime(project), { type: "solve" }));
    setStepIndex(0);
    setHighlight({ deviceIds: [], terminals: [] });
    setLive(false);
  };
  const diagram = (
    <FunctionalDiagram
      project={project}
      runtime={runtime}
      scope={scope}
      live={live}
      highlight={highlight}
      onHighlight={setHighlight}
    />
  );
  return (
    <section
      className="knowledge-demo"
      aria-label={`Przykład ${example.title}`}
    >
      <div className="knowledge-demo-header">
        <div>
          <span className="knowledge-eyebrow">
            Izolowany przykład · solver pracowni
          </span>
          <h2>{example.title}</h2>
        </div>
        <button onClick={reset}>Reset przykładu</button>
        <button
          onClick={async () => {
            try {
              await useApp.getState().flushSave();
              useApp.getState().load(demoCopy(project));
              returnToWorkbench();
            } catch (error) {
              setCopyError(String(error));
            }
          }}
        >
          Otwórz kopię w pracowni
        </button>
      </div>
      {copyError && <p role="alert">{copyError}</p>}
      <div className="knowledge-demo-controls">
        <label>
          <input
            type="checkbox"
            checked={live}
            onChange={(e) => setLive(e.target.checked)}
          />{" "}
          Widok działania
        </label>
        <span>
          {live
            ? "Styki pokazują obliczony stan."
            : "Dokumentacja: styki w stanie odniesienia."}
        </span>
        <button
          ref={zoomTrigger}
          onClick={(e) => {
            zoomTrigger.current = e.currentTarget;
            setZoomPhysical(false);
            setZoom(true);
          }}
        >
          Powiększ rysunek
        </button>
        <button
          onClick={(e) => {
            zoomTrigger.current = e.currentTarget;
            setZoomPhysical(true);
            setZoom(true);
          }}
        >
          Powiększ tablicę
        </button>
      </div>
      <div className="knowledge-tabs" aria-label="Zakres schematu">
        {example.diagrams.map((d, i) => (
          <button
            key={d.title}
            aria-pressed={scopeIndex === i}
            onClick={() => setScopeIndex(i)}
          >
            {i === 0 ? "Sterowanie / funkcja" : "Tor mocy"}
          </button>
        ))}
      </div>
      <p className="knowledge-scope">
        Zakres: {scope.title}. Linie są projekcją topologii. Powiązanie
        mechanizmu nie jest przewodem.
      </p>
      <div className="knowledge-mobile-tabs" aria-label="Reprezentacja">
        <button
          aria-pressed={representation === "schematic"}
          onClick={() => setRepresentation("schematic")}
        >
          Schemat
        </button>
        <button
          aria-pressed={representation === "physical"}
          onClick={() => setRepresentation("physical")}
        >
          Tablica fizyczna
        </button>
      </div>
      <div className={`knowledge-views show-${representation}`}>
        <figure className="knowledge-functional">
          {diagram}
          <figcaption>
            Schemat funkcjonalny · kliknij fragment symbolu
          </figcaption>
        </figure>
        <figure className="knowledge-physical">
          <PhysicalDiagram
            project={project}
            runtime={runtime}
            highlight={highlight}
            onHighlight={setHighlight}
          />
          <figcaption>
            Tablica fizyczna · te same instancje i zaciski
          </figcaption>
        </figure>
      </div>
      <div className="knowledge-highlight" aria-live="polite">
        {highlight.terminals.length
          ? `Wskazano: ${highlight.terminals.map((ref) => `${project.circuit.devices.find((d) => d.id === ref.deviceId)?.designation}:${ref.terminalId}`).join(" ↔ ")}`
          : "Wybierz symbol lub wiersz połączenia, aby odszukać te same zaciski w drugim widoku."}
      </div>
      <div className="knowledge-demo-step">
        <div>
          <strong>
            Krok {Math.min(stepIndex + 1, example.steps.length)} /{" "}
            {example.steps.length}: {currentStep?.title ?? "Próba zakończona"}
          </strong>
          <p>
            {currentStep?.explanation ??
              "Porównaj końcowy stan z przewidywaniem. Reset rozpocznie nową próbę tylko tego przykładu."}
          </p>
        </div>
        <button
          className="knowledge-primary"
          disabled={!currentStep}
          onClick={next}
        >
          {currentStep
            ? `Wykonaj: ${currentStep.title}`
            : "Wykonano wszystkie kroki"}
        </button>
      </div>
      <div
        className="knowledge-readouts"
        aria-live="polite"
        data-testid="knowledge-readouts"
      >
        {example.observe.map((name) => {
          const d = deviceByName(project, name),
            state = runtime.devices[d.id];
          return (
            <p key={d.id}>
              <strong>{name}</strong>
              {catalog[d.productId].topology.coil
                ? `mechanizm ${state.mechanism ? "ON" : "OFF"} · cewka ${state.coil ? "ON" : "OFF"}`
                : `odbiornik ${state.powered ? "ON" : "OFF"}`}
              {state.direction ? ` · kierunek ${state.direction}` : ""}
              <span>
                {state.voltageV === null
                  ? "Napięcie nieokreślone"
                  : `${state.voltageV.toFixed(2)} V`}{" "}
                · {state.currentA.toFixed(3)} A
              </span>
            </p>
          );
        })}
        <p>Status solvera: {runtime.status}</p>
      </div>
      {runtime.errors.length > 0 && (
        <p role="alert">{runtime.errors.join("; ")}</p>
      )}
      <details>
        <summary>Mechanizmy i sprzężenia — nie przewody</summary>
        <ul>
          {project.circuit.mechanicalCouplings.map((c) => (
            <li key={c.id}>
              {c.kind === "assembly"
                ? "Wspólny mechanizm aparatu i bloku"
                : "Blokada mechaniczna"}
              :{" "}
              {c.deviceIds
                .map(
                  (id) =>
                    project.circuit.devices.find((d) => d.id === id)
                      ?.designation,
                )
                .join(" ↔ ")}
            </li>
          ))}
        </ul>
        {!project.circuit.mechanicalCouplings.length && (
          <p>Ten przykład nie ma osobnych sprzężeń mechanicznych.</p>
        )}
      </details>
      <details>
        <summary>Historia stanów i czynności</summary>
        <ol>
          {example.steps.slice(0, stepIndex).map((s, i) => (
            <li key={i}>
              {s.title} — {s.explanation}
            </li>
          ))}
        </ol>
        <ul>
          {runtime.events.map((e) => (
            <li key={e.id}>
              {e.timeMs} ms: {e.message}
            </li>
          ))}
        </ul>
      </details>
      <details open>
        <summary>Tabela połączeń zaciskowych — fizyczne żyły i mostki</summary>
        <div className="knowledge-table-wrap">
          <table>
            <caption>
              Każdy wiersz pochodzi z CircuitModel. Wybór wskazuje oba końce.
            </caption>
            <thead>
              <tr>
                <th>Żyła</th>
                <th>Początek</th>
                <th>Koniec</th>
                <th>Rola / przekrój</th>
              </tr>
            </thead>
            <tbody>
              {(
                [...project.circuit.conductors, ...project.circuit.bridges] as (
                  Conductor | Bridge
                )[]
              ).map((w) => {
                const name = (r: typeof w.from) =>
                  `${project.circuit.devices.find((d) => d.id === r.deviceId)?.designation}:${r.terminalId}`;
                return (
                  <tr
                    key={w.id}
                    className={highlight.wireId === w.id ? "selected" : ""}
                  >
                    <td>
                      <button
                        aria-pressed={highlight.wireId === w.id}
                        aria-label={`Wskaż ${name(w.from)} do ${name(w.to)}`}
                        onClick={() =>
                          setHighlight({
                            wireId: w.id,
                            deviceIds: [w.from.deviceId, w.to.deviceId],
                            terminals: [w.from, w.to],
                          })
                        }
                      >
                        {"marking" in w ? w.marking : "Mostek"}
                      </button>
                    </td>
                    <td>{name(w.from)}</td>
                    <td>{name(w.to)}</td>
                    <td>
                      {"declaredRole" in w
                        ? `${w.declaredRole} · ${w.crossSectionMm2} mm²`
                        : "Połączenie stałe"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
      <dialog
        ref={zoomDialog}
        className="knowledge-zoom"
        onCancel={() => setZoom(false)}
        onClose={() => {
          setZoom(false);
          zoomTrigger.current?.focus();
        }}
      >
        <button onClick={() => setZoom(false)}>
          Zamknij powiększenie (Esc)
        </button>
        <div className="knowledge-zoom-scroll">
          {zoomPhysical ? (
            <PhysicalDiagram
              project={project}
              runtime={runtime}
              highlight={highlight}
              onHighlight={setHighlight}
            />
          ) : (
            diagram
          )}
        </div>
      </dialog>
    </section>
  );
}
export function Knowledge({ route }: { route: string }) {
  const project = useApp((s) => s.project);
  const [query, setQuery] = useState(""),
    [qualification, setQualification] = useState(""),
    [level, setLevel] = useState(""),
    [kind, setKind] = useState<ContentKind | "">(""),
    [department, setDepartment] = useState(""),
    [progress, setProgress] = useState(readProgress),
    [progressNotice, setProgressNotice] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const context = readContext();
  const valid = validContext(project, context);
  const [, routeKind, slug] = route.split("/");
  const article =
    routeKind === "article" ? articles.find((a) => a.slug === slug) : undefined;
  const lesson =
    routeKind === "lesson"
      ? lessons.find((l) => l.slug === slug)
      : routeKind === "circuit"
        ? circuits.find((l) => l.slug === slug)
        : undefined;
  const item = article ?? lesson;
  const pickedId = context
    ? (valid?.productId ?? null)
    : readProductSelection();
  const pickedProduct =
    pickedId &&
    resolveKnowledge(pickedId)?.exact &&
    resolveKnowledge(pickedId)?.articleId === article?.id
      ? catalog[pickedId]
      : undefined;
  useEffect(() => {
    titleRef.current?.focus();
    document.querySelector(".knowledge-page")?.scrollTo(0, 0);
  }, [route]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        !document.querySelector("dialog[open]") &&
        location.hash.startsWith("#knowledge")
      )
        returnToWorkbench();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  const markRead = () => {
    if (!item) return;
    const next = {
      version: 1 as const,
      read: { ...progress.read, [item.id]: new Date().toISOString() },
    };
    setProgress(next);
    try {
      localStorage.setItem(progressKey, JSON.stringify(next));
      setProgressNotice("Zapisano progres czytania lokalnie.");
    } catch {
      setProgressNotice(
        "Progres tej sesji jest widoczny, ale nie udało się zapisać go lokalnie.",
      );
    }
  };
  const knowledgeTotal = articles.length + lessons.length + circuits.length;
  const results = searchKnowledge(
    query,
    qualification,
    level,
    kind,
    department,
  );
  return (
    <div className="knowledge-page">
      <header className="knowledge-header">
        <a href="#knowledge" className="knowledge-brand">
          Pracownia / Baza wiedzy
        </a>
        <button onClick={() => returnToWorkbench()}>
          Wróć do mojego układu
        </button>
      </header>
      <main className="knowledge-main">
        {context && (
          <aside className="knowledge-context">
            <p>{contextExplanation(project, context)}</p>
            <button disabled={!valid} onClick={() => returnToWorkbench(true)}>
              Pokaż w moim układzie
            </button>
            <p className="small-help">
              Pomoc opisuje aparat. Nie rozpoznaje automatycznie jego roli w
              Twoim własnym obwodzie.
            </p>
          </aside>
        )}
        {item ? (
          <>
            <a href="#knowledge">← Wszystkie materiały</a>
            <span className="knowledge-eyebrow">
              {typeLabels[article ? "article" : lesson!.kind]} · {item.level} ·{" "}
              {item.qualifications.join(" / ")}
            </span>
            <h1 ref={titleRef} tabIndex={-1}>
              {item.title}
            </h1>
            <p className="knowledge-lead">{item.summary}</p>
            {article ? (
              <>
                <nav className="knowledge-toc" aria-label="Spis treści">
                  {article.sections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() =>
                        document
                          .getElementById(`section-${s.id}`)
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          })
                      }
                    >
                      {s.title}
                    </button>
                  ))}
                </nav>
                <ProductIllustration
                  productId={pickedProduct?.id ?? article.illustrationProductId}
                />
                {pickedProduct && (
                  <section className="knowledge-prose knowledge-product-map">
                    <h2>Wybrany model: {pickedProduct.displayNamePl}</h2>
                    <p>
                      {pickedProduct.educational
                        ? "Jawny profil dydaktyczny; nie dane przemysłowego SKU."
                        : `Produkt katalogowy: ${pickedProduct.manufacturer} ${pickedProduct.manufacturerPartNumber}.`}
                    </p>
                    {pickedProduct.topology.coil && (
                      <p>
                        Cewka tego modelu:{" "}
                        <strong>
                          {pickedProduct.topology.coil.voltageV} V{" "}
                          {pickedProduct.topology.coil.kind}
                        </strong>{" "}
                        · zaciski {pickedProduct.topology.coil.plus}/
                        {pickedProduct.topology.coil.minus}.
                      </p>
                    )}
                    <div className="knowledge-table-wrap">
                      <table>
                        <caption>
                          Mapa wybranego modelu. Funkcja w Twoim układzie wynika
                          z połączeń, nie z samego numeru.
                        </caption>
                        <thead>
                          <tr>
                            <th>Zacisk</th>
                            <th>Znaczenie</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pickedProduct.topology.terminals.map((t) => (
                            <tr key={t.id}>
                              <th scope="row">{t.label}</th>
                              <td>
                                {bindings.find(
                                  (b) => b.productId === pickedProduct.id,
                                )?.terminals[t.id]?.explanation ?? t.role}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <ul>
                      {pickedProduct.limitations.map((text, i) => (
                        <li key={i}>{text}</li>
                      ))}
                    </ul>
                  </section>
                )}
                <div className="knowledge-prose">
                  {article.sections.map((section) => (
                    <section key={section.id} id={`section-${section.id}`}>
                      <h2>{section.title}</h2>
                      {section.paragraphs.map((text, i) => (
                        <p key={i}>{text}</p>
                      ))}
                      <small>
                        Źródła:{" "}
                        {section.sourceIds.map((id, i) => (
                          <span key={id}>
                            {i > 0 ? " · " : ""}
                            <a
                              href={
                                article.sources.find((s) => s.id === id)!.url
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              {article.sources.find((s) => s.id === id)!.title}
                            </a>
                          </span>
                        ))}
                      </small>
                    </section>
                  ))}
                </div>
              </>
            ) : (
              <div className="knowledge-prose">
                <h2>Cel i stan początkowy</h2>
                <p>{lesson!.goal}</p>
                <p>{lesson!.initial}</p>
                <h2>Przewidź przed działaniem</h2>
                <p>{lesson!.prediction}</p>
                <label>
                  Moje przewidywanie (bez oceny)
                  <textarea placeholder="Opisz oczekiwany stan i drogę zasilania…" />
                </label>
                <h2>Znajdź to samo w obu widokach</h2>
                <p>{lesson!.explanation}</p>
              </div>
            )}
            {(article?.exampleId ?? lesson?.exampleId) ? (
              <Demo
                key={article?.exampleId ?? lesson?.exampleId}
                id={(article?.exampleId ?? lesson?.exampleId)!}
              />
            ) : (
              <p className="knowledge-limit">
                Brak przygotowanego interaktywnego przykładu dla tego materiału.
                Ilustracja i teoria pozostają dostępne; modele edukacyjne
                znajdziesz w katalogu pracowni.
              </p>
            )}
            {article?.id === "stycznik" && (
              <div className="knowledge-next">
                <h2>Dalej: START/STOP i podtrzymanie</h2>
                <a href={href("lesson", "szeregowo-rownolegle")}>
                  Przeczytaj lekcję podtrzymania →
                </a>
                <a href={href("circuit", "start-stop")}>
                  Uruchom pełny układ START/STOP →
                </a>
              </div>
            )}
            <section className="knowledge-prose">
              <h2>Materiały powiązane</h2>
              <div className="knowledge-related">
                {item.related.map((id) => {
                  const a = articles.find((a) => a.id === id)!;
                  return (
                    <a key={id} href={href("article", a.slug)}>
                      {a.title}
                    </a>
                  );
                })}
              </div>
              <h2>Źródła i lokalizatory</h2>
              <SourceList items={item.sources} />
              <button onClick={markRead}>
                {progress.read[item.id]
                  ? "Przeczytano ✓"
                  : "Oznacz jako przeczytane"}
              </button>
              <p role="status">{progressNotice}</p>
            </section>
          </>
        ) : routeKind && routeKind !== "map" ? (
          <>
            <h1 ref={titleRef} tabIndex={-1}>
              Nie znaleziono materiału
            </h1>
            <a href="#knowledge">Wróć do bazy wiedzy</a>
          </>
        ) : (
          <>
            <div className="knowledge-hero">
              <span className="knowledge-eyebrow">
                ELE.02 / ELE.05 · od symbolu do zacisku
              </span>
              <h1 ref={titleRef} tabIndex={-1}>
                Baza wiedzy
              </h1>
              <p className="knowledge-lead">
                Zrozum aparat, przeczytaj schemat i odnajdź połączenie na
                tablicy.
              </p>
              <a
                className="knowledge-primary"
                href={href("lesson", "linia-i-zyla")}
              >
                Uczę się od podstaw →
              </a>
              <span>
                {Object.keys(progress.read).length} / {knowledgeTotal}{" "}
                materiałów przeczytanych
              </span>
            </div>
            <div className="knowledge-departments">
              {[
                ["lesson", "Czytanie schematów"],
                ["article", "Aparaty i osprzęt"],
                ["circuit", "Układy bazowe"],
                ["measurements", "Pomiary i diagnoza"],
                ["selection", "Podstawy i dobór"],
                ["map", "Mapa ELE.02/ELE.05"],
              ].map(([id, title]) => (
                <button
                  key={id}
                  aria-pressed={department === id}
                  onClick={() => {
                    if (["measurements", "selection", "map"].includes(id)) {
                      document
                        .getElementById("coverage")
                        ?.scrollIntoView({ behavior: "smooth" });
                    } else setDepartment(department === id ? "" : id);
                  }}
                >
                  {title}
                </button>
              ))}
            </div>
            <section
              aria-label="Wyszukiwanie materiałów"
              className="knowledge-filters"
            >
              <label>
                Szukaj w bazie
                <input
                  type="search"
                  placeholder="np. podtrzymanie, różnicówka, LC1D09P7"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <label>
                Kwalifikacja
                <select
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                >
                  <option value="">Wszystkie</option>
                  <option>ELE.02</option>
                  <option>ELE.05</option>
                </select>
              </label>
              <label>
                Poziom
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                >
                  <option value="">Wszystkie</option>
                  <option>Podstawy</option>
                  <option>Średni</option>
                </select>
              </label>
              <label>
                Typ treści
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as ContentKind | "")}
                >
                  <option value="">Wszystkie</option>
                  <option value="article">Aparaty</option>
                  <option value="lesson">Lekcje</option>
                  <option value="circuit">Układy</option>
                </select>
              </label>
            </section>
            <p role="status">{results.length} materiałów</p>
            <div className="knowledge-cards">
              {results.map((c) => (
                <a
                  className="knowledge-card"
                  key={c.id}
                  href={href(c.kind, c.slug)}
                >
                  <span className="knowledge-eyebrow">
                    {typeLabels[c.kind]} · {c.level}
                    {progress.read[c.id] ? " · przeczytano ✓" : ""}
                  </span>
                  <h2>{c.title}</h2>
                  <p>{c.summary}</p>
                  <span>Otwórz materiał →</span>
                </a>
              ))}
            </div>
            {!results.length && (
              <p>Brak wyników. Spróbuj synonimu lub usuń filtr.</p>
            )}
            <section id="coverage">
              <h2>Mapa ELE.02/ELE.05 i plan zakresu</h2>
              <p>
                Pierwsze wydanie: {articles.length} artykułów, {circuits.length}{" "}
                układów, {lessons.length} lekcji. To część przygotowania do
                kwalifikacji. Status treści i dostępność praktyki są odrębne.
              </p>
              <div className="knowledge-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Temat</th>
                      <th>Zakres</th>
                      <th>Treść</th>
                      <th>Praktyka</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coverage.map((c) => (
                      <tr key={c.id}>
                        <td>
                          {c.title}
                          <small>{c.locator}</small>
                        </td>
                        <td>{c.tags.join(", ")}</td>
                        <td>
                          {c.contentStatus === "published"
                            ? "Gotowe materiały"
                            : "W planie"}
                        </td>
                        <td>
                          {c.practiceStatus === "interactive"
                            ? "Wybrane przykłady interaktywne"
                            : "Brak w tym wydaniu"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Samodzielne rysowanie fragmentów jest w planie. Przyszła ocena
                będzie porównywać topologię, niezależnie od położenia symboli.
              </p>
              <SourceList
                items={[sources.men, sources.curriculum, sources.cke]}
              />
            </section>
          </>
        )}
        <details className="knowledge-glossary">
          <summary>Słownik w kontekście</summary>
          <dl>
            {glossary.map(([word, definition]) => (
              <div key={word}>
                <dt>{word}</dt>
                <dd>{definition}</dd>
              </div>
            ))}
          </dl>
        </details>
        <footer>
          Autorskie objaśnienia i SVG. Konwencje dydaktyczne z odniesieniami do
          dokumentacji; bez deklaracji zgodności rysunków z normą. Progres
          czytania zapisuje się osobno od instalacji.
        </footer>
      </main>
    </div>
  );
}

import { ReferenceLesson } from "./ReferenceLesson";
import {
  referenceById,
  referenceByTask,
  referenceExamples,
} from "../../../packages/knowledge/reference-examples";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  examTasks,
  examArticles,
  examComponents,
  examIssues,
  examSources,
  manufacturerSources,
  examAvailability,
  shoppingKit,
  searchExamKnowledge,
  readyTaskCount,
  componentArticle,
  currentMapping,
  taskHref,
  examArticleHref,
  componentHref,
  examTaskBySlug,
  referenceIsReady,
  type ExamTask,
  type SourceFigure,
} from "../../../packages/knowledge/exams";
import { returnToWorkbench } from "./knowledge-navigation";
import "./knowledge.css";
import "./exam-knowledge.css";
const SchematicCourse = lazy(() => import("./SchematicCourse"));

const sections = ["Rysunek", "Działanie", "Aparaty", "Próby"];
const asset = (path: string) =>
  `${import.meta.env.BASE_URL}knowledge/ele02/${path}`;
function Figures({ task }: { task: ExamTask }) {
  const [enlarged, setEnlarged] = useState<SourceFigure | null>(null);
  const [scale, setScale] = useState(1);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (enlarged) dialog.current?.showModal();
    else dialog.current?.close();
  }, [enlarged]);
  return (
    <>
      <div className="exam-figures">
        {task.schematics.map((f) => (
          <figure key={f.id}>
            <img
              src={asset(f.png)}
              alt={f.alt}
              loading="lazy"
              decoding="async"
            />
            <figcaption>
              {f.kind} · PDF {f.sourcePage} ·{" "}
              {f.isIncompleteInSource
                ? "Szkic do uzupełnienia w źródle"
                : "Oryginał arkusza"}
            </figcaption>
            <button
              onClick={(e) => {
                trigger.current = e.currentTarget;
                setScale(1);
                setEnlarged(f);
              }}
            >
              Powiększ: {f.kind}
            </button>
            <a href={asset(f.svg)} target="_blank" rel="noreferrer">
              Oryginalny wycinek SVG
            </a>
          </figure>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="knowledge-zoom exam-zoom"
        aria-label="Powiększony rysunek źródłowy"
        onCancel={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setEnlarged(null);
        }}
        onClose={() => {
          setEnlarged(null);
          trigger.current?.focus();
        }}
      >
        <div className="exam-zoom-controls">
          <button onClick={() => setEnlarged(null)}>
            Zamknij powiększenie (Esc)
          </button>
          <button
            disabled={scale <= 0.5}
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
          >
            Pomniejsz rysunek
          </button>
          <output aria-live="polite">{Math.round(scale * 100)}%</output>
          <button
            disabled={scale >= 3}
            onClick={() => setScale((s) => Math.min(3, s + 0.25))}
          >
            Powiększ rysunek
          </button>
        </div>
        {enlarged && (
          <>
            <p>
              {enlarged.kind} · strona PDF {enlarged.sourcePage}.{" "}
              {enlarged.derivation}
            </p>
            <div
              className="knowledge-zoom-scroll"
              tabIndex={0}
              aria-label="Przewijaj rysunek"
            >
              <img
                src={asset(enlarged.svg)}
                alt={enlarged.alt}
                style={{ width: `${1000 * scale}px`, maxWidth: "none" }}
              />
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
function Manuals({ ids }: { ids: string[] }) {
  return (
    <ul className="knowledge-sources">
      {ids.map((id) => {
        const s = manufacturerSources.find((s) => s.id === id)!;
        return (
          <li key={id}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.title}
            </a>
            <span>
              {s.scope} · Weryfikacja materiału wejściowego: {s.checkedAt}
            </span>
            <span>{s.notice}</span>
          </li>
        );
      })}
    </ul>
  );
}
function Mapping({ id }: { id: string }) {
  const { mapping, product, matches } = currentMapping(id);
  const labels = {
    "educational-model": "Model dydaktyczny",
    "partial-adaptation": "Częściowa adaptacja",
    "missing-model": "Model do opracowania",
    "physical-layout": "Warstwa montażowa",
    "material-only": "Materiał / osprzęt mechaniczny",
  };
  if (!mapping) return null;
  return (
    <aside className="knowledge-limit">
      <strong>{labels[mapping.status]}</strong>
      <p>{mapping.note}</p>
      {mapping.productId && (
        <p>
          {matches
            ? `Zgodna rewizja w bieżącym katalogu: ${product!.displayNamePl}.`
            : "Mapowanie z paczki wymaga ponownego sprawdzenia w bieżącym katalogu."}
          {matches && (
            <span>
              {" "}
              {product!.educational
                ? "Profil edukacyjny; nie potwierdza rzeczywistego SKU."
                : "Produkt opublikowany w katalogu."}
            </span>
          )}
        </p>
      )}
    </aside>
  );
}
function Task({ task }: { task: ExamTask }) {
  const [tab, setTab] = useState(0);
  const source = examSources.find((s) => s.id === task.sourceId)!;
  const issues = examIssues.filter((i) => i.taskId === task.id);
  const ref = examAvailability.find((r) => r.taskId === task.id)!;
  const reference = referenceByTask(task.id);
  return (
    <>
      <span className="knowledge-eyebrow">
        ELE.02 · {task.code} · {task.category}
      </span>
      <h1 tabIndex={-1}>
        {task.id} — {task.title}
      </h1>
      <p className="knowledge-lead">{task.summary}</p>
      {reference ? (
        <p className="exam-cta">
          <a className="exam-cta-link" href={`#/wiedza/uklady/${reference.id}`}>
            {referenceIsReady(ref)
              ? "Gotowy układ i lekcja torów"
              : "Obejrzyj opracowanie modelu"}
          </a>
          <span>Schemat, tablica montażowa i działanie w jednej lekcji.</span>
        </p>
      ) : (
        <p className="exam-status">
          Na razie: rysunki z arkusza i opis. Lekcja interaktywna jest w
          przygotowaniu.
        </p>
      )}
      <div
        className="exam-reading-tabs"
        role="tablist"
        aria-label="Części zadania"
      >
        {sections.map((label, i) => (
          <button
            key={label}
            role="tab"
            id={`exam-tab-${i}`}
            aria-controls={`exam-panel-${i}`}
            aria-selected={tab === i}
            tabIndex={tab === i ? 0 : -1}
            onClick={() => setTab(i)}
            onKeyDown={(e) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
                return;
              e.preventDefault();
              const next =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? 3
                    : (tab + (e.key === "ArrowRight" ? 1 : 3)) % 4;
              setTab(next);
              document.getElementById(`exam-tab-${next}`)?.focus();
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={`exam-task show-exam-${tab}`}>
        <section
          className="exam-part exam-part-0"
          id="exam-panel-0"
          aria-labelledby="exam-tab-0"
        >
          <h2>Oryginał arkusza</h2>
          <Figures key={task.id} task={task} />
          <p className="small-help">
            Jak czytać ten rysunek, opisuje zakładka „Działanie”.
          </p>
          <details>
            <summary>Identyfikacja źródła i zakres</summary>
            <p>{source.fileName}</p>
            <p>
              Strony PDF: {task.sourcePages.join(", ")}. {source.pageNumbering}
            </p>
            <p className="exam-hash">SHA-256: {source.sha256}</p>
            <p>
              Czas zadania: {task.timeMinutes} min. Przekazano wycinki i
              opracowanie; pełny PDF nie jest plikiem aplikacji.
            </p>
          </details>
        </section>
        <section
          className="exam-part exam-part-1 knowledge-prose"
          id="exam-panel-1"
          aria-labelledby="exam-tab-1"
        >
          <h2>Jak czytać ten schemat</h2>
          <ol>
            {task.readingSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <h2>Czego się nauczyć</h2>
          <ul>
            {task.learningGoals.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          <h2>Typowe pomyłki</h2>
          <ul>
            {task.typicalMistakes.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          <a href={examArticleHref("czytanie-schematu")}>
            Czytanie schematu — od linii do żył
          </a>
        </section>
        <section
          className="exam-part exam-part-2"
          id="exam-panel-2"
          aria-labelledby="exam-tab-2"
        >
          <h2>Aparaty i osprzęt z arkusza</h2>
          <div className="knowledge-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Element</th>
                  <th>Ilość</th>
                  <th>Parametry z arkusza</th>
                </tr>
              </thead>
              <tbody>
                {task.bom.map((b, i) => {
                  const c = examComponents.find((c) => c.id === b.componentId)!;
                  return (
                    <tr key={`${b.componentId}-${i}`}>
                      <th scope="row">
                        <a href={componentHref(c.id)}>
                          {b.sourceName ?? c.name}
                        </a>
                      </th>
                      <td>
                        {b.quantity} {b.unit}
                      </td>
                      <td>{b.sourceParameters ?? b.note ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <details>
            <summary>Założenia modelu i warianty zakupu</summary>
            <ul>
              {task.bom.map((b, i) => {
                const c = examComponents.find((c) => c.id === b.componentId)!;
                return (
                  <li key={`${b.componentId}-${i}`}>
                    <strong>{b.sourceName ?? c.name}</strong> ({b.sourceLocator}
                    ).{" "}
                    {b.modelAssumptions ??
                      "Brak przyjętego wariantu modelu dla tej pozycji."}{" "}
                    Wariant zakupowy: {b.purchaseVariant ?? c.parameters}.
                    {b.sourceParameters && b.note && ` Uwaga: ${b.note}`}
                  </li>
                );
              })}
            </ul>
          </details>
          <details>
            <summary>Przewody i materiały — dane źródła</summary>
            <div className="knowledge-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Materiał</th>
                    <th>Ilość</th>
                    <th>Źródło / uwagi</th>
                  </tr>
                </thead>
                <tbody>
                  {task.materials.map((m, i) => (
                    <tr key={`${m.id}-${i}`}>
                      <th scope="row">{m.name}</th>
                      <td>
                        {m.quantity === null
                          ? "nie podano"
                          : `${m.quantity} ${m.unit}`}
                      </td>
                      <td>
                        {m.sourceLocator}
                        <small>
                          {m.scope === "station-preparation"
                            ? "Przygotowanie stanowiska"
                            : "Materiał zadania"}{" "}
                          · {m.note}
                        </small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
        <section
          className="exam-part exam-part-3 knowledge-prose"
          id="exam-panel-3"
          aria-labelledby="exam-tab-3"
        >
          <h2>Próby do wykonania</h2>
          <p>
            Co sprawdzić po zmontowaniu. To opracowanie arkusza, nie oficjalny
            klucz CKE.
          </p>
          {task.acceptanceChecks.map((c) => (
            <div className="exam-check" key={c.id}>
              <strong>{c.id}</strong>
              <p>{c.action}</p>
              <p>Oczekiwanie: {c.expected}</p>
              <small>{c.basis}</small>
            </div>
          ))}
          <details className="exam-author-notes">
            <summary>Otwarte kwestie źródła i stan opracowania</summary>
            <p>
              Stan wzorca: {ref.status} · rewizja{" "}
              {ref.referenceRevision ?? "nieustalona"}
            </p>
            <ul>
              {Object.entries(ref.gates).map(([id, status]) => (
                <li key={id}>
                  {id}: {status}
                </li>
              ))}
            </ul>
            <h2>Weryfikacja przed pełnym ćwiczeniem</h2>
            <ul>
              {task.openQuestions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
            {task.catalogGaps.length > 0 && (
              <>
                <h3>Braki modeli</h3>
                <ul>
                  {task.catalogGaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </>
            )}
            <h2>Kwestie źródłowe</h2>
            {issues.map((i) => (
              <p key={i.id}>
                <strong>{i.id} · otwarte</strong>
                <br />
                {i.description}
              </p>
            ))}
            <Manuals ids={task.manufacturerSources} />
          </details>
        </section>
      </div>
    </>
  );
}
function Component({ id }: { id: string }) {
  const c = examComponents.find((c) => c.id === id)!,
    a = componentArticle(id)!;
  return (
    <div className="knowledge-prose">
      <span className="knowledge-eyebrow">
        Zestaw stanowiska · wyjaśnienie kategorii elementów
      </span>
      <h1 tabIndex={-1}>{c.name}</h1>
      <p className="knowledge-lead">{c.parameters}</p>
      <h2>Znaczenie i dobór</h2>
      <p>{c.purchaseNotes || a.commonMistake}</p>
      <h2>Jak działa / jak stosować</h2>
      <p>{a.principle}</p>
      <h2>Jak czytać rysunek</h2>
      <p>{a.howToRead}</p>
      <h2>Co sprawdzić</h2>
      <p>{a.practiceCheck}</p>
      <h2>Typowa pomyłka</h2>
      <p>{a.commonMistake}</p>
      <Mapping id={id} />
      <a href={examArticleHref(a.id)}>Pełny artykuł: {a.title}</a>
      <h2>Zadania z tym elementem</h2>
      <div className="knowledge-related">
        {examTasks
          .filter((t) => t.bom.some((b) => b.componentId === id))
          .map((t) => (
            <a key={t.id} href={taskHref(t.code)}>
              {t.id}
            </a>
          ))}
      </div>
      <Manuals ids={a.manufacturerSources} />
    </div>
  );
}
export default function ExamKnowledge({ route }: { route: string }) {
  const [, , category = "home", slug] = route.split("/");
  const [query, setQuery] = useState("");
  const task = category === "zadania" ? examTaskBySlug(slug ?? "") : undefined;
  const article =
    category === "aparaty"
      ? examArticles.find((a) => a.id === slug)
      : undefined;
  const component =
    category === "zestaw"
      ? examComponents.find((c) => c.id === slug)
      : undefined;
  const reference =
    category === "uklady" && slug ? referenceById(slug) : undefined;
  const known = [
    "home",
    "zadania",
    "aparaty",
    "czytanie",
    "zestaw",
    "uklady",
  ].includes(category);
  const missing =
    (!!slug && !task && !article && !component && !reference) || !known;
  const result = searchExamKnowledge(query, "ELE.02");
  const page = useRef<HTMLDivElement>(null);
  useEffect(() => {
    page.current?.scrollTo(0, 0);
    page.current?.querySelector<HTMLHeadingElement>("h1")?.focus();
  }, [route]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]"))
        returnToWorkbench();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const showAll = !!query.trim();
  return (
    <div ref={page} className="knowledge-page exam-knowledge">
      <header className="knowledge-header">
        <a href="#knowledge" className="knowledge-brand">
          Pracownia / Baza wiedzy
        </a>
        <button onClick={() => returnToWorkbench()}>
          Wróć do mojego układu
        </button>
      </header>
      <main className="knowledge-main">
        <nav className="knowledge-departments" aria-label="Materiały ELE.02">
          {[
            ["home", "Start", "#knowledge"],
            ["czytanie", "Nauka schematów", "#/wiedza/czytanie"],
            ["zadania", "Zadania", "#/wiedza/zadania"],
            ["aparaty", "Aparaty", "#/wiedza/aparaty"],
          ].map(([id, label, href]) => (
            <a
              className="exam-nav"
              aria-current={
                category === id ||
                (id === "zadania" && (category === "uklady" || !!task)) ||
                (id === "aparaty" && category === "zestaw")
                  ? "page"
                  : undefined
              }
              key={id}
              href={href}
            >
              {label}
            </a>
          ))}
        </nav>
        {missing ? (
          <>
            <h1 tabIndex={-1}>Nie znaleziono materiału</h1>
            <a href="#/wiedza/zadania">Wróć do zadań</a>
          </>
        ) : reference ? (
          <ReferenceLesson key={reference.id} reference={reference} />
        ) : task ? (
          <Task key={task.id} task={task} />
        ) : article ? (
          <p>Otwieranie karty aparatu…</p>
        ) : component ? (
          <Component id={component.id} />
        ) : (
          <>
            <h1 tabIndex={-1}>
              {category === "home"
                ? "Baza wiedzy"
                : category === "uklady"
                  ? "Gotowe układy"
                  : category === "zestaw"
                    ? "Zestaw stanowiska"
                    : category === "aparaty"
                      ? "Aparaty i osprzęt"
                      : category === "czytanie"
                        ? "Nauka schematów"
                        : "Zadania ELE.02"}
            </h1>
            {category === "home" && (
              <>
                <p className="knowledge-lead">
                  Ucz się w tej kolejności: najpierw symbole i czytanie rysunku,
                  potem śledzenie torów na gotowym układzie, na końcu
                  samodzielny montaż w pracowni.
                </p>
                <ol className="knowledge-cards knowledge-start knowledge-path">
                  <li>
                    <a className="knowledge-card" href="#/wiedza/czytanie">
                      <h2>Zacznij od podstaw: symbole i czytanie arkusza</h2>
                      <p>
                        Słownik symboli i ćwiczenia na oryginalnych rysunkach
                        101 i 108.
                      </p>
                    </a>
                  </li>
                  <li>
                    <a
                      className="knowledge-card"
                      href="#/wiedza/uklady/ele02-101"
                    >
                      <h2>Prześledź tory: oświetlenie schodowe 101</h2>
                      <p>
                        Schemat, tablica i prąd w jednej lekcji. Przełączaj
                        łączniki i patrz, którędy płynie prąd.
                      </p>
                    </a>
                  </li>
                  <li>
                    <a
                      className="knowledge-card"
                      href="#/wiedza/uklady/ele02-108"
                    >
                      <h2>Sterowanie stycznikami: silnik 108</h2>
                      <p>
                        START, STOP, podtrzymanie i blokada kierunków na
                        działającym układzie.
                      </p>
                    </a>
                  </li>
                  <li>
                    <a className="knowledge-card" href="#/wiedza/zadania">
                      <h2>Ćwicz zadanie: wszystkie arkusze</h2>
                      <p>
                        17 arkuszy ELE.02 z rysunkami, listą aparatów i próbami.
                      </p>
                    </a>
                  </li>
                </ol>
                <p className="knowledge-aside-link">
                  <a href="#/wiedza/aparaty">
                    Poznaj aparat: wyszukaj nazwę, producenta lub model/SKU →
                  </a>
                </p>
              </>
            )}
            {(category === "zadania" || category === "uklady") && (
              <p className="exam-status">
                {readyTaskCount()}/17 układów możesz uruchomić. Pozostałe:
                schemat i teoria.
              </p>
            )}
            {category === "czytanie" && !query.trim() && (
              <Suspense fallback={<p role="status">Ładowanie…</p>}>
                <SchematicCourse />
              </Suspense>
            )}
            <div className="knowledge-filters exam-filters">
              <label>
                Szukaj w materiałach źródłowych
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="np. RCD, BIS-402, podtrzymanie, L01"
                />
              </label>
            </div>
            {
              <>
                {category === "home"
                  ? "Baza wiedzy"
                  : category === "uklady" && (
                      <section aria-label="Gotowe wzorce">
                        <h2>Układy</h2>
                        <div className="knowledge-cards">
                          {referenceExamples
                            .filter(
                              (r) =>
                                result.models.some((m) => m.id === r.id) &&
                                referenceIsReady(
                                  examAvailability.find(
                                    (a) => a.taskId === r.taskId,
                                  ),
                                ),
                            )
                            .map((r) => (
                              <a
                                className="knowledge-card"
                                key={r.id}
                                href={`#/wiedza/uklady/${r.id}`}
                              >
                                <h2>{r.taskId}</h2>
                                <p>{r.title}</p>
                                <span>Możesz uruchomić</span>
                              </a>
                            ))}
                        </div>
                        {readyTaskCount() === 0 && (
                          <p>
                            Wzorce czekają na pełny odbiór. Materiały i
                            opracowania znajdziesz na kartach zadań.
                          </p>
                        )}
                      </section>
                    )}
                {category === "zadania" && !showAll && (
                  <section aria-label="Lekcje interaktywne">
                    <h2>Lekcje interaktywne</h2>
                    <div className="knowledge-cards">
                      {referenceExamples
                        .filter((r) =>
                          referenceIsReady(
                            examAvailability.find((a) => a.taskId === r.taskId),
                          ),
                        )
                        .map((r) => (
                          <a
                            className="knowledge-card exam-lesson-card"
                            key={r.id}
                            href={`#/wiedza/uklady/${r.id}`}
                          >
                            <span className="knowledge-eyebrow">
                              {r.taskId}
                            </span>
                            <h2>{r.title}</h2>
                            <span>Otwórz lekcję →</span>
                          </a>
                        ))}
                    </div>
                  </section>
                )}
                {(category === "zadania" || showAll) && (
                  <section aria-label="Karty zadań">
                    <h2>Zadania ({result.tasks.length})</h2>
                    <div className="knowledge-cards">
                      {result.tasks.map((t) => (
                        <a
                          className="knowledge-card exam-task-card"
                          key={t.id}
                          href={taskHref(t.code)}
                        >
                          <span className="knowledge-eyebrow">{t.id}</span>
                          <h2>{t.title}</h2>
                          <p>{t.summary}</p>
                          <span>
                            Dostępna teoria
                            {referenceIsReady(
                              examAvailability.find((r) => r.taskId === t.id),
                            )
                              ? " · Gotowy układ dydaktyczny"
                              : t.code === "114"
                                ? " · Wymaga danych źródłowych"
                                : " · Wzorzec oczekuje na odbiór"}
                          </span>
                        </a>
                      ))}
                    </div>
                  </section>
                )}
                {(category === "aparaty" ||
                  category === "czytanie" ||
                  showAll) && (
                  <section aria-label="Artykuły źródłowe">
                    <h2>
                      {category === "czytanie" && !showAll
                        ? "Do poczytania"
                        : "Aparaty"}
                    </h2>
                    <div className="knowledge-cards">
                      {result.articles
                        .filter(
                          (a) =>
                            category !== "czytanie" ||
                            showAll ||
                            [
                              "czytanie-schematu",
                              "n-pe-wezly",
                              "jeden-no-nc",
                              "start-stop",
                            ].includes(a.id),
                        )
                        .map((a) => (
                          <a
                            className="knowledge-card exam-article-card"
                            key={a.id}
                            href={examArticleHref(a.id)}
                          >
                            <h2>{a.title}</h2>
                            <p>{a.principle}</p>
                            <span>Czytaj artykuł →</span>
                          </a>
                        ))}
                    </div>
                  </section>
                )}
                {(category === "zestaw" || showAll) && (
                  <section aria-label="Kategorie elementów">
                    <h2>Wyposażenie ({result.components.length})</h2>
                    {category === "zestaw" && (
                      <p>
                        {shoppingKit.policy} {shoppingKit.scope}
                      </p>
                    )}
                    <div className="knowledge-cards">
                      {result.components.map((c) => (
                        <a
                          className="knowledge-card exam-component-card"
                          key={c.id}
                          href={componentHref(c.id)}
                        >
                          <h2>{c.name}</h2>
                          <p>{c.parameters}</p>
                          <span>Znaczenie i dobór →</span>
                        </a>
                      ))}
                    </div>
                    {category === "zestaw" && (
                      <>
                        <details>
                          <summary>Materiały — zestawienie ilości</summary>
                          <p>
                            Nieznane długości zadania 108 pozostają nieznane;
                            zestawienie nie dolicza ich jako zera.
                          </p>
                          <div className="knowledge-table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Materiał</th>
                                  <th>Maksimum jednego zadania</th>
                                  <th>Znana suma serii</th>
                                </tr>
                              </thead>
                              <tbody>
                                {shoppingKit.materials.map((m) => (
                                  <tr key={m.id}>
                                    <th scope="row">{m.name}</th>
                                    <td>
                                      {m.largestSingleTask} {m.unit}
                                    </td>
                                    <td>
                                      {m.knownConsumedSeries} {m.unit}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                        <details>
                          <summary>
                            Wyposażenie — maksymalne ilości i warunki
                          </summary>
                          <div className="knowledge-table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Kategoria</th>
                                  <th>Maksimum</th>
                                  <th>Zadania źródłowe</th>
                                </tr>
                              </thead>
                              <tbody>
                                {shoppingKit.components.map((c) => (
                                  <tr key={c.componentId}>
                                    <th scope="row">
                                      <a href={componentHref(c.componentId)}>
                                        {
                                          examComponents.find(
                                            (e) => e.id === c.componentId,
                                          )!.name
                                        }
                                      </a>
                                    </th>
                                    <td>{c.quantity}</td>
                                    <td>{c.usedBy.join(", ")}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <ul>
                            {shoppingKit.conditionalPurchases.map((c) => (
                              <li key={c.componentId}>{c.condition}</li>
                            ))}
                          </ul>
                        </details>
                      </>
                    )}
                  </section>
                )}
                {showAll &&
                  !result.tasks.length &&
                  !result.articles.length &&
                  !result.components.length && (
                    <p role="status">Brak wyników. Zmień szukane hasło.</p>
                  )}
              </>
            }
          </>
        )}
        <footer>
          <a href="#/wiedza/zestaw">Wyposażenie i lista zakupów stanowiska →</a>
          <span>
            Opracowanie dydaktyczne arkuszy ELE.02, nie oficjalny klucz CKE.
          </span>
        </footer>
      </main>
    </div>
  );
}

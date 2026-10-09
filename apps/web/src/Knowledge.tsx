import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { catalog } from "@catalog/index";
import {
  apparatusCards,
  apparatusCard,
} from "../../../packages/knowledge/cards";
import {
  cardHref,
  canonicalCardId,
} from "../../../packages/knowledge/card-routes";
import {
  examAvailability,
  referenceIsReady,
} from "../../../packages/knowledge/exams";
import { ProductIllustration } from "../../../packages/knowledge/Diagram";
import {
  contextExplanation,
  resolveKnowledge,
  bindings,
  validContext,
} from "../../../packages/knowledge/bindings";
import {
  progressKey,
  readProgress,
} from "../../../packages/knowledge/progress";
import type {
  Article,
  Section,
  KnowledgeSource,
} from "../../../packages/knowledge/types";
import {
  readContext,
  readProductSelection,
  returnToWorkbench,
  readLessonReturn,
} from "./knowledge-navigation";
import { useApp } from "./store";
import "./knowledge.css";
const ExamKnowledge = lazy(() => import("./ExamKnowledge"));
const legacyLearningRoutes: Record<string, string> = {
  "knowledge/lesson/linia-i-zyla": "#/wiedza/uklady/ele02-101",
  "knowledge/lesson/wezel-i-skrzyzowanie": "#/wiedza/uklady/ele02-101",
  "knowledge/lesson/stan-odniesienia": "#/wiedza/uklady/ele02-108",
  "knowledge/lesson/jeden-aparat-wiele-symboli": "#/wiedza/uklady/ele02-108",
  "knowledge/lesson/szeregowo-rownolegle": "#/wiedza/uklady/ele02-108",
  "knowledge/lesson/moc-i-sterowanie": "#/wiedza/uklady/ele02-108",
  "knowledge/circuit/start-stop": "#/wiedza/uklady/ele02-108",
  "knowledge/circuit/lampa": "#/wiedza/uklady/ele02-101",
  "knowledge/circuit/schodowy": "#/wiedza/uklady/ele02-101",
  "knowledge/circuit/bistabilny": "#/wiedza/aparaty/bistabilny",
  "knowledge/circuit/dwa-miejsca": "#/wiedza/uklady/ele02-108",
  "knowledge/circuit/prawo-lewo": "#/wiedza/uklady/ele02-108",
};
export function Knowledge({ route }: { route: string }) {
  const [, kind, slug] = route.split("/");
  const cardRoute = route.startsWith("knowledge/exam/aparaty/");
  const cardId = cardRoute
    ? route.split("/")[3]
    : kind === "article"
      ? slug
      : undefined;
  const redirect =
    legacyLearningRoutes[route] ??
    (cardId && (kind === "article" || canonicalCardId(cardId) !== cardId)
      ? cardHref(cardId)
      : undefined);
  useEffect(() => {
    if (redirect) location.replace(redirect);
  }, [redirect]);
  if (redirect)
    return (
      <div className="knowledge-page" role="status">
        Otwieranie lekcji na obecnym wzorcu…
      </div>
    );
  if (cardRoute)
    return <CoreKnowledge key={cardId} route={`knowledge/article/${cardId}`} />;
  return route === "knowledge" ||
    route === "knowledge/map" ||
    route.startsWith("knowledge/exam") ? (
    <Suspense
      fallback={
        <div className="knowledge-page" role="status">
          Ładowanie materiałów…
        </div>
      }
    >
      <ExamKnowledge
        route={
          route.startsWith("knowledge/exam") ? route : "knowledge/exam/home"
        }
      />
    </Suspense>
  ) : (
    <CoreKnowledge route={route} />
  );
}
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
function ApparatusSection({
  article,
  section,
}: {
  article: Article;
  section: Section;
}) {
  return (
    <section id={`section-${section.id}`}>
      <h2>
        {section.id === "operation"
          ? "Co zmienia się po zadziałaniu"
          : section.title}
      </h2>
      {section.paragraphs.map((text, i) => (
        <p key={i}>{text}</p>
      ))}
      {section.sourceIds.length > 0 && (
        <small>
          Źródła:{" "}
          {section.sourceIds.map((id, i) => {
            const source = article.sources.find((s) => s.id === id)!;
            return (
              <span key={id}>
                {i > 0 ? " · " : ""}
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
              </span>
            );
          })}
        </small>
      )}
    </section>
  );
}
const taskReady = (code: string) =>
  referenceIsReady(examAvailability.find((r) => r.taskId === `ELE.02-${code}`));
function TaskLinks({ codes }: { codes: string[] }) {
  return (
    <div className="knowledge-related">
      {codes.map((code) => (
        <a
          key={code}
          href={`#/wiedza/${taskReady(code) ? "uklady" : "zadania"}/ele02-${code.toLowerCase()}`}
        >
          ELE.02-{code} ·{" "}
          {taskReady(code) ? "Możesz uruchomić" : "Schemat i teoria"}
        </a>
      ))}
    </div>
  );
}
function CoreKnowledge({ route }: { route: string }) {
  const project = useApp((s) => s.project);
  const [progress, setProgress] = useState(readProgress),
    [progressNotice, setProgressNotice] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const context = readContext(),
    valid = validContext(project, context);
  const [, routeKind, slug] = route.split("/");
  const article = routeKind === "article" ? apparatusCard(slug) : undefined;
  const item = article;
  const readyCodes = article?.taskCodes.filter(taskReady) ?? [];
  const primaryCodes = readyCodes.length
    ? readyCodes
    : (article?.taskCodes.slice(0, 1) ?? []);
  const otherCodes =
    article?.taskCodes.filter((code) => !primaryCodes.includes(code)) ?? [];
  const operation = article?.sections.find((s) => s.id === "operation");
  const pickedId = context
    ? (valid?.productId ?? null)
    : readProductSelection();
  const pickedProduct =
    pickedId &&
    canonicalCardId(resolveKnowledge(pickedId)?.articleId ?? "") === article?.id
      ? catalog[pickedId]
      : undefined;
  const displayedProduct =
    pickedProduct ??
    (!context && article?.illustrationProductId
      ? catalog[article.illustrationProductId]
      : undefined);
  useEffect(() => {
    titleRef.current?.focus();
    document.querySelector(".knowledge-page")?.scrollTo(0, 0);
  }, [route]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]"))
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
  return (
    <div className="knowledge-page knowledge-apparatus-page">
      <header className="knowledge-header">
        <a href="#knowledge" className="knowledge-brand">
          Pracownia / Baza wiedzy
        </a>
        <button onClick={() => returnToWorkbench()}>
          Wróć do mojego układu
        </button>
      </header>
      <main className="knowledge-main">
        {readLessonReturn() && (
          <a href={`#/wiedza/uklady/${readLessonReturn()}`}>
            Wróć do rozpoczętej lekcji
          </a>
        )}
        {context && (
          <aside className="knowledge-context">
            <p>{contextExplanation(project, context)}</p>
            <button disabled={!valid} onClick={() => returnToWorkbench(true)}>
              Pokaż w moim układzie
            </button>
            <p className="small-help">
              Pomoc opisuje aparat. Funkcja w obwodzie wynika z jego połączeń.
            </p>
          </aside>
        )}
        {article ? (
          <>
            <span className="knowledge-eyebrow">
              Aparat · {article.level} · {article.qualifications.join(" / ")}
            </span>
            <h1 ref={titleRef} tabIndex={-1}>
              {article.title}
            </h1>
            <p className="knowledge-lead">{article.summary}</p>
            <div className="knowledge-card-intro">
              {(pickedProduct || article.illustrationProductId) && (
                <ProductIllustration
                  productId={pickedProduct?.id ?? article.illustrationProductId}
                />
              )}
              {displayedProduct && (
                <p className="knowledge-model-summary">
                  {displayedProduct.educational
                    ? "Profil dydaktyczny"
                    : `${displayedProduct.manufacturer} ${displayedProduct.manufacturerPartNumber}`}{" "}
                  · {displayedProduct.published ? "opublikowany" : "oczekujący"}{" "}
                  · rewizja {displayedProduct.revision}
                  {displayedProduct.topology.coil && (
                    <>
                      {" "}
                      · cewka {displayedProduct.topology.coil.voltageV} V{" "}
                      {displayedProduct.topology.coil.kind} · zaciski{" "}
                      {displayedProduct.topology.coil.plus}/
                      {displayedProduct.topology.coil.minus}
                    </>
                  )}
                </p>
              )}
              {operation && (
                <div className="knowledge-prose">
                  <ApparatusSection article={article} section={operation} />
                </div>
              )}
              {article.taskCodes.length > 0 && (
                <section className="knowledge-next knowledge-card-tasks">
                  <h2>Zadania z tym aparatem</h2>
                  <TaskLinks codes={primaryCodes} />
                </section>
              )}
            </div>
            {displayedProduct && (
              <details className="knowledge-prose knowledge-product-map">
                <summary>Dane i mapa ilustrowanego profilu</summary>
                <h2>
                  {pickedProduct ? "Wybrany model" : "Ilustrowany profil"}:{" "}
                  {displayedProduct.displayNamePl}
                </h2>
                <p>
                  {displayedProduct.educational
                    ? "Jawny profil dydaktyczny; nie dane przemysłowego SKU."
                    : `Produkt katalogowy: ${displayedProduct.manufacturer} ${displayedProduct.manufacturerPartNumber}.`}
                </p>
                {displayedProduct.topology.coil && (
                  <p>
                    Cewka tego modelu:{" "}
                    <strong>
                      {displayedProduct.topology.coil.voltageV} V{" "}
                      {displayedProduct.topology.coil.kind}
                    </strong>{" "}
                    · zaciski {displayedProduct.topology.coil.plus}/
                    {displayedProduct.topology.coil.minus}.
                  </p>
                )}
                <p>
                  Profil:{" "}
                  {displayedProduct.published ? "opublikowany" : "oczekujący"} ·
                  rewizja {displayedProduct.revision} · topologia{" "}
                  {displayedProduct.topology.revision}.{" "}
                  {resolveKnowledge(displayedProduct.id)?.exact
                    ? "Zweryfikowane powiązanie zacisków z wiedzą."
                    : "Mapa modelu katalogowego; pomoc ogólna, bez mapy źródłowej realnego SKU."}
                </p>
                <details>
                  <summary>
                    Mapa zacisków i ograniczenia wybranego profilu
                  </summary>
                  <div className="knowledge-table-wrap">
                    <table>
                      <caption>
                        Mapa wybranego modelu. Funkcja w Twoim układzie wynika z
                        połączeń, nie z samego numeru.
                      </caption>
                      <thead>
                        <tr>
                          <th>Zacisk</th>
                          <th>Znaczenie</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedProduct.topology.terminals.map((t) => (
                          <tr key={t.id}>
                            <th scope="row">{t.label}</th>
                            <td>
                              {bindings.find(
                                (b) => b.productId === displayedProduct.id,
                              )?.terminals[t.id]?.explanation ?? t.role}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <ul>
                    {displayedProduct.limitations.map((text, i) => (
                      <li key={i}>{text}</li>
                    ))}
                  </ul>
                </details>
              </details>
            )}
            {otherCodes.length > 0 && (
              <details className="knowledge-card-toc">
                <summary>Inne zadania z tym aparatem</summary>
                <TaskLinks codes={otherCodes} />
              </details>
            )}
            <details className="knowledge-card-toc">
              <summary>Spis szczegółów i zakres teorii</summary>
              <nav className="knowledge-toc" aria-label="Spis treści">
                {article.sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      const section = document.getElementById(
                        `section-${s.id}`,
                      );
                      const details = section?.closest("details");
                      if (details) details.open = true;
                      section?.scrollIntoView({
                        behavior: matchMedia("(prefers-reduced-motion: reduce)")
                          .matches
                          ? "instant"
                          : "smooth",
                        block: "start",
                      });
                    }}
                  >
                    {s.title}
                  </button>
                ))}
              </nav>
              <p className="knowledge-limit">{article.scope}</p>
            </details>
            <div className="knowledge-prose">
              {article.sections
                .filter((s) => s.id !== "operation")
                .map((section) => (
                  <details key={section.id}>
                    <summary>{section.title}</summary>
                    <ApparatusSection article={article} section={section} />
                  </details>
                ))}
            </div>

            <div className="knowledge-next">
              <h2>Układy z obecnych arkuszy</h2>
              <a href="#/wiedza/uklady">
                Sprawdzone wzorce i lekcje połączeń →
              </a>
              <a href="#/wiedza/zadania">Arkusze, aparaty i wymagane próby →</a>
            </div>
            <section className="knowledge-prose">
              <h2>Materiały powiązane</h2>
              <div className="knowledge-related">
                {article.related.map((id) => {
                  const a = apparatusCards.find(
                    (a) => a.id === canonicalCardId(id),
                  )!;
                  return (
                    <a key={id} href={cardHref(a.id)}>
                      {a.title}
                    </a>
                  );
                })}
              </div>
              <details>
                <summary>Źródła i lokalizatory</summary>
                <SourceList items={article.sources} />
              </details>
              <button onClick={markRead}>
                {progress.read[article.id]
                  ? "Przeczytano ✓"
                  : "Oznacz jako przeczytane"}
              </button>
              <p role="status">{progressNotice}</p>
            </section>
          </>
        ) : (
          <>
            <h1 ref={titleRef} tabIndex={-1}>
              {["lesson", "circuit"].includes(routeKind)
                ? "Ten dawny układ został wycofany"
                : "Nie znaleziono materiału"}
            </h1>
            <p>
              Dostępne wzorce i lekcje dotyczą obecnych zadań egzaminacyjnych.
            </p>
            <a href="#/wiedza/uklady">Przejdź do aktualnych układów</a>
            <a href="#/wiedza/zadania">Przejdź do zadań</a>
          </>
        )}
      </main>
    </div>
  );
}

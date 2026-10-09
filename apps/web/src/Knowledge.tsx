import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { catalog } from "@catalog/index";
import { articles } from "../../../packages/knowledge/articles";
import { ProductIllustration } from "../../../packages/knowledge/Diagram";
import {
  contextExplanation,
  resolveKnowledge,
  bindings,
  validContext,
} from "../../../packages/knowledge/bindings";
import { progressKey, readProgress } from "../../../packages/knowledge";
import type { KnowledgeSource } from "../../../packages/knowledge/types";
import {
  readContext,
  readProductSelection,
  returnToWorkbench,
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
  "knowledge/circuit/start-stop": "#/wiedza/uklady/ele02-108",
};
export function Knowledge({ route }: { route: string }) {
  const redirect = legacyLearningRoutes[route];
  useEffect(() => {
    if (redirect) location.replace(redirect);
  }, [redirect]);
  if (redirect)
    return (
      <div className="knowledge-page" role="status">
        Otwieranie lekcji na obecnym wzorcu…
      </div>
    );
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
          route.startsWith("knowledge/exam") ? route : "knowledge/exam/zadania"
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
function CoreKnowledge({ route }: { route: string }) {
  const project = useApp((s) => s.project);
  const [progress, setProgress] = useState(readProgress),
    [progressNotice, setProgressNotice] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const context = readContext(),
    valid = validContext(project, context);
  const [, routeKind, slug] = route.split("/");
  const article =
    routeKind === "article" ? articles.find((a) => a.slug === slug) : undefined;
  const item = article;
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
              Pomoc opisuje aparat. Funkcja w obwodzie wynika z jego połączeń.
            </p>
          </aside>
        )}
        {article ? (
          <>
            <a href="#knowledge">← Zadania egzaminacyjne</a>
            <span className="knowledge-eyebrow">
              Aparat · {article.level} · {article.qualifications.join(" / ")}
            </span>
            <h1 ref={titleRef} tabIndex={-1}>
              {article.title}
            </h1>
            <p className="knowledge-lead">{article.summary}</p>
            <nav className="knowledge-toc" aria-label="Spis treści">
              {article.sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() =>
                    document.getElementById(`section-${s.id}`)?.scrollIntoView({
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
                          href={article.sources.find((s) => s.id === id)!.url}
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
                  const a = articles.find((a) => a.id === id)!;
                  return (
                    <a key={id} href={`#knowledge/article/${a.slug}`}>
                      {a.title}
                    </a>
                  );
                })}
              </div>
              <h2>Źródła i lokalizatory</h2>
              <SourceList items={article.sources} />
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

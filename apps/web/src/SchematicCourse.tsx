import { useState, type ReactElement } from "react";
import {
  drills,
  type Drill,
} from "../../../packages/knowledge/schematic-course";
import { referenceById } from "../../../packages/knowledge/reference-examples";
import "./schematic-course.css";

const asset = (path: string) =>
  `${import.meta.env.BASE_URL}knowledge/ele02/${path}`;
const ink = "#253f43";

// Symbols follow PN-EN 60617 in the simplified form used on ELE.02 sheets.
// Each one is drawn horizontally in a 160×80 box, wire ends at x=10 and x=150.
type SymbolDef = {
  id: string;
  name: string;
  meaning: string;
  draw: ReactElement;
};
const wire = (d: string) => <path d={d} />;
const symbols: { group: string; items: SymbolDef[] }[] = [
  {
    group: "Styki i łączniki (schemat wielokreskowy)",
    items: [
      {
        id: "no",
        name: "Styk zwierny (NO)",
        meaning:
          "W spoczynku otwarty. Zamyka się po naciśnięciu przycisku lub załączeniu cewki. Numery zacisków kończą się na 3–4.",
        draw: (
          <>
            {wire("M10 40H60M100 40H150")}
            <path d="M60 40L102 20" />
          </>
        ),
      },
      {
        id: "nc",
        name: "Styk rozwierny (NC)",
        meaning:
          "W spoczynku zamknięty, otwiera się po zadziałaniu. Krótka poprzeczka przy styku nieruchomym odróżnia go od NO. Numery kończą się na 1–2.",
        draw: (
          <>
            {wire("M10 40H60M100 40H150")}
            <path d="M100 40V28" />
            <path d="M60 40L104 28" />
          </>
        ),
      },
      {
        id: "changeover",
        name: "Styk przełączny (łącznik schodowy)",
        meaning:
          "Wspólny zacisk COM łączy się z torem 1 albo z torem 2. Dwa takie łączniki i dwie korespondencje dają sterowanie z dwóch miejsc.",
        draw: (
          <>
            {wire("M10 40H60M100 22H150M100 58H150")}
            <path d="M100 22V30M100 58V50" />
            <path d="M60 40L104 24" />
            <text x="118" y="16">
              1
            </text>
            <text x="118" y="76">
              2
            </text>
            <text x="14" y="32">
              COM
            </text>
          </>
        ),
      },
      {
        id: "push-no",
        name: "Przycisk zwierny (START)",
        meaning:
          "Styk NO z napędem ręcznym przyciskanym: przerywana linia łączy styk z symbolem przycisku. Wraca sam po puszczeniu.",
        draw: (
          <>
            {wire("M10 48H60M100 48H150")}
            <path d="M60 48L102 30" />
            <path d="M81 39V14" strokeDasharray="4 3" />
            <path d="M73 6V14H89V6" />
          </>
        ),
      },
      {
        id: "push-nc",
        name: "Przycisk rozwierny (STOP)",
        meaning:
          "Styk NC z napędem przyciskanym. W obwodzie sterowania STOP-y łączy się szeregowo: każdy z nich przerywa zasilanie cewki.",
        draw: (
          <>
            {wire("M10 48H60M100 48H150")}
            <path d="M100 48V36" />
            <path d="M60 48L104 36" />
            <path d="M82 42V14" strokeDasharray="4 3" />
            <path d="M74 6V14H90V6" />
          </>
        ),
      },
      {
        id: "coil",
        name: "Cewka stycznika (A1–A2)",
        meaning:
          "Prostokąt. Zasilona cewka przełącza wszystkie styki tego samego stycznika (to samo oznaczenie, np. K1), także te narysowane daleko od niej.",
        draw: (
          <>
            {wire("M10 40H58M102 40H150")}
            <rect x="58" y="26" width="44" height="28" fill="white" />
            <text x="12" y="30">
              A1
            </text>
            <text x="126" y="30">
              A2
            </text>
          </>
        ),
      },
      {
        id: "mcb",
        name: "Wyłącznik nadprądowy",
        meaning:
          "Łącznik z wyzwalaczem: krzyżyk przy styku i znaki członów cieplnego i elektromagnetycznego. Zabezpiecza jeden obwód (np. B10, B6).",
        draw: (
          <>
            {wire("M10 40H60M100 40H150")}
            <path d="M60 40L102 20" />
            <path d="M95 34L105 46M105 34L95 46" />
            <path d="M74 12h8v6h8" />
          </>
        ),
      },
      {
        id: "rcd",
        name: "Wyłącznik różnicowoprądowy (RCD)",
        meaning:
          "Łącznik z przekładnikiem (owal na przewodach). Odłącza L i N, gdy prąd ucieka do PE. Przycisk TEST sprawdza mechanizm, nie zastępuje pomiaru.",
        draw: (
          <>
            {wire("M10 40H60M100 40H150")}
            <path d="M60 40L102 20" />
            <path d="M95 34L105 46M105 34L95 46" />
            <ellipse cx="128" cy="40" rx="7" ry="13" />
          </>
        ),
      },
    ],
  },
  {
    group: "Odbiorniki i węzły",
    items: [
      {
        id: "lamp",
        name: "Lampka / oprawa (schemat wielokreskowy)",
        meaning:
          "Okrąg z krzyżykiem. Lampka sygnalizacyjna (H) świeci, gdy między jej L i N jest napięcie.",
        draw: (
          <>
            {wire("M10 40H58M102 40H150")}
            <circle cx="80" cy="40" r="22" fill="white" />
            <path d="M64 24L96 56M64 56L96 24" />
          </>
        ),
      },
      {
        id: "motor",
        name: "Silnik trójfazowy",
        meaning:
          "Okrąg z literą M i 3~. Zaciski U, V, W i PE. Zamiana dwóch faz zasilania odwraca kierunek obrotów.",
        draw: (
          <>
            {wire("M10 40H54M106 40H150")}
            <circle cx="80" cy="40" r="26" fill="white" />
            <text x="72" y="38" fontSize="16" stroke="none" fill={ink}>
              M
            </text>
            <text x="70" y="56" fontSize="13" stroke="none" fill={ink}>
              3~
            </text>
          </>
        ),
      },
      {
        id: "node",
        name: "Węzeł i skrzyżowanie",
        meaning:
          "Kropka oznacza połączenie przewodów. Dwie linie, które się przecinają bez kropki, NIE są połączone.",
        draw: (
          <>
            {wire("M10 26H70M40 10V70M90 54H150M120 10V70")}
            <circle cx="40" cy="26" r="5" fill={ink} />
            <text x="22" y="78">
              węzeł
            </text>
            <text x="92" y="78">
              bez połączenia
            </text>
          </>
        ),
      },
    ],
  },
  {
    group: "Schemat jednokreskowy (instalacyjny)",
    items: [
      {
        id: "strokes",
        name: "Kreski na przewodzie",
        meaning:
          "Liczba ukośnych kresek to liczba żył. Kreska z kropką to N, kreska z poprzeczką (T) to PE, pozostałe to L lub żyły łączeniowe.",
        draw: (
          <>
            {wire("M10 44H150")}
            <path d="M60 58L72 30M78 58L90 30M96 58L108 30" />
            <circle cx="88" cy="28" r="3" fill={ink} />
            <path d="M101 28H115" />
            <text x="58" y="74">
              L
            </text>
            <text x="78" y="74">
              N
            </text>
            <text x="98" y="74">
              PE
            </text>
          </>
        ),
      },
      {
        id: "outlet",
        name: "Oprawa oświetleniowa (wypust)",
        meaning:
          "Krzyżyk na końcu linii. Na arkuszach ELE.02 tak narysowano OP1 i OP2.",
        draw: (
          <>
            {wire("M10 40H80")}
            <path d="M80 18L124 62M80 62L124 18" />
          </>
        ),
      },
      {
        id: "staircase",
        name: "Łącznik schodowy (instalacyjny)",
        meaning:
          "Okrąg z dwiema kreskami w przeciwne strony. Dwa łączniki schodowe sterują oprawą z dwóch miejsc.",
        draw: (
          <>
            {wire("M10 40H64")}
            <circle cx="80" cy="40" r="14" fill="white" />
            <path d="M90 30L110 12L116 18M70 50L50 68L44 62" />
          </>
        ),
      },
      {
        id: "socket",
        name: "Gniazdo wtyczkowe ze stykiem ochronnym",
        meaning:
          "Półokrąg (miseczka) z kreską styku ochronnego. Gniazdo zawsze ma żyłę PE.",
        draw: (
          <>
            {wire("M10 50H62")}
            <path d="M62 28A22 22 0 0 0 106 28" fill="none" />
            <path d="M84 50V58M60 22H108" />
          </>
        ),
      },
    ],
  },
];

function SymbolCard({ s }: { s: SymbolDef }) {
  return (
    <article className="course-symbol" data-symbol={s.id}>
      <svg viewBox="0 0 160 80" role="img" aria-label={s.name}>
        <g
          stroke={ink}
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
          fontSize="12"
        >
          {s.draw}
        </g>
      </svg>
      <h4>{s.name}</h4>
      <p>{s.meaning}</p>
    </article>
  );
}

function DrillView({ drill }: { drill: Drill }) {
  const [index, setIndex] = useState(0),
    [answers, setAnswers] = useState<Record<string, number>>({});
  const q = drill.questions[index];
  const chosen = answers[q.id];
  const reference = referenceById(drill.referenceId);
  const project = reference?.create();
  const score = drill.questions.filter(
    (x) => answers[x.id] === x.correct,
  ).length;
  return (
    <section className="course-drill" aria-label={drill.title}>
      <p className="course-intro">{drill.intro}</p>
      <div className="course-drill-grid">
        <figure className="course-figure">
          <div className="course-figure-frame">
            <img src={asset(drill.figure.png)} alt={drill.figure.alt} />
            <svg
              viewBox={`0 0 ${drill.figure.width} ${drill.figure.height}`}
              aria-hidden="true"
            >
              {q.spots.map((spot) => (
                <circle
                  key={`${spot.x}:${spot.y}`}
                  className="course-spot"
                  cx={spot.x}
                  cy={spot.y}
                  r={spot.r}
                />
              ))}
            </svg>
          </div>
          <figcaption>
            Oryginalny rysunek z arkusza. Pomarańczowy okrąg wskazuje miejsce,
            którego dotyczy pytanie.
          </figcaption>
        </figure>
        <div className="course-question">
          <nav aria-label="Pytania" className="course-steps">
            {drill.questions.map((x, i) => (
              <button
                key={x.id}
                aria-current={i === index ? "step" : undefined}
                className={
                  answers[x.id] === undefined
                    ? ""
                    : answers[x.id] === x.correct
                      ? "ok"
                      : "bad"
                }
                onClick={() => setIndex(i)}
                aria-label={`Pytanie ${i + 1}`}
              >
                {i + 1}
              </button>
            ))}
          </nav>
          <p className="course-ask">{q.question}</p>
          <div className="course-options" role="group" aria-label="Odpowiedzi">
            {q.options.map((o, i) => (
              <button
                key={o}
                aria-pressed={chosen === i}
                className={
                  chosen === undefined
                    ? ""
                    : i === q.correct
                      ? "ok"
                      : chosen === i
                        ? "bad"
                        : ""
                }
                onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
              >
                {o}
              </button>
            ))}
          </div>
          {chosen !== undefined && (
            <div className="course-feedback" role="status">
              <strong>
                {chosen === q.correct ? "Dobrze." : "Jeszcze raz popatrz."}
              </strong>{" "}
              {q.explanation}
              {q.wires && project && (
                <ul className="course-wires">
                  {q.wires.map((id) => {
                    const w = project.circuit.conductors.find(
                      (w) => w.id === id,
                    )!;
                    const name = (ref: typeof w.from) =>
                      `${project.circuit.devices.find((d) => d.id === ref.deviceId)!.designation}:${ref.terminalId}`;
                    return (
                      <li key={id}>
                        <span
                          className="course-wire-color"
                          style={{ background: w.insulationColor }}
                        />
                        {id} · {name(w.from)} → {name(w.to)}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
          <div className="course-nav">
            <button
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
            >
              ← Poprzednie
            </button>
            <span>
              Wynik: {score}/{drill.questions.length}
            </span>
            <button
              disabled={index === drill.questions.length - 1}
              onClick={() => setIndex((i) => i + 1)}
            >
              Następne →
            </button>
          </div>
          <a href={`#/wiedza/uklady/${drill.referenceId}`}>
            Zobacz ten układ w lekcji: schemat, tablica i działanie →
          </a>
        </div>
      </div>
    </section>
  );
}

export default function SchematicCourse() {
  return (
    <div className="schematic-course">
      <ol className="course-path" aria-label="Kolejność nauki">
        <li>
          <a href="#course-symbols">
            <strong>Symbole</strong>
            <span>Co oznacza każdy znak na rysunku</span>
          </a>
        </li>
        <li>
          <a href="#course-drill-101-kreski">
            <strong>Czytaj arkusz 101</strong>
            <span>Policz żyły na schemacie jednokreskowym</span>
          </a>
        </li>
        <li>
          <a href="#course-drill-108-sterowanie">
            <strong>Czytaj arkusz 108</strong>
            <span>Moc, sterowanie, podtrzymanie i blokada</span>
          </a>
        </li>
        <li>
          <a href="#/wiedza/uklady/ele02-101">
            <strong>Prześledź tory</strong>
            <span>Schemat, tablica i prąd w jednej lekcji</span>
          </a>
        </li>
      </ol>
      <section id="course-symbols" aria-labelledby="course-symbols-title">
        <h2 id="course-symbols-title">1. Symbole na schematach ELE.02</h2>
        {symbols.map((g) => (
          <div key={g.group}>
            <h3>{g.group}</h3>
            <div className="course-symbols">
              {g.items.map((s) => (
                <SymbolCard key={s.id} s={s} />
              ))}
            </div>
          </div>
        ))}
      </section>
      {drills.map((d, i) => (
        <div key={d.id} id={`course-drill-${d.id}`}>
          <h2>
            {i + 2}. {d.title}
          </h2>
          <DrillView drill={d} />
        </div>
      ))}
    </div>
  );
}

import { articles } from "./articles";
import { examples } from "./examples";
import { sources } from "./sources";
import type { CircuitLesson, CoverageEntry } from "./types";
export { articles } from "./articles";
const lesson = (
  id: string,
  title: string,
  exampleId: string,
  goal: string,
  initial: string,
  prediction: string,
  explanation: string,
  related: string[],
): CircuitLesson => ({
  id,
  slug: id,
  title,
  kind: "lesson",
  summary: goal,
  qualifications: ["ELE.02", "ELE.05"],
  level: "Podstawy",
  exampleId,
  goal,
  initial,
  prediction,
  explanation,
  related,
  sources: [sources.curriculum, sources.model],
});
export const lessons: CircuitLesson[] = [
  lesson(
    "linia-i-zyla",
    "Linia na schemacie i fizyczna żyła",
    "lampa",
    "Przełóż połączenie funkcjonalne na dwa końce rzeczywistej żyły.",
    "S1 otwarty, źródło odłączone. N i PE połączone stale.",
    "Czy jedna linia rozgałęziona na schemacie oznacza jedną żyłę do dwóch lamp?",
    "Nie. Schemat streszcza wspólny potencjał. Na tablicy W od S1 kończy się w XL2; dwa kolejne odcinki prowadzą osobno do H1 i H2. Kliknij wiersz tabeli, odszukaj obydwa końce, potem wybierz symbol lampy. Po zamknięciu S1 obie gałęzie otrzymują zasilanie. Długość kreski nie określa długości elektrycznej żyły.",
    ["zlaczki", "laczniki"],
  ),
  lesson(
    "wezel-i-skrzyzowanie",
    "Węzeł i skrzyżowanie",
    "lampa",
    "Odróżnij wspólny potencjał od linii przechodzących obok siebie.",
    "Po S1 znajduje się wspólna złączka XL2; L i N pozostają oddzielne.",
    "Dlaczego H2 działa, choć nie jest połączona bezpośrednio z H1?",
    "Kropka na połączeniu za S1 oznacza odgałęzienie; reprezentuje połączone zaciski XL2. Poniżej pozioma linia N przecina pionową fazę do H2: przerwa w kresce i brak kropki oznaczają brak połączenia. Zaznacz przewód H2:L i znajdź jego początek na XL2. Połączone zaciski są potwierdzone przez tabelę, a nie kolor czy bliskość kreski.",
    ["zlaczki"],
  ),
  lesson(
    "stan-odniesienia",
    "Stan odniesienia, NO i NC",
    "start-stop",
    "Czytaj symbol przed uruchomieniem i rozpoznawaj zmianę podczas pracy.",
    "START NO otwarty; STOP NC i NC termika zamknięte; cewka bez pobudzenia.",
    "Czy zamknięty podczas pracy styk KA1 staje się NC?",
    "Nie: nazwa NO odnosi się do niepobudzonego mechanizmu. Wciśnij START, przełącz widok działania i obserwuj KA1. Wróć do stanu odniesienia — rysunek ponownie pokazuje NO otwarty, chociaż odczyt pracy pozostaje osobno. STOP chwilowy rozwiera obwód po naciśnięciu. Wybierz ten sam styk w obu reprezentacjach.",
    ["laczniki", "stycznik"],
  ),
  lesson(
    "jeden-aparat-wiele-symboli",
    "Jeden aparat, kilka symboli",
    "start-stop",
    "Połącz cewkę K1 ze stykami K1 i osobnym blokiem KA1.",
    "Cewka K1 i NO K1 oraz KA1 są niepobudzone.",
    "Czy linia odniesienia K1–KA1 jest przewodem z A1 do 53?",
    "Nie. Jest sprzężeniem mechanizmu. Wybierz cewkę, następnie styk sygnalizacji i blok pomocniczy. K1 występuje na rysunku sterowania i mocy, ale ma jedną instancję na tablicy. KA1 jest osobną instancją przypisaną przez assembly do K1. Po START mechanizm zamyka różne, elektrycznie oddzielne tory.",
    ["stycznik", "blok-pomocniczy"],
  ),
  lesson(
    "szeregowo-rownolegle",
    "Szeregowo, równolegle i podtrzymanie",
    "start-stop",
    "Znajdź drogę zasilania cewki po puszczeniu START.",
    "STOP i termik przewodzą; START i KA1 nie przewodzą.",
    "Co zasila A1, gdy START wróci do spoczynku?",
    "Gałąź KA1:53–54 równoległa do S1:13–14. Wspólne węzły są przed i za tymi stykami, więc każdy z nich może zamknąć tę samą część drogi. STOP i F1 są szeregowo przed rozgałęzieniem: jeden otwarty NC przerywa całą drogę. Wykonaj START → puść → STOP → puść i sprawdź napięcie cewki. Wbudowany K1:13–14 należy tutaj do innej gałęzi — sygnalizacji.",
    ["stycznik", "blok-pomocniczy", "laczniki"],
  ),
  lesson(
    "moc-i-sterowanie",
    "Osobne śledzenie mocy i sterowania",
    "prawo-lewo",
    "Prześledź rozkaz START oddzielnie od energii dostarczanej silnikowi.",
    "Oba styczniki wyłączone, mostki Y pozostają na silniku.",
    "Gdzie zmienia się kolejność faz, a gdzie jest blokada cewki?",
    "Wybierz tor sterowania: NC KA1 znajduje się przed cewką K2, NC KA2 przed K1. W torze mocy porównaj połączenia K1 i K2 do F1: K2 zamienia dwa tory. Wywołaj START 1 i spróbuj START 2; oba mechanizmy nie powinny pracować razem. Zatrzymaj, uruchom drugi kierunek i odczytaj kierunek z solvera. Interlock jest osobnym sprzężeniem mechanicznym, nie żyłą i nie zamiennikiem NC.",
    ["silnik", "stycznik", "blok-pomocniczy"],
  ),
];
export const circuits: CircuitLesson[] = examples.map((e) => ({
  id: `uklad-${e.id}`,
  slug: e.id,
  title: e.title,
  kind: "circuit",
  summary: e.steps[1]?.explanation ?? e.title,
  qualifications: ["ELE.02", "ELE.05"],
  level: ["lampa", "schodowy", "bistabilny"].includes(e.id)
    ? "Podstawy"
    : "Średni",
  exampleId: e.id,
  goal: `Przeczytaj schemat, wskaż zaciski i sprawdź: ${e.title.toLowerCase()}.`,
  initial:
    "Źródła odłączone; mechanizmy cewek w spoczynku. Dźwignie zabezpieczeń w przygotowanych przykładach ustawiono ON.",
  prediction:
    "Przed każdym krokiem przewidź stan odbiornika i drogę, którą popłynie prąd.",
  explanation: e.steps
    .map((step) => `${step.title}: ${step.explanation}`)
    .join(" "),
  related:
    e.id === "lampa" || e.id === "schodowy"
      ? ["laczniki", "zlaczki"]
      : e.id === "bistabilny"
        ? ["bistabilny", "laczniki"]
        : ["stycznik", "blok-pomocniczy", "silnik"],
  sources: [
    sources.model,
    sources.curriculum,
    ...(e.id === "lampa"
      ? [sources.mcb]
      : e.id === "bistabilny"
        ? [sources.bistable]
        : [sources.tesys, sources.auxiliary]),
  ],
}));
export const coverage: CoverageEntry[] = [
  {
    id: "reading",
    title: "Czytanie schematów i dokumentacji",
    qualifications: ["ELE.02", "ELE.05"],
    tags: ["ELE.02.2", "ELE.05.2"],
    contentStatus: "published",
    practiceStatus: "interactive",
    contentIds: lessons.map((l) => l.id),
    sourceId: "curriculum",
    locator: "s. 3–4 i 11–12: posługiwanie się schematami",
  },
  {
    id: "devices",
    title: "Aparaty i obwody sterowania",
    qualifications: ["ELE.02", "ELE.05"],
    tags: ["ELE.02.3", "ELE.02.4", "ELE.05.3", "ELE.05.4"],
    contentStatus: "published",
    practiceStatus: "interactive",
    contentIds: articles.filter((a) => a.exampleId).map((a) => a.id),
    sourceId: "curriculum",
    locator: "s. 4–7 i 12–15: instalacje i maszyny (jednostki .3 i .4)",
  },
  {
    id: "devices-theory",
    title:
      "Przekaźnik elektromagnetyczny, czas i zasilacze — teoria bez osobnej demonstracji",
    qualifications: ["ELE.02", "ELE.05"],
    tags: ["ELE.02.2", "ELE.02.4", "ELE.05.2", "ELE.05.4"],
    contentStatus: "published",
    practiceStatus: "theory-only",
    contentIds: articles.filter((a) => !a.exampleId).map((a) => a.id),
    sourceId: "curriculum",
    locator: "s. 3–4, 5–7, 11–12 i 13–15: podstawy i urządzenia elektryczne",
  },
  ...[
    [
      "measurements",
      "Pomiary ochronne i diagnoza",
      "ELE.02.3 / ELE.02.4 / ELE.05.3 / ELE.05.4",
      "s. 4–7 i 12–15: pomiary instalacji oraz maszyn",
    ],
    [
      "selection",
      "Podstawy i dobór przewodów oraz zabezpieczeń",
      "ELE.02.2 / ELE.05.2",
      "s. 3–4 i 11–12",
    ],
    [
      "networks",
      "Sieci TN, TT, IT i ochrona przeciwporażeniowa",
      "ELE.02.3 / ELE.05.3",
      "s. 4–6 i 12–13",
    ],
    [
      "machines",
      "Transformatory i pozostałe maszyny",
      "ELE.02.4 / ELE.05.4",
      "s. 5–7 i 13–15",
    ],
    [
      "safety",
      "BHP, pierwsza pomoc i organizacja pracy",
      "ELE.02.1 / ELE.05.1",
      "s. 1–3 i 10–11: organizacja bezpiecznego stanowiska pracy",
    ],
    [
      "language",
      "Język zawodowy, kompetencje i zespoły",
      "ELE.02.5 / ELE.02.6 / ELE.05.5 / ELE.05.6 / ELE.05.7",
      "s. 7–9 i 15–18: język obcy zawodowy, kompetencje oraz małe zespoły",
    ],
    [
      "drawing",
      "Samodzielne rysowanie małych fragmentów",
      "ELE.02.2 / ELE.05.2",
      "s. 3–4 i 11–12",
    ],
  ].map(([id, title, tag, locator]): CoverageEntry => ({
    id,
    title,
    tags: tag.split(" / "),
    locator,
    qualifications: ["ELE.02", "ELE.05"],
    contentStatus: "planned",
    practiceStatus: "unavailable",
    contentIds: [],
    sourceId: "curriculum",
  })),
];
export const glossary = [
  ["NO", "Styk normalnie otwarty — w stanie odniesienia nie przewodzi."],
  ["NC", "Styk normalnie zamknięty — w stanie odniesienia przewodzi."],
  ["COM", "Wspólny zacisk zestyku przełącznego."],
  [
    "Podtrzymanie",
    "Równoległa droga zastępująca puszczony START; funkcja połączenia, nie nazwa numeru zacisku.",
  ],
  [
    "Mechanizm",
    "Wspólny ruch styków aparatu i przypisanych bloków; relacja mechaniczna nie jest żyłą.",
  ],
  ["Węzeł", "Zbiór elektrycznie połączonych punktów o wspólnym potencjale."],
  [
    "Stan odniesienia",
    "Jawnie opisany stan aparatu przed pobudzeniem, używany w dokumentacji.",
  ],
];

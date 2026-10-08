# Baza wiedzy ELE.02 / ELE.05

Wydanie lokalne z 2026-10-08 obejmuje 12 artykułów, 6 układów i 6 lekcji. Wejście: **Baza wiedzy** w nagłówku, także bez otwierania instalacji. Adresy mają postać `/ele/#knowledge/article/stycznik`, `/ele/#knowledge/lesson/szeregowo-rownolegle`, `/ele/#knowledge/circuit/start-stop`. Hash nie wymaga reguł serwera GitHub Pages.

## Przyjęty zakres i rozpoznanie repozytorium

Przeczytano ARCHITECTURE, DEVICE_DATA_POLICY, SIMULATION_SCOPE, RELEASING, istniejące snapshoty i kontrakty katalogu, dokumentu, assembly oraz mechanizm zapisu. Nie znaleziono obowiązujących AGENTS.md w repozytorium ani jego przodkach. Załączona instrukcja odwoływała się do `ELE_Baza_wiedzy_specyfikacja_2026-10-07.md`, którego nie było w załącznikach/repozytorium. Implementację oparto na kompletnej dostarczonej instrukcji; robocze etapy A–C: ścieżka START/STOP i powrót → komplet materiałów → integracja/walidacja. Nie odtworzono treści brakującego dokumentu.

Aktualne punkty integracji: `device-catalog/index.ts` oraz profile; `circuit-model/index.ts`; `renderers/index.tsx`; `editor/Board.tsx`; konstruktor `training/builder.ts` i `arrangeProject`; solver `simulation/index.ts` oraz `mechanisms.ts`; `apps/web/src/store.ts` (`flushSave`, `load`, historia); persystencja i biblioteka w `persistence.ts` / `library.ts`. Dotychczasowa aplikacja nie miała routera. Nie zmieniono formatu CircuitModel, rewizji produktów, Dexie, snapshotów instalacji ani ocen starych ćwiczeń.

## Materiały

12 grup aparatów: łączniki/przyciski NO/NC; stycznik; blok pomocniczy; przekaźnik elektromagnetyczny; bistabilny; czasowe/automat schodowy; MCB; RCD/RCBO; zabezpieczenia silnikowe; złączki/listwy/mostki/DIN; zasilacze/AC/DC; silnik trójfazowy. Każdy artykuł ma 10 opracowanych sekcji, autorską ilustrację, mapę konkretnego modelu, ograniczenia i źródła z lokalizatorami. Teoria nie przypisuje automatycznie funkcji w dowolnym obwodzie użytkownika.

6 układów: lampa z rozgałęzieniem; schodowy; bistabilny; START/STOP; silnik z dwóch miejsc; prawo/lewo. 6 lekcji: linia/żyła; węzeł/skrzyżowanie; stan odniesienia NO/NC; wiele symboli jednego aparatu; szereg/równolegle/podtrzymanie; moc/sterowanie. Kroki wykonują RuntimeAction i wyświetlają obliczone stany, napięcia i kierunek; nie korzystają z oceny 4/4. Wejście do wiedzy nie załącza źródeł instalacji.

W planie pozostają pełne materiały pomiarowe/diagnostyczne, dobór, pozostałe układy sieciowe TT/IT, transformatory i inne maszyny, BHP, język zawodowy/kompetencje/zespoły oraz samodzielne rysowanie fragmentów. Mapa podaje jednostki podstawy MEN i osobno status treści/praktyki, w tym osobny wiersz materiałów opracowanych bez przygotowanej demonstracji. To nie jest pełne przygotowanie egzaminacyjne.

## Modele i źródła

Rzeczywiste opublikowane produkty wykorzystywane lub ilustrowane: LC1D09P7, XB5AA35, MBN116E, HDR-60-24. Pozostałe: jawne edu-* (przełączniki, chwilowe przyciski, bistabilny, czasówka, automat, przekaźnik, bloki, zabezpieczenia, złączki, źródła, lampy i silnik). Nie dodano nowych produktów.

`binding-snapshot.json` obejmuje 39 powiązań, 183 publiczne zaciski i 100 fragmentów. Utrwala ID/revizję produktu, rewizję topologii, artykuł, publiczne terminale i wewnętrzne fragmenty. Dla rekordów bez zgodnego bindingu behaviorId prowadzi jedynie do teorii, bez obietnicy konkretnej mapy. Numery zacisków przychodzą z katalogu, a role dydaktyczne z autorskiego layoutu wzorca. K1:13–14 → sygnalizacja; KA1:53–54 → podtrzymanie. Assembly wiąże KA1 z K1, interlock oddzielnie wiąże K1 z K2.

Przegląd źródeł: MEN (strona zawodu i podstawa), informatory CKE, Schneider FA110040 i FA400841, instrukcja TeSys D (0381869_01A55_04, rysunki s. 1 i 4), AS-212, HDR-60 oraz karta Finder 40. Dodatkowo przejrzano ABB Manual for Low Voltage Motors 01-2009 (§3.8.1, §3.9 i Figure 1) oraz Schneider FA107663 (styki LRD). Źródła starszych zweryfikowanych map zachowują daty katalogowe 2026-10-02/05. Daty 2026-10-07/08 dotyczą przeglądu treści odnośnika w tym wydaniu i nie oznaczają zakończenia odbioru dodatkowego SKU. Nie zadeklarowano zgodności autorskich symboli z normą.

Dalszej weryfikacji przemysłowej wymagają bloki LADN, zestaw przekaźnik + gniazdo, WAGO/listwy, BIS-411, AS-212, PCU-510, zabezpieczenia i silnik. Artykuły pokazują modele edukacyjne i nie publikują tych SKU. Przekaźnik elektromagnetyczny, czasówka/automat i zasilacz mają teorię/ilustrację bez osobnego przygotowanego interaktywnego przykładu w tej bazie; nie udają brakującej demonstracji. Czasówka, automat i DC są w dotychczasowym menu Przykłady.

## Architektura i izolacja

`packages/knowledge/types.ts` opisuje Article, ProductKnowledgeBinding, CircuitLesson, KnowledgeContext, CoverageEntry, LearningProgress oraz layout symboli. Treść jest wersjonowana w repozytorium. `content.ts`, `articles.ts`, `sources.ts` nie wymagają edycji App przy dodawaniu materiału.

`examples.ts` używa istniejących konstruktorów i walidatora. `permanentNets` wyprowadza węzły z przewodów, mostków i stałych połączeń wewnętrznych. Layout SVG zawiera wyłącznie położenia/referencje symboli i portów — nie drugą listę przewodów. N–PE źródła pozostaje w modelu elektrycznym, lecz diagram nie scala wizualnie linii N i PE. Styki ruchome nigdy nie są zamieniane w stałe połączenia diagramu. Tabela żył i fizyczny widok odczytują CircuitModel. Tor mocy i sterowania mają osobne zakresy. W lekcji węzłów N przecina fazę do H2 z przerwą i bez kropki, podczas gdy odgałęzienia XL2 mają kropki; układ elektryczny pozostaje ten sam. Zacisk zaznaczony w tabeli/symbolu wskazuje te same ID w drugim widoku. Powrót z pomocy wskazuje konkretne zaciski jako stan UI, bez zmiany dokumentu lub gestu łączenia.

Stan demonstracji jest lokalny komponentowi; `advance` dostaje wyłącznie izolowany dokument. Reset tworzy initialRuntime tego przykładu, bez store/undo oryginału. Kopia dostaje nowe projectId, przechodzi walidację i jest ładowana po `flushSave`. Usuwa sesję ćwiczenia/scenariusz/usterki. Nie nadpisuje oryginału.

`knowledge-navigation.ts` zapisuje pomocniczy kontekst w sessionStorage, a kadr w pamięci UI. Kontekst sprawdza dokładne projectId, rewizję, ID instancji i rewizję produktu; oznaczenie K1 nie służy do dopasowania. Nieaktualny kontekst wyłącza wskazywanie. Edytor pozostaje zamontowany i inert pod portalem wiedzy, zachowując kadr, historię i projekt. Skróty edytora oraz automatyczne kroki zegara są wówczas zawieszone. Powrót nie ładuje starej kopii dokumentu; przywraca stan UI i fokus po usunięciu inert. Progres czytania w `ele.knowledge.progress.v1` nie jest częścią instalacji ani jej eksportu.

## Dopisywanie materiału

1. Dodaj pełny Article w `articles.ts`: stałe ID/slug, polskie nazwy/synonimy, źródła z lokalizatorem, treści sekcji, model ilustracji, istniejące related i opcjonalny exampleId. Nie publikuj pustych kart. Braki wpisz jako `planned` w CoverageEntry.
2. Dla produktu przejrzyj jego topologię/revizję i dowody. Dodaj lub popraw konkretny wpis w `binding-snapshot.json`: każdy terminal musi istnieć, a fragment wskazywać prawdziwy internal connection i publiczne terminale. `scripts/knowledge-snapshot.ts` może przygotować snapshot z katalogu do przeglądu, ale NIE uruchamia się przy buildzie i nie stanowi weryfikacji producenta. Aktualizacja snapshotu wymaga przeglądu zmienionych produktów. Nie dodawaj bindingu nieopublikowanego SKU tylko po to, aby usunąć fallback.
3. Przykład dodaj w `examples.ts`: konstruktor CircuitModel, autorski DiagramScope z referencjami do fragmentów/portów, prawdziwe RuntimeAction i obserwowane urządzenia. Dodaj CircuitLesson w `content.ts` oraz test zależności elektrycznej. Przyszłe rysowanie powinno porównywać topologię, nie współrzędne symboli.
4. Uruchom `pnpm knowledge:validate`, typecheck, lint, testy i build. Build automatycznie waliduje treści. Nowe połączenie sprawdź zarówno na solverze, jak i w przeglądarce. Przejrzyj widok odniesienia/działania, tablicę, tabelę, fokus i mobilne zakładki.

## Weryfikacja

Testy kontraktów: `tests/knowledge.test.ts`, `tests/knowledge-navigation.test.tsx`. Przepływy browser: `tests/e2e/knowledge.spec.ts`, również w konfiguracji produkcyjnej pod `/ele/`. Zrzuty: `docs/qa/knowledge-*.png`. Skrypt ręcznej inspekcji `scripts/knowledge-visual.ts` wymaga `pnpm dev`.

Kontrole obejmują resolver produktu/terminala/fragmentu, odrzucenie rewizji, K1/K2, usuniętą instancję, relację assembly, zepsucie podtrzymania usuniętym przewodem, START/STOP, dwa miejsca, blokady kierunków, brak mutacji dokumentu/history/runtime, reset, nową kopię, progres, synonimy, klawiaturę i bezpośredni hash po odświeżeniu.

Wyniki lokalne (2026-10-08):

- Finalne `pnpm test`: **270/270**, 17 plików. Kontrakty wiedzy i nawigacji: 14 testów.
- Pełne E2E developerskie: **42 zaliczone, 1 pominięty**. Po poprawkach mapy modelu/wskazywania: **9/9** w `knowledge.spec.ts` i `wire-editing.spec.ts`.
- Pełne E2E produkcyjne: **26 zaliczonych, 1 pominięty**. Po ostatniej korekcie rysunku i źródeł: **9/9** na finalnym dist — wszystkie 7 przepływów wiedzy oraz 2 testy Pages/Workera pod `/ele/`.
- Pominięty w obu pełnych zestawach jest istniejący test zrzutu zależny od nieobecnego lokalnego projektu użytkownika. Nie dotyczy bazy wiedzy.
- Typecheck, Oxlint/ESLint, walidacja katalogu (32 SKU, 4 opublikowane, 28 oczekujących, 41 profili edukacyjnych), build z walidacją 24 materiałów oraz `dist:validate`: poprawne.

Przy równoległym obciążeniu buildem i generowaniem zrzutów istniejący test archiwum wydania raz przekroczył swój limit 5 s. Osobne uruchomienie: 7/7 w 2,35 s; ponowne pełne `pnpm test`, bez dodatkowego obciążenia: 270/270 w 20,81 s. Nie zwiększano limitu ani nie zmieniano tego testu.

Vite zgłasza duży główny chunk (około 1,39 MB, gzip 406 kB); build kończy się poprawnie. Podział bundla pozostaje osobną pracą wydajnościową. Nie utworzono tagu, commita wydania ani deploymentu GitHub Pages.

Przegląd wizualny obejmuje wszystkie sześć układów i osobne widoki mocy. Układ schodowy przedstawia drugi przełącznik z lustrzaną orientacją portów (korespondencje 1/2 od lewej, COM od prawej), bez zamiany ID zacisków. W prawo/lewo osobne korytarze rysunku prowadzą trzy węzły wyjściowe do F1; krzyżowanie torów nie oznacza ich połączenia. Layout nie zmienia solvera ani listy żył.

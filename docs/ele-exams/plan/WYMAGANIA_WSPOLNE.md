# Wymagania wspólne dla Codexa

## Cel i stan wejściowy

Docelowo każdy z 17 dostarczonych arkuszy ma gotowy, kompletnie połączony układ w pracowni i lekcję wyjaśniającą jego działanie. Baza wiedzy jest osobnym widokiem projektu i otwiera się też z konkretnego aparatu, zacisku, symbolu lub toru. Pierwszeństwo mają wzorce i rozumienie schematu; nowe warianty egzaminacyjnego montażu i diagnozy są dalszym zakresem.

W paczce są treści i instrukcje, a nie wdrożenie. Tylko 101 i 108 mają istniejące dokumenty importu; pozostałe 15 wymagają zbudowania. Status source-review-required dla 114 jest rzeczywistym ograniczeniem. 82 opisane próby nie są 82 testami już wykonanymi na nowych układach. Wyniki historycznych 40 testów aplikacji obejmują wybrane istniejące funkcje.

Punkt odniesienia: Choniawko/ele, commit 9c4895a817b5f5869d17b3cf23a3e9695d49f6cf. Przed sesją przeczytaj AGENTS.md, jeśli występuje, aktualne docs/ARCHITECTURE.md, PROJECT_IMPORT.md, DEVICE_DATA_POLICY.md, SIMULATION_SCOPE.md, MEASUREMENT_PROFILES.md, RELEASING.md oraz kontrakty kodu. Gdy HEAD jest nowszy, sprawdź różnice i zaadaptuj instrukcje. Nie cofaj zmian użytkownika ani nie przywracaj starego katalogu z paczki.

## Miejsca integracji — istniejące, sprawdzone w punkcie odniesienia

| Miejsce | Obowiązek |
|---|---|
| apps/web/src/App.tsx | Nawigacja, katalog, inspektor, dialog Przykłady; wyodrębniaj nowe widoki do komponentów |
| apps/web/src/store.ts | Komendy projektu, wybór, symulacja, worker, autosave; zachowaj walidację przed mutacją |
| packages/editor/Board.tsx | Dwa widoki i lokalny stan kamery; zachowaj kadr przy powrocie z teorii |
| packages/circuit-model/index.ts | Jedna topologia, Zod, ProjectDocument, dozwolone settings, limity |
| packages/device-catalog/index.ts, stage-one.ts, motor-controls.ts | Produkty, topologie, rewizje; nowe profile z dowodami |
| packages/device-catalog/project-validation.ts | validateProjectDocument: schema, referencje, zgodność katalogu i mechaniki |
| packages/simulation/index.ts, mechanisms.ts, motor.ts, numeric.ts | Zachowania aparatu i wynik obwodu; bez zależności od React |
| packages/measurements/index.ts | Odczyty z modelu, warunki próby i unsupported |
| packages/training/index.ts, builder.ts, practice.ts, assessment.ts | Dotychczasowy rejestr scenariuszy i ocena; nowe wzorce nie mogą podlegać niewłaściwej wspólnej ocenie |
| apps/web/src/persistence.ts, library.ts | Bezpieczny eksport/import i atomowy zapis kopii; brak nadpisywania wzorca |
| scripts/ele02-101.ts, scripts/ele02-108.ts, examples/physical/ | Istniejące generatory i wzorce ze stabilnymi ID |
| vite.config.ts, tsconfig.json | Oba miejsca aliasów; production BASE_URL=/ele/ |
| .github/workflows/verify.yml | Aktualny wymagany pipeline; Node 24 w badanym CI, przypięty pnpm w package.json |

Nie zakładaj workspace package.json w każdym podkatalogu: repo ma logiczne pakiety i wspólny build z głównego package.json. Nowy alias dodaj spójnie w Vite i TypeScript albo stosuj istniejące importy względne.

## Dwa rejestry, jedna topologia

1. packages/knowledge: źródła, artykuły, karty, profile aparatu, symbole, odniesienia do instrukcji, status źródła i fragmenty lekcji.
2. packages/training lub osobny packages/exam-examples: gotowe ProjectDocument i ReferenceExample. Dostosuj lokalizację do aktualnej architektury. Publiczny rejestr gotowych układów jest jawny, walidowany i nie stosuje fallback do scenariusza zero dla nieznanego ID.
3. Sidecar wiąże taskId/referenceRevision, ID instancji, productId/productRevision/topologyId, terminalId, conductorId/bridgeId, symbolFragmentId oraz lessonId. Sam ProjectDocument pozostaje zgodny ze swoim strict schematem. userMetadata może zawierać tekstową identyfikację task/reference, ale nie zagnieżdżony silnik treści.
4. physical i schematic są dwoma layoutami tego samego circuit. Tabela przewodów, podświetlenie i BOM projektu wynikają z modelu. Nie utrzymuj drugiego grafu połączeń tylko do animacji lekcji.
5. Źródłowy BOM jest osobną informacją o arkuszu. Lista fizycznego modelu może różnić się przez dydaktyczne złączki lub model źródła; pokaż jawne wyjaśnienie różnicy, nie podmień źródłowego BOM.

Proponowane pliki: packages/knowledge/schema.ts, index.ts, search.ts, bindings.ts; apps/web/src/knowledge/KnowledgePage.tsx, TaskPage.tsx, DeviceArticle.tsx, DiagramViewer.tsx, ContextHelp.tsx; packages/exam-examples/registry.ts, lessons.ts; docs/ele-exams/implementation-state.json, QA_<etap>.md. Są to planowane miejsca, nie pliki już obecne w repo.

## Gotowy układ — definicja odbioru

Każdy zweryfikowany wzorzec ma:

- Zapisany/generowany deterministycznie ProjectDocument: komplet aparatów, złączek, przewodów, mostków, zespołów mechanicznych, kabli i systemów zasilania; brak ukrytych usterek i aktywnej sesji treningu.
- Jawne źródło PDF/hash/strony/rysunki, profil każdego konkretnego aparatu, założenia długości/nastaw i zakres zgodności z realnym stanowiskiem.
- Stabilne ID instancji i przewodów między uruchomieniami generatora; kopia użytkownika ma nowe projectId. Dopisywanie projektu nie zmienia ID starych wzorców.
- Kompletny layout montażowy i schemat rozwinięty z oddzielnymi torami mocy i sterowania; brak pozornego połączenia na zwykłym skrzyżowaniu i widoczne oznaczenia zacisków.
- Galerie i karty z działającą akcją Otwórz gotowy układ, zestaw funkcjonalnych prób i aktualny status w rejestrze. Baza wiedzy dla jego aparatów i typowych zastosowań jest częścią odbioru.
- Import→eksport→import zgodny z bieżącą walidacją, nowa kopia startująca z energią OFF, po przeładowaniu bez samoczynnego włączenia źródeł.
- Dowody funkcji z niezależnie odczytanego źródła, prób błędnego połączenia, diagramu i UX. Sam validateProjectDocument nie potwierdza funkcji obwodu.

Istniejący Builder generuje losowe ID, ustawienie przewodu 1,5 mm² i 2 m oraz mechaniczny schemat w siatce. Nie używaj tych domyślnych wartości do udawania danych arkusza. Dla nowych wzorców wykorzystaj adapter/generator ze stabilnymi ID i jawnymi parametrami. Przykłady scripts/ele02-101.ts i 108.ts pokazują taki kierunek. Zmiany ogólnego Buildera muszą zachować stare scenariusze.

Nie narzucaj identycznych W1…Wn w ocenie własnego projektu użytkownika. Stable ID służą wzorcowi i lekcji; równoważne funkcjonalnie rozwiązanie ma być w przyszłym treningu oceniane przez topologię, role i zachowanie.

## Źródła i dokładność

Kolejność dowodów: oryginalny rysunek/treść/tabela → pełna instrukcja wybranego modelu → jawna interpretacja → model wykonywalny → próba. Rozbieżności rozstrzygaj i zapisuj, zamiast scalać po cichu. Źródłowe zdania TAK/NIE mogą być celowo fałszywe.

Treść pakietu jest w materialy/. data/component-catalog-map.json to snapshot mapowania, a plannedProductId to propozycja nowego modelu, nie produkt do importu. Porównaj aktualny katalog i użyj istniejącego zgodnego profilu, jeżeli został już dodany. Profile z niepełnymi danymi mogą być jawnie dydaktyczne, lecz nie otrzymują statusu odwzorowanie 1:1.

Nie zmieniaj w miejscu BIS-411 na BIS-413, C16 na B16, 24 V DC na 230 V AC ani silnika 230Δ/400Y na 400Δ/690Y. Dodaj nowe ID/topologie/revizje z potwierdzoną numeracją, zachowaniem i geometrią. Sprawdź DEVICE_DATA_POLICY przed publikacją produktu.

Nie kopiuj chronionych danych logowania do kodu, dokumentacji, testów lub raportów. Materiałem tej paczki są dostarczone pliki; nie potrzebujesz dostępu do konta kursowego.

Jednoznacznie rozdziel:

- symbol w stanie odniesienia i bieżące położenie styku;
- numer zacisku rysunku i terminalId wybranego produktu;
- nominalne dane tabliczki i nastawy użytkownika;
- długość geometryczną trasy w px i electricalLengthM w m;
- energię kWh, moc W i napięcie V;
- przełącznik NO+NC wspólnego operatora i dwa niezależne START/STOP;
- listwę/złączkę o wspólnym potencjale i płytkę kilku niezależnych torów;
- poprawność elektrycznej sieci i nieweryfikowaną głębokość puszki, momenty dokręcenia, mechanikę końcówek lub realne parametry pomiarów.

## Nauka w kontekście i UX

Wiedza jest osobną stroną, pomoc w pracowni niewielkim panelem. Użytkownik może kolejno zobaczyć: czym jest aparat, jak czytać jego symbol, jaką rolę pełni tutaj, które zaciski/przewody są istotne i jak sprawdzić funkcję. Nie otwieraj od razu dużego artykułu blokującego połączenia.

Trzy czytelne poziomy rysunku na karcie: Oryginał arkusza / Objaśnienie / Schemat z projektu. Oryginały są niezmienione; szkice do uzupełnienia zachowują taki status. Objaśnienie może mieć hotspoty w współrzędnych źródła, a solverowa projekcja używa ID modelu. PNG/SVG źródła nie zawiera semantyki klikanych styków; metadata trzeba dopisać i zwalidować. Powiększenie/przewijanie transformują hotspoty z obrazem.

Panel pracowni pozwala podświetlić aparat, zacisk, konkretną żyłę/mostek lub cały tor w obu widokach oraz pozostać przy poprzednim narzędziu. Pomoc ma osobny gest, więc nie przechwytuje podstawowego klikania zacisków. Nie używaj samego koloru do wskazywania L/N/PE; pokazuj tekst, oznaczenie i odpowiednią konwencję PE.

Ścieżka czytania układu: źródło i ochrona → tor mocy → tor sterowania → złączki/powroty N/PE → warunek załączenia → podtrzymanie/blokada → próba i spodziewany wynik. W 108 własne NO K1 jest podtrzymaniem, inny NO może pełnić zgodę lub sygnalizację. Funkcja nie wynika z samego napisu NO.

Schemat rozwinięty ma osobne symbole cewki, styków mocy i pomocniczych umieszczone we właściwych torach, z powtórzonym oznaczeniem aparatu i odnośnikiem do wspólnego mechanizmu. Oddziel bloki mocy/sterowania, uporządkuj rzędy, pokaż stan odniesienia i nakładkę bieżącego stanu. Nie wystarczy automatyczna siatka pełnych korpusów katalogowych. Projekcja może mieć wiele graphicFragmentId dla jednego instanceId, ale każdy port wskazuje istniejący TerminalRef, a żaden symbol nie dodaje nowej cewki, styku lub źródła w solverze. Kliknięcie cewki/styku odnajduje ten sam aparat w widoku montażowym. Rozszerzenie layoutu/projekcji musi mieć kontrolowaną wersję, walidację, zgodność starych plików oraz eksport/import. Lekcja nie utrzymuje drugiego netlistu, a własny projekt użytkownika także otrzymuje poprawną projekcję po edycji. Nowe szczegółowe symbole sprawdź z przyjętą konwencją i dokumentacją techniczną; obraz generatywny nie jest źródłem dokładnego rysunku elektrycznego.

Galeria Gotowe układy filtruje po kwalifikacji, zadaniu, poziomie i funkcji; nie miesza w jednym przycisku gotowego wzorca z pustym ćwiczeniem. Karty mają jawny stan: Dostępna teoria / Złożony szkic / Gotowy model dydaktyczny / Zweryfikowany wariant aparatury / Wymaga danych. Licznik X/17 dotyczy jednego jawnego kryterium i nie dolicza obrazów czy szkiców.

Desktop: pracownia z panelem lekcji, bez trzech równorzędnych szerokich paneli. Wąski ekran: zakładki Rysunek / Działanie / Aparaty / Próby, przewijanie samego rysunku i łatwy powrót. Minimalny odbiór: 1366×768, 1920×1080, 390×844 oraz 844×390; tekst i kontrolki nie znikają pod kanwą. Powiększenie rysunku jest oddzielne od zoomu całej strony.

Otwórz gotowy układ tworzy kopię i korzysta z istniejącej obsługi zapisu/nowej sesji; najpierw zakończ pending autosave i obsłuż błąd. Nie nadpisuj obecnego dokumentu ani wzorca. Pomoc i podświetlenie nie zwiększają circuit.revision; rzeczywista edycja topologii zachowuje politykę odłączenia energii i undo/redo.

## Rozbudowa wiedzy — obowiązek każdego etapu

Obecne 25 artykułów to materiał startowy. Każdy nowy model dostaje profil z: zasadą działania, wyglądem i symbolem, stanem spoczynkowym, mapą zacisków, tabelą stanów, zasilaniem/nastawami, zastosowaniami w konkretnych zadaniach, sposobem wykonania próby, typowymi pomyłkami i granicami symulacji. Dane z pełnej instrukcji mają konkretną wersję i źródło; fallback artykułu ogólnego nie dopisuje numerów SKU.

Każdy układ dostaje własną lekcję, tabelę stanów, opis kolejnych zdarzeń, torów i oczekiwanych obserwacji. Teoria rysunku obejmuje: jednokreskowy/ideowy/montażowy, węzeł kontra skrzyżowanie, rozwinięcie kabla, oznaczenia i stany NO/NC, wielokrotne symbole jednej cewki/mechanizmu, referencje styków oraz czytanie mocy/sterowania. Wytłumacz na 101/105/108/113, a nie na oderwanych losowych symbolach.

60 kategorii BOM musi mieć link do znaczącego wyjaśnienia, także szyny, obudowy, złączki, płytki, dławnice i materiał. Różne rodzaje zacisków mają odrębne przykłady. Nie wciskaj każdemu osprzętowi pozornej animacji elektrycznej, jeżeli jego znaczenie jest mechaniczne.

Na karcie artykułu prowadź do Zadania z tym aparatem i Otwórz klasyczny układ. Klasyczne zastosowania powiąż z gotowymi wzorcami: schodowe/krzyżowy, impulsowe światło, AZ+AS, podtrzymanie START/STOP, nawrotny z blokadą, krańcówki, przełączenie rezerwy, pomiar energii, sterowanie temperaturą i ściemnianie. Zdania sprawdzające wiedzę mają wyjaśnienie oparte na obwodzie; ocenianie egzaminu wymaga osobnych reguł.

## Solver, czas, bodźce i pomiary

Nowe modele czasowe, energia, jasność i bodźce temperatury/światła mają deterministyczny stan w runtime oraz działania przekazywane przez istniejący worker/store. Bez setInterval w artykule decydującego o rzeczywistych stykach. Sesja lekcji demonstracyjnej jest oddzielna od sesji projektu użytkownika.

Jeżeli potrzebujesz nowych ustawień, rozszerz DeviceSettings, strict Zod, walidację konkretnych profili, UI, import/eksport i migrację/defaulty starych dokumentów. Nie dodawaj nieznanych pól tylko do JSON. Nowe RuntimeAction musi przejść przez worker, store i testy; UI nie może włączyć cewki wbrew topologii.

Pomiar pochodzi z połączeń i dopuszczonych parametrów produktu. Nieznana rezystancja realnego uzwojenia czy cewki daje unsupported, nie arbitralne Ω. Izolacja, pętla, RCD i prądy rozruchowe muszą zachować jawny zakres modelu; przykładowe dane symulacji nie są odczytem ze stanowiska. Dla SCO aproksymacja RMS nie pozwala zadeklarować pełnej analizy przebiegów, harmonicznych lub wszystkich typów RCD.

## Testowanie i odbiór

Każdy etap: testy zmienionych modeli, walidacja treści i projektów, próby funkcji w dodanych zadaniach, test integracji pomocy i realny odbiór wizualny. Testy powinny obalić błędny układ: pomylony N, błędny mostek, brak PE, złe blokady lub niezgodny profil. Nie uznawaj testu kopiującego konstruktor projektu za dowód rysunku.

Niezależny opis oczekiwanej topologii zapisuj w QA: źródłowy fragment, grupy elektrycznych węzłów, funkcja styku i wersja instrukcji. Test porównuje wymagane relacje i zachowanie, nie bezmyślnie liczbę przewodów albo układ pikseli. Podobieństwo symboli nie jest dowodem właściwego napięcia cewki.

Przed wydaniem zachowaj wymagane obecnie bramki repo: pnpm typecheck, pnpm lint, pnpm test, pnpm catalog:validate, pnpm test:e2e, pnpm build, pnpm test:e2e:production i release zgodnie z RELEASING.md/verify.yml. Nie buduj ponownie innych plików po produkcyjnym E2E. Nie usuwaj starych testów, aby nowe przeszły. Jeśli test przeglądarkowy jest niedostępny, zapisz blocked, nie passed; jsdom nie zastępuje obrazu ani natywnego fokusu.

Podczas implementacji używaj testów dobranych do realnej zmiany. Cała wymagana regresja jest bramką wydania; nie uruchamiaj wielokrotnie pełnej pętli bez konkretnego ryzyka. Wynik etapu zawiera commit, komendy, datę, rezultat i dowód screenshot/raportu dla nowej funkcji.

## Sesje, wdrażanie i zachowanie kontekstu

Start każdej sesji: odczytaj docs/ele-exams/implementation-state.json i raport ostatniej jednostki. Porównaj z kodem/testami. Stan wejściowy z paczki nie jest dowodem wykonania. Kontynuuj najwcześniejszą niewykonaną jednostkę ze spełnionymi zależnościami, nie zaczynaj całej analizy od nowa.

Jedna jednostka wykonawcza może być granicą sesji. Zakończ ją działającym kodem, rzeczywistymi testami i raportem. Nie oznacz całego etapu jako done po samym modelu aparatu: bramka etapu obejmuje gotowe układy, teorię i UX. Szkic może zostać w repo bez publicznego przycisku Uruchom jako zweryfikowany.

30 jednostek to planowane punkty kontrolne, nie nakaz ukończenia każdej w jednej sesji. Dużą jednostkę możesz podzielić na 03a.1/03a.2 itp.; zapisz dodatkowe dzieci w checkpoint i oznacz nadrzędną jednostkę tested dopiero po pełnym zakresie. W każdej przerwie podaj dokładny następny krok i wyniki już wykonanych prób. Nie publikuj niekompletnego wzorca jako gotowego tylko z powodu limitu sesji.

Zależności etapów opisują wymagane zdolności, nie wymóg ukończenia każdego niezależnego układu poprzedniego etapu. Dla 03 zwykle wystarcza tested 03a (profile wspólne), dla 08 — 08a (motor/blok), dla 09 — 09a (mechanizmy). Jeśli np. 103 czeka na źródło, ale modele 03a są sprawdzone, 115 lub 117 może ruszyć. Oba modele i kontekst z 01 muszą być dostępne. Odbiór końcowy 14 wymaga jednak pełnych bramek wszystkich etapów; nie nadaj 03 statusu done na podstawie samego 03a.

Checkpoint zapisuje: ostatni commit, pliki, wykonane testy, stan każdej jednostki, źródłowe kwestie resolved/open z dowodem, przykłady referenceStatus i fidelity oraz dokładny następny krok. Dla blokady wpisz, czego brakuje i które niezależne jednostki można kontynuować; otwarte 114 nie blokuje prac nad 117 ani publikacji wcześniejszych etapów.

Rozróżnij implemented/tested/released. Przygotowanie PR i gotowego dist jest odrębne od publikacji Pages. W tej instrukcji nie ma upoważnienia do automatycznej publikacji; stosuj aktualne upoważnienie użytkownika i procedurę repo. Nie kończ sesji samym planem, jeśli wykonanie wybranej jednostki jest możliwe.

Raport końcowy jednostki: co użytkownik może zrobić; które taskId są rzeczywiście gotowe; nowe modele i ograniczenia; testy/dowody; commit/PR; krok do wznowienia. Nie deklaruj 17/17 na podstawie 17 kart lub 17 plików szkiców.

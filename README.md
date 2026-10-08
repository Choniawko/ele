# Pracownia Elektryczna

Lokalny symulator szkoleniowy w języku polskim. Budowanie po zaciskach, tablica montażowa i schemat z jednego modelu, solver MNA w workerze, pomiary i diagnostyka. Dane projektu i historia pomiarów zapisują się w IndexedDB przeglądarki.

## Uruchomienie

Sprawdzone na macOS 12.7.6 Intel, Node 24.18.0 i pnpm 11.19.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Otwórz http://127.0.0.1:5173. Do wersji produkcyjnej: `pnpm build`, następnie `pnpm preview:dist` i http://127.0.0.1:4173/ele/. Build jest przygotowany dla https://choniawko.github.io/ele/. Działanie projektu nie wymaga konta ani klucza API. Linki do dokumentacji producentów wymagają internetu. Nie ma jeszcze service workera/PWA.

## Pierwsza próba

1. Wybierz Baza wiedzy → Zadania ELE.02 i odszukaj arkusz 101.
2. Otwórz „Gotowy układ i lekcja torów”. Przełącz Q1/Q2 w izolowanej lekcji i śledź żyłę w tabeli.
3. Otwórz wzorzec jako nową kopię, wybierz Widok połączeń, włącz zasilanie i przełącz Q1/Q2.
4. W trybie Pomiary sprawdź napięcie GW:test-L / GW:test-N; ciągłość PE sprawdzaj przy wyłączonym zasilaniu.

Przykłady, Ćwiczenia i kopiowanie w bibliotece obejmują wyłącznie obecne 17 zadań. Obecnie gotowy jest wzorzec 101; pozostałe karty udostępniają materiały źródłowe i status przygotowania. Nowa instalacja zaczyna od pustego projektu, a wcześniejsze własne zapisy nadal można otwierać i importować.

W Budowie kliknij aparat z katalogu i miejsce na tablicy. Dwa kliknięcia zacisków tworzą przewód; kliknięcie tła między końcami dodaje punkty trasy. Esc anuluje, Backspace usuwa ostatni punkt. Shift umożliwia wielokrotne zaznaczenie; dostępne są kopiowanie, wyrównanie, Delete i historia Ctrl/Cmd+Z. Ciasne zaciski można wybrać z listy w inspektorze albo po powiększeniu widoku. Przyciski START/STOP przytrzymuje się myszą lub spacją.

## Baza wiedzy

W nagłówku wybierz **Baza wiedzy**: 17 kart arkuszy, 25 artykułów, 60 kategorii BOM i 40 oryginalnych rysunków. Wyszukaj kod, aparat lub synonim. Wzorzec 101 ma schemat funkcjonalny, tablicę z rzeczywistymi trasami i tabelę wszystkich 33 żył, wyprowadzone z jednego CircuitModel. Stały adres: `/ele/#/wiedza/uklady/ele02-101`.

„Poznaj aparat” i osobne wyjaśnienie zacisku otwierają pomoc z rolą w tym układzie. Zwykły gest zacisku nadal rozpoczyna łączenie. Powrót zachowuje kadr, zaznaczenie i rozpoczętą pracę; czytanie zawiesza automatyczny zegar. Pełne artykuły katalogowe zachowują istniejące adresy i lokalny progres. Dawne demonstracje oraz układy bazowe wycofano. [Zakres i dopisywanie materiałów](docs/KNOWLEDGE.md), [odbiór 01a](docs/ele-exams/QA_01.md).

## Moje projekty

Kliknij nazwę bieżącego projektu w nagłówku, aby otworzyć bibliotekę. Utwórz folder, wybierz go i dodaj pusty projekt, importuj plik/wklej JSON albo zapisz kopię przykładu. Karty mają podgląd, przenoszenie do folderu, zmianę nazwy, duplikowanie, eksport i usuwanie. Usunięcie folderu domyślnie zachowuje jego projekty w „Bez folderu”.

Import tworzy nowe ID i wymaga zatwierdzenia podsumowania; paczka folderu jest zapisywana atomowo. [Kontrakt JSON i przykłady](docs/PROJECT_IMPORT.md) opisują format pojedynczego dokumentu oraz opakowania projektu/folderu z historią pomiarów. Dane pozostają w IndexedDB konkretnej przeglądarki i originu; nie ma synchronizacji ani kopii serwerowej. Eksportuj foldery jako kopie zapasowe, szczególnie przed usunięciem danych witryny lub zmianą profilu.

## Praca na tablicy

Gotowy układ **ELE.02-108**, dwa kierunki silnika z dwóch stanowisk, importujesz z [examples/physical/ELE02_108_stanowisko.json](examples/physical/ELE02_108_stanowisko.json). Katalog ma edukacyjny wyłącznik silnikowy z NO 13–14 i zespoły niezależnych START/STOP na TH35 i w obudowie. [Opis połączeń, testów i założeń](docs/ELE02_108.md) wyjaśnia nastawę Q2, kable i powrót zasilania przy trzymanym przycisku; tabliczka silnika wymaga uzupełnienia.

- Tablica zajmuje większość okna; katalog i właściwości można chować przyciskami u góry albo krzyżykiem w panelu. Na ekranach poniżej 1280 px panele są wysuwane nad tablicą. Ich widoczność i widoczność dziennika są zapamiętywane.
- **F / przycisk skupienia** chowa nagłówek i dodatkowe panele. **Esc** przywraca zwykły widok. „Przewody” otwiera parametry nowego połączenia, „Dziennik” chowa także cały pasek historii.
- **Przeciągnij korpus aparatu**, aby go przesunąć. Działa to również podczas symulacji. Zmiana położenia nie zmienia zacisków, długości elektrycznej przewodów, rewizji obwodu ani wyników pomiarów. Aparaty DIN wskakują na najbliższą szynę; zajęty obszar jest odrzucany.
- **+ Szyna DIN** dodaje kolejny rząd. Zaznacz aparat i wybierz „Przenieś na szynę…”, aby przenieść go bez przeciągania. Szyny oraz oba układy graficzne zapisują się w projekcie i podlegają cofaniu.
- **Zaznacz przewód → Edytuj trasę**: kliknięcie tła dodaje punkt, przeciąganie punktu zmienia jego położenie, dwuklik go usuwa. Przycisk ze strzałką przywraca trasę automatyczną. Oba zaciski są podświetlone i opisane; skrzyżowania mają odstęp wizualny i nie oznaczają połączenia.
- Automatyczna trasa wychodzi prosto z zacisku i skręca za obudową. Uwzględnia obudowy innych aparatów oraz odstępy między sąsiednimi żyłami. Przesunięcie aparatu przelicza trasę; ręczne punkty można zastąpić przyciskiem „Automatyczna trasa przewodu”.
- **Przeciągnij puste tło**, aby przesunąć widok. Kółko myszy powiększa miejsce pod kursorem. V wybiera zaznaczanie, H przesuwanie całej tablicy. „Dopasuj widok” pokazuje całą instalację; na telefonie startowe powiększenie 65% ułatwia pracę z zaciskami.
- Lampa emituje ciepłe światło, wentylator obraca łopatki, grzałka żarzy się, a wirnik silnika obraca się zgodnie z kolejnością faz. Efekty reagują na stan obwodu i znikają po rozłączeniu. Animacje respektują ustawienie ograniczonego ruchu. [Galeria](docs/qa/gallery.html) pokazuje odbiorniki wyłączone i podczas pracy.

Porównanie powierzchni, zrzuty i wyniki weryfikacji są w [opisie UX/UI](docs/UX_UI.md).

## Rzeczywisty stan

To działająca wersja testowa, **nie pełny odbiór v1 ani pełne pokrycie kwalifikacji**. Katalog ma 32 rzeczywiste SKU (31 z oryginalnego seed i nowy XB5AA35): 4 opublikowane — Hager MBN116E, Mean Well HDR-60-24, Schneider LC1D09P7 i XB5AA35 — oraz 28 oczekujących. Osobne 41 profili dydaktycznych ma jawne ograniczenia. Publiczne zestawy dotyczą 17 obecnych arkuszy; odbiór 01a daje 1/17 gotowych wzorców. Warianty montażu i diagnozy dla tych arkuszy pozostają w przygotowaniu. Aktualny zakres i dowody: [checkpoint](docs/ele-exams/implementation-state.json) i [QA_01](docs/ele-exams/QA_01.md). Historyczne zestawy pozostają wyłącznie w obsłudze starszych zapisów i testach regresji.

Silnik jest rezystancyjny, quasi-statyczny. Ochrona, silnik, elektronika i pomiary specjalne mają jawne uproszczenia. Wyniki nie są protokołem odbioru realnej instalacji. Brak implementacji LLM jest zgodny z zakresem; dostępny jest tylko kontrakt przyszłego tutora.

## Sprawdzenia

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm catalog:validate
pnpm catalog:report
pnpm benchmark
pnpm test:e2e
# po pnpm build, osobny serwer preview na porcie 4173:
pnpm test:e2e:production
# przy działającym pnpm dev:
pnpm exec tsx scripts/visual-qa.ts
```

Playwright używa zainstalowanego Chrome (`channel: chrome`). Firefox z użytej wersji Playwright nie obsługuje macOS 12. Zrzuty, przykład eksportu i wyniki benchmarków są w [docs/qa](docs/qa/). Szczegóły i pozostałe kryteria: [stan implementacji](docs/IMPLEMENTATION_STATUS.md), [zakres symulacji](docs/SIMULATION_SCOPE.md), [raport katalogu](docs/CATALOG_REPORT.md), [kolejny etap](docs/NEXT_TASK.md).

Oryginalny pakiet w `Symulator_Elektryczny_Pakiet_Codex` pozostawiono bez zmian. Korygowane dane i źródła są opisane w [polityce danych](docs/DEVICE_DATA_POLICY.md).

Edycja, zapis i import stosują te same limity dokumentu. Odrzucona zmiana pokazuje komunikat i zachowuje poprzedni stan. Przy niepoprawnym istniejącym zapisie można pobrać kopię do odzyskania; oryginał pozostaje w bazie. Procedura i testy regresji: [walidacja projektów](docs/PROJECT_VALIDATION.md).

## Ćwiczenia praktyczne — etap 1

W menu **Ćwiczenia** wybierz tryb nowych zestawów: Wzorzec, Montaż lub Diagnoza, a potem oświetlenie bistabilne, START/STOP albo prawo/lewo. Rozwiń „Wymagania i instrukcja montażu”. W inspektorze przypisz blok pomocniczy do stycznika, wybierz rzeczywiste mostki Y/Δ silnika i osobną blokadę mechaniczną. Montaż otwiera tryb Budowa, a Diagnoza tryb diagnostyczny. Po zmianie połączeń wykonaj pomiary ponownie — ocena wymaga bieżącej rewizji.

W diagnostyce zapisz pomiar właściwego uszkodzonego toru, hipotezę i napraw zaznaczony element. Dla sklejonego NC badaj spadek napięcia na styku podczas załączenia mechanizmu; ciągłość NC w spoczynku sama nie dowodzi usterki. Po naprawie sprawdź PE i działanie. Ukryta przyczyna nie jest eksportowana. Instrukcja odczytu nadruków i ograniczenia rezystancji cewek znajdują się w danych produktu.

## CI i pierwsze wydanie

PR-y i push do main uruchamiają `ELE CI`: frozen lockfile, typecheck, Oxlint/ESLint, testy, katalog, pełne E2E developerskie, build i E2E gotowego dist pod `/ele/`. Zestawy przeglądarkowe działają kolejno. Publikacja następuje wyłącznie dla zweryfikowanego tagu wersji, przez environment `github-pages`, z archiwum do rollbacku i `version.json`. Konieczne ustawienia ochrony main/tagów/środowiska i procedura: [RELEASING.md](docs/RELEASING.md). Dodanie workflowów nie jest potwierdzeniem deploymentu.

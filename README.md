# Pracownia Elektryczna

Lokalny symulator szkoleniowy w języku polskim. Budowanie po zaciskach, tablica montażowa i schemat z jednego modelu, solver MNA w workerze, pomiary i diagnostyka. Dane projektu i historia pomiarów zapisują się w IndexedDB przeglądarki.

## Uruchomienie

Sprawdzone na macOS 12.7.6 Intel, Node 24.18.0 i pnpm 11.19.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Otwórz http://127.0.0.1:5173. W tym środowisku serwer został już uruchomiony. Do wersji produkcyjnej: `pnpm build`, następnie `pnpm preview`. Działanie projektu nie wymaga konta ani klucza API. Linki do dokumentacji producentów wymagają internetu. Nie ma jeszcze service workera/PWA.

## Pierwsza próba

1. Otwórz przykład „Lampa i łącznik”, włącz zasilanie i przełącz S1.
2. Wybierz tryb Pomiary, kliknij zaciski H1:L i H1:N, wykonaj pomiar.
3. W Przykładach sprawdź „Wentylator i łącznik”, START/STOP, DC, automat schodowy, czasówkę i trzy fazy.
4. W Ćwiczeniach otwórz diagnozę. Zmierz ciągłość PE bez zasilania, zapisz hipotezę, zaznacz podejrzany przewód i napraw go. Powtórz pomiar i ocenę.

W Budowie kliknij aparat z katalogu i miejsce na tablicy. Dwa kliknięcia zacisków tworzą przewód; kliknięcie tła między końcami dodaje punkty trasy. Esc anuluje, Backspace usuwa ostatni punkt. Shift umożliwia wielokrotne zaznaczenie; dostępne są kopiowanie, wyrównanie, Delete i historia Ctrl/Cmd+Z. Ciasne zaciski można wybrać z listy w inspektorze albo po powiększeniu widoku. Przyciski START/STOP przytrzymuje się myszą lub spacją.

## Praca na tablicy

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

To działająca wersja testowa, **nie pełny odbiór v1 ani pełne pokrycie kwalifikacji**. Katalog ma 32 rzeczywiste SKU (31 z oryginalnego seed i nowy XB5AA35): 4 opublikowane — Hager MBN116E, Mean Well HDR-60-24, Schneider LC1D09P7 i XB5AA35 — oraz 28 oczekujących. Osobne 29 profili dydaktycznych ma jawne ograniczenia. Do 13 wcześniejszych scenariuszy dodano trzy zestawy z wzorcem, samodzielnym montażem i trzema ukrytymi wariantami diagnozy. Szczegółowe źródła i zakres: [pokrycie arkuszy](docs/exam-coverage.md) oraz [weryfikacja aparatów](docs/device-verification-stage-one.md).

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

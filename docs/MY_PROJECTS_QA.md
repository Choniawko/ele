# Moje projekty — weryfikacja 2026-10-06

Gałąź: `feat/my-projects`. Środowisko lokalne: macOS 12.7.6 Intel, Node 24.18.0, pnpm 11.19.0, Playwright z kanałem Chrome. Poniżej wyniki wykonanych kontroli lokalnych; sam ten dokument nie potwierdza przebiegu GitHub Actions ani deploymentu.

| Kontrola | Wynik |
| --- | --- |
| `pnpm install --frozen-lockfile` | OK, lockfile bez zmian |
| `pnpm typecheck` | OK |
| `pnpm lint` | OK, Oxlint z deny-warnings i ESLint |
| `pnpm test` | 190/190, 10 plików |
| `pnpm catalog:validate` | OK, 32 rzeczywiste SKU: 4 opublikowane, 28 oczekujących; 29 osobnych profili dydaktycznych; 28 wariantów stanowisk |
| `pnpm test:e2e` | 32/32, pełny zestaw developerski |
| `pnpm build` | OK, base `/ele/` |
| `pnpm test:e2e:production` | 14/14, gotowy dist pod `/ele/` |

Zestawy przeglądarkowe wykonano kolejno. Po pełnym developerskim przebiegu poprawiono skalowanie miniatur i odświeżanie pola nazwy/listy po zmianie metadanych; ponowne typecheck/lint/190 testów i produkcyjne 14 E2E przeszły na końcowym kodzie. Produkcyjny test sprawdza, że korpusy aparatów mieszczą się w miniaturze. Build nadal zgłasza ostrzeżenie Vite o pakiecie JS większym niż 500 kB: 1205.18 kB, gzip 357.80 kB. Nie zmieniano progu, aby ukryć ostrzeżenie.

Testy jednostkowe biblioteki obejmują migrację v4 wraz z nieczytelnym dokumentem, pomiarami/zdarzeniami/snapshotami/wskaźnikiem, autosave zachowujący folder, odrzucenie starych rewizji, niezależność duplikatów, konflikty ID także w paczce, nieznany format/wersję/produkt/rewizję/zacisk, wycofanie importu po awarii snapshotu, eksport/import historii, ochronę ukrytych odpowiedzi, usunięcie z blokadą spóźnionego zapisu i walidację przykładowych plików JSON.

Nowe E2E działają zarówno bez importów modułów Vite, jak i na produkcyjnym dist. Sprawdzają tworzenie i kopiowanie w folderze, rzeczywisty pomiar PE, autosave i odświeżenie, podgląd bez zmiany rekordu, uruchomienie solvera, duplikat/przenoszenie/zmianę nazwy/wyszukiwanie/sortowanie/usuwanie, osobne potwierdzenie kasowania folderu wraz z projektami, import pliku i tekstu, odrzucenie błędnej paczki bez utraty danych oraz eksport/import folderu. Migracja przeglądarkowa tworzy prawdziwą starą bazę IndexedDB (Dexie v4 to natywna wersja 40).

Testy Pages nadal weryfikują wszystkie zasoby z manifestu, SHA-256, adres Workera, zapis/odtworzenie i ponowną pracę solvera. Dotychczasowe testy odzyskiwania danych i ukrytych diagnoz nadal przechodzą.

## Przegląd wizualny

Na gotowym dist wykonano dodatkowy przepływ utworzenia folderu i kopii przykładu oraz obejrzano bibliotekę przy 1366×768 i 390×844. Brak pageerror i poziomego przepełnienia dialogu. Zrzuty przedstawiają fikcyjne projekty w izolowanym profilu testowym:

- [Komputer](qa/my-projects-desktop.png)
- [Telefon](qa/my-projects-mobile.png)

## Test ręczny

1. `pnpm build`, `pnpm preview:dist`, otwórz `http://127.0.0.1:4173/ele/`.
2. Kliknij nazwę projektu → „Nowy folder”, nazwij go „Projekty do egzaminu”. Wybierz „Kopiuj przykład”, nadaj własną nazwę i zapisz. Zmierz ciągłość PE bez zasilania, edytuj połączenie, poczekaj na „Zapisano lokalnie” i odśwież. Folder, rozmieszczenie i zapisany pomiar pozostają; zasilanie jest wyłączone.
3. Otwórz bibliotekę, obejrzyj podgląd, potem „Otwórz w edytorze”. Duplikuj, zmień nazwę kopii i przenieś ją do innego folderu. Oryginał pozostaje niezależny.
4. W wybranym folderze importuj `examples/import/minimal-project.json`, sprawdź podsumowanie i zatwierdź. Powtórz import — pojawi się nowy projekt. Wklej wersję z nieznanym produktem lub zaciskiem: import jest odrzucony.
5. Wyeksportuj folder i ponownie importuj paczkę: powstają nowy folder oraz nowe ID, oryginały pozostają. Usunięcie folderu domyślnie przenosi projekty do „Bez folderu”; opcja kasowania wraz z projektami ma osobne potwierdzenie.

Biblioteka pozostaje lokalna dla originu/profilu. Kontrakt i ograniczenia: [PROJECT_IMPORT.md](PROJECT_IMPORT.md). Nie utworzono tagu, wydania ani deploymentu Pages.

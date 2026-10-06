# ELE.02-101 — weryfikacja warstwy fizycznej

Gałąź `feat/ele02-101-physical`, baza `feat/my-projects`. Środowisko: macOS 12.7.6 Intel, Node 24.18.0, pnpm 11.19.0, Playwright z zainstalowanym kanałem Google Chrome 150. Wyniki lokalne nie są potwierdzeniem uruchomienia GitHub Actions ani publikacji Pages.

## Obwód i kompatybilność

Nowy przykład zawiera 24 urządzenia, 33 żyły, 4 obudowy i 6 korytek. Testy obejmują cztery położenia Q1/Q2, wspólną pracę opraw, niezależność gniazda, B10/B6 i H1/H2, przerwanie L/N kontrolki, TEST RCD oraz cztery pomiary PE z wykrywaniem przerw. Usunięcie wszystkich żył pozostawia złączki w tej samej puszce elektrycznie niezależne; wewnętrzny mostek ma dotychczasowe 5 mΩ.

Testy edycji obejmują również miniatury pustych obudów/skrajnych tras i usunięcie samej zaznaczonej obudowy bez zatrzymania symulacji. Sprawdzają zachowanie obwodu, ID, długości elektrycznych, sesji symulacji i pomiarów przy zmianach pokryw oraz przesuwaniu obudowy, wycofanie niepoprawnego ruchu, undo, usuwanie urządzeń z metadanych i przypisanie wielu żył do korytka. Podświetlenie nie ujawnia lokalizacji ukrytej przerwy PE.

Nowe E2E korzystają z publicznego interfejsu importu/eksportu i IndexedDB, bez importów modułów developerskich Vite. Sprawdzają oba widoki tego samego obwodu, otwieranie pokryw, wkładanie i wyjmowanie złączki, przesunięcie całej puszki, zapis pomiaru, autosave, odświeżenie z wyłączonym zasilaniem i ponowny import z nowym ID projektu. Kontrola wyrenderowanego SVG sprawdza wszystkie 33 żyły: końce przy zaciskach i brak przejścia przez korpusy aparatów.

Dotychczasowe testy nadal obejmują bibliotekę folderów, migrację IndexedDB, niezależność kopii, ochronę przed opóźnionym autosave, odrzucanie importów, eksport całych folderów, odzyskiwanie nieczytelnych zapisów i ochronę ukrytych odpowiedzi. Oryginalny JSON bez obudów/korytek również przechodzi walidację i otwiera się w aplikacji.

## Porównanie wizualne

Zrzuty mają rozmiar 1366×768 i pochodzą z końcowego produkcyjnego E2E pod `/ele/`. „Przed” odtworzono przez otwarcie oryginalnego JSON-a użytkownika w aktualnej aplikacji; nie był dostępny osobny zrzut starej wersji. Materiał PDF i zdjęcie pozostają plikami referencyjnymi użytkownika, nie kopiowano ich do repozytorium.

- [Przed — oryginalny JSON](qa/ele101-before.png)
- [Po — widok zewnętrzny](qa/ele101-external.png)
- [Po — widok połączeń](qa/ele101-connections.png)

Porównanie z planem (PDF str. 2) i fotografią: PZ leży nad R po lewej, OP1/OP2 nad P1/P2, Q1/Q2 pod puszkami, GW po prawej. Rozdzielnica grupuje aparaty w kolejności RCD–B10–H1–B6–H2. Małe zielone kontrolki DIN różnią się od owalnych opraw z osłoną. Zniknęły duże listwy w miejscach puszek oraz niebieskie listwy używane do rozdziału faz. W widoku połączeń widoczne są cztery niezależne złączki w każdej puszce, N/PE rozdzielnicy i końce żył. Przyciski pokryw znajdują się pod obudowami, poza obszarem zacisków. Do montażu i odczytu małych zacisków należy powiększyć odpowiedni fragment tablicy.

Geometria jest dydaktyczna: istniejących korpusów aparatów nie rozciągano, więc rozdzielnica ma większy zapas miejsca niż na fotografii. Nie deklarujemy skali 1:1 ani wierności konkretnemu SKU. Szczegółowe ograniczenia modeli, długości i tras: [PHYSICAL_ELE02_101.md](PHYSICAL_ELE02_101.md).

## Kontrole

| Kontrola | Wykonany wynik |
| --- | --- |
| `pnpm install --frozen-lockfile` | OK; lockfile bez zmian |
| `pnpm typecheck` | OK |
| `pnpm lint` | OK: Oxlint z deny-warnings i ESLint |
| `pnpm test` | **213/213**, 12 plików, końcowy przebieg bez równoległego E2E |
| `pnpm catalog:validate` | OK: 32 SKU (4 opublikowane, 28 oczekujących), 34 osobne profile dydaktyczne, 28 wariantów stanowisk |
| Pełne developerskie E2E | **35/35**, 8,4 min; świeży serwer i jeden worker |
| `pnpm build` | OK, base `/ele/`, commit `c5916f8` |
| `ELE_BEFORE_PROJECT=… pnpm test:e2e:production` | **17/17**, 2,9 min, dokładnie gotowy dist z poprzedniego builda |
| `pnpm dist:validate`, `pnpm release:pack` | OK; SHA-256 archiwum i wszystkie jego pliki porównane bajtowo z testowanym dist |

Końcowe developerskie E2E wykonano z kopią konfiguracji bazowej wskazującą port **5175**, aby nie zatrzymywać istniejącego serwera użytkownika na 5173. Pozostałe opcje i pełny zestaw testów pozostały zgodne z `playwright.config.ts` (Chrome, 1366×768, jeden worker, bez retries). Ustawiono `ELE_BEFORE_PROJECT` na oryginalny JSON z Downloads, dzięki czemu wykonano także opcjonalny test porównawczego zrzutu. Zestawy przeglądarkowe wykonano kolejno; raport developerski zachowano w `/tmp/ele-physical-qa/development-final` przed uruchomieniem produkcyjnego. W CI ten lokalny materiał jest niedostępny: pomijany jest tylko test „przed”, nie testy funkcjonalne nowego stanowiska.

Wcześniejsze przebiegi nie były w pełni zielone: pierwszy pełny E2E miał 34/35 (istniejący pomocnik edycji przewodów: `Resulting promise was garbage collected`); następny miał 34/35 (istniejący test prawo/lewo przekroczył 45 s przy oczekiwaniu na kierunek). Równoległy przebieg jednostkowy miał 210/211 (istniejący test archiwum przekroczył 5 s). Końcowe kontrole wykonano kolejno; powtórzono całe zestawy, bez zmiany tych testów, zwiększania ich timeoutów ani włączania retries. Trwałej przyczyny tych wcześniejszych błędów nie potwierdzono.

W trybie developerskim serwer przekazał komunikaty React o nierozpoznanych tagach `<g>/<path>` podczas montażu warstwy SVG. Nie wyciszano logów. Kontrola rzeczywistego SVG oraz E2E z obsługą `pageerror` przechodzą; komunikat pozostaje do osobnej diagnostyki.

Kod produkcyjny został zatwierdzony w `c5916f8e9f4352a9d17435cbf20c98fbc21a0fe2`. Końcowe uzupełnienie wyników i zrzutów dotyczy wyłącznie dokumentacji. Nie utworzono tagu ani wydania i nie uruchomiono deploymentu.

Build zgłasza ostrzeżenie Vite o pakiecie JS większym niż 500 kB: **1232,72 kB**, gzip **365,27 kB**; Worker **225,15 kB**. Nie zmieniano progu ostrzeżeń. Jest to ograniczenie wielkości bundla, a nie potwierdzenie błędu uruchomienia.

Lokalne archiwum podglądu: `release/ele-preview-c5916f8e9f43.tar.gz` z sumą SHA-256. `tar` zgłosił ostrzeżenie locale, zakończył się kodem 0; porównanie zawartości archiwum z dist przeszło. Archiwum nie zostało opublikowane.

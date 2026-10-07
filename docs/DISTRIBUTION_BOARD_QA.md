# Konstruktor rozdzielnicy — weryfikacja

Gałąź: `feat/distribution-board-builder`, na bazie `feat/ele02-101-physical`. Nie publikowano wydania.

## Zakres

Profil `edu-modular-v1`, rewizja `1`, jest dydaktyczny: siatka 18 mm, 1–3 rzędy, 8 lub 12 pól w rzędzie, dwa niezależne rzędy przyłączeń. Nie jest produktem konkretnego producenta. Korpusy aparatów zachowują wymiary i rewizje katalogowe; szerokość zajmowana to zaokrąglenie w górę szerokości korpusu / 18 mm. RCD dydaktyczny 48 mm zajmuje trzy pola. Kontrola zajętości nie potwierdza termiki, głębokości ani zgodności normowej.

Dopuszczone fronty i przyłącza są jawnie wymienione w `packages/device-catalog/mounting-profiles.ts`. Styczniki, bloki pomocnicze i zasilacze bez profilu zgodności z maskownicą pozostają na tablicy. Obudowa nie tworzy mostków ani listwy N/PE; listwy są osobnymi aparatami z własnymi zaciskami.

Stare ręczne obudowy i przykład ELE.02-101 pozostają otwieralne bez konwersji. Nie dodano SKU obudów ani automatycznej migracji starych skrzynek. W pierwszym profilu nie ma drzwi; przyciski dotyczą maskownicy.

## Test ręczny

1. Otwórz **Moje projekty**, utwórz folder i pusty projekt.
2. Kliknij **+ Rozdzielnica**, wpisz nazwę i wybierz rzędy, pola i własne założenie rezerwy. Sprawdź podgląd i utwórz obudowę.
3. W **Edytuj wnętrze R1** kliknij rząd. Dodaj MCB/RCD z listy lub katalogu. Pole montażowe i zajętość uwzględniają szerokość korpusu.
4. Wybierz **Przyłącza 1/2** i dodaj N/PE/L jako rzeczywiste aparaty. Połącz zaciski przy zdjętej maskownicy.
5. Zaznacz aparat i przeciągnij go do wolnego pola; albo wybierz inny rząd, wpisz **Pierwsze pole** i kliknij **Przenieś zaznaczone na pole**. Końce przewodów pozostają połączone z tymi samymi zaciskami. Zajęte miejsce odrzuca zmianę.
6. W **Konfiguracja R1** rozbuduj obudowę. Podgląd pokazuje nowe rzędy i istniejące aparaty. Próba usunięcia zajętego rzędu lub zmniejszenia szerokości poniżej zajętości blokuje zatwierdzenie. Przenieś aparaty przed zmniejszeniem.
7. Załóż maskownicę: w każdym rzędzie zobaczysz fronty oraz zaślepki wolnych pól. Dźwignie i kontrolki pozostają dostępne; zaciski wymagają zdjęcia maskownicy.
8. Kliknij **Wróć do instalacji** / **Montuj poza rozdzielnicą**, dodaj źródło, odbiornik i łączniki oraz podłącz całość w tym samym projekcie. Przy odłączonym zasilaniu wykonaj pomiar PE, następnie uruchom symulację.
9. Poczekaj na **Zapisano lokalnie**, odśwież. Układ, folder i pomiary zostają zachowane, zasilanie zaczyna wyłączone. Wyeksportuj projekt lub folder i importuj jako nowy: przypisania montażowe również mają się odtworzyć.
10. Przenieś całą skrzynkę za oznaczenie nad korpusem, cofnij zmianę i usuń samą obudowę. Aparaty i połączenia pozostają w projekcie.

## Automatyczna weryfikacja

Wykonano lokalnie 2026-10-07: macOS 12.7.6, Node 24.18.0, pnpm 11.19.0, Playwright 1.63.0, zainstalowany Chrome 150.0.7871.125 (`channel: chrome`). Desktop: 1366×768; test skupienia obejmuje również 390×844.

| Kontrola | Rzeczywisty wynik |
| --- | --- |
| `pnpm typecheck` | OK |
| `pnpm lint` — Oxlint z `--deny-warnings` i ESLint | OK |
| `pnpm test` | **227/227**, 13 plików; w tym 13 testów konstruktora |
| `pnpm catalog:validate` | OK: 32 SKU, 4 opublikowane, 28 oczekujących; 34 osobne profile dydaktyczne; 28 wariantów stanowisk |
| Pełne E2E developerskie, osobny serwer 5175 | **38/38**, 10,9 min, commit `8f3310e` |
| Powtórzenie `physical-installation.spec.ts` po poprawce helpera importu | **3/3**, 1,7 min, commit `e128713` |
| `pnpm build` | OK; `version.json`: `e1287139c79c52c3a852dbbd5bfd164639cad50f`, base `/ele/`, bez tagu wydania |
| `pnpm test:e2e:production` | **20/20**, 3,8 min, ten sam gotowy `dist` pod `/ele/` |
| `pnpm dist:validate` | OK: base, manifest i sumy zasobów |
| Dodatkowa kontrola przeciągania w produkcji | OK: rzeczywisty ruch myszą na pole 4, zielony podgląd; próba zajęcia pola 1 daje czerwony podgląd, komunikat i zachowuje dokument oraz pozycję aparatu; brak `pageerror` |
| Lokalne `pnpm release:pack` | OK: SHA-256 archiwum oraz zgodność wszystkich **16 plików** z przetestowanym `dist`; bez publikacji |

Po pełnym zielonym przebiegu developerskim zmieniono wyłącznie helper starego testu importu, bez zmiany kodu aplikacji. Jego trzy scenariusze powtórzono developersko, a następnie ponownie zbudowano i uruchomiono cały zestaw produkcyjny. Dwa wcześniejsze przebiegi ujawniły brak oczekiwania testów na nową kartę projektu i zapis wskaźnika aktywnego projektu. Poprawione helpery sprawdzają konkretne nowe ID przed odczytem danych. Zachowano asercje niezależności kopii; nie dodano retry ani nie zwiększano timeoutów.

Zestawy przeglądarkowe uruchamiano kolejno. Lokalny override konfiguracji developerskiej `/tmp/ele-playwright-dev.config.ts` zmienia wyłącznie port na 5175 i wyłącza ponowne użycie serwera. Serwera użytkownika 5173 i jego IndexedDB nie używano do testów. Oba końcowe zestawy uruchomiono z `ELE_BEFORE_PROJECT`, dlatego zawierają również opcjonalny zrzut wcześniejszego projektu użytkownika. Bez tego lokalnego pliku CI pomija tylko ten dodatkowy test porównawczy; funkcjonalny przykład ELE.02-101 jest w repozytorium i testuje się niezależnie.

Testy obejmują pełny rząd, kolizje pól i korpusów, przyłącza, niezgodne profile, błędne pozycje/rewizje w JSON, zmniejszenie zajętej obudowy, przeciąganie, przenoszenie, undo, zachowanie symulacji oraz rzeczywisty zapis/odczyt i import projektu/folderu. Własne rzędy nie tworzą pustych szyn tablicy; osobne testy sprawdzają pierwszą globalną szynę i duplikat poza skrzynką. E2E buduje instalację od pustego projektu przez sześć przewodów i pomiar PE do pracy lampy, rozbudowy 2→3 rzędy, odtworzenia po odświeżeniu i importu kopii folderu. Sprawdza też, że sześć tras ma końce przy zaciskach i omija obrysy aparatów. Zapisany pomiar i folder pozostają zachowane, a odtworzona symulacja zaczyna się bez zasilania. Produkcyjne testy Pages sprawdzają każdy zasób według manifestu oraz rzeczywisty Worker.

## Materiały odbioru i ograniczenia

- [Wnętrze wybranego rzędu, 1366×768](qa/distribution-interior.png) — powiększenie 150%, czytelny aparat i zaciski, wyłącznie własne szyny.
- [Cała instalacja, 1366×768](qa/distribution-installation.png) — rozbudowana skrzynka 3×12M z maskownicą i zaślepkami, świecąca lampa oraz zapisany pomiar PE 0,052 Ω. Skupienie na wnętrzu umożliwia edycję aparatów przy większym powiększeniu.
- [Przeciąganie i odrzucenie kolizji](qa/distribution-drag.png) — QF1 pozostaje na polu 4, QF2 na polu 1.

Raporty lokalne zachowano oddzielnie: `/tmp/ele-distribution-development-final-10rn3mhf/`, `/tmp/ele-distribution-legacy-final-_s9jnc50/` i `/tmp/ele-distribution-production-final-vyzadbuv/`. Zawierają `playwright-report/` i `test-results/`; są materiałami lokalnymi, poza Git. Dodatkowy skrypt przeciągania: `/tmp/ele-distribution-drag-qa.mjs`. Archiwum preview: `release/ele-preview-e1287139c79c.tar.gz` z plikiem SHA-256, również poza Git. Po testach nie przebudowywano artefaktu.

Wyniki powyżej dotyczą wykonanych poleceń lokalnych; nie uruchamiano zdalnego GitHub Actions, nie tworzono tagu i nie publikowano Pages. Build zgłasza ostrzeżenie Vite o pakiecie większym niż 500 kB: główny JS 1256,13 kB / gzip 371,67 kB. Nie blokuje kompilacji. W developerskim scenariuszu starszej instalacji React loguje komunikaty `console.error` o znacznikach SVG `path`/`g`; testy nie wykazały `pageerror`. Lokalne pakowanie zgłosiło ostrzeżenie `tar` o locale, ale zakończyło się kodem 0; zawartość i suma archiwum zostały niezależnie sprawdzone.

Pierwszy etap nie obejmuje jawnej konwersji starych skrzynek, automatycznego porządkowania z podglądem, drzwi, szaf z płytą montażową ani certyfikacji zgodności mechanicznej/termicznej wyrobów. Produkty i ich dotychczasowe rewizje pozostają zachowane. Dane nadal są lokalne w IndexedDB; do przenoszenia i kopii bezpieczeństwa służą istniejące eksporty projektu i folderu.

# Stan implementacji — 2026-10-05

**Działająca lokalna wersja testowa z pierwszym etapem ćwiczeń ELE.02/ELE.05. Pełny odbiór v1 i pełne pokrycie kwalifikacji pozostają nieukończone.** Z 32 rzeczywistych SKU 28 oczekuje na weryfikację. Oryginalny prompt i pakiet katalogu pozostawiono bez zmian.

## Działające funkcje

- React/TypeScript strict/Vite, otwarty JointJS, autorskie SVG; 33 dostępne elementy: 4 rzeczywiste i 29 dydaktycznych. Zweryfikowano LC1D09P7 i XB5AA35; dotychczasowe opublikowane rewizje zachowano.
- Lampa świeci, wentylator obraca łopatki, grzałka żarzy się, silnik pokazuje kierunek wynikający z faz. Galeria przedstawia stan wyłączony i podczas pracy.
- Dodawanie aparatów i przewodów, limity zacisków, edycja tras, przekroju, długości elektrycznej, koloru i oznaczeń. Automatyczne trasy omijają obudowy i przeliczają się po przesunięciu.
- Tablica DIN i schemat z jednego obwodu, widok dzielony, zoom/pan, przesuwanie, kopiowanie, wyrównanie, usuwanie, undo/redo oraz chowanie paneli. Ruch nie zmienia modelu elektrycznego.
- Solver MNA w workerze: AC/DC, fazory trójfazowe, wyspy, skończone rezystancje, KCL i moc; kontrolowane błędy oraz wykrycie oscylacji.
- Wspólny mechanizm styków głównych i pomocniczych stycznika, przyciski NO+NC, osobne przypisane bloki pomocnicze. Blokady elektryczna i mechaniczna działają oraz są oceniane oddzielnie.
- Silnik sześciokońcówkowy rozpoznaje mostki lub przewody Y/Δ, napięcia uzwojeń, brak fazy i kierunek. Mostki są widocznymi obiektami obwodu. Starszy silnik z ukrytą gwiazdą zachowano dla zapisanych projektów.
- Bistabilny, schodowy/krzyżowy, automat schodowy, czasówka A–D, MCB/RCCB/RCBO i termik; podtrzymanie przez przewody. RCD ma dźwignię OFF/ON, wyzwolenie, reset przez OFF i przycisk TEST.
- Pomiary AC/DC, ciągłości/Ω, jednej żyły cęgami, izolacji, rezystancyjnej pętli, RCD i kolejności faz. Historia zawiera rewizję i czas. Nieznana rezystancja DC realnej cewki daje `unsupported`, przerwana cewka — OL.
- Usterki zmieniają obwód: przerwa przewodu/PE/mostka, cewki, sklejony wskazany NO/NC, zwarcie i pozostałe dotychczasowe nakładki. Sandbox pozwala połączyć A1–A2 i obserwować wyzwolenie zabezpieczenia.
- 16 scenariuszy: 13 wcześniejszych i trzy nowe zestawy. Nowe mają wzorzec, stanowisko samodzielnego montażu i po trzy ukryte warianty diagnozy. Ocena nowych zestawów obejmuje 7/8 kryteriów oraz dodatkowe kryterium diagnozy: aparaty, połączenia, zachowanie, ochronę, PE, identyfikację żył i wykonane pomiary. Równoważne rozwiązania nie zależą od nazw ani położenia aparatów.
- Autosave/Dexie, logi i pomiary, zapis definicji produktów, przełączanie projektów oraz odświeżenie bez samoczynnego załączenia zasilania. Wspólna walidacja komend, undo/redo, zapisu i importu; atomowy zapis projektu/snapshotów. Błędny zapis zachowuje oryginał i umożliwia pobranie kopii z ochroną odpowiedzi ćwiczeń.
- JSON, SVG i PDF z wynikami/ograniczeniami; eksport ukrytej diagnozy usuwa przyczynę i sesję treningową. Badawczy import, normalizacja, IndexedDB oraz raport wszystkich SKU. Kontrakt przyszłego tutora pozostaje read-only.

## Sprawdzenia tego etapu

| Kontrola | Wynik |
|---|---|
| `pnpm typecheck` | OK |
| `pnpm lint` | OK: Oxlint z `--deny-warnings` oraz ESLint |
| `pnpm test` | 171 testów, OK |
| `pnpm catalog:validate` | OK: 32 SKU, 4 opublikowane, 28 oczekujących, 29 dydaktycznych; 28 wariantów stanowisk |
| `pnpm build` | OK; ostrzeżenie o dużym głównym bundle około 1,19 MB / 352 kB gzip |
| `pnpm test:e2e` | 28/28 scenariuszy Chrome, OK |
| `pnpm test:e2e:production` | 8/8 scenariuszy Chrome na produkcyjnym buildzie, OK |
| Galeria / wygląd | Przegląd nowych SVG względem zdjęć producenta; odświeżona galeria 33 elementów i zrzuty trzech ćwiczeń w `qa/` |

Pełny zestaw Chrome wykonano przed końcowym poszerzeniem oceny równoważnych rozwiązań i identyfikacji żył. Po tej zmianie ponowiono cały zestaw jednostkowy, typecheck, lint, walidację katalogu, build i osiem testów produkcyjnych. Testy obejmują również wcześniejszą walidację/persystencję projektów. Kontrole routingu nowych wzorców są częścią testów jednostkowych. Procedura ręczna i zakres dowodów: [EXAM_STAGE_ONE_QA.md](EXAM_STAGE_ONE_QA.md).

Osobne skrypty routingu, UX i eksportu z 2026-10-03 nie były ponawiane w tym etapie: historycznie 58 przewodów w czterech przykładach, pięć rozmiarów ekranu, galeria, SVG i PDF.

Wcześniejszy pełny benchmark 100 aparatów / 300 żył: solver 30 prób, mediana około 27 ms, p95 około 82 ms; zimna próba około 1,33 s. Import około 1,98 s zamiast 3,9 s po ograniczeniu renderowania przy zegarze. Odstępy klatek: mediana około 16 ms, p95 około 280 ms; podczas pan mediana 16 ms, p95 około 274 ms. Wcześniejszy p95 przed optymalizacją wynosił 621 ms. Prosty obwód: sześć reakcji 16–126 ms. Surowe dane historycznej próby są w `qa/browser-benchmark.json`. Po zmianie routingu nowa kontrola importu i załączenia 100/300 dała około 2,49 s bez błędów (`qa/routing-performance.json`); nie ponawiano pełnego pomiaru klatek. Wyniki zależą od obciążenia komputera. Cel stałych 60 fps dużej sceny pozostaje niepotwierdzony.

## Pozostałe wymagania odbioru

| Obszar | Konkretna luka |
|---|---|
| Katalog | 28 rzeczywistych SKU zablokowanych. BIS-411 ma potwierdzone zaciski, lecz nie pełne wymiary; osobny blok LADN11 pozostaje modelem dydaktycznym. Szczegóły w CATALOG_REPORT i device-verification-stage-one. |
| Mechanika | Brak oceny obróbki końcówek, momentów dokręcania, adapterów, pełnych par przekaźnik+gniazdo i kabli wielożyłowych. |
| Schemat | Bez pełnego rozwinięcia IEC i odnośników między arkuszami; symbole pokazują położenie spoczynkowe zgodnie z dotychczasową konwencją. |
| Trening / arkusze | Pierwszy etap obejmuje wybrane funkcje i autorskie rozszerzenia; nie ocenia dokumentacji odręcznej, narzędzi ani przebiegu pracy. Szczegółowe potwierdzone wymagania i luki w exam-coverage. Starsze scenariusze zachowują cztery wspólne kryteria. |
| Silniki / czasówki | Brak dynamiki, silnika jednofazowego z uzwojeniem pomocniczym, pierścieniowego, rozruchu rezystorowego oraz ćwiczenia dwóch silników z czasową blokadą rozruchu. |
| Pomiary | Pętla X=0, RCD 50 ms profilu, uproszczona izolacja; brak pełnego modelu metrologii i normatywnego odbioru instalacji. |
| Import / migracje | Schemat v1; brak migracji obcych wersji i edytora read-only przy brakującym SKU. |
| Wydajność | Brak potwierdzenia stałych 60 fps dużej sceny; główny bundle przekracza 500 kB. |
| Kompatybilność | Chrome zweryfikowany; drugi silnik i pełny audyt WCAG niewykonane. Playwright Firefox nie obsługuje macOS 12 w tym środowisku. |

Zakres i dowody: ARCHITECTURE, DEVICE_DATA_POLICY, SIMULATION_SCOPE, MEASUREMENT_PROFILES, exam-coverage, device-verification-stage-one, EXAM_STAGE_ONE_QA i VISUAL_QA. Nie użyto prawdziwych urządzeń, usług LLM ani publikacji aplikacji.

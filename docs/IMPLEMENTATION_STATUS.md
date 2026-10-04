# Stan implementacji — 2026-10-04

**Działająca lokalna wersja testowa. Pełny odbiór v1 jest nieukończony.** Największa luka to 29 z 31 rzeczywistych SKU. Oryginalny prompt i dostarczony pakiet katalogu pozostawiono bez zmian.

## Działające funkcje

- React/TypeScript strict/Vite, otwarty JointJS, autorskie SVG; 28 dostępnych elementów: 2 rzeczywiste i 26 dydaktycznych.
- Lampa emituje światło, wentylator obraca łopatki, grzałka żarzy się, silnik pokazuje kierunek ruchu. Efekty reagują na stan obwodu. Galeria prezentuje stan wyłączony i podczas pracy.
- Dodawanie, zaciski i listy w inspektorze; trasy z punktami, przekrój, elektryczna długość, kolor i oznaczenie. Limity zacisków przy edycji i imporcie.
- Automatyczne trasy wychodzą za krawędź obudowy, omijają inne aparaty, mają oddzielone wyjścia sąsiednich żył i przeliczają się po przesunięciu. Ręczne punkty pozostają edytowalne.
- Tablica DIN i schemat z jednego obwodu, widok dzielony; zoom/pan, przesuwanie, wielokrotny wybór, kopiowanie, wyrównanie, usuwanie i undo/redo. Ruch nie zmienia modelu elektrycznego.
- Czysty solver MNA w workerze: AC/DC, fazory trójfazowe, wyspy, skończone rezystancje, KCL i moc; kontrolowane błędy i wykrycie oscylacji.
- Cewka AC/DC i oddzielne kontakty, schodowy/krzyżowy, bistabilny, schodowy czasowy, A–D, MCB/RCCB/RCBO i termik. Podtrzymanie działa przez przewody.
- Dydaktyczne RCD/RCBO 2P akceptują obie orientacje każdego toru L/N, zachowując reakcję na upływ do PE. Fizyczna dźwignia ma ON/OFF i położenie wyzwolenia, a przycisk TEST rozłącza zasilony aparat; ponowne załączenie przez OFF → ON. Dowolna orientacja pojedynczego toru jest jawnym uproszczeniem modelu.
- Napięcie AC/DC, ciągłość/Ω, cęgi jednej żyły, izolacja, rezystancyjna pętla, test RCD i kolejność faz. Historia z rewizją i czasem.
- Usterki wpływają na gałęzie i mechanizmy; ukryta diagnoza z hipotezą, naprawą zaznaczonego elementu i pomiarem przed/po.
- 13 wzorców/ćwiczeń, w tym wentylator z łącznikiem; cztery kryteria i stopniowane wskazówki. Odpowiedniki dydaktyczne są jawne. Kontrakt tutora jest read-only i pomija ukryte przyczyny.
- Autosave/Dexie, przełączanie projektów bez utraty oczekującego zapisu, odświeżenie, logi i pomiary, zapis definicji produktów. Otwieranie bez energii także dla źródeł niezależnych.
- Wspólna walidacja komend, undo/redo, zapisu, eksportu, importu i odczytu. Formularze używają limitów schematu; błędna zmiana zachowuje dokument, historię i symulację, bez przycinania wartości. Atomowy zapis projektu i snapshotów w Dexie v4. Niepoprawny zapis pozostaje w bazie i ma kopię do pobrania z ochroną odpowiedzi ćwiczeń; procedura w PROJECT_VALIDATION.md.
- JSON import/eksport z Zod i kontrolą referencji, SVG z tłem i stylem, raport PDF z wynikami i uproszczeniami. Błędny import zachowuje bieżący projekt.
- Badawczy import/normalizacja/IndexedDB/eksport oraz CLI walidacji i raport wszystkich 31 SKU.

## Sprawdzenia

| Polecenie / kontrola                  | Wynik                                                                                          |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                      | OK                                                                                             |
| `pnpm lint`                           | OK                                                                                             |
| `pnpm test`                           | 119 testów, OK                                                                                 |
| `pnpm build`                          | OK; ostrzeżenie o dużym bundle ~1,15 MB / 339 kB gzip                                          |
| `pnpm catalog:validate`               | OK; 31 SKU, 2 opublikowane, 29 oczekujących, 26 oddzielnych profili dydaktycznych              |
| `pnpm test:e2e`                       | 23/23 scenariusze Chrome, OK                                                                   |
| `pnpm test:e2e:production`            | 3/3 scenariusze Chrome na buildzie produkcyjnym, OK                                            |
| `pnpm exec tsx scripts/routing-qa.ts` | OK; 58 przewodów w czterech przykładach, bez przejść przez obudowy ani oderwanych końców       |
| `pnpm exec tsx scripts/ux-qa.ts`      | OK; pięć rozmiarów ekranu, lampy, wentylator, grzałka, silnik, schemat oraz ograniczenie ruchu |
| Visual QA                             | 1366/1920 i tablet; galeria, SVG i dwustronicowy PDF w `qa/`                                   |

Kontrole routingu, UX i Visual QA w tabeli są historyczne (2026-10-03); nie ponawiano ich w tej poprawce.

Playwright sprawdza pusty projekt → aparaty → przewody → cofnięcie → zasilanie → pomiar, przeciąganie, dwa widoki, prąd i blokadę omomierza, odświeżenie, START/STOP i brak restartu, izolowane DC, trwałe wyzwolenie RCD, wprowadzanie przerwy cewki w sandbox, ukrytą diagnozę z naprawą i retestem oraz odporność importu. Nowe regresje obejmują odrzucanie niepoprawnych wartości, autosave z odświeżeniem oraz odzyskiwanie błędnego zapisu z ochroną ukrytych odpowiedzi. Te trzy scenariusze przeszły również na produkcyjnym buildzie na porcie 4173, bez nieobsłużonych błędów przeglądarki; po odświeżeniu sprawdzono też działanie lampy i workera.

Wcześniejszy pełny benchmark 100 aparatów / 300 żył: solver 30 prób, mediana około 27 ms, p95 około 82 ms; zimna próba około 1,33 s. Import około 1,98 s zamiast 3,9 s po ograniczeniu renderowania przy zegarze. Odstępy klatek: mediana około 16 ms, p95 około 280 ms; podczas pan mediana 16 ms, p95 około 274 ms. Wcześniejszy p95 przed optymalizacją wynosił 621 ms. Prosty obwód: sześć reakcji 16–126 ms. Surowe dane historycznej próby są w `qa/browser-benchmark.json`. Po zmianie routingu nowa kontrola importu i załączenia 100/300 dała około 2,49 s bez błędów (`qa/routing-performance.json`); nie ponawiano pełnego pomiaru klatek. Wyniki zależą od obciążenia komputera. Cel stałych 60 fps dużej sceny pozostaje niepotwierdzony.

## Pozostałe wymagania odbioru

| Obszar          | Konkretna luka                                                                                                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Katalog         | 29 SKU zablokowanych. Trzy F&F mają przejrzaną topologię, ale brakuje geometrii rzeczywistych obudów i przeglądu rendererów. Braki wszystkich rekordów w CATALOG_REPORT i JSON      |
| Mechanika       | Podstawowe DIN/collision; bez pełnej walidacji końcówek, momentów, adapterów i par przekaźnik+gniazdo; brak edytora zestawów i kabli wielożyłowych                                  |
| Schemat         | Symbole grupowane według aparatu; bez pełnego rozwinięcia IEC i odnośników między arkuszami. Duże sceny wymagają korekty tras                                                       |
| Trening         | Działające wzorce zamiast pełnych zadań od pustej tablicy; cztery wspólne kryteria zamiast kompletnego gradingu każdego ćwiczenia. Jedna ukryta diagnoza PE, inne usterki w sandbox |
| Pomiary         | Pętla X=0, RCD 50 ms profilu, uproszczona izolacja z blokadą elektroniki całego projektu; brak pełnego modelu metrologii i normatywnych kryteriów                                   |
| Import/migracje | Schemat v1, odrzucenie obcych wersji/bindingów. Brak migracji i edytora read-only przy brakującym SKU                                                                               |
| Wydajność       | Duża scena nie utrzymuje stale 60 fps. Pierwszy render, routing i podział bundle wymagają dalszej pracy                                                                             |
| Kompatybilność  | Chrome zweryfikowany. Firefox Playwright nie obsługuje macOS 12; drugi silnik i pełny audyt WCAG niewykonane                                                                        |

Zakres i dowody: ARCHITECTURE, DEVICE_DATA_POLICY, SIMULATION_SCOPE, MEASUREMENT_PROFILES, EXAM_MAPPING, VISUAL_QA i ADR. Nie użyto prawdziwych urządzeń, usług LLM ani publikacji aplikacji.

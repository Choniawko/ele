# ELE.02 — wdrażanie kolejnych wzorców

Aktualny stan jest w [implementation-state.json](implementation-state.json), a dowody jednostki 00a w [QA_00.md](QA_00.md). Kolejna jednostka: **01a**, integracja istniejącego ELE.02-101 według [etapu 01](plan/etapy/01_wzorce_101_108.md) i [kontraktu 101](plan/zadania/ELE02_101.md).

Instrukcje w `plan/` pochodzą z przekazanej paczki z 8 października 2026. Opisują cel 17 wzorców oraz historyczny stan wejściowy, a nie bieżące wyniki wdrożenia. Przy kontynuacji przeczytaj wymagania wspólne, kontrakty danych, kryteria BA/UX/QA i aktualny checkpoint; zachowaj nowsze zmiany repo.

| Ścieżka z paczki | Kanoniczne miejsce w repo |
| --- | --- |
| `data/stage-plan.json`, `task-implementation-plan.json`, `qa-source-checks.json` | [plan/data](plan/data) |
| `data/implementation-state.seed.json` | Zastąpione istniejącym checkpointem; nie inicjalizuj go ponownie |
| `materialy/data/` | [packages/knowledge/exam-data](../../packages/knowledge/exam-data) |
| `materialy/articles/` | [content](content), czytelne opracowanie źródłowe z poprawionymi linkami |
| `materialy/assets/schematy/` | [public/knowledge/ele02/assets/schematy](../../public/knowledge/ele02/assets/schematy) |
| `materialy/examples/import/` | Istniejące [examples/physical](../../examples/physical), bez kopiowania starych dokumentów |

Lokalny katalog `ELE02_plan_wdrozenia_Codex_2026-10-08/` jest ignorowany i zachowany na dysku. Podgląd HTML, narzędzia jego testowania, historyczne raporty walidacji paczki oraz snapshot całego starego katalogu nie są zależnościami aplikacji. Dane mapowania są materiałem do porównania z bieżącym katalogiem, nie instrukcją instalowania zaplanowanych produktów.

`pnpm knowledge:validate` sprawdza treści, referencje, bramki dostępności i sumy źródłowych rysunków. `tests/exam-knowledge.test.ts` rozdziela 82 specyfikacje prób od wykonanych testów; w planie nie ma source check IDs przypisanych do etapu 00. Pełne kontrole i archiwum przechodzą przez istniejący proces [RELEASING](../RELEASING.md).

Adres karty w wersji produkcyjnej: `/ele/#/wiedza/zadania/ele02-108`. Nawigacja w aplikacji: Baza wiedzy → Zadania ELE.02.

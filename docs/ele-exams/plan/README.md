# Pakiet wdrożenia — gotowe układy i wiedza ELE.02

To zachowana instrukcja materiału wejściowego. Aktualny stan i przeniesione ścieżki: [README etapu](../README.md). Polecenie walidacji oryginalnej paczki niżej dotyczy lokalnego, ignorowanego katalogu; w repo stosuj `pnpm knowledge:validate` i testy aplikacji.

Zacznij od [ZACZNIJ_TUTAJ.md](ZACZNIJ_TUTAJ.md). Zawiera prompt do wklejenia Codexowi i kolejność 15 etapów. To pełny pakiet instrukcji oraz materiałów wejściowych, nie patch ani wdrożenie aplikacji.

Wszystkie 17 zadań mają kontrakt w zadania/ i przypisany etap. Materiały zawierają dwa istniejące importy 101/108, a nie komplet 17 nowych projektów. Projekt 114 ma osobną bramkę weryfikacji. 102/111 oraz arkusze ELE.05 nie zostały przekazane.

WYMAGANIA_WSPOLNE.md, KONTRAKTY_DANYCH.md i BA_UX_QA_odbior.md są nadrzędną instrukcją tej paczki. Starszy materialy/docs/CODEX_wdrozenie.md opisuje wcześniejszy zakres; przy rozszerzeniu o wszystkie gotowe układy stosuj nowe etapy i kontrakty.

data/ to plan/checkpoint do zaadaptowania w repo. materialy/data/ to treści wiedzy. Żaden z tych katalogów nie jest paczką projektu do importu w pracowni. Do istniejącego importu służą tylko dwa ProjectDocument w materialy/examples/import/.

Kontrola pakietu: `python tools/validate-plan.py`. Sprawdza strukturę instrukcji, dokładne pokrycie zadań i 82 prób oraz linki; nie wykonuje przyszłych wdrożeń ani ich symulacji. Dotychczasowy zakres analizy opisano w materialy/docs/WERYFIKACJA.md.

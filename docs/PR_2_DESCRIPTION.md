Pierwszy etap umożliwia montaż i diagnostykę trzech zestawów: oświetlenia bistabilnego z dwóch miejsc i osobnego gniazda, silnika START/STOP z podtrzymaniem oraz silnika prawo/lewo z blokadami. Każdy zestaw ma poprawny wzorzec, stanowisko bez połączeń i trzy warianty ukrytych usterek. Ocena wymaga aparatów, połączeń, zachowania, ochrony, PE i wykonanych pomiarów; sama praca odbiornika nie wystarcza.

Zmiana obejmuje również modele i renderery zweryfikowanych LC1D09P7 oraz XB5AA35, przyciski NO+NC, przypisane bloki pomocnicze, wspólny mechanizm stycznika, osobną blokadę mechaniczną i silnik rozpoznający Y/Δ, napięcie i kierunek z połączeń. Starsze opublikowane rewizje zachowano. Nieznanej rezystancji DC realnej cewki nie zastąpiono zmyślonym odczytem.

Pokrycie jest częściowe: funkcje ELE.02-106 i wybrane umiejętności z informatora oraz arkuszy ELE.02/ELE.05. Prawo/lewo jest ćwiczeniem autorskim, nie pełną rekonstrukcją arkusza 23.06. Źródła, kryteria i braki: [exam-coverage.md](docs/exam-coverage.md); weryfikacja SKU: [device-verification-stage-one.md](docs/device-verification-stage-one.md).

CI i przygotowanie wydania:
- PR-y do main oraz push do main: frozen lockfile, typecheck, Oxlint/ESLint, testy, katalog, pełne E2E dev, jeden build i E2E produkcyjne.
- Zestawy przeglądarkowe kolejno, z oddzielnie zachowanymi raportami; instalacja Chrome zgodna z Playwright.
- Gotowy dist testowany pod /ele/: wszystkie zasoby i SHA-256, Worker, autosave i odtworzenie; błędne ścieżki nie są maskowane HTML.
- Publikacja tylko po poprawnym anotowanym tagu vX.Y.Z z main, zgodnym z package.json i po pełnych kontrolach; environment github-pages i deployment przetestowanego artefaktu bez drugiego builda.
- version.json, manifest, archiwum w GitHub Releases i rollback z odtworzeniem/ponownym testem zachowanych bajtów.
- Minimalne uprawnienia per job, akcje przypięte do SHA; wymagane ręczne ustawienia w [RELEASING.md](docs/RELEASING.md).

Rzeczywiście wykonano lokalnie: frozen install, typecheck, Oxlint/ESLint, 178 testów, katalog (32 SKU: 4 opublikowane, 28 oczekujących; 29 dydaktycznych, 28 wariantów), build oraz 10/10 produkcyjnych E2E pod /ele/. Pełny przebieg lokalny dev → build → produkcja zakończył się sukcesem: 28/28 E2E dev oraz 10/10 produkcyjnych. Archiwum ma 15 plików identycznych z przetestowanym dist; test odtwarzania i odrzucania błędnej sumy także przeszedł.

Actionlint 1.7.12: OK. Build zgłasza istniejące ostrzeżenie o bundle około 1,19 MB. Job aktualizacji tego opisu działa dopiero po przejściu pełnej weryfikacji CI i dopisuje poniżej link do rzeczywistego przebiegu.

Nie wykonano jeszcze publikacji tagu, deploymentu Pages ani administracyjnej konfiguracji ochrony main/tagów/environment. Nie dodano kolejnych rodzin katalogu.

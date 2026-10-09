# Weryfikacja i wydawanie ELE

Adres docelowy: **https://choniawko.github.io/ele/**. Build i preview używają `/ele/`; serwer developerski pozostaje przy `/`. Pierwsze wydanie obejmuje zakres [etapu ćwiczeń](exam-coverage.md), wraz z jego jawnymi ograniczeniami. Wersja 0.2.0 dodaje dotychczasowe rozszerzenia instalacji/konstruktora rozdzielnicy oraz [ELE.02-108](ELE02_108.md), w tym edukacyjny wyłącznik silnikowy i niezależne START/STOP. Wersja 0.3.0 dodaje bazę wiedzy z 17 kartami zadań i przyjęte wzorce/lekcje ELE.02-101 oraz ELE.02-108, pomoc kontekstową i rozwinięte symbole 108. Gotowe są 2/17 wzorców; ograniczenia i dowody opisują [QA_01](ele-exams/QA_01.md) oraz [QA_01b](ele-exams/QA_01b.md).

Merge do `main` uruchamia wyłącznie `ELE CI`. Publikacja wymaga nowego anotowanego tagu zgodnego z wersją w `package.json`; tag uruchamia `ELE Release`, który po pełnej weryfikacji zapisuje archiwum wydania i wdraża je na Pages.

## Kontrole i artefakt

`ELE CI` działa dla PR-ów do `main` i push do `main`. Reużywa `verify.yml`, którego job `Verify ELE` wykonuje kolejno:

1. Checkout, Node 24 i pnpm zgodny z `packageManager`, `pnpm install --frozen-lockfile`.
2. Instalację **Chrome** przez `pnpm exec playwright install --with-deps chrome`, zgodnie z `channel: chrome` w Playwright.
3. Typecheck, Oxlint + ESLint, wszystkie testy i walidację katalogu/stanowisk.
4. Pełne E2E developerskie. Raport i ślady są zachowane przed uruchomieniem kolejnego zestawu.
5. Jeden build pod `/ele/`, zapis `version.json`, `.nojekyll` i `asset-manifest.json`.
6. E2E produkcyjne na tym samym `dist`, następnie kontrolę sum i utworzenie archiwum.

Zestawy przeglądarkowe działają sekwencyjnie. CI nie używa istniejącego serwera ani retry maskujących wynik. `forbidOnly` chroni przed przypadkowym pominięciem testów. Produkcyjny serwer `preview:dist` obsługuje wyłącznie istniejące pliki pod `/ele/`; `/`, brakujące zasoby i próby wyjścia poza katalog dają 404. Nie ma fallbacku HTML dla błędnego JS.

Testy Pages pobierają wszystkie pliki manifestu, porównują bajty/SHA-256 i typy JS/CSS. Sprawdzają właściwy adres Workera, rzeczywistą pracę lampy przez solver, poprawny link strony głównej, edycję, autosave, odświeżenie i ponowne uruchomienie solvera. Wcześniejsze testy produkcyjne nadal sprawdzają montaż, kierunki, pomiary, diagnozę, import i odzyskiwanie zapisów.

`version.json` zawiera wersję z `package.json`, tag lub `null` dla builda weryfikacyjnego, SHA checkoutu, datę builda i base. Lokalny build przed commitem może zawierać niezatwierdzone zmiany; sam SHA nie potwierdza czystego checkoutu. Wydanie w Actions ma osobną bramkę czystego checkoutu/tagu przed testami. Manifest obejmuje pliki i metadane, bez własnego rekurencyjnego hasha.

## Publikacja po tagu

`ELE Release` reaguje wyłącznie na push tagu `v*` w `Choniawko/ele`. Walidator dopuszcza tylko **anotowany, stabilny tag `vX.Y.Z`**, zgodny z `package.json`, checkout tego tagu, czyste drzewo i commit będący częścią `origin/main`. Tag z gałęzi niepołączonej z main, lekki tag i prerelease nie przechodzą.

Workflow ponawia cały zestaw kontroli opisany powyżej. Dopiero po ich sukcesie przesyła `dist` jako artefakt Pages. Job publikacji ma `needs: verify`, używa environment `github-pages` i wdraża ten artefakt — **nie robi kolejnego checkoutu ani builda**.

Przed deploymentem zapisuje GitHub Release z archiwum `ele-vX.Y.Z.tar.gz`, sumą SHA-256, `version.json` i manifestem. Oba archiwa powstają z tych samych zweryfikowanych, niezmienionych plików dist; opakowanie tar/zip może mieć inne metadane techniczne. Istniejące archiwum wydania nie jest nadpisywane. Raporty Actions mają retencję 14 dni, archiwum w Actions 90 dni; kopia w GitHub Releases nie zależy od wygaśnięcia artefaktów Actions. Włącz także serwerową ochronę immutable releases opisaną niżej.

Jeśli archiwum zostało zapisane, a deployment zawiódł, użyj workflow rollbacku na tym tagu. Ponowne tworzenie wydania pod tą samą nazwą zostanie odrzucone.

Uprawnienia są ograniczone do jobów: CI/weryfikacja `contents: read`; publikacja `contents: write` dla archiwum Release, `pages: write` i `id-token: write`; rollback zapisuje wyłącznie Pages i używa odczytu repozytorium. Nie potrzeba PAT. PR nie otrzymuje joba wdrożenia ani tokena zapisującego kod lub Pages. Akcje przypięto do sprawdzonych pełnych SHA; nie użyto `pull_request_target` ani uprzywilejowanego uruchamiania kodu z PR.

Osobny job `Describe PR 2` realizuje zleconą poprawkę tytułu/opisu: tylko PR #2 z `feat/exam-practice-stage-one` w tym repozytorium, wyłącznie po zielonym `Verify ELE`. Ma `contents: read` i `pull-requests: write`, nie robi checkoutu, nie uruchamia kodu projektu, nie tworzy/akceptuje/łączy PR. Pobiera tekst `PR_2_DESCRIPTION.md` jako dane dla aktualnego SHA i dopisuje URL wykonanej weryfikacji. To jawny wyjątek dla metadanych tego PR; pozostałe PR-y i push do main mają tylko job kontroli.

## Ustawienia ręczne przed pierwszym tagiem

Nie znaleziono wcześniejszej polityki wydawania w repozytorium ani dyskusji PR #2. Poniższe minimum jest jawnie opisane; wcześniejsze wymagania dotyczące liczby recenzentów lub akceptacji środowiska należy zachować, jeśli obowiązują. Pliki workflow nie konfigurują tych ustawień administracyjnych i nie są dowodem ich włączenia.

| Miejsce w Settings | Wymagane ustawienie |
|---|---|
| Actions → General | Włącz Actions; pozwól na użyte `actions/*`, `pnpm/action-setup` i lokalny reusable workflow. Domyślne Workflow permissions: read-only. Nie włączaj tworzenia/akceptacji PR przez Actions. |
| Rules → main | Aktywny ruleset/branch protection: zmiany przez PR, wymagany status joba `verify / Verify ELE` z `ELE CI`, aktualna gałąź względem main, brak force push i usuwania. Nie omijaj kontroli przez administracyjny bypass. Zachowaj wcześniejszą liczbę wymaganych recenzji. Po pierwszym przebiegu wybierz dokładną nazwę checka pokazaną przez GitHub. |
| Rules → tags `v*` | Zezwól na tworzenie tagów tylko uprawnionym osobom wydającym; blokuj zmianę i usuwanie tagów. Nie dawaj tokenowi CI prawa omijania ochrony. |
| General → Releases | **Enable release immutability** przed pierwszym wydaniem. Chroni przyszłe opublikowane archiwa i powiązane tagi. Workflow nie używa `--clobber`. |
| Pages | Source: **GitHub Actions**, bez gałęzi publikacyjnej i bez custom domain dla tego adresu. |
| Environments → github-pages | **Selected branches and tags**, reguła typu **Tag: `v*`**. Nie wybieraj „Protected branches only”: workflow tagowy i rollback na tagu potrzebują dostępu. Nie dodawaj reguły dla PR/main. Zachowaj wymaganą ręczną akceptację przez recenzenta, jeśli jest częścią ustalonej polityki. |

Przed wydaniem należy zobaczyć zielony check aktualnego PR i push/merge na main, potwierdzić powyższe ustawienia, a dopiero potem utworzyć tag. Przykład dla wersji `0.3.0`, po połączeniu PR:

```sh
git fetch origin
git switch main
git pull --ff-only
git tag -a v0.3.0 -m "ELE 0.3.0"
git push origin v0.3.0
```

Workflow `ELE Release` przeprowadzi kontrole ponownie; zaakceptuj deployment w environment, jeśli jego reguły tego wymagają. Po sukcesie sprawdź `/ele/version.json`, otwórz przykład i wykonaj zasilanie → zapis → odświeżenie. Zapisz URL przebiegu oraz SHA artefaktu w notatkach wydania. Skrypty testują gotowy dist lokalnie/na runnerze; sam ich sukces nie oznacza wykonania deploymentu w GitHub Pages.

## Rollback zachowanego wydania

Uruchom **ELE Rollback na istniejącym tagu wersji**, którego archiwum jest w GitHub Releases. Dispatch na main zostanie odrzucony. W CLI (przykład; nie wykonano go w tej zmianie):

```sh
gh workflow run rollback.yml --repo Choniawko/ele --ref v0.1.0
```

Workflow sprawdza tag/main, pobiera archiwum i sumę z tego wydania, odrzuca niebezpieczne ścieżki/linki, weryfikuje pełny manifest oraz zgodność tagu/commita. Odtwarza dist, uruchamia wszystkie E2E produkcyjne pod `/ele/`, ponownie sprawdza integralność i dopiero wtedy przesyła pliki do Pages. Nie buduje kodu ponownie ani nie zmienia oryginalnej daty/wersji artefaktu. Publikacja i rollback współdzielą concurrency `github-pages` z `cancel-in-progress: false`.

Rollback aplikacji nie jest migracją w dół IndexedDB. Zachowaj eksporty projektów przed zmianą wersji; starsze bindingi mogą odrzucić projekt używający później dodanego SKU. Dotychczasowa ochrona niepoprawnych zapisów i pobierania kopii pozostaje aktywna.

## Odtworzenie kontroli lokalnie

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm catalog:validate
pnpm test:e2e
pnpm build
pnpm test:e2e:production
pnpm release:pack
pnpm dist:validate
```

Do ręcznej próby dist: `pnpm preview:dist`, adres `http://127.0.0.1:4173/ele/`. Na macOS 12 testy korzystają z istniejącego Chrome; nie nadpisuj lokalnej instalacji poleceniem instalacji przeznaczonym dla runnera Ubuntu.

Dokumentacja źródłowa: [Pages workflows i uprawnienia](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Playwright Chrome](https://playwright.dev/docs/browsers), [Vite base](https://vite.dev/guide/static-deploy.html#github-pages), [ochrona wydań](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/prevent-release-changes), [environment](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments), [uprawnienia i pinowanie akcji](https://docs.github.com/en/actions/reference/security/secure-use).

# Kontrakty nowych danych — propozycja do zaadaptowania w repo

To specyfikacja, nie istniejące rozszerzenie ProjectDocument. Docelowe typy i Zod powstają w etapie 00/01, po porównaniu aktualnego repo. Pliki w data/ tej paczki są planem pracy, a materialy/data są treścią, nie dokumentami importu.

## ReferenceExample

| Pole | Wymaganie |
|---|---|
| id, taskId, referenceRevision | Stabilna tożsamość wzorca i zgodny numer wersji sidecar |
| sourceIds, figureIds | Istniejące źródła i oryginalne figury z numerem strony |
| documentPath lub create | Jeden deterministyczny ProjectDocument; nie dwa równolegle rozchodzące się wzorce |
| status | content-only / draft / model-tested / source-verified; UI mapuje te stany na zrozumiałe etykiety |
| fidelity | educational / adapted / exact-selected-profile; z listą konkretnych różnic |
| sourceIssueIds, assumptions | Istniejące kwestie i jawne przyjęte parametry; issue ma resolution i dowód |
| lessonId, profileBindingIds | Powiązania do istniejącej, zgodnej wersji wiedzy |
| evidence | Commit, testy, raport, zrzuty i wynik gates; samo pole true nie stanowi dowodu |

status model-tested nie oznacza zgodności z pełnym realnym SKU. Status source-verified oznacza sprawdzony wariant wobec źródła i wybranych instrukcji, z jawną fidelity. Do publikacji przycisku „Gotowy układ” potrzebny co najmniej model-tested i wszystkie odpowiednie bramki R1–R10; draft ma oddzielną akcję „Obejrzyj szkic”. Wyniki pomiarów unsupported są widocznym ograniczeniem, a nie zaliczoną realistyczną próbą.

## LessonBinding i CircuitFragment

LessonBinding ma taskId/referenceId/referenceRevision oraz sourceDesignation → instanceId. Profil wiąże productId/productRevision/topologyId z profileArticleId i mapą sourceTerminalLabel → terminalId. Terminals są lokalne dla konkretnego produktu, nie uniwersalne dla całej kategorii.

CircuitFragment ma id, lessonId, kind (power/control/return/interlock/measurement), deviceIds, terminalRefs, conductorIds, bridgeIds, narrative i stateExpectations. Wszystkie referencje są walidowane wobec wzorca. Po edycji kopii fragment ze starą rewizją może pokazać wyjaśnienie oryginału, ale nie udawać aktualnej gwarantowanej drogi przepływu; zaznacz różnicę i sprawdź referencje.

Schemat z projektu używa tych samych instanceId i terminalId. Oryginalne figury mają osobny FigureHotspot: figureId, sourceCropPt, rect/circle w współrzędnych źródła, label, sourceDesignation, bindingId. Wycinki PNG/SVG z paczki są obrazami źródła, nie semantycznym SVG każdego styku.

Projekcja rozwinięta może mieć SymbolFragment z graphicFragmentId, instanceId, topologyFragmentId, symbolKind oraz portId→TerminalRef i odnośnikiem do mechanizmu. To dane renderera/layoutu, a nie nowe DeviceInstance. Pozycje fragmentów wymagają jawnego, walidowanego kontraktu layoutu lub sidecar, nie drugiego grafu przewodów. Przed wdrożeniem wybierz sposób zapisu zgodny z aktualnym modelem i eksportem, dodaj defaulty dla starego schematu oraz próby powrotu do historycznych plików. Grafika nadal używa jednej listy conductors/bridges i zachowuje ciągłość zacisków po rozdzieleniu symboli.

## ContextHelp i ReturnState

ContextHelp identyfikuje projekt/revision, instancję i profil, opcjonalny zacisk/fragment/lekcję oraz źródło wejścia. Gdy binding konkretnego modelu nie istnieje, widoczny artykuł ogólny ma komunikat o braku zweryfikowanej numeracji.

ReturnState przechowuje w sesji route, projectId, revision, widok/narzędzie, selection i kamerę obu tablic; opcjonalnie stan rozpoczętego przewodu według ustalonej polityki. Nie jest częścią circuit ani obowiązkowym zapisem do IndexedDB. Zmiana źródłowego projektu podczas otwartego panelu unieważnia niepasujący kontekst zamiast kierować pomoc do innej instancji.

## Rozbudowany Article / DeviceProfile

Article: id, category, qualificationScopes, title, summary, principle, symbolExplanation, classicUses, lessons, taskIds, misconceptions, checks, evidence. Article ogólny łączy profile, nie zastępuje ich numeracji.

DeviceProfile: id/revision, product binding, model label, supply/rating, topology, terminal map, restState, stateTable, settings, appearance/mounting, simulationScope, measurementSupport, manuals/version/checkedAt, source issues i datę weryfikacji. Ponowne sprawdzenie pełnej instrukcji jest częścią dodania modelu, nawet jeśli link znajdował się w poprzednim materiale.

Elementy mechaniczne mają appearance/mounting/compatibility oraz zastosowania; nie wymaga się od dławnicy cewki lub sztucznej symulacji. Klasyczne układy odwołują się do konkretnych referenceId i fragmentów, a nie do drugiego ręcznie połączonego grafu.

## Kontynuowanie pracy

implementation-state.json przechowuje schemaVersion, baselineCommit, lastImplementedCommit, stages[id].status, units[id].status i evidence, tasks[taskId].referenceStatus/fidelity/referenceRevision/gates oraz issues[issueId].resolution. Dozwolone statusy pracy: pending/in-progress/implemented/tested/released/blocked. Krok może być tested bez released, a etap jest tested dopiero po wszystkich własnych bramkach.

Nie kopiuj początkowego implementation-state.seed.json ponad istniejący postęp. Seed tworzy plik tylko przy braku wcześniejszego rejestru. Nie wpisuj dowodów z przyszłych testów ani fikcyjnego SHA. Każda sesja aktualizuje stan na podstawie rzeczywistego kodu i wyników, nie samej treści planu.

## Dalsze tutoriale i ELE.05

TutorialStep: articleId/taskId/referenceId/referenceRevision, cel, fragmentIds, opis działania użytkownika, opis spodziewanego wyniku, link do dowodów i opcjonalny checkerId. Nie zapisuje spodziewanego wyniku jako rzeczywistego runtime. Artykuł blogowy może łączyć te same kroki, a pracownia zachowuje kontekst powrotu.

Nowe zadanie ELE.05 wymaga źródła, tej samej karty, modelu/reference, mapy zacisków i QA. kwalifikacja nie jest automatycznie nadawana wszystkim układom z silnikiem. W tym zestawie nie ma arkuszy ELE.05 i nie tworzymy pustego „ukończonego” modułu.

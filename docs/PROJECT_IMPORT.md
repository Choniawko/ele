# Import i eksport projektów ELE

Aplikacja przyjmuje gotowy JSON. Odczyt schematu PDF/JPG i przygotowanie JSON odbywają się poza aplikacją. Import nie odtwarza połączeń z obrazu ani nie zgaduje modeli aparatów.

Przykład [ELE.02-108](ELE02_108.md): `examples/physical/ELE02_108_stanowisko.json`. Wyłącznik silnikowy i zespoły START/STOP mają nowe productId, bez zmiany `schemaVersion`. NO 13–14 łączy się z Q2 przez `mechanicalCouplings.kind: assembly`; Q2 jest właścicielem mechanizmu bez cewki. Stare produkty i rewizje są zachowane. Chwilowe wciśnięcia START/STOP są stanem sesji solvera, nie zapisem projektu.

## Obsługiwane formaty

1. Dotychczasowy `ProjectDocument` — obiekt dokumentu bez opakowania. Schemat obwodu ma `circuit.schemaVersion: 1`. Nie zawiera pomiarów ani zdarzeń.
2. Projekt z historią: `{ "format": "ele-project", "version": 1, "project": { "document": ProjectDocument, "measurements": [], "events": [] } }`.
3. Folder: `{ "format": "ele-folder", "version": 1, "folder": { "name": "Projekty do egzaminu" }, "projects": [{ "document": ProjectDocument, "measurements": [], "events": [] }] }`.

`measurements` i `events` mogą zostać pominięte w importowanym opakowaniu; ich domyślna wartość to `[]`. Opakowania nie przyjmują innych pól. Nieobsługiwana wersja jest odrzucana. Foldery nie mają podfolderów. Nazwa folderu jest wymagana (1–120 znaków, nie same spacje). Limit importu biblioteki wynosi 20 MiB, a paczki folderu — 100 projektów. Dotychczasowy parser pojedynczego dokumentu `parseProject` zachowuje limit 5 MiB.

Import pojedynczego projektu zapisuje go w wybranym folderze; w widokach „Wszystkie projekty” i „Bez folderu” zapisuje go bez folderu. Paczka folderu zawsze tworzy nowy folder, także kiedy folder o tej samej nazwie istnieje. Każdy projekt otrzymuje nowe `circuit.projectId`; identyfikatory aparatów, przewodów i pomiarów pozostają lokalne dla projektu. Nie nadpisujemy dokumentu o ID z pliku. FolderId, identyfikator folderu, data zapisu i rewizja metadanych nie należą do elektrycznego dokumentu i nie są kopiowane jako tożsamość zapisu.

Przed zatwierdzeniem importu aplikacja pokazuje nazwy, liczbę projektów, aparatów i pomiarów. Całość musi przejść `projectSchema` i `validateProjectDocument`, w tym kontrolę produktów, rewizji i zacisków. Wszelkie projekty i wymagane snapshoty są zapisywane w jednej transakcji Dexie; błąd wycofuje też nowy folder. Nie importujemy części paczki po błędzie.

## Wymagane pola dokumentu

Źródłem kontraktu są `packages/circuit-model/index.ts` oraz `packages/device-catalog/project-validation.ts`. Poniżej opis obecnego schematu, nie alternatywny schemat dla generatora.

| Pole | Zawartość |
| --- | --- |
| `name` | Nazwa 1–120 znaków. |
| `circuit` | Wszystkie pola opisane poniżej. |
| `physical`, `schematic` | `{ "devices": { "id-aparatu": { "x": 80, "y": 90 } }, "routes": {} }`. Każdy aparat ma pozycję w obu widokach. |
| `faults` | Tablica usterek; `[]` w zwykłym projekcie. |
| `userMetadata` | Mapa tekst→tekst; `{}` wystarcza. |
| `productRevisions` | Mapa używanego `productId` na zgodną rewizję, np. `{ "edu-source-ac": "1", "edu-lamp": "1" }`. |

Pola opcjonalne `scenarioId` i `training` służą istniejącym ćwiczeniom. Generator zwykłego układu powinien je pominąć. Nie dodawaj `folderId`, miniaturek ani danych producenta do dokumentu. Nieznane pola głównego dokumentu i aparatu są odrzucane.

`circuit` wymaga:

- `schemaVersion: 1`, `projectId`, `revision` (nieujemna liczba całkowita), `catalogSnapshotId`;
- `devices`, `conductors`, `bridges`, `cables`, `mechanicalCouplings`, `supplySystems` — tablice, również gdy puste;
- `installationConditions`: `temperatureC`, `copperResistivity`, `aluminiumResistivity`, `insulationResistanceOhm`. Przykład: `20`, `0.0175`, `0.0282`, `200000000`.

Identyfikatory mają 1–120 znaków z zestawu `a-z A-Z 0-9 _ . : / + -`. Aparat ma `id`, `productId`, `productRevision`, `designation` (1–30 znaków), `settings` (obiekt, nie tablica); opcjonalne `assemblyId`. ID i oznaczenia aparatów muszą być unikalne w projekcie. `settings` muszą odpowiadać zachowaniu i domyślnym nastawom konkretnego produktu. Parametry znamionowe rzeczywistego SKU są stałe. Nie dodawaj dowolnych ustawień ani zmyślonych wartości znamionowych.

Przewód ma `id`, `from` i `to` (`{ "deviceId": "source-1", "terminalId": "L" }`), `declaredRole`, `insulationColor` (`#RRGGBB`), `crossSectionMm2`, `electricalLengthM`, `material` (`Cu` lub `Al`), `marking` (0–30 znaków). Opcjonalne `cableId`. Role: `L1`, `L2`, `L3`, `N`, `PE`, `CONTROL`, `DC_PLUS`, `DC_MINUS`, `UNSPECIFIED`. Mostek ma `id`, `from`, `to`. ID przewodów/mostków muszą być unikalne i nie mogą być ID aparatów.

## Jednostki i limity

| Wielkość | Jednostka / limit |
| --- | --- |
| `electricalLengthM` | m, 0.001–10000; niezależna od długości narysowanej trasy. |
| `crossSectionMm2` | mm², 0.14–240; dodatkowo obowiązuje zakres i liczba żył konkretnego zacisku. |
| `physical/schematic.devices`, `routes` | Współrzędne tablicy w jednostkach rysunku (px), każda -10000…10000. Trasa to tablica `{x,y}`, do 100 punktów, kluczem jest ID przewodu. |
| `rails` (opcjonalne w layout) | Tablica `{id,x,y,width}`, 1–24 szyny; szerokość 100–5000 jednostek tablicy. |
| Nastawy | `voltageV` w V, `powerW` w W, `ratedCurrentA` w A, `resistanceOhm` i `sourceResistanceOhm` w Ω, `timeS` w s. Limity: `numericSettingLimits` w schemacie. |
| Usterki | `activeAtMs` w ms; `resistanceOhm` w Ω. Nieznane typy są odrzucane. |
| Warunki instalacji | °C, rezystywności w Ω·mm²/m, rezystancja izolacji w Ω. |
| Liczba elementów | Do 150 aparatów i 500 przewodów na projekt. |

Długości geometryczne i położenia nie zastępują długości elektrycznej. Model obwodu dopuszcza błędne połączenia elektryczne w sandboxie; poprawność JSON/topologii nie oznacza bezpieczeństwa ani zaliczenia ćwiczenia.

## Produkty, zaciski i rewizje

Dozwolone są wyłącznie opublikowane pozycje bieżącego `catalog` z `packages/device-catalog/index.ts` i `stage-one.ts`. Katalog w interfejsie pokazuje dostępne modele i dokumentację. Wpis research-seed ani niezweryfikowane SKU nie są dozwolonym produktem do importu.

| Produkt w minimalnym przykładzie | Rewizja | Zaciski |
| --- | --- | --- |
| `edu-source-ac` | `1` | `L`, `N`, `PE` |
| `edu-lamp` | `1` | `L`, `N`, `PE` |

Są to jawne modele dydaktyczne. `designation` (`G1`, `H1`) jest etykietą; połączenia wskazują **ID instancji**, nie oznaczenie ani nazwę SKU. `terminalId` jest dokładnym ID zacisku (rozróżnia wielkość liter), nie jego roli czy numerem zacisku z innego modelu. Rewizja `devices[].productRevision` i wpis `productRevisions[productId]` muszą odpowiadać rewizji katalogu. Import nie pobiera ani nie publikuje obcego katalogu i nie wykonuje automatycznej migracji nieznanej rewizji. Zachowaj oryginalny JSON przy braku zgodnej wersji.

## Pomiary i zdarzenia w opakowaniu

Pomiar zawiera `id`, `function`, `parameters`, `revision`, `timeMs`, `energized`, `result`. Opcjonalne `red`, `black`, `wireId`, `deviceId` zachowują punkty historycznego pomiaru — mogą dotyczyć wcześniejszej rewizji układu. `parameters` obejmują `function`, `testVoltageV` (100/250/500 V), `rcdMultiplier` (0.5/1/2/5), `compensateLeads` (boolean). Funkcje: `voltage-ac`, `voltage-dc`, `continuity`, `current`, `insulation`, `loop`, `rcd`, `phase-order`.

`result` ma `status`, `value` (skończona liczba lub null), `unit`, `explanation`; opcjonalne `details` to mapa wartości liczbowych/tekstowych. Statusy: `valid`, `open-circuit`, `floating`, `invalid-setup`, `out-of-range`, `unsupported`, `solver-error`. Historycznych wyników nie traktujemy jako bieżących wskazań miernika ani samodzielnego dowodu poprawności instalacji. Maksymalnie 500 pomiarów i 300 zdarzeń w opakowaniu projektu. Zdarzenie: `{ "id": "event-1", "timeMs": 0, "message": "Zapisane zdarzenie", "type": "info" }`, opcjonalne `deviceId`; typy `info`, `warning`, `trip`.

Otwarcie projektu przywraca dokument i historię, natomiast runtime, źródła, sondy, selekcja i undo/redo rozpoczynają nową sesję z wyłączonym zasilaniem.

## Przykłady i ochrona odpowiedzi

- [minimal-project.json](../examples/import/minimal-project.json): kompletny surowy dokument, dwa istniejące aparaty i trzy przewody. Można załączyć zasilanie i zobaczyć świecącą lampę. To minimalny model dydaktyczny, bez deklaracji poprawnej kompletnej instalacji zabezpieczonej.
- [exam-folder.json](../examples/import/exam-folder.json): wersjonowana paczka folderu z tym samym układem.

Oba przykłady są walidowane i importowane w testach. Nie dopisuj komentarzy ani końcowych przecinków: format to JSON, nie JSONC.

Eksport aktywnej diagnozy pomija ukryte usterki, stan treningu i identyfikator scenariusza, zgodnie z dotychczasowym `safeExport`. Nowe opakowania dodatkowo pomijają historię pomiarów i zdarzeń takiej diagnozy, aby nie ujawnić odpowiedzi przez komunikaty. Oryginał pozostaje w IndexedDB. Wbudowany eksport dokumentu nadal wytwarza dotychczasowy format; eksport z biblioteki wytwarza `ele-project` i zachowuje historię publicznych projektów. Eksport całego folderu nie pomija po cichu uszkodzonych zapisów: zgłasza błąd; kopię do odzyskania pobierzesz z karty nieczytelnego projektu.

## Ograniczenia lokalnej biblioteki

IndexedDB należy do konkretnego originu i profilu przeglądarki: localhost, produkcyjne Pages i inne profile mają odrębne biblioteki. Nie ma konta, synchronizacji, wspólnej biblioteki ani kopii serwerowej. Usunięcie danych witryny, profilu lub zapis w trybie prywatnym może usunąć projekty. Eksportuj foldery jako kopie zapasowe. Import sprawdza zgodność danych, a nie autentyczność autora historycznych pomiarów. Starsza aplikacja sprzed migracji v5 nie powinna otwierać już zmigrowanej bazy; rollback aplikacji nie obniża wersji IndexedDB.

## Opcjonalna warstwa instalacji fizycznej

Przykład: [`ELE02_101_stanowisko.json`](../examples/physical/ELE02_101_stanowisko.json). Dokument zachowuje `circuit.schemaVersion: 1`; stare pliki bez nowych pól pozostają poprawne. Nowe pola znajdują się **wyłącznie w `physical`**, poza siecią elektryczną i metadanymi folderów:

```json
{
  "presentation": "external",
  "enclosures": [{
    "id": "case-P1", "name": "P1", "kind": "junction",
    "position": {"x": 602, "y": 390}, "width": 176, "height": 176,
    "deviceIds": ["P1.N", "P1.PE", "P1.T1", "P1.T2"], "closed": true
  }],
  "trunking": [{
    "id": "trunk-main", "name": "Trasa główna", "width": 36,
    "points": [{"x": 525, "y": 478}, {"x": 1390, "y": 478}],
    "conductorIds": ["W10", "W16", "W18"], "closed": true
  }]
}
```

To fragment `physical`, nie kompletny projekt. Nadal wymagane są `devices` i `routes`. Współrzędne i wymiary obudów/korytek to jednostki tablicy, nie metry. Pozycje aparatów pozostają absolutne, również wewnątrz obudów. Renderowane rozmiary produktu to mm × 2,2; nie skaluj aparatu, aby ukryć brak miejsca.

- `kind`: `distribution`, `junction` lub `supply`; opcjonalne `window: {x,y,width,height}` tylko w rozdzielnicy, względnie do jej początku, w jej granicach.
- Jeden aparat może należeć do jednej obudowy i musi się w niej mieścić. Usunięcie obudowy nie usuwa jej aparatów ani przewodów. Sama obudowa **nie tworzy węzła elektrycznego**.
- Segmenty korytka są niezerowe i poziome/pionowe. `conductorIds` wskazują istniejące żyły. Kilka korytek może zawierać tę samą żyłę. Przebieg rzeczywistej żyły nadal opisuje `physical.routes[wireId]`; metadane korytka nie zastępują tej trasy ani `electricalLengthM`.
- `presentation`: `external` lub `connections`; `closed` jest zapisanym stanem poszczególnej pokrywy. Widok schematyczny i solver używają tego samego `circuit`.
- Limity centralne: 50 obudów, 100 korytek, 100 punktów na trasę; obudowy 60–2000 jednostek, szerokość korytka 10–100, nazwy do 30 znaków. Pozostałe limity pozostają zgodne z `projectLimits`.

Nowe identyfikatory produktów (rewizja `1`): `edu-indicator-green-230` (L,N), `edu-bulkhead-40` (L,N,PE), `edu-junction-terminal` (1,2 zwarte), `edu-splice-3` oraz `edu-phase-distribution` (1,2,3 zwarte). Wszystkie są jawnie dydaktyczne; nie używaj tych ID jako identyfikatorów wyrobów producenta. Każdą rewizję wpisz zarówno do instancji, jak i `productRevisions`.

Identyfikatory komórek graficznych `handle:<id-obudowy>` i `cover:<id-obudowy>` są zarezerwowane dla interfejsu. Nie nadawaj takich ID aparatom, żyłom ani innym elementom fizycznym. Nie występują jako urządzenia ani zaciski w obwodzie.

## Rozdzielnica modułowa (opcjonalne metadane fizyczne)

`physical.enclosures[]` może mieć `distribution`. Stare obudowy bez niego nadal są ręczne. Wersja schematu elektrycznego pozostaje `1`; nie zmieniono produktów ani ich rewizji.

```json
{
  "profileId": "edu-modular-v1",
  "revision": "1",
  "rows": 2,
  "modulesPerRow": 12,
  "reserve": 4,
  "placements": {
    "device-mcb": { "zone": "modules", "row": 0, "slot": 0 },
    "device-pe": { "zone": "terminals", "row": 0, "slot": 0 }
  }
}
```

To fragment obudowy, nie cały importowalny projekt. `row` i `slot` są indeksami od zera. Rzędy aparatów: 1–3; pola w rzędzie: 8 lub 12. Strefa `terminals` ma dwa osobne rzędy. `reserve` jest nieujemną całkowitą liczbą planowanych wolnych pól, najwyżej równą pojemności rzędów aparatów; nie wymusza wypełnienia ani nie oznacza wymogu normowego.

Każdy członek `deviceIds` musi mieć dokładnie jedno przypisanie, do odpowiedniej strefy. Szerokość korpusu katalogowego dzielona przez 18 mm i zaokrąglona w górę określa zajętość. Pozycje `physical.devices` oraz szerokość/wysokość obudowy muszą zgadzać się z wynikiem funkcji w `packages/circuit-model/distribution.ts`; walidator odrzuca niezgodność, kolizje i nieznaną rewizję profilu. Szyny i okna frontu są wyliczane z tego samego profilu, nie dopisuj ich drugi raz do `physical.rails` ani `window` tej obudowy. Wymiary profilu są założeniem dydaktycznym; nie stanowią dokumentacji SKU ani sprawdzenia głębokości lub termiki.

Paczka folderu i pojedynczy projekt przenoszą te same metadane bez zmiany formatów eksportu. Połączenia nadal wskazują oryginalne elektryczne identyfikatory aparatów i zacisków, a folder pozostaje metadanymi biblioteki.

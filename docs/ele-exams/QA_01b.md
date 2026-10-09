# Odbiór 01b — ELE.02-108

Data: 2026-10-09. Jednostka **01b: tested**, cały etap **01: tested**. Kod i niezmieniony dist: `8d8fa3bf37eba979e21cee7a20c94230b8e2308f`. 101 i 108 są gotowymi modelami dydaktycznymi: **2/17**. Następujący commit raportu zawiera tylko dokumentację, obrazy i poprawkę prewarunku testu; aplikacja i dist odpowiadają podanemu SHA.

## Funkcja i zgodność

Lekcja `#/wiedza/uklady/ele02-108` integruje istniejący, walidowany projekt: 15 aparatów, 37 żył, trzy kable oraz assembly Q2/Q2.AUX. Zachowano wszystkie ID, produkty, rewizje, circuit, physical, nastawy, długości i faults sprzed 01b. Sidecar zawiera 11 profili, 15 bindingów i siedem fragmentów obejmujących wszystkie żyły. Oryginalny BOM i rysunki pozostają oddzielone od modelowego BOM.

Natywny schemat pracowni zapisuje opcjonalne `schematic.symbolFragments`, wersja `1`: 23 fragmenty i sześć nierozwiniętych aparatów tworzą 29 pól graficznych. Cewka, trzy tory mocy, NO i NC K1/K2 wskazują istniejące instancje i zaciski. Q2.AUX zachowuje własną instancję i assembly do mechanizmu Q2. Nie dodano nowych cewek ani obwodów solvera. Niewykorzystany NO K2 pozostaje niepodłączony. Stare dokumenty bez sidecaru importują się z dotychczasowym symbolem całego aparatu; schemaVersion i Dexie nie zmieniły się.

Przesunięcie pojedynczego fragmentu zmienia geometrię i autosave, zachowując circuit/revision oraz fizyczny layout. Usuwanie aparatu usuwa jego fragmenty. Walidacja odrzuca brakujące fragmenty, powtórzone zaciski, niepełne pokrycie i kolizję ID symbolu z obiektem obwodu. Zmieniona żyła nadal jest rysowana przez bieżący dokument; nieaktualne powiązanie lekcji jest odrzucane.

Solver odtwarza podtrzymanie prawego K1, chwilowy lewy K2, niezależne START/STOP obu stanowisk, blokadę NC, wspólne ON/OFF/TRIPPED Q2 oraz zachowanie przy powrocie energii. Lekcja ma własną sesję. Przyciski reagują na trzymanie klawisza/wskaźnika i zwolnienie/blur/cancel; stan przycisku i symbolu pochodzi z runtime. Ω sprawnej cewki jest jawnie unsupported. Q2.AUX odczytuje wspólny mechanizm także przed pierwszym ON energii. Po akcji lekcja pokazuje bieżący runtime również przy energii OFF; reset przywraca stan odniesienia.

## Źródła i ograniczenia

Oba oryginalne rysunki: `ELE02_108_p2_moc-i-sterowanie`, `ELE02_108_p1_rozmieszczenie`, `pdf-ele02-108`; pełne źródłowe pliki/hashe w exam-data. Wszystkie 80 PNG/SVG zachowują bajty.

Profil LC1D09P7 odczytano z pełnej [karty Schneider, 4 strony, 15.07.2015](https://iportal2.schneider-electric.com/Contents/docs/SQD-LC1D09P7.PDF): cewka 230 V AC, trzy NO mocy, NO+NC pomocnicze. [Instrukcja W9 0381869 01 11 A04, 06-2016](https://download.se.com/files?p_Doc_Ref=0381869_01A55&p_File_Name=0381869_01A55_04.pdf&p_enDocType=Instruction+sheet) zawiera rysunki zacisków TeSys, lecz dotyczy osprzętu LAD; nie podpisano jej jako pełnej instrukcji każdego użytego SKU. Pozostałe profile są dydaktyczne. Mapa źródła 1/3/5 i 2/4/6 do 1L1/3L2/5L3 i 2T1/4T2/6T3 jest widoczna w profilach i pomocy. Nie przeliczono VA cewki na fikcyjną rezystancję DC.

Wszystkie trzy `108-ISSUE-01/02/03` pozostają open: brak tabliczki/długości, 3 kW i 4,35 A jako założenia, brak gwarancji pierwszeństwa przy równoczesnym żądaniu. Nie odtworzono rozruchu, momentu, dynamiki ruchu, krzywych konkretnego Q2 ani geometrii montażowej 1:1. Cały rejestr nadal ma 30 otwartych kwestii. To model `educational`, nie `exact-selected-profile`.

## Wykonanie i odbiór obrazu

W pierwszej produkcji `1131bbe` testy automatyczne dały 3 passed/1 świadomy skip publicznej kopii. Ogląd obrazu wykrył nakładanie powrotu za STOP-ami na wiersz Q1/STOP, sugerujące obejście. Ten snapshot nie stanowi odbioru R7 ani podstawy awansu: [zapis](qa/01b-initial-production.json). Poprawiono trasę jednym ortogonalnym odcinkiem należącym do rzeczywistego węzła; źródłem grup pozostaje `permanentNets`. Dodano próbę natywnego SVG wykrywającą linie przechodzące przez wnętrza symboli. Poprawiony draft `2768c4f`: **3 passed / 1 świadomy skip**, 54,9 s; [zapis](qa/01b-production-draft.json). Końcowa produkcja 8d8fa3b przeszła po poprawce także wspólny mechanizm przy OFF.

## Potwierdzone kontrole

- Typy, lint, katalog i wiedza: passed; 2/17 gotowych wzorców.
- `pnpm test`: **303 passed, 22 pliki, 28,17 s**, z domyślnymi limitami; końcowy zestaw uruchomiono osobno. Wcześniejszy test archiwum przekroczył 5000 ms przy równoległym obciążeniu; nie zmieniano tego limitu.
- `pnpm test:e2e`: pełny przebieg **61 passed, 1 failed, 1 skipped, 18,4 min**. Test 108 po próbie ON/OFF pozostawał w trybie Test, więc nie rozpoczynał przewodu. Dodano jawny powrót do Budowy, bez zmiany aplikacji; ponowienie tego scenariusza: **1 passed, 30,4 s**. Potwierdzono wszystkie **62 unikalne scenariusze + 1 brakujący lokalny plik**. Raporty: `release/qa-01b-dev-full/`, `release/qa-01b-dev-rerun/`.
- Wszystkie siedem prób źródłowych: [rejestr wykonania](qa/108-source-check-results.json); 82 oryginalne specyfikacje pozostają niezmienione.
- `pnpm build`: passed, czysty kod 8d8fa3b, base `/ele/`, builtAt `2026-10-08T22:15:06.886Z`. `pnpm test:e2e:production`: **44 passed / 1 skipped, 7,2 min**, na tym samym dist. Wszystkie cztery scenariusze 108 i pięć 101 passed, w tym publiczne kopie, wcześniejsze projekty, Worker, odświeżenie i kamera. Nie wykonywano kolejnego builda.

## Bramki R1–R10

| Bramka | Dowód |
| --- | --- |
| R1 | Bieżący katalog; walidacja 15 instancji, 11 profili, wersji i pełnych fragmentów |
| R2 | 37 żył, trzy kable, assembly, pojemności, odrębne N/PE i izolowana rezerwa |
| R3 | 22 niezależnie opisane grupy: kolejność faz i zamiana L1/L3, STOP, oba kierunki, N/PE, niewykorzystany NO K2 |
| R4 | Wszystkie 108-QA-01…07, sekwencje przeciążenia/zwarcia/resetu/powrotu energii |
| R5 | Usunięte podtrzymanie i PE, obejście NC powodujące zwarcie i trip; brak fikcyjnego Ω cewki |
| R6 | 15 bindingów, profile/referencje/fragmenty, rzeczywiste ID wszystkich 37 żył, brak fallbacku obcego taskId |
| R7 | Natywny rozwinięty schemat i tablica, 37 końców w każdym widoku, brak przejść fizycznych przez obudowy; poprawiona trasa za STOP |
| R8 | Nowe ID/OFF, import/export/roundtrip, geometryczny autosave/odświeżenie, wcześniejsze projekty i szablon zachowane |
| R9 | Wyszukanie „podtrzymanie”, pomoc K1/W35, pełny artykuł i powrót, kamera/klawiatura/przewód; cztery viewporty i zoom |
| R10 | Dist 8d8fa3b pod /ele/: 44 passed/1 lokalny skip, wszystkie 4 scenariusze 108 passed; identyczny manifest przed i po, archiwum zweryfikowane |

Następna jednostka po odbiorze: **02a — ELE.02-105**, dwie schodowe, jeden krzyżowy, dwie równoległe oprawy, lekcja korespondencji i osiem kombinacji. Nie implementowano jej w 01b.

## Obrazy i przygotowane archiwum

Obejrzano **11 zrzutów końcowej produkcji**, nie makiety. Lekcja i pomoc mieściły się w czterech wymaganych viewportach; rysunki mają własne przewijanie i zoom. Na 390×844 panel pomocy zajmuje większą część kanwy, lecz zamknięcie jest widoczne. W dwóch pełnych zrzutach SVG użyto wyższego viewportu 1366×1600, aby stały kontener nie obciął dolnych torów. Cztery zrzuty wymaganych rozmiarów pozostały bez zmiany.

- Lekcja: [1366x768](qa/01b-108-lesson-1366x768.png), [1920x1080](qa/01b-108-lesson-1920x1080.png), [390x844](qa/01b-108-lesson-390x844.png), [844x390](qa/01b-108-lesson-844x390.png).
- Pomoc: [1366x768](qa/01b-108-help-1366x768.png), [1920x1080](qa/01b-108-help-1920x1080.png), [390x844](qa/01b-108-help-390x844.png), [844x390](qa/01b-108-help-844x390.png).
- [Tor mocy](qa/01b-108-power-diagram.png), [tor sterowania](qa/01b-108-control-diagram.png), [W35 w dwóch natywnych widokach](qa/01b-108-wire-context.png).

Archiwum lokalne: `release/ele-preview-8d8fa3bf37eb.tar.gz`. SHA-256: `d3e9a2482de9ae12b8255802e77ab957717a469693f762557d6bc13d4ea3e77b`. [Dowód produkcji i manifestu](qa/01b-production-final.json). Build: wersja 0.2.0, tag null, base /ele/, builtAt 2026-10-08T22:15:06.886Z. `pnpm release:pack` i `pnpm dist:validate`: passed; manifest nie zmienił się między testami i pakowaniem. Pozostaje ostrzeżenie rozmiaru głównego JS 1662,60 kB / gzip 473,20 kB. Nie publikowano Pages ani wydania.

## Zapisana biblioteka lokalna

Przed próbą uzupełnienia istniejącej kopii 108 zapisano kopię wszystkich tabel IndexedDB w ignorowanym `release/local-library-01b-default-upgrade/backup.json`. Biblioteka zawiera obecnie trzy projekty, w tym nową kopię 101. Zapisany 108 ma zmieniony circuit i physical względem wzorca wejściowego; automatyczna aktualizacja została pominięta. Zachowano wszystkie rekordy i dokumenty użytkownika. Nowy rozwinięty wzorzec 108 można otworzyć jako osobną kopię z Przykładów. Tymczasową stronę aktualizacji usunięto.

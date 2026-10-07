# Architektura

React/TypeScript, Vite, pnpm. Logiczne pakiety mają osobne katalogi, ale wspólny build. CircuitModel jest jedynym źródłem topologii; layout fizyczny i schematyczny są niezależne. Graf diagramu jest projekcją. Czysty solver MNA działa w workerze, bez Reacta i DOM. Zustand integruje komendy, historię, runtime oraz persystencję IndexedDB (Dexie). Komendy, undo/redo, zapis, eksport, import i odczyt używają `validateProjectDocument`: schematu Zod i kontroli zgodności katalogu. Wspólne limity formularzy i domeny są w CircuitModel. Walidacja poprzedza zatwierdzenie dokumentu i zmianę historii oraz symulacji.

Plan: model i katalog → MNA i pomiary → interaktywny edytor i dwa widoki → aparaty czasowe, ochrona i ćwiczenia → weryfikacja liczb, gestów, persystencji i obrazu. Kryteria odbioru oraz dowody aktualizujemy w IMPLEMENTATION_STATUS.md. Dane producenta, topologia, profil dydaktyczny i renderer pozostają oddzielone. Produkty bez krytycznych dowodów nie trafiają do edytora.

Worker utrzymuje RuntimeSnapshot, zegar i seed. Każde żądanie/reply ma sesję, rewizję i sekwencję. Zustand odrzuca odpowiedź starego obwodu, zachowuje tożsamość niezmienionych stanów urządzeń, a memo adaptera zapobiega przebudowie grafu tylko z powodu zegara. Edycja topologii jest transakcją z nową rewizją i odłączeniem źródeł; zmiana layoutu ma własną flagę historii i nie zmienia rewizji elektrycznej.

Dexie v4: `projects`, `research`, `snapshots`, `settings`. Dokument, wymagane snapshoty katalogu i wskaźnik ostatniego projektu zapisują się atomowo; status „Zapisano lokalnie” wymaga sukcesu transakcji. Migracja dodaje tabelę ustawień i zachowuje dane v3; starszy wskaźnik localStorage jest obsługiwany przy odczycie. Zapis jest opóźniony o 350 ms, logi ograniczone do 300 zdarzeń, pomiary do 500. Stan energii i symulacji nie jest częścią dokumentu. Snapshot produktu przechowuje dane, ale uruchomienie nadal wymaga zgodnego, walidowanego bindingu zachowania. Nie wykonujemy dostarczonego JavaScript ani SVG przy imporcie.

Niepoprawny istniejący rekord pozostaje nienaruszony i jest chroniony przed nadpisaniem. `ProjectReadError` zawiera komunikat oraz kopię dokumentu do pobrania. Kopia ćwiczenia pomija ukryte usterki, sesję i identyfikator scenariusza; nie zawiera logów ani pomiarów. Pełny oryginał zostaje w IndexedDB. Szczegóły i procedura odzyskania: [PROJECT_VALIDATION.md](PROJECT_VALIDATION.md).

Trening używa kopii projektu do prób działania i własnych reguł oceny. Kontrakt tutora przyjmuje tylko obserwacje i pomiary; nie ma operacji włączania źródeł ani dostępu do fault overlays. Do odtworzenia zachowania wystarcza projekt, rewizja katalogu, seed i sekwencja RuntimeAction; pełnego odtwarzacza nagrań nie zaimplementowano.

Etap 1 egzaminów dodaje profile w `device-catalog/stage-one.ts`, niezależne od solvera. `simulation/mechanisms.ts` wiąże pomocnicze styki z mechanizmem rodzica i obsługuje osobne sprzężenie `interlock`. Po ruchu jednego stycznika solver przelicza obwód przed oceną drugiej cewki; blokada elektryczna nadal wynika z NC i przewodów. `simulation/motor.ts` analizuje sieci końców uzwojeń oraz ich napięcia, a nie deklarowaną przez ćwiczenie konfigurację/kierunek.

`training/builder.ts` jest wspólnym konstruktorem dotychczasowych i nowych projektów. `practice.ts` opisuje trzy stanowiska, warianty montażu i ukryte nakładki diagnostyczne. `assessment.ts` ocenia funkcje i drogi obwodu na kopii projektu; nie porównuje ID ani szablonowej listy przewodów. Ocena elektrycznej blokady usuwa sprzężenie mechaniczne z kopii. Pomiary nadal oblicza pakiet pomiarów; ćwiczenie nie dostarcza gotowych odczytów. Dowód diagnozy jest wyliczany przed naprawą wybranego obiektu i nie zapisuje identyfikatora ukrytej przyczyny w publicznych metadanych.

CI i wydanie korzystają ze wspólnego workflow `verify.yml`. Build pod `/ele/` ma metadane wersji i manifest SHA-256; serwer testowy udostępnia wyłącznie istniejące pliki pod tą ścieżką. Pełne E2E dev i produkcyjne działają kolejno. Job Pages wdraża artefakt powstały po tych kontrolach, bez drugiego builda; rollback weryfikuje i ponownie testuje archiwum GitHub Release. Uprawnienia i wymagane ustawienia: [RELEASING.md](RELEASING.md).

## Biblioteka „Moje projekty”

Dexie v5 dodaje `folders`, indeks `projects.folderId` oraz tombstone'y `deletedProjects`. Migracja dopisuje wyłącznie `folderId: null` i `libraryRevision: 0`; zachowuje dokumenty, pomiary, zdarzenia, snapshoty i wskaźnik ostatniego projektu, także w nieczytelnych rekordach. Metadane biblioteki pozostają poza `ProjectDocument`.

`apps/web/src/library.ts` obsługuje CRUD, kopiowanie i wersjonowane opakowania JSON. Import waliduje całą paczkę przed pierwszą mutacją i zapisuje projekty, folder oraz snapshoty w jednej transakcji. Nowe ID zapobiegają nadpisaniu oryginału. `MyProjects.tsx` dostarcza foldery, karty, podgląd bez edycji i potwierdzenie importu/usunięcia.

Zmiana nazwy/przeniesienie/usunięcie folderu aktualizują rewizję metadanych. Store przekazuje zapamiętaną rewizję do każdego autosave; niezgodność powoduje odrzucenie opóźnionego zapisu. Usunięte projekty pozostawiają tombstone, aby oczekujący zapis lub inna karta przeglądarki nie odtworzyły projektu. Zapis zachowuje bieżący folder z rekordu. Operacje interfejsu najpierw kończą zapis aktywnego projektu; otwarcie z biblioteki ładuje nową sesję bez ponownego zapisu nieaktualnej kopii poprzedniego dokumentu. Błędy odczytu nadal zachowują oryginał i udostępniają chronioną kopię do odzyskania.

Kontrakt generatorów zewnętrznych i ograniczenia lokalnego przechowywania: [PROJECT_IMPORT.md](PROJECT_IMPORT.md).

### Fizyczne obudowy i wspólne trasy

`ProjectDocument.physical` opcjonalnie przechowuje `enclosures`, `trunking` i `presentation`. Pozycje urządzeń nadal są absolutne, identyfikatory i zaciski nie zależą od pokrywy. Obudowy i korytka nie występują w `compile()` ani w sieci solvera. Walidacja `assertPhysicalLayout` jest częścią istniejącego wspólnego punktu walidacji projektu; sprawdza referencje, unikalne członkostwo, dopasowanie korpusów i osiowe segmenty.

Komendy pokryw, grupowania i geometrii przechodzą przez istniejącą transakcję edytora z `topology=false`, dzięki czemu zachowują rewizję obwodu, sesję i pomiary. Przeniesienie obudowy przenosi korpusy oraz wewnętrzne trasy/szynę, zachowując ścienne korytka. Interakcje fizycznych zacisków zamkniętej obudowy są blokowane; schemat ma odrębny kontekst interakcji w widoku dzielonym. Warstwa SVG masek zakrywa żyły pod pokrywami, a okno rozdzielnicy odsłania same fronty aparatów. Nowe profile katalogu mają nowe ID, bez zmiany historycznych rewizji.

### Konstruktor rozdzielnicy modułowej

Opcjonalne `PhysicalEnclosure.distribution` przechowuje wersjonowany profil dydaktyczny, liczbę rzędów/pól, założenie rezerwy i przypisania urządzeń do strefy/rzędu/pola. `circuit-model/distribution.ts` jest wspólnym źródłem geometrii, zajętości, własnych szyn oraz okien maskownicy dla store, renderera, podglądu i miniatury. Walidacja sprawdza zgodność absolutnych pozycji z przypisaniami; zmiana następuje w jednej transakcji, przed zapisaniem dokumentu. Profile zgodności frontów są konserwatywną listą w `device-catalog/mounting-profiles.ts`; nie wynikają z liczby biegunów lub samego oznaczenia DIN.

Mechaniczne przemieszczenia, rozbudowa i maskownica używają `topology=false`, zachowując rewizję elektryczną, solver i pomiary. Własne szyny są wyliczane, globalne szyny zachowują dotychczasowy zapis. Aparaty wewnątrz modułowej obudowy nie generują dodatkowych globalnych szyn; pierwsza jawnie dodana szyna tablicy powstaje pod obudowami. W skupieniu rzędami zarządza konfiguracja rozdzielnicy. Skupienie na rzędzie oraz cel montażu są stanem interfejsu, nie elektrycznego dokumentu. Stare obudowy nie otrzymują profilu automatycznie. [Projekt](DISTRIBUTION_BOARD_DESIGN.md), [weryfikacja](DISTRIBUTION_BOARD_QA.md).

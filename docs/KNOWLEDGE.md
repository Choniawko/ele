# Baza wiedzy — obecne arkusze ELE.02

Wejście „Baza wiedzy” otwiera 17 kart: 101, 103, 104, 105, 106, 107, 108, 109, 110, 112, 113, 114, 115, 116, 117, L01, L02. Zawiera 25 artykułów, 60 kategorii wyposażenia oraz 40 oryginalnych rysunków PNG/SVG. Przykłady, Ćwiczenia i Kopiuj przykład w bibliotece korzystają z tego samego zakresu. Dawne ogólne demonstracje nie są oferowane; ich adresy informują o wycofaniu i prowadzą do obecnych zadań. Zapisane projekty, import/eksport i progres artykułów pozostają zgodne.

## Wzorzec i lekcja 101

`/ele/#/wiedza/uklady/ele02-101` jest lekcją jednego kanonicznego [projektu 101](../examples/physical/ELE02_101_stanowisko.json). Rejestr `packages/knowledge/reference-examples.ts` zachowuje 24 instancje i 33 żyły, wskazuje rewizje, źródła, ograniczenia, profile 12 produktów oraz siedem fragmentów obwodu. Schemat, tablica i tabela wynikają z tego samego dokumentu; nie mają drugiego netlistu. Tablica używa routera przewodów edytora, a schemat odczytuje jego rzeczywiste węzły.

Solver izolowanej lekcji wykonuje przełączenia Q1/Q2, B6/B10, TEST RCD i reset. Energia oraz stan użytkownika nie są zmieniane. Otwieranie wzorca tworzy własne projectId po ukończeniu wcześniejszego zapisu, zachowuje poprzedni projekt i rozpoczyna od OFF. Publiczny przycisk wymaga poprawnego dokumentu, rejestru, rewizji, fidelity, dowodów oraz wszystkich R1–R10 w `exam-data/availability.json`.

101 i 108 są modelami dydaktycznymi; geometria i długości nie są odwzorowaniem stanowiska 1:1. Galeria oferuje dwa wzorce z 17 obecnych arkuszy. Pozostałe karty nie są gotowymi modelami. Nie ma dostarczonych arkuszy ELE.05.

## Wzorzec i lekcja 108

`/ele/#/wiedza/uklady/ele02-108` łączy 15 aparatów, 37 żył, trzy kable i assembly Q2/Q2.AUX. Lekcja ma 11 profili, siedem torów i dwa schematy funkcjonalne: moc z zamianą L1/L3 oraz zgodę/STOP/podtrzymanie K1/chwilowy K2. Izolowane przyciski START/STOP używają tego samego solvera co pracownia. Profile pokazują mapę źródłowych oznaczeń do rzeczywistych zacisków modelu.

Natywny schemat zapisuje opcjonalny `schematic.symbolFragments` v1: 23 symbole wskazują istniejące cewki, NO/NC i bieguny. Nie dodaje aparatów ani drugiego obwodu. Symbole wspólnego K1/K2 korzystają z jednego runtime. Przesuwanie symbolu jest edycją geometrii, a zwykły gest zacisku nadal rozpoczyna przewód. Stare zapisy bez sidecaru zachowują symbol całego aparatu. Trzy kwestie źródłowe 108 pozostają otwarte; 3 kW i 4,35 A są założeniami, a Ω sprawnej cewki jest unsupported.

## Pomoc i powrót

`ReferenceHelp.tsx` pokazuje profil i rolę instancji, nastawy, mapę zacisków, stany, próbę i ograniczenia. Osobne akcje zacisku/symbolu/żyły wskazują faktyczne ID. Zwykły gest zacisku nadal rozpoczyna przewód. `boundReference` odrzuca zmieniony obwód albo nieaktualny sidecar; przemieszczenie aparatu pozostaje dozwolone.

Stan panelu znajduje się w osobnym store UI. Schowanie/Esc przywraca wcześniejsze zaznaczenie i fokus. Pełny artykuł zachowuje kontekst oraz kamerę obu tablic; zamontowany edytor jest inert pod portalem. Automatyczny zegar i skróty edytora są zawieszone podczas czytania; powrót przywraca uprzednią politykę zegara. Kopia i edycja należą do jawnych akcji użytkownika.

Artykuły katalogowe z `articles.ts` i `binding-snapshot.json` nadal podają dokładny wybrany produkt/revizję i zaciski. Nie uruchamiają wycofanych przykładowych obwodów. Progres `ele.knowledge.progress.v1` pozostaje oddzielny od dokumentów. Oryginalne obrazy są poza JS, pod BASE_URL, z manifestem SHA-256 i natywnym dialogiem powiększenia.

## Kontynuacja i walidacja

Dodaj następny kanoniczny ReferenceExample i jego profile/lekcję, zachowując ID projektu źródłowego. Czytaj [wymagania wspólne](ele-exams/plan/WYMAGANIA_WSPOLNE.md), [kontrakty](ele-exams/plan/KONTRAKTY_DANYCH.md), zadanie, źródłowe rysunki i otwarte issues. Nie publikuj przycisku na podstawie samego istnienia JSON. Nieznane wartości zachowaj jako założenia.

`pnpm knowledge:validate` sprawdza treści, referencje, bramki i sumy źródłowe. `tests/reference-examples.test.ts`, `reference-copy.test.ts`, `reference-navigation.test.tsx` i `wire-routing.test.ts` sprawdzają obwód, niezależne węzły, próby i geometrię. `tests/e2e/reference-examples.spec.ts` i `knowledge.spec.ts` sprawdzają realną przeglądarkę, także produkcyjny `/ele/`, cztery rozmiary okna i kopiowanie. Starsze obwody w `tests/fixtures/legacy-projects.json` służą wyłącznie kontroli importu istniejących zapisów; nie są pozycjami aplikacji.

Bieżące wyniki i ograniczenia: [QA_01](ele-exams/QA_01.md), [QA_01b](ele-exams/QA_01b.md), [checkpoint](ele-exams/implementation-state.json). Dowody wcześniejszej jednostki 00a zachowuje [QA_00](ele-exams/QA_00.md). Po odbiorze 01b następna jednostka: **02a — ELE.02-105**, trzy miejsca sterowania, krzyżowy i lekcja korespondencji.

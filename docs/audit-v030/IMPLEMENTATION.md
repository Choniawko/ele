# Poprawki po audycie ELE v0.3.0

Punkt wejścia: `c0b5ea49b370cfb5a681bfc5abf5d9d9dfd56e57`, wersja 0.3.0, czyste drzewo i aktualne origin/main. Praca na `fix/audit-v0.3.0-learning`. Nie znaleziono AGENTS.md w repozytorium ani nadrzędnych katalogach roboczych. Raport, wyniki i reproducer odczytano z przekazanego pakietu `ELE_audyt_2026-10-09` w Downloads; nie kopiowano paczki do publicznych zasobów.

Trwały stan kolejnych części: [checkpoint.json](checkpoint.json). Te instrukcje nie upoważniają do wydania ani zmiany Pages.

## Etap 0 — wejście

- `pnpm test`: 303/303, 22 pliki, 28,64 s.
- Typy, lint, katalog, wiedza i build: passed.
- Katalog: 4 opublikowane SKU, 28 oczekujących, 41 profili dydaktycznych. Wiedza: 17 kart, 40 rysunków; 2/17 gotowych wzorców.
- Oryginalny reproducer: oczekiwany exit 1. Zdrowy K1/pole1 otwarty we wszystkich widokach. Sklejony K1/pole1 przewodzi, pomiar 0,005 Ω, oba SVG otwarte.
- Pakiet początkowy: 1662,60 kB, gzip 473,20 kB. To punkt odniesienia do etapu 4, nie pomiar opóźnienia sieci.

## Etap 1 — zgodność styków i aktywna ścieżka

Wspólny resolver `simulation/connections.ts` rozdziela położenie mechanizmu, rzeczywistą ciągłość i prezentację. Kompilator obwodu i oba widoki działania używają tej samej reguły. Runtime przenosi wyliczone stany par do rendererów bez zależności wiedza ↔ symulacja i bez zmiany dokumentu projektu. Uwzględnione są pary zacisków, Q2.AUX, aktywacja w czasie oraz wybrane obsługiwane usterki.

Przy ukrytych usterkach cały widok ma tę samą, jawnie opisaną semantykę „Położenie mechanizmów — ciągłość sprawdź pomiarem”. Nie oznacza uszkodzonego miejsca ani rodzaju usterki. Widok dokumentacyjny pokazuje stan odniesienia bez uwzględniania usterek. To celowa różnica semantyki, a nie deklaracja rzeczywistego przewodzenia.

Ścieżka czytania schematów i dawne lekcje linii/węzła prowadzą do aktywnego 101; NO/NC i podtrzymanie do 108. Samo przekierowanie nie otwiera kopii ani nie zmienia zapisanych projektów. Artykuł stycznika rozróżnia teorię od roli własnego K1:13–14 w nazwanym zadaniu 108, bez historycznego H1/KA1.

Dowody jednostkowe: rzeczywiste SVG fragmentu, całego aparatu oraz diagramu funkcjonalnego, pomiar 0,005 Ω, zwykłe NO/NC, pozostałe tory, opóźnione sklejenie, Q2.AUX/trip/reset i zablokowany mechanizm. Oryginalny reproducer po poprawce: PASS. Próby przeglądarkowe i odbiór części są zapisywane w checkpointcie po wykonaniu.

Pozostałe części audytu nie są zaliczone na podstawie tej poprawki. Nie zmieniono wartości znamionowych, źródłowych rysunków ani dostępności pozostałych 15 wzorców.

Odbiór etapu 1: 35 testów w 4 plikach (styki/wiedza/101/108), 3 scenariusze przeglądarkowe, typecheck, lint i build. QA-01 obejmuje także naprawę: 0,005 Ω/zamknięty → OL/otwarty. W teście poprawiono wybór inspektora i usunięto zbędne kliknięcie fragmentu przykrytego innym symbolem. Nie stosowano wymuszonego kliknięcia. Wynik reprodukcera po zmianie: exit 0. Sekcje istniejących 12 artykułów przepisano na nazwane pola jako pierwszy mały krok etapu 2.

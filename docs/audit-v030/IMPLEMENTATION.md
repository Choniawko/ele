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

## Etap 2 — jedna karta i odnajdywanie informacji

Kanoniczny model `cards.ts` scala istniejące materiały, zachowując identyfikatory i mapy sekcji. Dla nakładających się kart usunięto drugi opis teorii z JSON; pozostała metadana o zadaniach. Katalog, pomoc i pełna karta używają tej samej zasady działania oraz adresu `/wiedza/aparaty/...`. Dawne adresy i aliasy przekierowują. Szczegóły, mapy oraz źródła są rozwijane; progres i bezpieczny powrót zostały zachowane. Dodano tylko dwie krótkie karty brakujących obciążeń dydaktycznych, bez deklaracji realnego SKU.

Wyszukiwarka uwzględnia nazwę, producenta, SKU, aliasy, zaciski i zweryfikowane powiązania wzorców. Wyniki grupuje na aparaty, układy i zadania. Start zawiera trzy ścieżki; dostępność jest opisana językiem ucznia. Bramki odbioru pozostają w szczegółach.

W 108 parametry arkusza, założenia modelu i propozycje zakupu są osobnymi polami. Nieznana moc/tabliczka nie została zastąpiona wartością kategorii 113. Model 3 kW i Q2 4,35 A pozostają założeniami. Pozostałe zadania zachowują własne lokalizatory źródła i osobno opisaną kategorię zakupową; nie dopisano nieodczytanych parametrów.

Odbiór: 21 testów jednostkowych wiedzy/kart; 18 różnych scenariuszy przeglądarkowych po aktualizacji testów do nowej strony startowej i rozwijanych kart. Sprawdzono wszystkie 25 dawnych adresów kart oraz 60 kategorii. Po zmianie adresu karta resetuje rozwinięte sekcje. Typecheck, lint, walidacja wiedzy i build przeszły. Początkowy JS nadal 1666,21 kB/gzip 474,14 kB; ładowanie na żądanie jest osobnym etapem 4.

## Etap 3 — lekcje 101 i 108

Trzy kroki „Zrozum / Połącz / Sprawdź” prowadzą do panelu sterowania, wyniku i przewijanego schematu. Przełączenie tablicy zachowuje wybrany zacisk. Cały tor podświetla wszystkie żyły i mostki; pojedyncza żyła pozostaje dostępna w rozwijanej tabeli. Kliknięcie cewki wyróżnia wspólny mechanizm fioletowym przerywanym obramowaniem, bez dodawania połączenia elektrycznego. Pełne źródło/ograniczenia/profile są rozwijane.

Działają krótkie próby przewidywania z faktycznym wynikiem solvera. Instrukcje i wyniki pochodzą z małych typowanych deklaracji; walidator odrzuca brak urządzenia/zacisku. W niezależnym teście skorygowano akcję próby Q1: po resecie zmiana pozycji oznacza `true`, a nie ponowne ustawienie `false`.

Momentary controls zwalniają po keyup, blur, utracie pointer capture, anulowaniu, ukryciu karty i opuszczeniu lekcji. Pauza blokuje nowe sterowanie, pozwalając zwolnić przycisk. Reduced motion wyłącza przejścia. Nie dodano strzałek sugerujących przepływ DC. Stan rozpoczętej lekcji wraca po lekturze karty; zamknięcie/odświeżenie karty rozpoczyna nową sesję. To nie zapis do biblioteki użytkownika.

Odbiór: 25 testów jednostkowych kontaktów i wzorców/deklaracji, 3 istniejące scenariusze 101/108 oraz 5 nowych scenariuszy, w tym 1366×768 i 390×844, wszystkie właściwe żyły, identyczny zacisk, cewka i 6 fragmentów K1, brak podświetlenia K2, lewy trzymany/zwolniony, utrata focusu i powrót do pracującej lekcji. Zrzuty sprawdzono; panel i skutek na schemacie są widoczne razem. Ekran mobilny wymaga przewijania rysunku, zachowując czytelne numery. Dowody lokalne: `release/audit-v030/proofs/` (ignorowane).

## Etap 4 — kod i ładowanie treści

Pracownia korzysta z lekkich modułów nawigacji, tożsamości wzorca i sprawdzania istniejących ćwiczeń. Karty, pełne materiały 17 zadań, wzorce, pomoc, projekty i galeria są ładowane po otwarciu odpowiedniego widoku. Historyczne fabryki pozostają dostępne do regresji bez importowania ich do pracowni; zachowano opisy i sprawdzanie zapisanych ćwiczeń. Zasada działania aparatu została usunięta z pomocniczych profili: karta, pomoc i lekcja czytają tę samą treść.

Tożsamość wzorca zachowuje dotychczasową dokładną kontrolę topologii i rewizji. Dane generowane mają walidację względem fabryk i pokrycia zacisków/symboli. Małe deklaracje lekcji określają sterowanie, wskaźniki, sondę i niezależnie oczekiwane wyniki prób; następna lekcja nie wymaga warunku taskId w komponentach. Wyodrębniono otwieranie kopii i sprawdzanie ćwiczeń z obszarów faktycznie objętych zmianą. Nie przeorganizowano pozostałych edycji, pomiarów, zapisu ani koordynacji workerów; ich zachowanie pokrywają regresje.

[Pomiar pakietu](bundle-comparison.json) obejmuje cały początkowy graf statycznych importów, a nie tylko plik index: 1662,609 → 1329,332 kB (**−20,05%**), gzip tym samym narzędziem Node 469,867 → 378,178 kB (**−19,51%**). Plik bazowy wyodrębniono z zachowanego archiwum v0.3.0 i sprawdzono SHA-256. Raport pierwotnego audytu podawał gzip Vite 473,20 kB; nie porównujemy dwóch metod jako dokładnego wyniku. Sam index wynosi 877,373 kB. Początkowe moduły nie zawierają tytułów wszystkich 17 zadań ani fabryk historycznych przykładów. Ostrzeżenie Vite dla dużego modułu nadal występuje; limit nie został podniesiony.

W odbiorze poprawiono rzeczywisty błąd kontekstu: usunięty aparat nie może otrzymać mapy domyślnego SKU. Karta bez kontekstu pokazuje oznaczony ilustrowany profil, a wybrany produkt zachowuje własne parametry. Pozostałe dawne adresy układów i lekcji prowadzą do najbliższego aktywnego materiału; bistabilny do teorii, nie do niezweryfikowanego wzorca. Przykłady MCB/RCD i bloku pomocniczego odróżniają aktualne 101/108 od teorii ogólnej. Źródła sekcji są przypisane do konkretnych informacji; karta silnika 108 nie sugeruje znanej tabliczki w nazwie elementu.

Stan odbioru i ostateczne wyniki przeglądarkowe są w jednym checkpointcie; etap nie jest zaliczany na podstawie starego builda.

## Zakres audytu i dalsza praca

| Problem audytu | Wdrożone zachowanie                                                                                       | Dowód odbioru                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| QA-01          | Widok działania i pomiar używają wspólnego stanu pary; dokumentacja i ukryta diagnoza mają jawne etykiety | Oryginalny reproducer oraz rzeczywiste SVG i pomiar w unit/E2E |
| UX-01          | Czytanie schematów otwiera aktywne 101; dawne adresy prowadzą do odpowiednich 101/108 albo teorii         | Test wejścia i przekierowań                                    |
| CONTENT-01     | Jedna karta i zasada działania; własny NO K1 w nazwanym 108, bez historycznego KA1/H1                     | Test wspólnego adresu, kart i źródeł                           |
| SEARCH-01      | Wyszukiwanie SKU, producenta, aliasów i zacisków; trzy grupy wyników                                      | LC1D09P7/XB5AA35/A1-A2/różnicówka                              |
| CONTENT-02     | Wszystkie opublikowane profile mają kartę lub oznaczoną teorię dydaktyczną                                | Coverage opublikowanych profili; fallback exact=false          |
| UX-02          | Zrozum/Połącz/Sprawdź, sterowanie i wynik przy schemacie, rozwijane szczegóły                             | Próby 101/108 na desktopie i telefonie                         |
| UX-03          | Wybrany tor podświetla wszystkie żyły i mostki; zaciski są wspólne dla obu widoków                        | Niezależne listy tras i przełączanie zacisku w E2E             |
| DATA-01        | Lista 108 oddziela niewiadome arkusza od modelu i zakupu, także w nazwie silnika                          | Test struktury danych i widocznej listy                        |

To zakres dwóch zweryfikowanych modeli dydaktycznych. Pokrycie kart nie potwierdza zgodności całego katalogu z realnymi wyrobami. Pozostałe 15 układów pozostają „Schemat i teoria”. Etap 5 audytu nie został wdrożony. Następna działająca jednostka to **02a / ELE.02-105**: osobno ustalona topologia, schemat źródłowy, trzy miejsca sterowania, dwie oprawy, B6, tablica prawdy wszystkich 8 kombinacji i odbiór R1–R10. Nie dodawać RCD jako elementu rzekomo obecnego w źródle 105.

Otwarte kwestie źródłowe i ograniczenia silnika 108 pozostają otwarte. Sprzeczności 114 nie zostały rozstrzygnięte i nie włączono automatycznego oceniania. Materiał ELE.05 wymaga własnych źródeł. Nie wydano nowej wersji, nie uruchomiono workflow publikacji i nie zmieniono Pages. Biblioteki projektów użytkownika nie czyszczono w ramach tego audytu.

Uczeń zaczyna od **Baza wiedzy → Zacznij od podstaw**, wybiera lekcję 101 albo 108 i wykonuje krok „Zrozum”. W „Połącz” wskazuje cały tor, porównuje identyczne oznaczenia na schemacie i tablicy oraz przechodzi do wspólnej karty aparatu. Po powrocie do rozpoczętej lekcji w „Sprawdź” przewiduje skutek i obserwuje rzeczywisty wynik solvera. „Otwórz gotowy układ jako nową kopię” tworzy odrębny zapis z zasilaniem OFF; materiały źródłowe pozostają dostępne do powiększenia.

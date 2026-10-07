# Konstruktor rozdzielnicy — projekt i zakres wdrożenia

Status: pierwszy etap wdrożony na `feat/distribution-board-builder`, 2026-10-07. Analiza bazowa dotyczyła `feat/ele02-101-physical`, commit `5652bdc`; sekcja „Co można obecnie” poniżej opisuje stan przed konstruktorem. Zakres i procedura odbioru: [DISTRIBUTION_BOARD_QA.md](DISTRIBUTION_BOARD_QA.md). Istniejąca warstwa fizyczna: [PHYSICAL_ELE02_101.md](PHYSICAL_ELE02_101.md).

## Co można obecnie

W panelu **Obudowy i korytka** można utworzyć rozdzielnicę, puszkę rozgałęźną lub zasilającą z własną nazwą, pozycją, szerokością i wysokością. Wymiary są w jednostkach tablicy. Zaznaczone aparaty można włożyć lub wyjąć, otworzyć pokrywę, przesunąć obudowę z zawartością i usunąć samą obudowę bez usuwania obwodu. Przewody nadal łączą te same identyfikatory zacisków.

Obecny panel nie dobiera pojemności w modułach. `setEnclosureMembers` szuka wolnego miejsca geometrycznie; nie układa aparatów na rzędach rozdzielnicy. `addRail` dodaje globalną szynę tablicy, nie kolejny rząd wybranej rozdzielnicy. `addDevice` nie rozpoznaje miejsca montażu jako wnętrza obudowy. Panel nie oferuje edycji wymiarów istniejącej obudowy. Nie ma stanu zajętości rzędów, licznika rezerwy, wielu okien maskownicy ani konfiguracji drzwi.

Oznaczenie „R · 8M” w przykładzie ELE.02-101 jest nazwą odnoszącą się do materiału egzaminacyjnego. Nie jest obliczeniem pojemności. Duża powierzchnia zamkniętego frontu wynika z ręcznej geometrii obejmującej również rozdział L/N/PE i przewody; nie stanowi dobranego modelu producenta.

## Dobór według zajętego miejsca, nie liczby aparatów

Pojemność należy opisywać jako **liczba rzędów × moduły w rzędzie**, np. proponowane dydaktyczne konfiguracje 1×8, 1×12, 2×12 i 3×12. Lista ta jest propozycją szablonów aplikacji, nie deklaracją dostępności konkretnych SKU.

Szerokość aparatów jest różna. Dokumentacja Hager podaje dla MBN116E szerokość 17,5 mm, a dla CD240J szerokość 35 mm i dwa moduły. Rozdzielnica VD112TP ma jeden rząd, 12 modułów, osobne bloki N/PE i wloty przewodów. To uzasadnia rozdzielenie pojemności rzędów od miejsca na przyłącza; nie jest weryfikacją kompletnej zgodności tych trzech produktów ze sobą.

Źródła producenta, odczytane 2026-10-07:

- [MBN116E — karta katalogowa](https://assets.hager.com/step-content/P/PDS_157554603301PL/Document/std.lang.all/MBN116E_3301_pl-PL.pdf)
- [CD240J — karta katalogowa](https://hager.com/intl-en/catalogue/catalog/product/download/id/CD240J)
- [VD112TP — specyfikacja obudowy](https://hager.com/pl/katalog/produkt/vd112tp-cosmos-rozdz-1x12m-n-t-ip40-drz-transp)

Aplikacja powinna przechowywać jawny mechaniczny profil montażu: szerokość zajmowana na szynie, pozycja zaczepu, zgodność z maskownicą i ewentualnie zweryfikowana liczba modułów. Liczba biegunów nie zastępuje szerokości.

Aktualny `edu-rcd` ma umowną szerokość **48 mm**. Nie można wcisnąć go w miejsce dla zweryfikowanego aparatu 35 mm ani przeskalować jego korpusu. Przy umownej siatce dydaktycznej 18 mm wymagałby co najmniej trzech pól. Dokładniejsze profile otrzymują nowe identyfikatory/rewizje; zapisane projekty zachowują dotychczasowe modele. Szerokość siatki dydaktycznej jest osobnym założeniem, nie wspólną daną wszystkich producentów.

## Przepływ użytkownika

1. **Dodaj rozdzielnicę** na istniejącej tablicy albo utwórz ją w pustym projekcie.
2. Wybierz dydaktyczny typ, liczbę rzędów i pojemność; podgląd pokazuje szyny, wolne pola oraz strefę N/PE i przyłączeń. Nazwa i przewidywana rezerwa pozostają edytowalne.
3. Dodawaj aparaty z katalogu bezpośrednio do wskazanego rzędu. Podczas przeciągania widoczny jest podgląd miejsca i zajmowanych pól. Wolne miejsce nie jest wybierane po cichu w innej części instalacji.
4. Podłączaj rzeczywiste zaciski przy otwartej maskownicy. Dodaj potrzebne listwy i złączki jako osobne urządzenia; obudowa nie tworzy domyślnego mostka.
5. Zamknij maskownicę i wróć do całej instalacji. Dodaj puszki, korytka, odbiorniki, gniazda i łączniki w tym samym projekcie.
6. W razie rozbudowy otwórz właściwości rozdzielnicy i wybierz większą konfigurację. Podgląd pokazuje wynik przed zatwierdzeniem. Zmiana zachowuje ID i końce przewodów; nie usuwa nadmiarowych aparatów.

Przykładowy komunikat pojemności: „R1 — 2×12M; rząd 1: 8 zajętych / 4 wolne; rząd 2: 0 zajętych / 12 wolnych”. Rezerwę użytkownik ustawia sam; aplikacja nie przedstawia wybranej wartości jako obowiązku wynikającego z normy.

## Układanie i edycja

- Przyciąganie do własnych rzędów rozdzielnicy, z kontrolą zajętości każdego pola oraz rzeczywistego obrysu korpusu.
- Przesuwanie i zmiana kolejności aparatów między rzędami bez odłączania zacisków. Automatyczne uporządkowanie dostępne jako jawna akcja z podglądem i undo.
- Po przepełnieniu odrzucenie operacji z komunikatem. Dostępne działania: wybierz inny rząd, powiększ obudowę albo pozostaw aparat na tablicy. Bez samoczynnej zmiany rozmiaru skrzynki.
- Pomniejszenie obudowy dopuszczalne tylko przy zachowaniu miejsc dla wszystkich członków. Usunięcie rzędu z aparatami wymaga wcześniej ich przeniesienia; nie kasuje obwodu.
- Dodatkowe wyposażenie, w tym listwy N/PE i rozdział L, ma własne miejsca montażu. Liczba końcówek i możliwość podłączenia przewodów są sprawdzane niezależnie od liczby modułów frontu.
- Grupowanie N za różnymi RCD może mieć nazwy ułatwiające montaż; nazwa ani wspólna obudowa nie zwiera torów. Połączenia pozostają jawne.
- Miejsce na prowadzenie żył i przyłączenie jest oddzielone od miejsca na aparaty. Deklaracja pojemności w modułach nie oznacza sprawdzenia termiki, głębokości, wypełnienia lub zgodności normowej.

## Czytelność bez utraty realizmu

Cała instalacja pozostaje głównym miejscem pracy. Akcja **Edytuj wnętrze R1** skupia kamerę na wybranej rozdzielnicy i tymczasowo chowa zbędne panele. Nie tworzy nowego podprojektu ani kopii obwodu. Powrót przywraca wcześniejsze położenie kamery całej instalacji.

| Prezentacja | Widoczne elementy i interakcje |
| --- | --- |
| Cała instalacja — eksploatacja | Fronty, dźwignie, kontrolki, oznaczenia obwodów, odbiorniki i zamknięte trasy |
| Wnętrze rozdzielnicy — montaż | Własne szyny, N/PE/L, złączki, zaciski, pojedyncze żyły i strefy przyłączeń; większe powiększenie |
| Schemat | Ten sam obwód, symbole, pomiary i rozróżnienie połączeń od skrzyżowań |

Drzwi i maskownica są odrębne. Zdjęcie maskownicy odsłania zaciski. Otwarcie drzwi może udostępniać dźwignie przy nadal założonej maskownicy. Przezroczyste drzwi umożliwiają obserwację; dostęp do sterowania zależy od stanu drzwi i rzeczywistego profilu. Pierwszy profil dydaktyczny może być bez drzwi, z jednoznacznym przyciskiem „Zdejmij maskownicę”.

Front powinien wynikać z liczby rzędów i ich okien, z zaślepkami wolnych pól. Nie należy powiększać aparatu, aby był czytelniejszy: poprawę odczytu dają kamera, etykiety oraz wyróżnienie wybranej żyły. Na całej tablicy pełne opisy żył pozostają na żądanie; badany tor jest wyróżniany bez ujawniania ukrytej usterki.

Dla obwodów wychodzących przydatna jest lista „Oświetlenie / Gniazda / Silnik”, która odnajduje zabezpieczenie, przewody i odbiorniki. Są to metadane i nawigacja po istniejących urządzeniach. Nazwa obwodu nie stanowi automatycznego połączenia ani dowodu poprawności montażu.

## Zmiana architektury

Rozbudowa dotyczy opcjonalnych metadanych `physical`. Potrzebne są profil obudowy z wersją, własne rzędy i przypisania mechaniczne aparatów oraz stan maskownicy/drzwi. Zaciski i elektryczne ID urządzeń pozostają w obecnym `circuit`.

Pozycje absolutne, porty i trasy używane przez Board pozostają wspólnym wynikiem układu. Pole modułowe jest źródłem mechanicznego rozmieszczenia; nie należy utrzymywać dwóch niesynchronizowanych pozycji. Przeniesienie obudowy, rzędu lub aparatu musi aktualizować ten wynik w jednej walidowanej transakcji. Konkretny kontrakt nowych pól JSON należy ustalić podczas implementacji i testów, zamiast przedstawiać go teraz jako format obsługiwany przez importer.

Stare obudowy bez profilu pozostają obudowami ręcznymi. Przejście do profilu modułowego jest jawną konwersją z podglądem i undo, nie automatyczną migracją. Sama operacja mechaniczna korzysta z `topology=false`, zachowuje sesję solvera, rewizję elektryczną i historię pomiarów. Dodanie/usunięcie aparatu lub zmiana połączeń stosują obecne zasady edycji obwodu. Zachowane pozostają walidacja całego dokumentu, autosave, metadane folderu oraz ochrona danych treningowych.

Wspólny mechaniczny układ powinien być używany przez renderer frontu, otwarte wnętrze, podgląd montażu, walidację kolizji, miniaturę i zapis. Zapobiegnie to ponownemu problemowi rozbieżności obrazu i danych.

## Kolejność implementacji i odbiór

Pierwszy działający zakres: dydaktyczne konfiguracje modułowe, własne rzędy, licznik zajętości, montaż z katalogu, zmiana kolejności, powiększenie z podglądem, N/PE/L, wielorzędowy front oraz skupienie na wnętrzu i powrót do instalacji.

Kolejny zakres: konfiguracje szaf sterowniczych z płytą montażową i niemodułowymi aparatami, szczegółowe wloty i geometria tras, a następnie zweryfikowane produkty obudów. Styczników lub zasilaczy o nieznanej zgodności mechanicznej nie wolno automatycznie traktować jak aparatury do standardowej maskownicy modułowej.

Kryteria odbioru pierwszego zakresu:

1. Od pustego projektu zbudować rozdzielnicę, dodać odbiorniki i połączyć całą instalację bez zmiany projektu.
2. Zajętość uwzględnia szerokość aparatów, wolne miejsca i różne rzędy; brak ukrytych kolizji lub przeskalowania korpusów.
3. Pełny rząd i zbyt mała obudowa odrzucają zmianę bez częściowej mutacji dokumentu, historii i symulacji.
4. Przesunięcie aparatu między rzędami, powiększenie obudowy, otwarcie drzwi lub maskownicy zachowują ID, połączenia i wyniki solvera.
5. Aparaty dostępne do montażu tylko w odpowiednim stanie obudowy; po powrocie do całej tablicy można dalej edytować puszki i odbiorniki.
6. Autosave, odświeżenie, import/export projektu i folderu odtwarzają układ mechaniczny. Stary przykład pozostaje otwieralny bez niejawnej konwersji.
7. E2E produkcyjne pod `/ele/` obejmuje proces od pustego projektu do pomiaru i pracy odbiornika; zrzuty całej instalacji i wnętrza przy 1366×768 potwierdzają czytelność i brak kolizji.

Wdrożenie obejmuje konfiguracje 1–3 rzędów × 8/12 pól, osobne rzędy przyłączeń, montaż z katalogu, podgląd pól przy przeciąganiu, przenoszenie między rzędami, podgląd rozbudowy, rezerwę użytkownika, wielorzędową maskownicę z zaślepkami oraz skupienie kamery na wybranym rzędzie. Pozostawiono ręczne obudowy bez automatycznej konwersji. Jawna konwersja, automatyczne porządkowanie z podglądem, osobne drzwi, nawigacja po obwodach i szafy z płytą montażową wymagają kolejnego etapu. Żaden nowy SKU obudowy nie został opublikowany.

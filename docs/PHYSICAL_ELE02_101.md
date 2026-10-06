# Stanowisko fizyczne ELE.02-101

Gałąź `feat/ele02-101-physical` opiera się na `feat/my-projects`: foldery, import i autosave są zachowane. Brak publikacji wydania.

## Materiały i zakres

Odczytany materiał użytkownika: `ele_02_101 (2).pdf`, 8 stron, oraz `ELE02_101_schodowe_gniazdo.json` z Downloads. Zdjęcie rzeczywistego stanowiska dostarczone w rozmowie pokazuje rozdzielnicę, dwie zielone kontrolki, dwie owalne oprawy, dwie puszki, łączniki i wspólne białe listwy. Osobny zrzut dawnej aplikacji nie został dostarczony w tej turze; obraz „przed” powstaje przez otwarcie oryginalnego JSON-a. Nie jest to kopia brakującego zrzutu użytkownika.

| Potwierdzone materiałem | Realizacja |
| --- | --- |
| Schemat, str. 1: dwa łączniki schodowe sterujące dwiema oprawami; osobny obwód gniazda | Q1/Q2, OP1/OP2 i GW w jednym modelu solvera |
| Plan, str. 2: PZ nad R, OP nad P, Q pod P, GW po prawej | Układ stanowiska i sześć korytek z segmentami osiowymi |
| Powiększenie R, str. 2: RCD–B10–H1–B6–H2 | Zachowana kolejność; osobne moduły kontrolek |
| Wyposażenie, str. 5: RCD 2P 30 mA, B10, B6, dwie zielone kontrolki 230 V, R 8M, dwie oprawy klasy I 40 W, puszki 80×80 | Profile dydaktyczne i grupująca rozdzielnica z oknem frontów |
| Str. 7–8: kompaktowe złączki; minimum cztery niezależne zaciski w każdej puszce | Cztery niezależne złączki w P1 i cztery w P2; jawne mostki tylko wewnątrz poszczególnych złączek |
| Karta, str. 3: TEST RCD, brak zwarć B10/B6, sterowanie schodowe, napięcie gniazda, cztery tory PE | Testy funkcjonalne i pomiary wynikające z sieci |
| Str. 1: 2,5 mm² zasilanie/rozdzielnica/gniazdo; 1,5 mm² oświetlenie | Odpowiednie przekroje w poprawionym JSON-ie |

## Obsługa

Importuj `examples/physical/ELE02_101_stanowisko.json` przez **Moje projekty → Importuj JSON**. Domyślna prezentacja zewnętrzna pokazuje zamknięte puszki i korytka. **Widok połączeń** otwiera wszystkie pokrywy i pokazuje zaciski. Stan obwodu, urządzenia oraz wyniki solvera są wspólne. Schemat pozostaje dostępny; skrzyżowania mają przerwę graficzną, a połączenia kończą się na portach.

Pokrywę pojedynczej obudowy przełączasz przyciskiem pod obudową. Po otwarciu można przypiąć przewód lub sondę. W prezentacji zewnętrznej otwarcie puszki ujawnia jej wnętrze, zachowując zakryte pozostałe trasy. Kontrolki reagują na zasilanie obwodów B10/B6, nie na położenie Q1/Q2.

Panel **Obudowy i korytka** pozwala dodawać rozdzielnice i puszki, wkładać/wyjmować zaznaczone aparaty, usuwać samą obudowę oraz tworzyć poziome/pionowe korytka. Przeciągnięcie oznaczenia obudowy (lub strzałki klawiatury po jego zaznaczeniu) przesuwa ją wraz z zawartością. Przesunięcie obudowy przenosi jej zawartość i wewnętrzne trasy; ścienne korytka pozostają na miejscu. Po wyjęciu aparat zachowuje wszystkie przewody i można przesunąć go osobno. Shift umożliwia zaznaczenie kilku żył i przypisanie ich do wspólnego korytka. Zmiana geometrii nie zmienia `electricalLengthM`.

Pełne opisy żył pojawiają się po zaznaczeniu. Badany tor jest wyróżniany na podstawie przebiegu żył i mostków. Podświetlenie nie wskazuje lokalizacji ukrytej usterki i nie jest dowodem ciągłości; wynik pomiaru oblicza solver. Jeśli nie ma ścieżki w samym okablowaniu, wyróżniane są przewody przy sondach.

## Jawne ograniczenia

- Wszystkie nowe produkty są dydaktyczne, bez numerów producenta i bez twierdzenia o zweryfikowaniu SKU. Zachowano stare produkty i rewizje. Oprawy nie są automatycznie zamieniane na kontrolki.
- Kontrolka ma L/N, bez PE. Umowny pobór **0,6 W** jest rezystancyjnym odpowiednikiem solvera, a nie parametrem producenta. Próg świecenia: 80% napięcia znamionowego. Brak modelu półprzewodników i jasności.
- Oprawa 40 W jest rezystancyjna; osłona i owalny kształt ilustrują zdjęcie. Brak charakterystyki zimnego żarnika, temperatury, IP i certyfikacji.
- Geometria obudów i korytek jest umowna. Pozycje zachowują relacje planu, **nie skalę 1:1** ani kompletny wymiarowany rysunek wykonawczy. Rozdzielnica mieści istniejące korpusy bez ich rozciągania; 8M opisuje stanowisko referencyjne, nie zweryfikowany produkt obudowy.
- Złączka dwuwejściowa ma umownie do dwóch żył na wejście, 0,5–2,5 mm²; złączka trójwejściowa po jednej. Nie jest to deklaracja parametrów WAGO. Wewnętrzne mostki stosują istniejący model oporu styku 5 mΩ.
- Długości elektryczne żył (0,3–1,6 m) są oszacowaniem dydaktycznym z zapasem na zakończenia, a nie pomiarem rzeczywistego stanowiska ani wynikiem przeliczania współrzędnych ekranu. Można je zmienić w inspektorze.
- Korytka nie obliczają wypełnienia, promieni gięcia ani sposobu ułożenia; przypisanie żył jest metadanymi fizycznymi. Automatyczny router omija korpusy, ale bardzo ciasne albo błędne ręczne trasy mogą wymagać korekty punktów.
- Brak rozszerzenia oceny całej kwalifikacji ani nowej deklaracji pełnego pokrycia egzaminu. Ten JSON jest poprawnie zmontowanym przykładem stanowiska, nie oficjalnym rozwiązaniem CKE.
- Biblioteka nadal działa lokalnie w IndexedDB. Eksport ukrytych usterek/odpowiedzi stosuje dotychczasową ochronę treningów.

## Ręczna weryfikacja

1. Zaimportuj do folderu; zobacz PZ/R, dwie puszki i sześć tras zamiast kilkunastu listew.
2. Włącz zasilanie: H1/H2 świecą, OP1/OP2 pracują jednocześnie. Przełącz Q1/Q2 we wszystkich czterech kombinacjach; gniazdo nadal ma napięcie.
3. Wyłącz B10: H1 i gniazdo są odłączone, oświetlenie pracuje. Ponownie włącz B10 i wyłącz B6: H2 i oprawy gasną, gniazdo pozostaje zasilone. TEST RCD odłącza oba obwody.
4. Odłącz zasilanie, otwórz pokrywy, zmierz ciągłość: PZ.PE→R.PE, R.PE→GW.PE, R.PE→OP1.PE, R.PE→OP2.PE.
5. Przesuń puszkę za oznaczenie nad korpusem; przewody zachowują końce. Wyjmij i włóż złączkę przez panel.
6. Poczekaj na „Zapisano lokalnie”, odśwież. Sprawdź folder, położenia i historię pomiarów. Zasilanie ma pozostać wyłączone.
7. Wyeksportuj projekt, importuj jako nowy; porównaj rozmieszczenie i niezależność identyfikatora projektu.

Wyniki wykonanych kontroli i porównanie zrzutów: [PHYSICAL_ELE02_101_QA.md](PHYSICAL_ELE02_101_QA.md).

# Tablica jako główny obszar pracy

Stan sprawdzony 3 października 2026 w Chrome 150 na macOS. Uruchomiona lokalnie aplikacja: http://127.0.0.1:5173.

Przy 1366 × 768 px powierzchnia tablicy wzrosła z 824 × 403 do **1146 × 555 px**, czyli o około **92%**. Domyślnie właściwości są schowane. Katalog pozostaje widoczny na większych ekranach; poniżej 1280 px oba panele otwierają się nad tablicą i mają osobne przyciski zamknięcia. Ustawienia widoczności paneli i dziennika są zapamiętywane.

| Okno                        | Powierzchnia tablicy | Udział w oknie |
| --------------------------- | -------------------- | -------------- |
| 1366 × 768, poprzedni układ | 824 × 403            | 31,7%          |
| 1366 × 768, nowy układ      | 1146 × 555           | 60,6%          |
| 1366 × 768, skupienie       | 1366 × 724           | 94,3%          |
| 1920 × 1080                 | 1700 × 867           | 71,1%          |
| 1024 × 768                  | 1024 × 555           | 72,3%          |
| 390 × 844                   | 390 × 663            | 78,6%          |
| 844 × 390                   | 844 × 211            | 54,1%          |

Nagłówek, narzędzia i dziennik są niższe. Parametry przewodów otwierają się na żądanie lub podczas łączenia zacisków. **F** włącza skupienie, **Esc** przywraca zwykły widok. Otwarcie katalogu lub właściwości z widoku skupienia od razu pokazuje wybrany panel. Otwarcie i zamknięcie panelu zachowuje powiększenie. Na telefonie widok startuje od 65%; na bardzo niskim ekranie od 50%, z możliwością przesuwania tła. „Dopasuj widok” pokazuje pełną tablicę.

## Montaż i prowadzenie przewodów

Aparaty przenosi się bezpośrednio za korpus, bez dodatkowych uchwytów. Dźwignie i zaciski pozostają osobnymi celami kliknięcia. Przenoszenie działa podczas symulacji. Aparaty DIN są przyciągane do najbliższej szyny, miejsce zajęte przez inny aparat jest odrzucane. Pojawia się podświetlenie szyny podczas przeciągania.

„+ Szyna DIN” dodaje kolejny rząd. Zaznaczenie aparatu otwiera menu „Przenieś na szynę…”. Dodatkowe szyny i trasy są częścią zapisanego układu, działają po ponownym otwarciu i podlegają cofaniu. Starsze pliki bez pola `physical.rails` zachowują swoje położenia i otrzymują odtworzone szyny. Położenie, szyna i trasa nie zmieniają modelu obwodu, długości elektrycznej żył ani rewizji elektrycznej. Zapisy kolejnych zmian układu nie są oznaczane jako zakończone przez odpowiedź dotyczącą wcześniejszego zapisu.

Automatyczny przewód wychodzi prosto z zacisku i skręca poza obudową, z małym promieniem zagięcia. Routing uwzględnia obudowy wszystkich aparatów oraz bieżące położenie przesuwanego elementu. Sąsiednie zaciski mają oddzielne odcinki wyjściowe, także gdy żyły biegną do różnych aparatów. Kolejność rekordów przewodów w dokumencie nie wpływa na wybrane odstępy. Zniknęły zbędne nawroty generowane wcześniej przez punkty umieszczone zbyt blisko zacisków.

Obrys oddziela skrzyżowania. Zaznaczenie eksponuje jeden przewód, podświetla końce i pokazuje dokładne identyfikatory zacisków. „Edytuj trasę” pozwala dodawać punkty kliknięciem tła, przesuwać je i usuwać dwuklikiem. Przycisk przywracania trasy usuwa ręczne punkty. Ręcznie ustawione punkty pozostają częścią dokumentu; przy większej liczbie przewodów może być potrzebna korekta tras. Szukanie prostych tras i pamięć ostatniej geometrii ograniczają koszt rysowania. Przeniesienie dowolnego aparatu lub zmiana punktu ręcznego unieważnia zapamiętaną geometrię.

Sprawdzenie SVG objęło 58 przewodów w czterech przykładach: oświetlenie, rozdzielnica, trzy fazy oraz sterowanie DC. Nie znaleziono przejść przez obudowy poza prostym wejściem do własnego zacisku ani oderwanych końców. Dodatkowo test Chrome sprawdza te warunki po przesunięciu pracującego silnika. Próba 100 aparatów / 300 żył zaimportowała i narysowała projekt w około 2,49 s, następnie uruchomiła odbiornik bez błędów przeglądarki. To pomiar tego komputera, a nie nowy pełny benchmark klatek.

Dowody routingu: [silnik i listwy](qa/routing-motor-after.png), [oświetlenie](qa/routing-lamp-after.png), [rozdzielnica](qa/routing-distribution-after.png), [DC](qa/routing-dc-after.png), [geometria SVG](qa/routing-metrics.json), [próba dużej sceny](qa/routing-performance.json). Ponowienie kontroli: `pnpm exec tsx scripts/routing-qa.ts` przy działającym serwerze.

## Różnicówka

RCD i RCBO mają ruchomą dźwignię ON/OFF z położeniem środkowym po wyzwoleniu oraz osobny przycisk TEST. TEST zadziała przy załączonych stykach i zasilaniu AC L–N, zgasi odbiornik i zapisze przyczynę w dzienniku. Po wyzwoleniu pierwsze kliknięcie dźwigni ustawia OFF i resetuje aparat, kolejne załącza ON. Oba elementy działają myszą, dotykiem i klawiaturą; obsługa nie przesuwa obudowy ani nie rozpoczyna przewodu.

Dydaktyczny model 2P akceptuje dowolną orientację każdego toru L/N, także układ z L i N podłączonymi z przeciwnych stron. Upływ do PE i ominięcie toru neutralnego nadal powodują wyzwolenie. To uproszczenie zostało opisane w [zakresie silnika](SIMULATION_SCOPE.md). Miernik RCD również działa przy odwróconym podłączeniu.

Podglądy: [ON](qa/rcd-on.png), [wyzwolenie po TEST](qa/rcd-tripped.png), [OFF](qa/rcd-off.png), [tablica](qa/rcd-board.png).

## Odbiorniki i sprawdzenie

Lampa emituje ciepłe światło i poświatę, wentylator obraca łopatki, grzałka żarzy się i pokazuje unoszące się ciepło, a silnik ma większy ruchomy wirnik z oznaczeniem kierunku. Stan pracy widać bezpośrednio na urządzeniu; duże plakietki zostały usunięte. Światło i ruch wynikają ze stanu solvera i wyłączają się po rozłączeniu łącznika, zabezpieczenia albo zasilania. W schemacie pozostaje „PRACA / OFF”. Animacja respektuje preferencję ograniczonego ruchu. Kontrolki nie wyświetlają domyślnej obwódki przeglądarki po kliknięciu; nadal działają z klawiatury.

„Przykłady → Wentylator i łącznik” pozwala od razu sprawdzić ruch i zatrzymanie łopatek. Wentylator jest osobnym elementem dydaktycznym w katalogu. [Galeria SVG](qa/gallery.html) pokazuje cztery odbiorniki w stanie wyłączonym i podczas pracy; zawiera te same animacje co tablica. Eksport SVG zachowuje poświatę i nieruchomą klatkę wirnika.

- 104 testy jednostkowe: obwody, import, zgodność starych projektów, szyny, trasy, brak nawrotów i przejść przez obudowy we wszystkich 13 wzorcach, niezależność tras od kolejności rekordów, punkty ręczne, unieważnianie geometrii po ruchu aparatu i niezależność wyniku symulacji od montażu.
- 17 testów Chrome (dwie próby ponowione na finalnym kodzie): geometria przewodów po przesunięciu pracującego silnika, rzeczywista zmiana kąta łopatek, stała oś obrotu przy powiększeniu, zatrzymanie po rozłączeniu, światło i żar, ograniczenie ruchu, ruch aparatu i RCD podczas pracy, trzecia szyna, kolizje, cofanie, zapis/odczyt, edycja trasy, skupienie, wąskie i niskie ekrany, prawdziwe zdarzenia dotykowe, pomiary, diagnoza i eksport.
- ESLint, TypeScript i build produkcyjny przechodzą. Build nadal zgłasza wcześniejsze ostrzeżenie o wielkości głównego pakietu JS.
- Kontrola wizualna obejmuje 1366, 1920, 1024 i 390 px oraz niski widok poziomy. Nie występuje poziome przewijanie całej strony. Sprawdzono pracę lampy, wentylatora, grzałki i silnika oraz ograniczenie animacji.

Dowody: [metryki](qa/ux-metrics.json), [tablica podczas pracy](qa/ux-lamp-working.png), [wentylator](qa/ux-fan-working.png), [skupienie](qa/ux-focus.png), [trzecia szyna](qa/ux-third-rail.png), [trasa przewodu](qa/ux-wire-route.png), [telefon](qa/ux-390x844.png), [niski ekran](qa/ux-844x390.png), [silnik](qa/ux-motor-working.png). Ponowienie kontroli wizualnej: `pnpm exec tsx scripts/ux-qa.ts` przy działającym `pnpm dev`.

Zmiany dotyczą ergonomii i reprezentacji stanu; zakres modeli elektrycznych oraz weryfikacji katalogu pozostaje opisany w README i dokumentacji symulacji.

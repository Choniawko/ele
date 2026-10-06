# Przegląd wyglądu i gestów

macOS 12.7.6 Intel, Chrome 150.0.7871.125. Obrazy pochodzą z działającej aplikacji.

| Artefakt w `qa/` | Sprawdzenie |
|---|---|
| `lamp-1366.png`, `lamp-1920.png` | Powłoka, katalog, montaż i zaciski |
| `measurement-1920.png` | Sondy i wynik solvera |
| `motor-1366.png`, `motor-1920.png` | Większy układ, termik, START/STOP, trzy fazy |
| `schematic-1920.png`, `schematic.svg`, `svg-standalone.png` | Symbole, identyfikatory i samodzielny eksport poza aplikacją |
| `split-1366.png`, `tablet-768.png` | Dwa widoki, dostępność paneli |
| `gallery.png`, `gallery.html` | Aktualizacja 2026-10-05: 33 dostępne elementy; lampa, grzałka, wentylator i silnik wyłączone oraz podczas pracy |
| `ux-lamp-working.png`, `ux-heater-working.png`, `ux-fan-working.png`, `ux-motor-working.png` | Efekty pracy odbiorników na tablicy |
| `report.pdf` | Dwustronicowy wydruk szkoleniowy |
| `benchmark-1920.png` | 100 aparatów / 300 żył |

Rodziny autorskie: Hager, zasilacz, łącznik, przycisk, stycznik/termik, przekaźnik z podstawą, czasówka, listwa, źródło, lampa, grzałka, gniazdo, wentylator, silnik. Hager/HDR porównano ze źródłami z DEVICE_DATA_POLICY; LC1D09P7 i XB5AA35 zweryfikowano w etapie opisanym poniżej. Pozostałe są jawnie dydaktyczne. WAGO i markowe zestawy Finder/Relpol nie mają wydanych rendererów; nie zastąpiono ich wspólną ikoną pod nazwami gotowych SKU.

Poprawiono kolizje we wzorcach, odstępy schematu, nakładanie hit-test gęstych zacisków, narzędzia przykrywające porty, brak tła/transformacji w SVG, hover zasilania i zapis oceny ćwiczenia. PE ma zieloną bazę i żółty pasek. Wkręt, port i identyfikator zacisku mają osobne funkcje.

Gęste zaciski wymagają zoomu lub listy inspektora. Klawiatura obsługuje porty i chwilowe przyciski. Duże schematy wymagają ręcznej korekty tras; rozwinięcie jest uproszczone. Pełny audyt WCAG i drugi silnik pozostają otwarte. Playwright 1.63 zgłosił brak obsługi Firefox na macOS 12.

Odtworzenie: `pnpm exec tsx scripts/visual-qa.ts` i `pnpm exec tsx scripts/gallery.tsx`. Metryki odnoszą się do tego komputera. Browser-benchmark oddziela reakcję prostego obwodu, import 100/300 i odstępy klatek; nie stanowi gwarancji płynności.

## Etap 1 ELE.02 / ELE.05 — 2026-10-05

Galeria pokazuje teraz 33 dostępne elementy (4 SKU i 29 profili dydaktycznych). LC1D09P7 porównano z kartą, rysunkiem i zdjęciem producenta; XB5AA35 z kartą oraz zdjęciami frontu i tyłu. Zaciski przycisku pokazują nadruk bloku obok pełnego numeru ISO. Źródła i ograniczenia: [device-verification-stage-one.md](device-verification-stage-one.md).

Zrzuty `qa/exam-bistable.png`, `qa/exam-start-stop.png`, `qa/exam-reversing.png` powstają z testów Chrome. Widoczne metalowe mostki silnika są obiektami obwodu; przewody i mostki nie blokują kliknięcia sondy na zacisku. Zaznaczony przewód jest pod warstwą portów. Nowe stanowiska mają jawne szyny oddalone o 350 px, zapewniające wyjścia przewodów pod silnikiem; wcześniejsze układy zachowują swoje położenia.

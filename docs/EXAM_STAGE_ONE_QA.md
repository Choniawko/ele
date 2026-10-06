# Odbiór etapu ćwiczeń ELE.02/ELE.05 — 2026-10-05

Branch: `feat/exam-practice-stage-one`. Środowisko: macOS 12.7.6 Intel, Node 24.18.0, pnpm 11.19.0, zainstalowany Chrome. Pracowano w obecnej architekturze; nie znaleziono AGENTS.md w repozytorium ani katalogach nadrzędnych. Źródła arkuszy i zakres: [exam-coverage.md](exam-coverage.md). Weryfikacja SKU i ograniczenia: [device-verification-stage-one.md](device-verification-stage-one.md).

## Kontrole

| Polecenie | Wynik |
|---|---|
| `pnpm typecheck` | OK |
| `pnpm lint` | OK, Oxlint + ESLint |
| `pnpm test` | 171/171 |
| `pnpm catalog:validate` | OK: 32 rzeczywiste SKU, 4 opublikowane, 28 oczekujących; 29 dydaktycznych, 28 wariantów stanowisk |
| `pnpm build` | OK; ostrzeżenie Vite o głównym bundle przekraczającym 500 kB (około 1,19 MB, 352 kB gzip) |
| `pnpm test:e2e` | 28/28, Chrome |
| `pnpm test:e2e:production` | 8/8, Chrome, preview na porcie 4173, bez hooków Vite |

Pełne 28 testów przeglądarkowych przeszło przed ostatnią poprawką oceny rozłącznika 2P, przycisku wielostykowego jako STOP i identyfikacji N/PE według dróg obwodu. Po niej ponowiono 171 testów, typecheck, lint, katalog, build i osiem testów produkcyjnych. Nie uruchamiać obu zestawów Playwright równocześnie: korzystają ze wspólnych katalogów wyników.

Nowe testy jednostkowe obejmują wszystkie trzy poprawne zestawy, puste stanowiska, dziewięć wariantów ukrytych usterek, wymagane pomiary, ochronę eksportu, Y/Δ i napięcia, kierunki, zwarcie A1–A2, brak podtrzymania i blokady, przerwę PE/mostka, przerwaną cewkę oraz sklejony wybrany NO/NC. Równoważność sprawdzono przez zmianę oznaczeń i kolejności aparatów, odwrócenie końców przewodów, dodanie rozłącznika 2P, STOP wykorzystujący NC przycisku wielostykowego oraz przewody zamiast mostków gwiazdy. Zamiana L z N oraz PE do N nie zaliczają, choć odbiornik może pracować.

Pięć nowych testów UI sprawdza rzeczywiste operacje: przyciski i światło, RCD TEST, trzy pomiary PE i pełną ocenę; podtrzymanie, STOP, lampkę, rotor, mostki oraz autosave/odświeżenie; kierunki i blokadę; puste stanowisko z przypisaniem bloku, mostkami i dodaniem przewodu; ukrytą przerwę PE, hipotezę, naprawę, retest oraz eksport bez odpowiedzi. Trzy pozostałe testy produkcyjne chronią wspólną walidację i odzyskiwanie niepoprawnych zapisów.

## Próba ręczna

1. Uruchom `pnpm build`, następnie `pnpm preview`; otwórz lokalny adres wypisany przez Vite. W **Ćwiczeniach** wybierz tryb **Wzorzec** i „Bistabilny i gniazdo”. Włącz zasilanie, przytrzymaj i puść S1, następnie S2 (co najmniej 150 ms). Lampa zmienia stan, gniazdo pozostaje pod napięciem. TEST FI1 wyzwala aparat. Wyłącz zasilanie, zmierz i zapisz G1:PE–XPE1:1, XPE1–H1:PE i XPE1–X1:PE. **Sprawdź** pokazuje siedem kryteriów; rozwiń ocenę.
2. Otwórz wzorzec START/STOP. START S1 uruchamia M1 i H1; po puszczeniu praca trwa, STOP S0 wyłącza. Po zaniku i powrocie zasilania nie ma samorozruchu. Odśwież: połączenia, przypisanie KA1 i dwa mostki pozostają, zasilanie jest wyłączone. Zmierz PE źródło–listwa/listwa–M1/listwa–H1 oraz kolejność faz pracującego M1. Ocena wymaga wszystkich siedmiu kryteriów.
3. Otwórz prawo/lewo. S1 daje 123; S2 podczas pracy nie przełącza. STOP, następnie S2 daje 132 i H2 zamiast H1. W inspektorze K1 zobacz osobną blokadę mechaniczną, w KA1/KA2 — przypisanie mechanizmu. Rozwiń wymagania: NC przeciwnego bloku są rzeczywistymi przewodami, a nie samą opcją mechaniki.
4. Wybierz **Montaż** dla START/STOP. Nie ma przewodów ani mostków. Tryb Budowa jest aktywny. Przypisz KA1 do K1, wybierz mostki gwiazdy w inspektorze M1 i wykonaj połączenia według rozwijanej instrukcji. Kliknięcia zacisków tworzą przewody. Sama zmiana opcji mostków nie uruchamia silnika bez torów mocy i sterowania. Po każdej zmianie elektrycznej powtórz pomiary bieżącej rewizji.
5. Wybierz **Diagnoza** i wariant 1/2/3 bez publicznego opisu przyczyny. Zbadaj układ i zapisz pomiar dotyczący podejrzanego elementu. Dla cewki porównaj dostępne napięcie A1–A2 i OL bez zasilania; dla sklejonego NC porównaj spadek napięcia przy załączonym mechanizmie. Zapisz hipotezę, zaznacz właściwy aparat/przewód i użyj naprawy. Ponów PE, kolejność faz dla silnika i próby pracy. Eksport JSON nie zawiera ukrytej przyczyny ani sesji treningowej. Nie wystarcza pomiar dowolnego sprawnego PE przed naprawą.
6. W **Budowie / sandboxie** można zewrzeć A1–A2 lub usunąć podtrzymanie/blokadę. Obserwuj prąd, wyzwolenie B6 lub zabezpieczenia mocy i ocenę. Przerwa PE nie musi zatrzymać silnika; ujawniają ją pomiar OL i kryterium PE. Wybierając usterkę sklejonego styku, wskaż konkretną parę zacisków.

## Ograniczenia odbioru

To odbiór funkcji oprogramowania i odwzorowania topologii/wyglądu wybranych SKU; nie badanie sprzętu. Nie potwierdza pełnego zaliczenia arkusza ani kwalifikacji, jakości montażu, BHP i normatywnego odbioru. Silnik, ochrona i metrologia zachowują jawne uproszczenia opisane w SIMULATION_SCOPE i MEASUREMENT_PROFILES. Nieznanej rezystancji DC realnej cewki nie zastępuje liczba obliczona z VA. Firefox Playwright w tym środowisku nie wspiera macOS 12; zweryfikowano Chrome. Nie ponawiano historycznego benchmarku 100 aparatów / 300 żył ani pełnego audytu dostępności.

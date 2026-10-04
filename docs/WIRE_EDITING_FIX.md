# Blokada rozpoczynania przewodu — 2026-10-03

## Odtworzenie

Potwierdzona ścieżka w Chrome na lokalnym przykładzie „Lampa i łącznik”:

1. Usuń S1 i cofnij usunięcie.
2. Rozpocznij przewód z S1:1; opcjonalnie dodaj punkt trasy.
3. Użyj „Ponów”, usuwając S1 ponownie.
4. Kliknij zacisk innego aparatu, np. G1:L.

Przed poprawką `redo()` odtwarzało projekt bez czyszczenia `wireStart`. Punkt startowy nadal wskazywał nieistniejący S1. `terminalClick()` zakładało istnienie obu aparatów i kończyło się `TypeError: Cannot read properties of undefined (reading 'productId')`. Kolejne próby pozostawiały ten sam nieaktualny stan. Odświeżenie usuwało roboczy punkt startowy, dlatego przywracało działanie.

To jedna potwierdzona przyczyna zgłoszonego objawu. Osobna próba 25 cykli usuwania i ponownego dodawania przewodów z cofaniem/ponawianiem, bez usuwania aparatu startowego, przeszła bez błędu. Nie stwierdzono w tej próbie awarii routingu ani blokady JointJS. Wpisanie „h” w wyszukiwarkę również nie przełączało tablicy w przesuwanie.

## Poprawka

- „Cofnij” i „Ponów” anulują roboczy przewód, jego punkty trasy oraz rozpoczęte dodawanie aparatu.
- Usunięcie elementu czyści nieaktualny punkt startowy w tej samej zmianie stanu co projekt.
- Klikany zacisk i poprzedni punkt startowy są sprawdzane przed użyciem. Nieaktualny początek jest zastępowany nowym, prawidłowym zaciskiem; spóźnione kliknięcie usuniętego zacisku jest odrzucane bez wyjątku.
- Usuwanie, otwieranie projektu, zmiana trybu i rozpoczęcie dodawania aparatu czyszczą pozostałe punkty roboczej trasy. Zapisane przewody i ich trasy pozostają w dokumencie.

## Weryfikacja

`tests/e2e/wire-editing.spec.ts` sprawdza usunięcie aparatu przez „Ponów” podczas prowadzenia przewodu, nieaktualny punkt startowy, spóźnione zdarzenia oraz 12 cykli kasowania, przepinania, punktów ręcznych i historii. Dwa pierwsze testy kończą się załączeniem lampy, bez odświeżania strony. Testy przerywa każdy nieobsłużony błąd przeglądarki.

Ponowienie: `pnpm exec playwright test tests/e2e/wire-editing.spec.ts`.

Przeszły 3/3 nowe testy Chrome, 104 testy jednostkowe, ESLint i produkcyjny build. Dodatkowo sprawdzono istniejące testy łączenia od pustego projektu oraz edycji ręcznej trasy z cofaniem.

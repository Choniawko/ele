# Etap 02 — Zadanie 105: pierwszy nowy kompletny układ

## Prompt do użycia w Codexie

Wdróż ten etap w aktualnym repo Choniawko/ele. Zacznij od WYMAGANIA_WSPOLNE.md, KONTRAKTY_DANYCH.md oraz istniejącego docs/ele-exams/implementation-state.json. Wykonaj najbliższą niewykonaną jednostkę ze spełnionymi zależnościami i zweryfikuj ją; nie zakończ na samym opisie. Nie cofaj już wykonanych części. W razie braku czasu zapisz checkpoint po działającej jednostce, a nie pusty placeholder.

Zależności etapu: 01. Jednostki sesji: 02a. Ich stan implemented/tested/released zapisuj osobno. Zależność od 03/08/09 oznacza wymagane sprawdzone profile z 03a/08a/09a, nie blokadę przez niezależne zadanie tamtego etapu; odbiór końcowy 14 wymaga wszystkich pełnych bramek. Model aparatu może zostać zakończoną jednostką, lecz cały własny etap wymaga także gotowych układów i wiedzy. Publiczny przycisk otwiera tylko faktycznie zweryfikowany wariant.

## Funkcja dostępna po odbiorze etapu

Gotowy układ z trzema miejscami sterowania, czytelnymi puszkami i lekcją korespondencji.

## Zakres wykonania

1. Użyj dwóch schodowych i jednego krzyżowego oraz dwóch równoległych opraw. Aparaty funkcjonalne już istnieją; uzupełnij właściwą mechanikę i złączki, jeśli bieżące profile nie wystarczają.
2. Umieść każdy elektrycznie niezależny węzeł w osobnej złączce. Puszka sama nie łączy przewodów, przecięcie tras nie tworzy węzła.
3. Zachowaj B6 z zadania i odrębny opis ochrony stanowiska. Nie dopisuj RCD do źródłowego rysunku jako rzekomo obecnego elementu.
4. Dodaj lekcję COM, dwóch żył korespondencyjnych i dwóch pozycji krzyżowego; powiąż symbole z właściwymi zaciskami.

## Materiał zadaniowy

- [Kontrakt zadania 105](../zadania/ELE02_105.md).

Odczytaj w materialy/data/ele02-tasks.json odpowiednie taskId, BOM, materiały, readingSteps, acceptanceChecks i rysunki. W source-issues.json sprawdź otwarte kwestie, a w component-catalog-map.json wszystkie komponenty, również partial-adaptation. Dane katalogu porównaj z obecnym kodem, nie traktuj snapshotu jako instalacji nowych modeli.

## Wiedza i UX w tym etapie

Każdy dodany model otrzymuje rozbudowany DeviceProfile: działanie, symbol, zaciski, stan odniesienia, nastawy, tabela stanów, próby i ograniczenia. Każdy układ otrzymuje własną lekcję torów mocy/sterowania/N/PE i kontekstowe odnośniki. Artykuł prowadzi do wzorca, wzorzec do konkretnego fragmentu teorii. Użyj wymagań wspólnych dla powrotu, kamery, klawiatury i widoku mobilnego; dokument wiedzy nie może sterować cewką wbrew solverowi.

## Próby specyficzne

- Tablica prawdy wszystkich 8 kombinacji i każda zmiana jednego łącznika.
- Obie oprawy zawsze zgodne, B6 OFF wyłącza obie, drogi PE ciągłe.
- Ruch puszki, otwieranie pokrywy, edycja jednej korespondencji i undo aktualizują widoki bez zmiany ukrytej kopii obwodu.

Dodaj wszystkie source check IDs przypisane temu etapowi z data/qa-source-checks.json i odpowiednie R1–R10 z BA_UX_QA_odbior.md. Rozdziel automatyczne zachowanie, ręczny odbiór obrazu oraz elementy fizyczne unsupported. Nie zapisuj prób jako passed bez uruchomienia i dowodu.

## Kryterium końca sesji i raport

Zakończ konkretną jednostkę działającym kodem i testami albo zapisz precyzyjną blokadę źródłową. W docs/ele-exams/QA_02.md zapisz commit, zmienione modele/taskId, źródła, wyniki komend i dowody UX. Zaktualizuj rejestr postępu. Podaj użytkownikowi: co działa, co wymaga danych, jak odtworzyć oraz dokładną następną jednostkę. Przy pełnym odbiorze etapu przygotuj część do standardowego wydania zgodnie z repo; nie utożsamiaj przygotowania z publikacją Pages.

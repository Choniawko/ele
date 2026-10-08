# Etap 10 — Zadanie 109: silnik kondensatorowy

## Prompt do użycia w Codexie

Wdróż ten etap w aktualnym repo Choniawko/ele. Zacznij od WYMAGANIA_WSPOLNE.md, KONTRAKTY_DANYCH.md oraz istniejącego docs/ele-exams/implementation-state.json. Wykonaj najbliższą niewykonaną jednostkę ze spełnionymi zależnościami i zweryfikuj ją; nie zakończ na samym opisie. Nie cofaj już wykonanych części. W razie braku czasu zapisz checkpoint po działającej jednostce, a nie pusty placeholder.

Zależności etapu: 01, 03. Jednostki sesji: 10a, 10b. Ich stan implemented/tested/released zapisuj osobno. Zależność od 03/08/09 oznacza wymagane sprawdzone profile z 03a/08a/09a, nie blokadę przez niezależne zadanie tamtego etapu; odbiór końcowy 14 wymaga wszystkich pełnych bramek. Model aparatu może zostać zakończoną jednostką, lecz cały własny etap wymaga także gotowych układów i wiedzy. Publiczny przycisk otwiera tylko faktycznie zweryfikowany wariant.

## Funkcja dostępna po odbiorze etapu

Gotowy układ silnika jednofazowego z jawną mapą uzwojeń i osobnym wariantem kierunku.

## Zakres wykonania

1. 10a: profil silnika jednofazowego z uzwojeniem U/Z i kondensatorem, C 1P oraz przycisk NO+NC utrzymujący pozycję. 10b: 109.
2. Dobierz konkretną instrukcję silnika i kondensatora. Zapisz źródło napięcia, mocy, prądu, rezystancji lub ich nieznanego statusu. Brak dokumentu blokuje twierdzenie o odwzorowaniu 1:1.
3. Stycznik 3NO wykorzystuje w zadaniu dwa tory L/N. S1 utrzymuje pozycję, H2 jest przed S1 i może świecić przy nieruchomym motorze.
4. Zmiana kierunku to zmiana względnego połączenia uzwojenia pomocniczego według instrukcji. Zamiana L i N nie jest rozwiązaniem.
5. Przygotuj kompletny wariant podstawowy oraz kopię kierunku przeciwnego z udokumentowanymi mostkami. Nie zapisuj fikcyjnej mapy śrub na podstawie samego symbolu M1.

## Materiał zadaniowy

- [Kontrakt zadania 109](../zadania/ELE02_109.md).

Odczytaj w materialy/data/ele02-tasks.json odpowiednie taskId, BOM, materiały, readingSteps, acceptanceChecks i rysunki. W source-issues.json sprawdź otwarte kwestie, a w component-catalog-map.json wszystkie komponenty, również partial-adaptation. Dane katalogu porównaj z obecnym kodem, nie traktuj snapshotu jako instalacji nowych modeli.

## Wiedza i UX w tym etapie

Każdy dodany model otrzymuje rozbudowany DeviceProfile: działanie, symbol, zaciski, stan odniesienia, nastawy, tabela stanów, próby i ograniczenia. Każdy układ otrzymuje własną lekcję torów mocy/sterowania/N/PE i kontekstowe odnośniki. Artykuł prowadzi do wzorca, wzorzec do konkretnego fragmentu teorii. Użyj wymagań wspólnych dla powrotu, kamery, klawiatury i widoku mobilnego; dokument wiedzy nie może sterować cewką wbrew solverowi.

## Próby specyficzne

- S1 ON/OFF, dwa tory główne stycznika i obie gałęzie zabezpieczenia.
- U1–U2 oraz Z1–Z2 dają wyniki z wybranego profilu, nie wspólną stałą bez dowodu.
- Izolacja U–PE, Z–PE, U–Z i odłączony kondensator zgodnie z instrukcją; prawidłowa klasyfikacja unsupported.
- Zmiana kierunku według instrukcji; wariant z samą zamianą L/N nie zalicza tej próby.

Dodaj wszystkie source check IDs przypisane temu etapowi z data/qa-source-checks.json i odpowiednie R1–R10 z BA_UX_QA_odbior.md. Rozdziel automatyczne zachowanie, ręczny odbiór obrazu oraz elementy fizyczne unsupported. Nie zapisuj prób jako passed bez uruchomienia i dowodu.

## Kryterium końca sesji i raport

Zakończ konkretną jednostkę działającym kodem i testami albo zapisz precyzyjną blokadę źródłową. W docs/ele-exams/QA_10.md zapisz commit, zmienione modele/taskId, źródła, wyniki komend i dowody UX. Zaktualizuj rejestr postępu. Podaj użytkownikowi: co działa, co wymaga danych, jak odtworzyć oraz dokładną następną jednostkę. Przy pełnym odbiorze etapu przygotuj część do standardowego wydania zgodnie z repo; nie utożsamiaj przygotowania z publikacją Pages.

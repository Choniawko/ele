# Etap 05 — Bistabilny z czasem: 106/107

## Prompt do użycia w Codexie

Wdróż ten etap w aktualnym repo Choniawko/ele. Zacznij od WYMAGANIA_WSPOLNE.md, KONTRAKTY_DANYCH.md oraz istniejącego docs/ele-exams/implementation-state.json. Wykonaj najbliższą niewykonaną jednostkę ze spełnionymi zależnościami i zweryfikuj ją; nie zakończ na samym opisie. Nie cofaj już wykonanych części. W razie braku czasu zapisz checkpoint po działającej jednostce, a nie pusty placeholder.

Zależności etapu: 01, 03. Jednostki sesji: 05a, 05b, 05c. Ich stan implemented/tested/released zapisuj osobno. Zależność od 03/08/09 oznacza wymagane sprawdzone profile z 03a/08a/09a, nie blokadę przez niezależne zadanie tamtego etapu; odbiór końcowy 14 wymaga wszystkich pełnych bramek. Model aparatu może zostać zakończoną jednostką, lecz cały własny etap wymaga także gotowych układów i wiedzy. Publiczny przycisk otwiera tylko faktycznie zweryfikowany wariant.

## Funkcja dostępna po odbiorze etapu

Dwa układy z nowym zachowaniem BIS-413 i rzeczywistą obsługą przytrzymania.

## Zakres wykonania

1. 05a: nowy profil BIS-413 230 V według E220128. 05b: 106. 05c: 107 wraz z jawnym wyborem modelu z czasem.
2. BIS-413 jest nowym modelem; edu-bistable BIS-411 i istniejące exam-bistable zachowują dotychczasowe znaczenie.
3. Wersja źródła: 1=N, 3=L, 6=impuls, 10=NC, 11=COM, 12=NO. Testuj krótki impuls, czas, długi impuls i utratę zasilania zgodnie z pełną instrukcją.
4. 107: źródłowy Ł ma COM=2, a model changeover COM. Mapuj jawnie 2↔COM; P2 działa zawsze, P1 zależnie od pozycji Ł.
5. Czas demo w 107 oznacz jako przyjęty parametr, bo źródło nie ustala nastawy. Zmiana Ł bez impulsu nie może sztucznie przełączać BIS.

## Materiał zadaniowy

- [Kontrakt zadania 106](../zadania/ELE02_106.md).
- [Kontrakt zadania 107](../zadania/ELE02_107.md).

Odczytaj w materialy/data/ele02-tasks.json odpowiednie taskId, BOM, materiały, readingSteps, acceptanceChecks i rysunki. W source-issues.json sprawdź otwarte kwestie, a w component-catalog-map.json wszystkie komponenty, również partial-adaptation. Dane katalogu porównaj z obecnym kodem, nie traktuj snapshotu jako instalacji nowych modeli.

## Wiedza i UX w tym etapie

Każdy dodany model otrzymuje rozbudowany DeviceProfile: działanie, symbol, zaciski, stan odniesienia, nastawy, tabela stanów, próby i ograniczenia. Każdy układ otrzymuje własną lekcję torów mocy/sterowania/N/PE i kontekstowe odnośniki. Artykuł prowadzi do wzorca, wzorzec do konkretnego fragmentu teorii. Użyj wymagań wspólnych dla powrotu, kamery, klawiatury i widoku mobilnego; dokument wiedzy nie może sterować cewką wbrew solverowi.

## Próby specyficzne

- Impuls z każdego przycisku, oba naraz, trzymany wejściowy sygnał: bez przełączenia co klatkę.
- Granice krótkiego/długiego naciśnięcia i końca czasu; przerwane zasilanie odcina funkcję.
- 107: oba położenia Ł × oba przyciski × wyjście BIS; L1/OO razem, L2/L3 zgodnie z trybem.
- Pointerup poza przyciskiem, pointercancel i obsługa klawiatury kończą żądanie; zmiana trybu nie zostawia wciśniętego klawisza.

Dodaj wszystkie source check IDs przypisane temu etapowi z data/qa-source-checks.json i odpowiednie R1–R10 z BA_UX_QA_odbior.md. Rozdziel automatyczne zachowanie, ręczny odbiór obrazu oraz elementy fizyczne unsupported. Nie zapisuj prób jako passed bez uruchomienia i dowodu.

## Kryterium końca sesji i raport

Zakończ konkretną jednostkę działającym kodem i testami albo zapisz precyzyjną blokadę źródłową. W docs/ele-exams/QA_05.md zapisz commit, zmienione modele/taskId, źródła, wyniki komend i dowody UX. Zaktualizuj rejestr postępu. Podaj użytkownikowi: co działa, co wymaga danych, jak odtworzyć oraz dokładną następną jednostkę. Przy pełnym odbiorze etapu przygotuj część do standardowego wydania zgodnie z repo; nie utożsamiaj przygotowania z publikacją Pages.

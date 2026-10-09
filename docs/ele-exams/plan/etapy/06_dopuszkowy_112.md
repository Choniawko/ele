# Etap 06 — Zadanie 112: aparat i złączki w puszce

## Prompt do użycia w Codexie

Wdróż ten etap w aktualnym repo Choniawko/ele. Zacznij od WYMAGANIA_WSPOLNE.md, KONTRAKTY_DANYCH.md oraz istniejącego docs/ele-exams/implementation-state.json. Wykonaj najbliższą niewykonaną jednostkę ze spełnionymi zależnościami i zweryfikuj ją; nie zakończ na samym opisie. Nie cofaj już wykonanych części. W razie braku czasu zapisz checkpoint po działającej jednostce, a nie pusty placeholder.

Zależności etapu: 01, 03. Jednostki sesji: 06a, 06b. Ich stan implemented/tested/released zapisuj osobno. Zależność od 03/08/09 oznacza wymagane sprawdzone profile z 03a/08a/09a, nie blokadę przez niezależne zadanie tamtego etapu; odbiór końcowy 14 wymaga wszystkich pełnych bramek. Model aparatu może zostać zakończoną jednostką, lecz cały własny etap wymaga także gotowych układów i wiedzy. Publiczny przycisk otwiera tylko faktycznie zweryfikowany wariant.

## Funkcja dostępna po odbiorze etapu

Gotowy układ BIS-402 w trzech puszkach, z wariantem płytki lub złączek.

## Zakres wykonania

1. 06a: BIS-402 według E240610, przycisk natynkowy NO, czteroportowa wspólna złączka i płytka z pięcioma niezależnymi torami. 06b: układ 112.
2. BIS-402: L 6, N 5, impuls 4, COM 1, NO 2, NC 3. Zachowaj dopuszkową geometrię i właściwe styki, nie montuj profilu DIN z innym napisem.
3. Płytka pięciu torów nie jest pięcioportową złączką o wspólnym potencjale. Profile dwójki/trójki/czwórki mają jawne grupy wspólne i pojemności.
4. Przygotuj wariant domyślny z płytką oraz dozwolony wariant alternatywny z dodatkowymi złączkami. Drugi wariant nie jest osobnym zadaniem ani obligatoryjnym podwójnym zakupem.
5. Zgodność 2D gabarytów nie dowodzi możliwości zamknięcia realnej puszki z przewodami, głębokości ani siły zacisku. Opisz zakres modelu.

## Materiał zadaniowy

- [Kontrakt zadania 112](../zadania/ELE02_112.md).

Odczytaj w materialy/data/ele02-tasks.json odpowiednie taskId, BOM, materiały, readingSteps, acceptanceChecks i rysunki. W source-issues.json sprawdź otwarte kwestie, a w component-catalog-map.json wszystkie komponenty, również partial-adaptation. Dane katalogu porównaj z obecnym kodem, nie traktuj snapshotu jako instalacji nowych modeli.

## Wiedza i UX w tym etapie

Każdy dodany model otrzymuje rozbudowany DeviceProfile: działanie, symbol, zaciski, stan odniesienia, nastawy, tabela stanów, próby i ograniczenia. Każdy układ otrzymuje własną lekcję torów mocy/sterowania/N/PE i kontekstowe odnośniki. Artykuł prowadzi do wzorca, wzorzec do konkretnego fragmentu teorii. Użyj wymagań wspólnych dla powrotu, kamery, klawiatury i widoku mobilnego; dokument wiedzy nie może sterować cewką wbrew solverowi.

## Próby specyficzne

- Każdy z trzech przycisków zmienia tę samą oprawę, stały potencjał wejścia nie daje wielokrotnego toggla.
- Bez źródła światła wskazane pomiary L–N/PE–L mają przerwę, natomiast PE–PE ciągłość.
- Brak przypadkowego zwarcia pięciu niezależnych torów; poprawność obu wariantów połączeń.
- P3 można otworzyć, znaleźć PB i zaciski oraz odczytać ich rolę bez utraty kontekstu.

Dodaj wszystkie source check IDs przypisane temu etapowi z data/qa-source-checks.json i odpowiednie R1–R10 z BA_UX_QA_odbior.md. Rozdziel automatyczne zachowanie, ręczny odbiór obrazu oraz elementy fizyczne unsupported. Nie zapisuj prób jako passed bez uruchomienia i dowodu.

## Kryterium końca sesji i raport

Zakończ konkretną jednostkę działającym kodem i testami albo zapisz precyzyjną blokadę źródłową. W docs/ele-exams/QA_06.md zapisz commit, zmienione modele/taskId, źródła, wyniki komend i dowody UX. Zaktualizuj rejestr postępu. Podaj użytkownikowi: co działa, co wymaga danych, jak odtworzyć oraz dokładną następną jednostkę. Przy pełnym odbiorze etapu przygotuj część do standardowego wydania zgodnie z repo; nie utożsamiaj przygotowania z publikacją Pages.

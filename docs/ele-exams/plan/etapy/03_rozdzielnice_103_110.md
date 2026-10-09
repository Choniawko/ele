# Etap 03 — Ochrona i trzy fazy: 103/110

## Prompt do użycia w Codexie

Wdróż ten etap w aktualnym repo Choniawko/ele. Zacznij od WYMAGANIA_WSPOLNE.md, KONTRAKTY_DANYCH.md oraz istniejącego docs/ele-exams/implementation-state.json. Wykonaj najbliższą niewykonaną jednostkę ze spełnionymi zależnościami i zweryfikuj ją; nie zakończ na samym opisie. Nie cofaj już wykonanych części. W razie braku czasu zapisz checkpoint po działającej jednostce, a nie pusty placeholder.

Zależności etapu: 01. Jednostki sesji: 03a, 03b, 03c. Ich stan implemented/tested/released zapisuj osobno. Zależność od 03/08/09 oznacza wymagane sprawdzone profile z 03a/08a/09a, nie blokadę przez niezależne zadanie tamtego etapu; odbiór końcowy 14 wymaga wszystkich pełnych bramek. Model aparatu może zostać zakończoną jednostką, lecz cały własny etap wymaga także gotowych układów i wiedzy. Publiczny przycisk otwiera tylko faktycznie zweryfikowany wariant.

## Funkcja dostępna po odbiorze etapu

Dwa nowe układy z RCD 4P, rozdziałem N i prawdziwymi pięcioma torami CEE.

## Zakres wykonania

1. 03a: wspólne profile RCD 4P, B16 3P, CEE 5P, listew o wymaganej pojemności, oprawki bez PE, czerwonej/żółtej lampki i przycisku natynkowego NO; osobne ID i dowody. 03b: układ 103. 03c: układ 110.
2. RCD 4P musi mieć wspólny mechanizm i detekcję sumy prądów wszystkich czynnych torów. Nie składaj go z niezależnych RCD 2P.
3. 103: wspólny N może występować przed RCD, dwa osobne N występują za RCD. Jedna oprawka bez PE wymaga właściwego profilu L/N, nie odpięcia PE z oprawy klasy I.
4. 110: CEE 3P+N+PE, B16 3P o charakterystyce B, osobno B10 i B6. edu-mcb3 C16 nie spełnia tego opisu.
5. Wymiarów, charakterystyki i typu A/AC nie wywodź z nazwy artykułu. Model sinusoidalny RCD oznacz jako taki; źródło 103 nie określa typu.

## Materiał zadaniowy

- [Kontrakt zadania 103](../zadania/ELE02_103.md).
- [Kontrakt zadania 110](../zadania/ELE02_110.md).

Odczytaj w materialy/data/ele02-tasks.json odpowiednie taskId, BOM, materiały, readingSteps, acceptanceChecks i rysunki. W source-issues.json sprawdź otwarte kwestie, a w component-catalog-map.json wszystkie komponenty, również partial-adaptation. Dane katalogu porównaj z obecnym kodem, nie traktuj snapshotu jako instalacji nowych modeli.

## Wiedza i UX w tym etapie

Każdy dodany model otrzymuje rozbudowany DeviceProfile: działanie, symbol, zaciski, stan odniesienia, nastawy, tabela stanów, próby i ograniczenia. Każdy układ otrzymuje własną lekcję torów mocy/sterowania/N/PE i kontekstowe odnośniki. Artykuł prowadzi do wzorca, wzorzec do konkretnego fragmentu teorii. Użyj wymagań wspólnych dla powrotu, kamery, klawiatury i widoku mobilnego; dokument wiedzy nie może sterować cewką wbrew solverowi.

## Próby specyficzne

- Kontrolowane próby każdego RCD i rozłączenia poszczególnych gałęzi.
- Błędny N między grupami wykrywa próba zachowania w odpowiednim modelu; samo source-schema jest niewystarczające.
- Napięcia CEE: tolerancje do modelu fazowego, około 398,4 V przy 230 V fazowym; nie wymuszaj dokładnego 400.
- 103 ma źródłowe B20, ale karta nie podaje go jako uniwersalnego doboru gniazda.

Dodaj wszystkie source check IDs przypisane temu etapowi z data/qa-source-checks.json i odpowiednie R1–R10 z BA_UX_QA_odbior.md. Rozdziel automatyczne zachowanie, ręczny odbiór obrazu oraz elementy fizyczne unsupported. Nie zapisuj prób jako passed bez uruchomienia i dowodu.

## Kryterium końca sesji i raport

Zakończ konkretną jednostkę działającym kodem i testami albo zapisz precyzyjną blokadę źródłową. W docs/ele-exams/QA_03.md zapisz commit, zmienione modele/taskId, źródła, wyniki komend i dowody UX. Zaktualizuj rejestr postępu. Podaj użytkownikowi: co działa, co wymaga danych, jak odtworzyć oraz dokładną następną jednostkę. Przy pełnym odbiorze etapu przygotuj część do standardowego wydania zgodnie z repo; nie utożsamiaj przygotowania z publikacją Pages.

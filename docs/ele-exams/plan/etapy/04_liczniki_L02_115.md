# Etap 04 — Energia i pomiar: L02/115

## Prompt do użycia w Codexie

Wdróż ten etap w aktualnym repo Choniawko/ele. Zacznij od WYMAGANIA_WSPOLNE.md, KONTRAKTY_DANYCH.md oraz istniejącego docs/ele-exams/implementation-state.json. Wykonaj najbliższą niewykonaną jednostkę ze spełnionymi zależnościami i zweryfikuj ją; nie zakończ na samym opisie. Nie cofaj już wykonanych części. W razie braku czasu zapisz checkpoint po działającej jednostce, a nie pusty placeholder.

Zależności etapu: 01, 03. Jednostki sesji: 04a, 04b, 04c. Ich stan implemented/tested/released zapisuj osobno. Zależność od 03/08/09 oznacza wymagane sprawdzone profile z 03a/08a/09a, nie blokadę przez niezależne zadanie tamtego etapu; odbiór końcowy 14 wymaga wszystkich pełnych bramek. Model aparatu może zostać zakończoną jednostką, lecz cały własny etap wymaga także gotowych układów i wiedzy. Publiczny przycisk otwiera tylko faktycznie zweryfikowany wariant.

## Funkcja dostępna po odbiorze etapu

Dwa układy z działającym licznikiem energii i wyjaśnieniem zakresu pomiaru.

## Zakres wykonania

1. 04a: licznik jednofazowy; czerwony/żółty wariant lampki wykorzystaj z profili 03a. 04b: L02. 04c: 115.
2. Najpierw dobierz i udokumentuj profil licznika: wejścia/wyjścia, wspólne N, liczba modułów i limit prądu. Źródło nie podaje numerów, więc nie kopiuj ich z przypadkowego produktu.
3. Obliczaj moc czynną z przepływu przez licznik i całkuj po czasie solvera. Nie sumuj tabliczek wszystkich istniejących odbiorników.
4. KWh jest stanem sesji aparatu, nie przewodem ani ręcznie ustawioną odpowiedzią. Zdefiniuj reset/odświeżenie/powrót z teorii i nie sugeruj pamięci realnego licznika, gdy runtime jej nie ma.
5. W obu zadaniach licznik jest przed RCD i obejmuje obie gałęzie. W 115 H3 jest przed łącznikami, nie jest wskaźnikiem świecenia opraw.

## Materiał zadaniowy

- [Kontrakt zadania L02](../zadania/ELE02_L02.md).
- [Kontrakt zadania 115](../zadania/ELE02_115.md).

Odczytaj w materialy/data/ele02-tasks.json odpowiednie taskId, BOM, materiały, readingSteps, acceptanceChecks i rysunki. W source-issues.json sprawdź otwarte kwestie, a w component-catalog-map.json wszystkie komponenty, również partial-adaptation. Dane katalogu porównaj z obecnym kodem, nie traktuj snapshotu jako instalacji nowych modeli.

## Wiedza i UX w tym etapie

Każdy dodany model otrzymuje rozbudowany DeviceProfile: działanie, symbol, zaciski, stan odniesienia, nastawy, tabela stanów, próby i ograniczenia. Każdy układ otrzymuje własną lekcję torów mocy/sterowania/N/PE i kontekstowe odnośniki. Artykuł prowadzi do wzorca, wzorzec do konkretnego fragmentu teorii. Użyj wymagań wspólnych dla powrotu, kamery, klawiatury i widoku mobilnego; dokument wiedzy nie może sterować cewką wbrew solverowi.

## Próby specyficzne

- Niezależny test liczbowy na znanej mocy i czasie, tolerancja solvera; brak przyrostu od odłączonej gałęzi.
- Uwzględnij rzeczywisty pobór lampek kontrolnych, jeśli należą do mierzonej strony.
- Pauza zatrzymuje czas i przyrost, x5/x20 zachowuje energię względem czasu symulacji.
- L02: około 1000 W odbiornik próbny; 115: wszystkie stany schodowych i kolory lampek.

Dodaj wszystkie source check IDs przypisane temu etapowi z data/qa-source-checks.json i odpowiednie R1–R10 z BA_UX_QA_odbior.md. Rozdziel automatyczne zachowanie, ręczny odbiór obrazu oraz elementy fizyczne unsupported. Nie zapisuj prób jako passed bez uruchomienia i dowodu.

## Kryterium końca sesji i raport

Zakończ konkretną jednostkę działającym kodem i testami albo zapisz precyzyjną blokadę źródłową. W docs/ele-exams/QA_04.md zapisz commit, zmienione modele/taskId, źródła, wyniki komend i dowody UX. Zaktualizuj rejestr postępu. Podaj użytkownikowi: co działa, co wymaga danych, jak odtworzyć oraz dokładną następną jednostkę. Przy pełnym odbiorze etapu przygotuj część do standardowego wydania zgodnie z repo; nie utożsamiaj przygotowania z publikacją Pages.

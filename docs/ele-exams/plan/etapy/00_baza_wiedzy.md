# Etap 00 — Baza wiedzy: wszystkie materiały

## Prompt do użycia w Codexie

Wdróż ten etap w aktualnym repo Choniawko/ele. Zacznij od WYMAGANIA_WSPOLNE.md, KONTRAKTY_DANYCH.md oraz istniejącego docs/ele-exams/implementation-state.json. Wykonaj najbliższą niewykonaną jednostkę ze spełnionymi zależnościami i zweryfikuj ją; nie zakończ na samym opisie. Nie cofaj już wykonanych części. W razie braku czasu zapisz checkpoint po działającej jednostce, a nie pusty placeholder.

Zależności etapu: brak. Jednostki sesji: 00a. Ich stan implemented/tested/released zapisuj osobno. Zależność od 03/08/09 oznacza wymagane sprawdzone profile z 03a/08a/09a, nie blokadę przez niezależne zadanie tamtego etapu; odbiór końcowy 14 wymaga wszystkich pełnych bramek. Model aparatu może zostać zakończoną jednostką, lecz cały własny etap wymaga także gotowych układów i wiedzy. Publiczny przycisk otwiera tylko faktycznie zweryfikowany wariant.

## Funkcja dostępna po odbiorze etapu

17 kart zadań, 40 rysunków i 25 artykułów w aplikacji; jawne statusy układów.

## Zakres wykonania

1. Dodaj packages/knowledge z walidowanymi treściami, indeksem wyszukiwania i niezależnym rejestrem dostępności projektów.
2. Dodaj osobny widok Wiedza, routowanie hash oraz listy Zadania / Aparaty / Czytanie schematów / Zestaw stanowiska. Adaptuj zastany interfejs, nie przebudowuj całej pracowni.
3. Przenieś treści do własnych komponentów React. Sam iframe z index.html nie realizuje integracji, powrotu do projektu ani pomocy przy zacisku.
4. Obrazy ładuj na żądanie spod BASE_URL; do bundle nie wklejaj 8 MB podglądu HTML ani wszystkich obrazów base64.
5. Widok ELE.05 obsłuż jako rozszerzalny filtr z uczciwym komunikatem o nieprzekazanych materiałach. 102 i 111 nie należą do bieżącego zakresu.

## Materiał zadaniowy

- Wszystkie karty są w ../materialy/articles/zadania/; źródła danych w ../materialy/data/.

Odczytaj w materialy/data/ele02-tasks.json odpowiednie taskId, BOM, materiały, readingSteps, acceptanceChecks i rysunki. W source-issues.json sprawdź otwarte kwestie, a w component-catalog-map.json wszystkie komponenty, również partial-adaptation. Dane katalogu porównaj z obecnym kodem, nie traktuj snapshotu jako instalacji nowych modeli.

## Wiedza i UX w tym etapie

Każdy dodany model otrzymuje rozbudowany DeviceProfile: działanie, symbol, zaciski, stan odniesienia, nastawy, tabela stanów, próby i ograniczenia. Każdy układ otrzymuje własną lekcję torów mocy/sterowania/N/PE i kontekstowe odnośniki. Artykuł prowadzi do wzorca, wzorzec do konkretnego fragmentu teorii. Użyj wymagań wspólnych dla powrotu, kamery, klawiatury i widoku mobilnego; dokument wiedzy nie może sterować cewką wbrew solverowi.

## Próby specyficzne

- Bezpośrednie wejście i odświeżenie #/wiedza/zadania/ele02-108 w buildzie /ele/.
- Wszystkie 17 kart, 40 obrazów i 60 kategorii BOM mają działające odnośniki.
- Wyszukiwanie RCD, różnicówka, BIS-402, podtrzymanie, krańcówka oraz L01; polskie znaki i ich zapis bez znaków.
- Natywne powiększenie rysunku, klawiatura, Esc i powrót fokusu; realny Chrome, nie tylko jsdom.

Dodaj wszystkie source check IDs przypisane temu etapowi z data/qa-source-checks.json i odpowiednie R1–R10 z BA_UX_QA_odbior.md. Rozdziel automatyczne zachowanie, ręczny odbiór obrazu oraz elementy fizyczne unsupported. Nie zapisuj prób jako passed bez uruchomienia i dowodu.

## Kryterium końca sesji i raport

Zakończ konkretną jednostkę działającym kodem i testami albo zapisz precyzyjną blokadę źródłową. W docs/ele-exams/QA_00.md zapisz commit, zmienione modele/taskId, źródła, wyniki komend i dowody UX. Zaktualizuj rejestr postępu. Podaj użytkownikowi: co działa, co wymaga danych, jak odtworzyć oraz dokładną następną jednostkę. Przy pełnym odbiorze etapu przygotuj część do standardowego wydania zgodnie z repo; nie utożsamiaj przygotowania z publikacją Pages.

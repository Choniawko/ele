# Etap 12 — Zadanie 114: źródło rezerwowe i bramka rozstrzygnięcia

## Prompt do użycia w Codexie

Wdróż ten etap w aktualnym repo Choniawko/ele. Zacznij od WYMAGANIA_WSPOLNE.md, KONTRAKTY_DANYCH.md oraz istniejącego docs/ele-exams/implementation-state.json. Wykonaj najbliższą niewykonaną jednostkę ze spełnionymi zależnościami i zweryfikuj ją; nie zakończ na samym opisie. Nie cofaj już wykonanych części. W razie braku czasu zapisz checkpoint po działającej jednostce, a nie pusty placeholder.

Zależności etapu: 01, 03, 09. Jednostki sesji: 12a, 12b. Ich stan implemented/tested/released zapisuj osobno. Zależność od 03/08/09 oznacza wymagane sprawdzone profile z 03a/08a/09a, nie blokadę przez niezależne zadanie tamtego etapu; odbiór końcowy 14 wymaga wszystkich pełnych bramek. Model aparatu może zostać zakończoną jednostką, lecz cały własny etap wymaga także gotowych układów i wiedzy. Publiczny przycisk otwiera tylko faktycznie zweryfikowany wariant.

## Funkcja dostępna po odbiorze etapu

Złożony układ interpretacji rysunku; status zweryfikowany dopiero po rozstrzygnięciu funkcji KT i kryteriów.

## Zakres wykonania

1. 12a: protokół interpretacji wszystkich czterech otwartych kwestii 114 i konkretna instrukcja KT. 12b: nowe zachowanie wymaganych styków/czasówki oraz układ.
2. Nie wymagaj, aby wszystkie zdania TAK/NIE w arkuszu były prawdziwe. Rozstrzygnięcie wskazuje osobno wymaganie, twierdzenie do oceny i dowód odpowiedzi. Oficjalny klucz jest potrzebny do deklaracji zgodności z jego odpowiedziami, nie do niezależnej analizy schematu.
3. KP ma tor NC mimo oznaczeń 3/4 na rysunku. Zmapuj sourceContactId do rzeczywistego terminalId; numer z innego produktu nie zmienia rodzaju styku.
4. L1 idzie na tor spoczynkowy KT, L2 na przełączony, COM do S/oprawy. H1 i H2 są przed S. Modeluj rozłączne przełączanie bez połączenia faz.
5. On-delay 5 s nie implikuje opóźnionego powrotu 5 s. Przyjmij zachowanie wybranej instrukcji i oznacz świadome różnice. Dopóki profil jest otwarty, projekt może być złożonym szkicem w galerii, z wyłączoną oceną egzaminacyjną i jasnym opisem.

## Materiał zadaniowy

- [Kontrakt zadania 114](../zadania/ELE02_114.md).

Odczytaj w materialy/data/ele02-tasks.json odpowiednie taskId, BOM, materiały, readingSteps, acceptanceChecks i rysunki. W source-issues.json sprawdź otwarte kwestie, a w component-catalog-map.json wszystkie komponenty, również partial-adaptation. Dane katalogu porównaj z obecnym kodem, nie traktuj snapshotu jako instalacji nowych modeli.

## Wiedza i UX w tym etapie

Każdy dodany model otrzymuje rozbudowany DeviceProfile: działanie, symbol, zaciski, stan odniesienia, nastawy, tabela stanów, próby i ograniczenia. Każdy układ otrzymuje własną lekcję torów mocy/sterowania/N/PE i kontekstowe odnośniki. Artykuł prowadzi do wzorca, wzorzec do konkretnego fragmentu teorii. Użyj wymagań wspólnych dla powrotu, kamery, klawiatury i widoku mobilnego; dokument wiedzy nie może sterować cewką wbrew solverowi.

## Próby specyficzne

- L1 obecna, zanik L1 z L2, stan przed/po 5 s, powrót L1 i zanik L2; oczekiwania zgodne z rozstrzygniętym profilem.
- KP NC, sygnalizacja przed S i odrębne przełączanie oprawy.
- Brak zwarcia L1–L2 w stanach ustalonych i podczas przełączenia, także z krokiem czasu obejmującym zmianę.
- Bez dowodu nie nadaj ready/graded ani nie podwyższaj licznika zweryfikowanych wzorców; publikacja szkicu nie zamyka zadania.

Dodaj wszystkie source check IDs przypisane temu etapowi z data/qa-source-checks.json i odpowiednie R1–R10 z BA_UX_QA_odbior.md. Rozdziel automatyczne zachowanie, ręczny odbiór obrazu oraz elementy fizyczne unsupported. Nie zapisuj prób jako passed bez uruchomienia i dowodu.

## Kryterium końca sesji i raport

Zakończ konkretną jednostkę działającym kodem i testami albo zapisz precyzyjną blokadę źródłową. W docs/ele-exams/QA_12.md zapisz commit, zmienione modele/taskId, źródła, wyniki komend i dowody UX. Zaktualizuj rejestr postępu. Podaj użytkownikowi: co działa, co wymaga danych, jak odtworzyć oraz dokładną następną jednostkę. Przy pełnym odbiorze etapu przygotuj część do standardowego wydania zgodnie z repo; nie utożsamiaj przygotowania z publikacją Pages.

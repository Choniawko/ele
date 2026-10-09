# Etap 09 — Zadanie 113: gotowość, kierunki, krańcówki

## Prompt do użycia w Codexie

Wdróż ten etap w aktualnym repo Choniawko/ele. Zacznij od WYMAGANIA_WSPOLNE.md, KONTRAKTY_DANYCH.md oraz istniejącego docs/ele-exams/implementation-state.json. Wykonaj najbliższą niewykonaną jednostkę ze spełnionymi zależnościami i zweryfikuj ją; nie zakończ na samym opisie. Nie cofaj już wykonanych części. W razie braku czasu zapisz checkpoint po działającej jednostce, a nie pusty placeholder.

Zależności etapu: 01, 08. Jednostki sesji: 09a, 09b. Ich stan implemented/tested/released zapisuj osobno. Zależność od 03/08/09 oznacza wymagane sprawdzone profile z 03a/08a/09a, nie blokadę przez niezależne zadanie tamtego etapu; odbiór końcowy 14 wymaga wszystkich pełnych bramek. Model aparatu może zostać zakończoną jednostką, lecz cały własny etap wymaga także gotowych układów i wiedzy. Publiczny przycisk otwiera tylko faktycznie zweryfikowany wariant.

## Funkcja dostępna po odbiorze etapu

Układ podnośnika z elektrycznymi blokadami i rozróżnieniem gotowości od ruchu.

## Zakres wykonania

1. 09a: pomocniczy stycznik 230 V, chwilowy wspólny NO+NC w wariancie DIN, NC DIN i krańcówka NO+NC. 09b: 113.
2. K1 podtrzymuje gotowość przez S2; K2/K3 są chwilowe. Nie dodawaj własnego podtrzymania do obu kierunków.
3. S3/S4 mają po jednym operatorze dla NO+NC. Styk NC przeciwnego przycisku jest częścią blokady, a nie drugim niezależnym przyciskiem.
4. Wk1 blokuje podnoszenie, Wk2 opuszczanie; Wk2 sam nie przerywa K1. Krańcówki można jawnie zadziałać ręcznie; automatyczna pozycja windy wymaga osobnego modelu ruchu.
5. Motor 113 ma profil 230Δ/400Y w Y przy sieci 400 V, do 1,5 kW w źródle. Zweryfikuj/dodaj odrębny profil mocy; istniejący 3 kW nie jest dokładnym odwzorowaniem.

## Materiał zadaniowy

- [Kontrakt zadania 113](../zadania/ELE02_113.md).

Odczytaj w materialy/data/ele02-tasks.json odpowiednie taskId, BOM, materiały, readingSteps, acceptanceChecks i rysunki. W source-issues.json sprawdź otwarte kwestie, a w component-catalog-map.json wszystkie komponenty, również partial-adaptation. Dane katalogu porównaj z obecnym kodem, nie traktuj snapshotu jako instalacji nowych modeli.

## Wiedza i UX w tym etapie

Każdy dodany model otrzymuje rozbudowany DeviceProfile: działanie, symbol, zaciski, stan odniesienia, nastawy, tabela stanów, próby i ograniczenia. Każdy układ otrzymuje własną lekcję torów mocy/sterowania/N/PE i kontekstowe odnośniki. Artykuł prowadzi do wzorca, wzorzec do konkretnego fragmentu teorii. Użyj wymagań wspólnych dla powrotu, kamery, klawiatury i widoku mobilnego; dokument wiedzy nie może sterować cewką wbrew solverowi.

## Próby specyficzne

- Gotowość bez obrotów, kierunek podczas trzymania, zwolnienie operatora, obie krańcówki osobno.
- Oba S3/S4 wciśnięte od spoczynku: brak żądania obu cewek zgodnie z szeregowymi NC.
- STOP zrywa gotowość; Wk2 nie zrywa gotowości K1; powrót zasilania ze zwolnionymi przyciskami.
- Brak dopisanego interlock maskującego brak elektrycznej blokady; schemat i pomiary odzwierciedlają obwód.

Dodaj wszystkie source check IDs przypisane temu etapowi z data/qa-source-checks.json i odpowiednie R1–R10 z BA_UX_QA_odbior.md. Rozdziel automatyczne zachowanie, ręczny odbiór obrazu oraz elementy fizyczne unsupported. Nie zapisuj prób jako passed bez uruchomienia i dowodu.

## Kryterium końca sesji i raport

Zakończ konkretną jednostkę działającym kodem i testami albo zapisz precyzyjną blokadę źródłową. W docs/ele-exams/QA_09.md zapisz commit, zmienione modele/taskId, źródła, wyniki komend i dowody UX. Zaktualizuj rejestr postępu. Podaj użytkownikowi: co działa, co wymaga danych, jak odtworzyć oraz dokładną następną jednostkę. Przy pełnym odbiorze etapu przygotuj część do standardowego wydania zgodnie z repo; nie utożsamiaj przygotowania z publikacją Pages.

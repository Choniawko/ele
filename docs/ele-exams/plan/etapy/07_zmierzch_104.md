# Etap 07 — Zadanie 104: współpraca AZ i AS

## Prompt do użycia w Codexie

Wdróż ten etap w aktualnym repo Choniawko/ele. Zacznij od WYMAGANIA_WSPOLNE.md, KONTRAKTY_DANYCH.md oraz istniejącego docs/ele-exams/implementation-state.json. Wykonaj najbliższą niewykonaną jednostkę ze spełnionymi zależnościami i zweryfikuj ją; nie zakończ na samym opisie. Nie cofaj już wykonanych części. W razie braku czasu zapisz checkpoint po działającej jednostce, a nie pusty placeholder.

Zależności etapu: 01, 03. Jednostki sesji: 07a, 07b. Ich stan implemented/tested/released zapisuj osobno. Zależność od 03/08/09 oznacza wymagane sprawdzone profile z 03a/08a/09a, nie blokadę przez niezależne zadanie tamtego etapu; odbiór końcowy 14 wymaga wszystkich pełnych bramek. Model aparatu może zostać zakończoną jednostką, lecz cały własny etap wymaga także gotowych układów i wiedzy. Publiczny przycisk otwiera tylko faktycznie zweryfikowany wariant.

## Funkcja dostępna po odbiorze etapu

Układ sterowany światłem z minutowym czasem i kontekstową lekcją współpracy dwóch aparatów.

## Zakres wykonania

1. 07a: dobierz rzeczywiste instrukcje AZ z zewnętrzną sondą i AS albo opisz ograniczony model dydaktyczny z własnymi terminalId. 07b: kompletny układ.
2. Światło jest jawnym bodźcem środowiska, a nie ręcznym nakazem załączania cewki. Zdefiniuj RuntimeAction i przepływ worker/store dla bodźca.
3. W źródle AZ warunkuje zasilanie AS. AS ma być pozbawiony zasilania przy jasnej sondzie, nie tylko mieć dodatkowy styk na wyjściu lampy.
4. Zdefiniuj próg, histerezę/opóźnienie AZ oraz reakcję AS na ponowny impuls i powrót zasilania według dobranych instrukcji. Nastawa AS = 60 s.
5. edu-staircase ma profil AS-212; jego użycie wymaga potwierdzenia instrukcji i zgodności całego wariantu, nie samego parametru timeS.

## Materiał zadaniowy

- [Kontrakt zadania 104](../zadania/ELE02_104.md).

Odczytaj w materialy/data/ele02-tasks.json odpowiednie taskId, BOM, materiały, readingSteps, acceptanceChecks i rysunki. W source-issues.json sprawdź otwarte kwestie, a w component-catalog-map.json wszystkie komponenty, również partial-adaptation. Dane katalogu porównaj z obecnym kodem, nie traktuj snapshotu jako instalacji nowych modeli.

## Wiedza i UX w tym etapie

Każdy dodany model otrzymuje rozbudowany DeviceProfile: działanie, symbol, zaciski, stan odniesienia, nastawy, tabela stanów, próby i ograniczenia. Każdy układ otrzymuje własną lekcję torów mocy/sterowania/N/PE i kontekstowe odnośniki. Artykuł prowadzi do wzorca, wzorzec do konkretnego fragmentu teorii. Użyj wymagań wspólnych dla powrotu, kamery, klawiatury i widoku mobilnego; dokument wiedzy nie może sterować cewką wbrew solverowi.

## Próby specyficzne

- Jasno + przycisk: AS bez zasilania i lampa OFF; ciemno + impuls: lampa ON przez 60 s.
- Rozjaśnienie w trakcie czasu, ponowne zasłonięcie, retrigger i zanik zasilania.
- Przyspieszenie symulacji testuje ten sam czas; brak zegara setTimeout w React sterującego aparatem.
- Kliknięcie AZ wyjaśnia wpływ jego wyjścia na zasilanie AS, a nie tylko ogólny artykuł o lampie.

Dodaj wszystkie source check IDs przypisane temu etapowi z data/qa-source-checks.json i odpowiednie R1–R10 z BA_UX_QA_odbior.md. Rozdziel automatyczne zachowanie, ręczny odbiór obrazu oraz elementy fizyczne unsupported. Nie zapisuj prób jako passed bez uruchomienia i dowodu.

## Kryterium końca sesji i raport

Zakończ konkretną jednostkę działającym kodem i testami albo zapisz precyzyjną blokadę źródłową. W docs/ele-exams/QA_07.md zapisz commit, zmienione modele/taskId, źródła, wyniki komend i dowody UX. Zaktualizuj rejestr postępu. Podaj użytkownikowi: co działa, co wymaga danych, jak odtworzyć oraz dokładną następną jednostkę. Przy pełnym odbiorze etapu przygotuj część do standardowego wydania zgodnie z repo; nie utożsamiaj przygotowania z publikacją Pages.

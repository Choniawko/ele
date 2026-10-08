# Etap 13 — Zadanie 117: regulacja jasności

## Prompt do użycia w Codexie

Wdróż ten etap w aktualnym repo Choniawko/ele. Zacznij od WYMAGANIA_WSPOLNE.md, KONTRAKTY_DANYCH.md oraz istniejącego docs/ele-exams/implementation-state.json. Wykonaj najbliższą niewykonaną jednostkę ze spełnionymi zależnościami i zweryfikuj ją; nie zakończ na samym opisie. Nie cofaj już wykonanych części. W razie braku czasu zapisz checkpoint po działającej jednostce, a nie pusty placeholder.

Zależności etapu: 01, 03. Jednostki sesji: 13a, 13b. Ich stan implemented/tested/released zapisuj osobno. Zależność od 03/08/09 oznacza wymagane sprawdzone profile z 03a/08a/09a, nie blokadę przez niezależne zadanie tamtego etapu; odbiór końcowy 14 wymaga wszystkich pełnych bramek. Model aparatu może zostać zakończoną jednostką, lecz cały własny etap wymaga także gotowych układów i wiedzy. Publiczny przycisk otwiera tylko faktycznie zweryfikowany wariant.

## Funkcja dostępna po odbiorze etapu

Gotowy układ SCO-815, krótki/długi impuls i widoczna jasność oprawy.

## Zakres wykonania

1. Etap zależy od 01 i 03 (wystarczają zweryfikowane wspólne modele 03a); nie zależy od rozstrzygnięcia 114 ani termostatu L01. Kontynuuj 117 niezależnie od tych blokad.
2. 13a: model SCO-815 według E230329 i odpowiedni renderer/obciążenie. 13b: 117.
3. SCO: L=10, N=7/8/9 zgodnie z topologią, wyjście=12, izolowane wejście 1–3. Nie zwieraj wejścia izolowanego z wyjściem w rendererze lub solverze.
4. Krótkie naciśnięcie ON/OFF, długie regulacja, zmiana kierunku kolejnych długich naciśnięć według tej wersji instrukcji. Prawidłowe reakcje na cancel i utratę zasilania.
5. Źródło zadania: żarówka 40 W. Nie zastępuj jej dowolnym LED. Objaśnij związek jasności i rzeczywistej mocy, zakres aproksymacji RMS oraz pomiary unsupported dla nieodtwarzanych przebiegów.

## Materiał zadaniowy

- [Kontrakt zadania 117](../zadania/ELE02_117.md).

Odczytaj w materialy/data/ele02-tasks.json odpowiednie taskId, BOM, materiały, readingSteps, acceptanceChecks i rysunki. W source-issues.json sprawdź otwarte kwestie, a w component-catalog-map.json wszystkie komponenty, również partial-adaptation. Dane katalogu porównaj z obecnym kodem, nie traktuj snapshotu jako instalacji nowych modeli.

## Wiedza i UX w tym etapie

Każdy dodany model otrzymuje rozbudowany DeviceProfile: działanie, symbol, zaciski, stan odniesienia, nastawy, tabela stanów, próby i ograniczenia. Każdy układ otrzymuje własną lekcję torów mocy/sterowania/N/PE i kontekstowe odnośniki. Artykuł prowadzi do wzorca, wzorzec do konkretnego fragmentu teorii. Użyj wymagań wspólnych dla powrotu, kamery, klawiatury i widoku mobilnego; dokument wiedzy nie może sterować cewką wbrew solverowi.

## Próby specyficzne

- Krótkie i długie naciśnięcia, kolejne przytrzymania, limity jasności, pauza i restart.
- Oddzielne B6/B10; gniazdo nie ściemnia się wraz z oprawą.
- Zmiana jasności ma odpowiadający jej model obciążenia, nie sam CSS opacity.
- Brak wymyślonych odczytów harmonicznych, THD i zachowania RCD typu A z modelu sinusoidalnego.

Dodaj wszystkie source check IDs przypisane temu etapowi z data/qa-source-checks.json i odpowiednie R1–R10 z BA_UX_QA_odbior.md. Rozdziel automatyczne zachowanie, ręczny odbiór obrazu oraz elementy fizyczne unsupported. Nie zapisuj prób jako passed bez uruchomienia i dowodu.

## Kryterium końca sesji i raport

Zakończ konkretną jednostkę działającym kodem i testami albo zapisz precyzyjną blokadę źródłową. W docs/ele-exams/QA_13.md zapisz commit, zmienione modele/taskId, źródła, wyniki komend i dowody UX. Zaktualizuj rejestr postępu. Podaj użytkownikowi: co działa, co wymaga danych, jak odtworzyć oraz dokładną następną jednostkę. Przy pełnym odbiorze etapu przygotuj część do standardowego wydania zgodnie z repo; nie utożsamiaj przygotowania z publikacją Pages.

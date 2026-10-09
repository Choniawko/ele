# Etap 14 — Odbiór całego zestawu i rozbudowa nauki

## Prompt do użycia w Codexie

Wdróż ten etap w aktualnym repo Choniawko/ele. Zacznij od WYMAGANIA_WSPOLNE.md, KONTRAKTY_DANYCH.md oraz istniejącego docs/ele-exams/implementation-state.json. Wykonaj najbliższą niewykonaną jednostkę ze spełnionymi zależnościami i zweryfikuj ją; nie zakończ na samym opisie. Nie cofaj już wykonanych części. W razie braku czasu zapisz checkpoint po działającej jednostce, a nie pusty placeholder.

Zależności etapu: 00, 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13. Jednostki sesji: 14a. Ich stan implemented/tested/released zapisuj osobno. Zależność od 03/08/09 oznacza wymagane sprawdzone profile z 03a/08a/09a, nie blokadę przez niezależne zadanie tamtego etapu; odbiór końcowy 14 wymaga wszystkich pełnych bramek. Model aparatu może zostać zakończoną jednostką, lecz cały własny etap wymaga także gotowych układów i wiedzy. Publiczny przycisk otwiera tylko faktycznie zweryfikowany wariant.

## Funkcja dostępna po odbiorze etapu

Zweryfikowane pokrycie 17 zadań, pełne powiązania teorii i praktyki oraz kontrakt dalszych materiałów.

## Zakres wykonania

1. Porównaj rejestr dostępności z listą dokładnie 17 dostarczonych zadań. Ready oznacza działający kompletny projekt i dowody, nie sam obraz ani istniejący wpis scenariusza.
2. Rozszerz 25 artykułów o profile wszystkich dodanych modeli, 60 kategorii BOM i lekcje układów. Brakujący profil lub wyjaśnienie zacisku jest otwartym kryterium danego zadania.
3. Wprowadź ścieżkę nauki od schodowych przez ochronę, bistabilne i podtrzymanie do rezerwy, temperatury i regulacji. Kolejność dydaktyczna może różnić się od kolejności wdrażania.
4. Dodaj bezpieczny dla projektu przełącznik Oglądaj wzorzec / Pracuj na kopii. Przygotuj kontrakt TutorialStep do późniejszych lekcji, a nie fikcyjne gotowe ćwiczenia diagnozy bez testów.
5. Dodatkowe arkusze ELE.05 i blog są kolejnym zakresem: wykorzystują istniejące articleId/taskId/referenceId, wersjonowany content i te same procedury QA.

## Materiał zadaniowy

- Wszystkie karty są w ../materialy/articles/zadania/; źródła danych w ../materialy/data/.

Odczytaj w materialy/data/ele02-tasks.json odpowiednie taskId, BOM, materiały, readingSteps, acceptanceChecks i rysunki. W source-issues.json sprawdź otwarte kwestie, a w component-catalog-map.json wszystkie komponenty, również partial-adaptation. Dane katalogu porównaj z obecnym kodem, nie traktuj snapshotu jako instalacji nowych modeli.

## Wiedza i UX w tym etapie

Każdy dodany model otrzymuje rozbudowany DeviceProfile: działanie, symbol, zaciski, stan odniesienia, nastawy, tabela stanów, próby i ograniczenia. Każdy układ otrzymuje własną lekcję torów mocy/sterowania/N/PE i kontekstowe odnośniki. Artykuł prowadzi do wzorca, wzorzec do konkretnego fragmentu teorii. Użyj wymagań wspólnych dla powrotu, kamery, klawiatury i widoku mobilnego; dokument wiedzy nie może sterować cewką wbrew solverowi.

## Próby specyficzne

- Pełny pipeline repo dla jednego zbudowanego dist oraz E2E pod /ele/.
- Przejdź ręcznie każdy wzorzec: otwarcie, energia OFF, schemat, wyjaśnienie, próba, edycja, eksport/import, powrót.
- Macierz źródłowych 82 prób: wynik passed / blocked / unsupported / manual z dowodem, bez zbiorowego OK.
- Nie podpisuj 17/17 zweryfikowanych, jeżeli 114 lub którykolwiek dokładny profil pozostaje otwarty.

Dodaj wszystkie source check IDs przypisane temu etapowi z data/qa-source-checks.json i odpowiednie R1–R10 z BA_UX_QA_odbior.md. Rozdziel automatyczne zachowanie, ręczny odbiór obrazu oraz elementy fizyczne unsupported. Nie zapisuj prób jako passed bez uruchomienia i dowodu.

## Kryterium końca sesji i raport

Zakończ konkretną jednostkę działającym kodem i testami albo zapisz precyzyjną blokadę źródłową. W docs/ele-exams/QA_14.md zapisz commit, zmienione modele/taskId, źródła, wyniki komend i dowody UX. Zaktualizuj rejestr postępu. Podaj użytkownikowi: co działa, co wymaga danych, jak odtworzyć oraz dokładną następną jednostkę. Przy pełnym odbiorze etapu przygotuj część do standardowego wydania zgodnie z repo; nie utożsamiaj przygotowania z publikacją Pages.

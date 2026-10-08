# Etap 11 — Zadanie L01: temperatura, fazy, silnik

## Prompt do użycia w Codexie

Wdróż ten etap w aktualnym repo Choniawko/ele. Zacznij od WYMAGANIA_WSPOLNE.md, KONTRAKTY_DANYCH.md oraz istniejącego docs/ele-exams/implementation-state.json. Wykonaj najbliższą niewykonaną jednostkę ze spełnionymi zależnościami i zweryfikuj ją; nie zakończ na samym opisie. Nie cofaj już wykonanych części. W razie braku czasu zapisz checkpoint po działającej jednostce, a nie pusty placeholder.

Zależności etapu: 01, 08. Jednostki sesji: 11a, 11b. Ich stan implemented/tested/released zapisuj osobno. Zależność od 03/08/09 oznacza wymagane sprawdzone profile z 03a/08a/09a, nie blokadę przez niezależne zadanie tamtego etapu; odbiór końcowy 14 wymaga wszystkich pełnych bramek. Model aparatu może zostać zakończoną jednostką, lecz cały własny etap wymaga także gotowych układów i wiedzy. Publiczny przycisk otwiera tylko faktycznie zweryfikowany wariant.

## Funkcja dostępna po odbiorze etapu

Gotowy układ wentylacji, bodziec temperatury i pozwolenie fazowe odczytywane z obwodu.

## Zakres wykonania

1. 11a: RT-820 według E211220, sonda i histereza oraz udokumentowany CKF. 11b: L01.
2. RT-820: 3=L, 4=N, sonda 5/6, COM=2, NO=1, NC=8 w stanie odniesienia. Tor wentylacji powyżej progu to 2–8; użyj pełnej instrukcji dla histerezy i stanów po utracie sondy.
3. Nastawa zadania 28°C. Parametry histerezy, opóźnienia i prógów CKF wynikają z wybranego modelu, nie z samego skrótu CKF.
4. Tor cewki jest szeregowo warunkowany przez zabezpieczenie, CKF i RT. Obrót silnika wynika z mocy i kolejności faz; nie z samej wartości suwaka.
5. Motor 400Δ/690Y z etapu 08 w Δ; nie zamieniaj go na silnik 113 w Y.

## Materiał zadaniowy

- [Kontrakt zadania L01](../zadania/ELE02_L01.md).

Odczytaj w materialy/data/ele02-tasks.json odpowiednie taskId, BOM, materiały, readingSteps, acceptanceChecks i rysunki. W source-issues.json sprawdź otwarte kwestie, a w component-catalog-map.json wszystkie komponenty, również partial-adaptation. Dane katalogu porównaj z obecnym kodem, nie traktuj snapshotu jako instalacji nowych modeli.

## Wiedza i UX w tym etapie

Każdy dodany model otrzymuje rozbudowany DeviceProfile: działanie, symbol, zaciski, stan odniesienia, nastawy, tabela stanów, próby i ograniczenia. Każdy układ otrzymuje własną lekcję torów mocy/sterowania/N/PE i kontekstowe odnośniki. Artykuł prowadzi do wzorca, wzorzec do konkretnego fragmentu teorii. Użyj wymagań wspólnych dla powrotu, kamery, klawiatury i widoku mobilnego; dokument wiedzy nie może sterować cewką wbrew solverowi.

## Próby specyficzne

- Temperatura powyżej/pod progiem i w paśmie histerezy; brak migotania od rozwiązywania kolejnych klatek.
- Zanik fazy i zła kolejność odbierają zgodę w zakresie wybranego CKF; powrót zgodnie z instrukcją.
- Temperatura wysoka nie omija OFF/trip zabezpieczenia ani braku pozwolenia CKF.
- Sonda jest obiektem powiązanym z zaciskami; UI wyjaśnia tor szeregowy K.

Dodaj wszystkie source check IDs przypisane temu etapowi z data/qa-source-checks.json i odpowiednie R1–R10 z BA_UX_QA_odbior.md. Rozdziel automatyczne zachowanie, ręczny odbiór obrazu oraz elementy fizyczne unsupported. Nie zapisuj prób jako passed bez uruchomienia i dowodu.

## Kryterium końca sesji i raport

Zakończ konkretną jednostkę działającym kodem i testami albo zapisz precyzyjną blokadę źródłową. W docs/ele-exams/QA_11.md zapisz commit, zmienione modele/taskId, źródła, wyniki komend i dowody UX. Zaktualizuj rejestr postępu. Podaj użytkownikowi: co działa, co wymaga danych, jak odtworzyć oraz dokładną następną jednostkę. Przy pełnym odbiorze etapu przygotuj część do standardowego wydania zgodnie z repo; nie utożsamiaj przygotowania z publikacją Pages.

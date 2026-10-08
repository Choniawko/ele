# Instrukcje Codexa — gotowe układy i baza wiedzy ELE.02

Cel: **17 gotowych, złożonych i sprawdzonych układów** oraz osobna, rozbudowana baza wiedzy powiązana z aparatami, zaciskami, symbolami i torami tych układów. Wdrożenie dzielimy na 15 etapów i 30 jednostek pracy, które mogą być granicami sesji. Każdy etap ma konkretną funkcję do wydania.

Stan pakietu: przygotowane instrukcje i materiał wejściowy. Nie zmieniono aplikacji ani repo zdalnego. 101/108 mają istniejące importy; pozostałych 15 nie należy uznawać za zrealizowane tylko dlatego, że mają kartę/rysunek. 114 wymaga rozstrzygnięcia opisanych kwestii. Brak 102/111 i materiałów ELE.05.

Repo sprawdzone 8 października 2026: Choniawko/ele, `9c4895a817b5f5869d17b3cf23a3e9695d49f6cf`, aktualne origin/main w chwili przygotowania. Przy nowszym HEAD Codex ma dostosować się do kontraktów i zachować nowsze zmiany.

## Jak rozpocząć

1. Rozpakuj cały ZIP i udostępnij jego katalog Codexowi pracującemu w repozytorium.
2. Wklej prompt poniżej. Pierwsza sesja wdraża 00a — realną stronę wiedzy z całym dostarczonym materiałem.
3. Kolejne sesje wznawiają pracę z rejestru docs/ele-exams/implementation-state.json i następnego promptu z etapy/. Przenoś między sesjami repo z checkpointem; nie musisz ponownie opisywać wszystkich zadań.
4. Wydawaj zakończone etapy zgodnie z procesem repo. Otwarte źródło 114 nie blokuje wcześniejszych układów ani 117.

## Prompt startowy do wklejenia

```text
Kontynuujemy projekt Choniawko/ele. Masz paczkę
ELE02_plan_wdrozenia_Codex_2026-10-08 z materiałami i instrukcjami.
Naszym celem jest 17 gotowych, połączonych układów z dostarczonych zadań
oraz osobna baza wiedzy z pomocą w kontekście aparatu/zacisku/schematu.

Znajdź paczkę w udostępnionej przestrzeni. Przeczytaj ZACZNIJ_TUTAJ.md,
WYMAGANIA_WSPOLNE.md, KONTRAKTY_DANYCH.md, BA_UX_QA_odbior.md
i aktualne instrukcje repo. Nie cofaj zmian z nowszego HEAD.
Jeśli istnieje docs/ele-exams/implementation-state.json, odczytaj stan
i potwierdź go w kodzie i testach; nie nadpisuj go seedem.
Jeśli go brak, utwórz stan na podstawie data/implementation-state.seed.json.

Wybierz najwcześniejszą niewykonaną jednostkę ze spełnionymi zależnościami.
Bez wcześniejszego wdrożenia zacznij od etapy/00_baza_wiedzy.md, jednostka 00a.
W tej sesji wykonaj tę jednostkę do działającego kodu, testów i raportu.
Nie realizuj wszystkich 17 obwodów w jednym pośpiesznym PR.

Wiedza ma być częścią aplikacji React; podgląd HTML jest materiałem referencyjnym.
Zachowaj jedną topologię CircuitModel, dwa widoki i bieżący format importu.
Nowe profile aparatury dodawaj z dowodami, bez zmiany starych ID i rewizji.
Gotowe wzorce mają być kompletnie połączone, otwierane jako nowa kopia
z energią OFF i własną lekcją. Nie zamieniaj ich w puste ćwiczenia.

Wykonaj testy adekwatne do zmiany i wymagane bramki przed wydaniem.
Zapisz checkpoint w docs/ele-exams/implementation-state.json oraz QA_<etap>.md.
Raportuj tylko faktycznie wykonane testy. Nie deklaruj 17/17 na podstawie obrazów.
Jeżeli materiał blokuje część pracy, zapisz czego brakuje, nie zgaduj;
kontynuuj niezależny możliwy zakres. 114 ma osobną bramkę źródłową.
Na koniec podaj działającą funkcję, commit/PR, ograniczenia i następną jednostkę.
Przygotuj wynik do standardowego wydania repo; publikacja stosuje aktualne
upoważnienie użytkownika i procedurę RELEASING.md.
```

## Kolejność działających wdrożeń

| Etap | Wynik | Nowe zadania | Jednostki sesji | Cel układów narastająco* |
|---|---|---|---:|---|
| 00 | [Baza wiedzy: wszystkie materiały](etapy/00_baza_wiedzy.md) | — | 1 | 0/17 |
| 01 | [Gotowe wzorce 101/108 i pomoc w kontekście](etapy/01_wzorce_101_108.md) | 101, 108 | 2 | 2/17 |
| 02 | [Zadanie 105: pierwszy nowy kompletny układ](etapy/02_schodowe_105.md) | 105 | 1 | 3/17 |
| 03 | [Ochrona i trzy fazy: 103/110](etapy/03_rozdzielnice_103_110.md) | 103, 110 | 3 | 5/17 |
| 04 | [Energia i pomiar: L02/115](etapy/04_liczniki_L02_115.md) | L02, 115 | 3 | 7/17 |
| 05 | [Bistabilny z czasem: 106/107](etapy/05_bistabilne_106_107.md) | 106, 107 | 3 | 9/17 |
| 06 | [Zadanie 112: aparat i złączki w puszce](etapy/06_dopuszkowy_112.md) | 112 | 2 | 10/17 |
| 07 | [Zadanie 104: współpraca AZ i AS](etapy/07_zmierzch_104.md) | 104 | 2 | 11/17 |
| 08 | [Zadanie 116: sześć zacisków, trójkąt i pomiary](etapy/08_silnik_116.md) | 116 | 2 | 12/17 |
| 09 | [Zadanie 113: gotowość, kierunki, krańcówki](etapy/09_podnosnik_113.md) | 113 | 2 | 13/17 |
| 10 | [Zadanie 109: silnik kondensatorowy](etapy/10_jednofazowy_109.md) | 109 | 2 | 14/17 |
| 11 | [Zadanie L01: temperatura, fazy, silnik](etapy/11_temperatura_L01.md) | L01 | 2 | 15/17 |
| 12 | [Zadanie 114: źródło rezerwowe i bramka rozstrzygnięcia](etapy/12_rezerwa_114.md) | 114 | 2 | 16/17 po rozstrzygnięciu 114 |
| 13 | [Zadanie 117: regulacja jasności](etapy/13_sciemniacz_117.md) | 117 | 2 | 17/17 po rozstrzygnięciu 114 |
| 14 | [Odbiór całego zestawu i rozbudowa nauki](etapy/14_odbior_i_rozszerzenia.md) | — | 1 | 17/17 po rozstrzygnięciu 114 |

\* To docelowa liczba po odbiorze, nie obecny stan wykonania. 114 nie zwiększa liczby zweryfikowanych układów, dopóki nie zamkniemy jego bramki. Po zakończeniu pozostałych można mieć 16 gotowych + złożony szkic 114; pełny cel pozostaje 17 sprawdzonych.

Etapy mają jednostki aparat → pierwszy układ → drugi układ, gdzie jest to potrzebne. Codex może zakończyć sesję po modelu z testami, lecz etap otrzymuje odbiór dopiero po dostępnych wzorcach i wiedzy. Kolejność tabeli jest rekomendacją. Zależności w data/stage-plan.json pozwalają kontynuować niezależne części: gotowe profile 03a mogą zasilić następne etapy, nawet jeśli jeden układ 103/110 jeszcze czeka. Nierozstrzygnięte 114 nie jest zależnością 117, a AZ/AS nie blokuje motorów. Odbiór końcowy zależy od wszystkich pełnych etapów.

## Co zawiera paczka

- [Wymagania wspólne](WYMAGANIA_WSPOLNE.md): konkretne miejsca integracji, model danych, UX, solver, źródła i testy.
- [Kontrakty danych](KONTRAKTY_DANYCH.md): rejestr wzorców, sidecar lekcji, profile aparatów, kamera/powrót i checkpoint.
- [Kryteria BA/UX/QA](BA_UX_QA_odbior.md): konkretne scenariusze oraz bramki odbioru.
- etapy/: 15 oddzielnych promptów; zadania/: 17 kontraktów z wymaganiami, BOM, modelami i źródłowymi próbami.
- data/: kolejność etapów, macierz 17 zadań, 82 próby do implementacji i początkowy stan postępu.
- materialy/: komplet poprzednio przygotowanych kart, 25 artykułów, 40 rysunków PNG/SVG, dane zakupowe i dwa istniejące importy. Nie jest to 17 projektów importu.
- tools/validate-plan.py: kontrola kompletności planu i lokalnych referencji; nie zastępuje testów przyszłego wdrożenia.

Szczegóły nieznanych aparatów i punktów źródłowych są na kartach oraz w materialy/data/source-issues.json. Dokładna numeracja realnego wyrobu wymaga jego pełnej instrukcji. Jawny model dydaktyczny może trenować zasadę, lecz jego status nie dowodzi podłączenia 1:1 dowolnego kupionego egzemplarza.

## Następny zakres po wzorcach

Usprawnianie pustych ćwiczeń montażu/diagnozy, kolejne arkusze ELE.05 i tutoriale blogowe korzystają z tych samych artykułów, profili i fragmentów obwodu. Ich kontrakt jest przygotowany, ale nie udajemy opracowanych arkuszy, których nie otrzymaliśmy. Najpierw wydajemy użyteczną wiedzę i kolejne gotowe układy.

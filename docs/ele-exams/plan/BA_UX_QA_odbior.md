# Kryteria odbioru BA / UX / QA

## BA: wartość i pokrycie

| Kryterium | Dowód |
|---|---|
| Wszystkie dostarczone arkusze | Dokładnie 101,103,104,105,106,107,108,109,110,112,113,114,115,116,117,L01,L02 |
| Działające części po kolejnych wdrożeniach | Każdy etap ma widoczną funkcję, a publiczna galeria pokazuje tylko faktyczne statusy |
| Wzorzec dla każdego zadania | Pełna topologia, layout montażowy/schematyczny, źródło, próby; komplet nie obejmuje 102/111 i ELE.05 |
| Wiedza powiązana z praktyką | Każdy użyty aparat ma profil, opis symbolu i roli w konkretnym układzie; 60 kategorii BOM ma znaczące wyjaśnienie |
| Rozszerzalność | Nowe zadanie to nowy walidowany zestaw treści/wzorca/lekcji i prób, bez dodatkowego wielkiego switcha w App.tsx |
| Zakupy | Źródłowy BOM, modelowy BOM i wspólny zestaw rozpoznawalne; null 108 i warunki doboru nie zamienione w fikcyjne liczby |
| Dokładność | Brak klucza CKE nie zamienia zdań TAK/NIE w same prawdy; różnice aparatury i profili jawne |

## UX: scenariusze ręczne

1. Nowy użytkownik otwiera Wiedzę, wyszukuje „podtrzymanie”, wybiera 108 i odczytuje tor K1. Widzi różnicę K1/K2 oraz rolę STOP.
2. Otwiera gotowy układ 108, przechodzi do podglądu połączeń R2, znajduje końce jednej żyły i wraca do schematu. Nie myli całej puszki z jednym węzłem.
3. Zaznacza stycznik w swoim projekcie i klika Poznaj aparat. Czyta zasadę ogólną oraz konkretny profil, potem wraca do poprzedniego kadru i narzędzia.
4. Rozpoczyna przewód, otwiera teorię i wraca. Stan narzędzia jest zachowany lub wyraźnie zakończony zgodnie z ustaloną polityką; nie powstaje przypadkowe połączenie.
5. Otwiera 105 i sprawdza jedną korespondencję. Po wybraniu przewodu widzi opis, oba końce i podświetloną trasę, bez konieczności śledzenia samego koloru.
6. Zmienia jedno połączenie w kopii; drugi widok i tabela natychmiast pokazują tę samą zmianę. Undo przywraca jeden obwód, nie tylko grafikę.
7. Otwiera kartę 112, widzi oryginalny nieuzupełniony schemat oraz osobny uzupełniony wariant BIS-402. Każdy jest podpisany źródłem i statusem.
8. Na 390×844 znajduje Aparaty/Próby i powiększa rysunek. Ekran nie ma wymuszonego poziomego scrolla całej strony; rysunek może przewijać się we własnym obszarze.
9. Klawiaturą wybiera wynik, otwiera i zamyka powiększenie Esc. Fokus wraca do przycisku; modal go nie gubi pod kanwą.
10. Otwiera nowy wzorzec, gdy autosave poprzedniego projektu trwa. Błąd zapisu jest obsłużony, a poprzedni dokument nie ginie.

Dla każdej sesji UX zapisz build/commit, wymiary okna, kroki, wynik i zrzut. Wymagane ekrany: 1366×768,1920×1080,390×844,844×390. Nowa nawigacja ma nie zmniejszać obszaru pracowni bez sposobu schowania panelu. Screenshot ma zawierać realny wzorzec, nie pustą planszę.

## QA: obowiązkowe rodziny testów wzorca

| ID | Kontrola |
|---|---|
| R1 | ProjectDocument i katalog: istniejące opublikowane ID, rewizje, zaciski, settings i rozmiary |
| R2 | Komplet węzłów: aparat/żyła/mostek/kabel/assembly, N/PE i pojemności zacisków |
| R3 | Niezależnie odczytana topologia: funkcje styków, zasilanie, powroty, rozłączność faz |
| R4 | Próby funkcji z karty i dodatkowe sekwencje czasowe / powrotu energii |
| R5 | Negatywne przypadki związane z daną funkcją, np. usunięty mostek lub błędny N |
| R6 | Wszystkie odniesienia lekcji i profilów wskazują aktualną wersję i istniejące obiekty |
| R7 | Oba layouty, trasy i widoczność numerów; skrzyżowanie bez węzła i pokrywy |
| R8 | Otwarcie nowej kopii, energia OFF, import→eksport→import, odświeżenie i autosave |
| R9 | Baza wiedzy: pomoc kontekstowa, wyszukiwanie, powrót, kamera, klawiatura i mały ekran |
| R10 | E2E na tym samym produkcyjnym dist pod /ele/ i aktualny raport pokrycia |

W data/qa-source-checks.json są 82 próby do wdrożenia, w dokładnie tym samym brzmieniu co materiał wejściowy. Mają status specification, a nie passed. testDisposition wskazuje plan sposobu sprawdzenia; jeśli dane fizyczne są nieobsługiwane, test musi to jawnie wykazać i nie raportować fikcyjnego pomiaru. Kod testu i jego wynik powstaną podczas właściwego etapu.

Dodatkowe obowiązki modelu: sumy prądów i sprzężenie biegunów RCD4; sumowanie energii po czasie; krawędzie impulsu i cancel; wspólne mechanizmy NO+NC; napięcia uzwojeń i konfiguracja mostków; bodźce sond i histereza; model mocy i jasności. Zewnętrzna klatka React nie jest źródłem tych zachowań.

## Bramka 114 i dokładność realnych profili

Zweryfikowany przykład 114 wymaga rozstrzygnięcia czterech source issues oraz potwierdzenia wybranego KT. Każde resolution zawiera dowód i odróżnia rysunek od odpowiedzi TAK/NIE. Nie ma wymagania zdobycia klucza, aby wyjaśnić rysunek; bez klucza nie podpisujemy jednak własnych odpowiedzi jako oficjalnych.

Szkic montażowy 114 może być dostępny jako draft, a symulacja jasno opisanej interpretacji jako model edukacyjny. Nie jest wtedy zweryfikowanym wzorcem egzaminacyjnym. Kryterium „17/17 zweryfikowanych” pozostaje otwarte. Publikacja 117 i reszty nie czeka na tę kwestię.

Dokładne podłączenie realnych AZ/AS/CKF/licznika/silnika 1f wymaga konkretnej instrukcji, wersji i mapy zacisków. Jawny model dydaktyczny może służyć treningowi funkcji, ale UI pokazuje granicę przenoszenia na wybrany realny wyrób. Cele „model działa” i „połączenie 1:1” mają odrębne dowody.

## Raport wydania

Raport zawiera tabelę wszystkich 17 taskId: status treści, status projektu, fidelity, testy funkcji, pomiary, UX, source issues, referenceRevision, commit i link do dowodów. Otwarte kwestie nie giną przy zmianie statusu etapu. Cały raport zwięźle określa, co naprawdę jest dostępne po wdrożeniu i jaka jest następna jednostka.

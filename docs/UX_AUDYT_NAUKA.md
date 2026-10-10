# Audyt UX i plan nauki schematów — październik 2026

Cel aplikacji: nauczyć się od zera czytać schematy z arkuszy ELE.02, przenosić je w myślach na rzeczywistą instalację i składać realistyczne układy. Ten dokument opisuje, co sprawdzono, co poprawiono w tej iteracji i jak dalej modernizować aplikację. Dotyczy gałęzi `fix/audit-v0.3.0-learning`.

## 1. Kontrola połączeń 101 i 108

### Model elektryczny jest zgodny z arkuszami

Pełne netlisty obu wzorców porównano zacisk po zacisku z rysunkami z arkuszy (101: rys. 1 i 2, 108: rys. 1 i 2). Wszystkie węzły się zgadzają, nie ma zbędnych ani brakujących połączeń.

- **101:** RCD rozdziela L i N na B10 i B6. B10 zasila H1 i GW. B6 zasila H2 i COM Q1. Korespondencje Q1:1–Q2:1 i Q1:2–Q2:2 są rozdzielne. COM Q2 zasila OP1 i OP2 równolegle. PE dochodzi do GW, OP1 i OP2.
- **108:** K2 zamienia L1 z L3 (K2:2T1→W, K2:6T3→U, V bez zmian). Sterowanie: Q1 → Q2 13–14 → STOP S1 → STOP S3 szeregowo. START S1, START S3 i K1 13–14 są równoległe, potem NC K2 21–22 i cewka K1. S2 i S4 są równoległe, potem NC K1 21–22 i cewka K2, bez podtrzymania.

Liczby żył na odcinkach schematu jednokreskowego 101 też zgadzają się z modelem. Między puszkami P1 i P2 jest pięć żył: dwie korespondencje, żyła łączeniowa do OP1, N i PE.

### Błędy rysowania, które pokazywały złe połączenia (naprawione)

| Miejsce | Co widział uczeń | Przyczyna |
|---|---|---|
| Lekcja 101, rysunek „gniazdo, kontrolka H1 i PE” | H1 w szeregu z gniazdem i linia L zwarta z N | Automatyczny rysunek kładł sieci L i N na tej samej linii |
| Tablica 108, styczniki K1 i K2 | 9 przewodów sterowania przechodziło przez zaciski mocy 1L1/3L2/5L3 i 2T1/4T2/6T3 | Zaciski 13/21/14/22 leżą w tej samej kolumnie co zaciski mocy, a przewód wychodził prosto w górę lub w dół |
| Starsze scenariusze (silnik 6 zacisków, przekaźnik czasowy, bistabilny) | Przewody przez cudze zaciski (np. U1 przez W2) | Ta sama przyczyna |

Wprowadzone zabezpieczenia, które obejmą też kolejne zadania:

- Router przewodów wyprowadza żyłę z zacisku bokiem, przez najbliższą wolną szczelinę między zaciskami, jak zagięty przewód między śrubami.
- Test `przewód nie przechodzi przez cudzy zacisk` sprawdza geometrię 101, 108 i wszystkich scenariuszy. Test e2e `wireGeometry` zgłasza teraz także dotknięcie cudzego pierścienia zacisku.
- `diagramConflicts` w `validateReference` odrzuca rysunek lekcji, w którym dwie różne sieci nakładają się, stykają albo linia przechodzi przez symbol lub zacisk innej sieci.

### Uwagi o realizmie do decyzji (bez zmian w modelu)

- **101, złączki w puszkach:** P2.Ls:2, P1.N:2 i P1.PE:2 mają po dwa przewody na jednym zacisku. Dla kostki śrubowej to dopuszczalne, dla złączki typu WAGO 221 nie. Warto wybrać jeden typ złączki i modelować złączki 3- i 5-torowe.
- **101, spójność rozgałęzień:** korespondencja 1 ma złączkę w P2, a korespondencja 2 przechodzi przez P2 bez złączki. Żyła do OP1 przechodzi przez P1 bez złączki. Elektrycznie poprawne, dydaktycznie myli.
- **108, Q2:1:** dwa przewody o różnych przekrojach (2,5 i 1,5 mm²) w jednym zacisku. Należy to potwierdzić z danymi aparatu albo zasilić Q1 ze złączki.

## 2. Audyt UX — co przeszkadzało w nauce

| # | Problem | Stan |
|---|---|---|
| P1 | Aplikacja startuje od pustej tablicy bez wskazówki. Te same 17 zadań jest dostępne z czterech miejsc: Baza wiedzy → Zadania, Gotowe układy, Przykłady, Ćwiczenia | Częściowo: panel „Od czego zacząć?” na pustej tablicy i ścieżka nauki w bazie wiedzy. Przykłady i Ćwiczenia w nagłówku pozostają |
| P2 | W treściach dla ucznia dużo informacji audytowych: bramki odbioru, rewizje, SHA-256, polityka zakupów, wybór nieistniejącej kwalifikacji ELE.05, powtarzany baner i stopka z zastrzeżeniami | Poprawione |
| P3 | Lekcja jako ściana kilkunastu przycisków, rysunek w okienku 380 px, stan układu jako jedna linia tekstu | Poprawione |
| P4 | Rysunki lekcji z wewnętrznymi identyfikatorami (`pole1`) i jednym błędnym schematem | Poprawione |
| P5 | Brak animacji: nie widać, które przewody są pod napięciem i którędy płynie prąd | Poprawione |
| P6 | Lekcja nie pokazuje oryginalnego arkusza, więc nie ćwiczy przenoszenia rysunku egzaminacyjnego na układ | Poprawione |
| P7 | „Czytanie schematów” to cztery artykuły tekstowe, w tym dwa o przyciskach. Brak symboli i ćwiczeń | Poprawione |
| P8 | Widok „Schemat” w pracowni to siatka kart aparatów z kolorowymi liniami, nie schemat | Do zrobienia (R2) |
| P9 | Widok połączeń na tablicy jest zatłoczony: wiązki wokół obudów, nakładające się żyły | Częściowo: usunięte przejścia przez zaciski. Ogólny porządek tras w R3 |
| P10 | Pasek narzędzi pracowni ma ponad 20 kontrolek widocznych jednocześnie | Do zrobienia (R5) |
| P11 | Brak montażu krok po kroku, choć to główny cel nauki | Do zrobienia (R1) |

## 3. Co zmieniono w tej iteracji

- **Baza wiedzy.** Nawigacja ma cztery pozycje: Start, Nauka schematów, Zadania, Aparaty. Strona startowa prowadzi ścieżką: symbole → lekcja 101 → lekcja 108 → wszystkie zadania. Gotowe układy są na górze listy zadań. Zestaw stanowiska przeniesiono do stopki.
- **Karta zadania.** Wyraźny przycisk do lekcji. Lista aparatów pokazuje element, ilość i parametry z arkusza. Założenia modelu, warianty zakupu, bramki odbioru i kwestie źródłowe są w zwiniętych sekcjach.
- **Nauka schematów.** Słownik 15 symboli w uproszczonej postaci PN-EN 60617, w tym kreski żył N i PE na schemacie jednokreskowym. Dwa ćwiczenia na oryginalnych rysunkach: 8 pytań o liczbę żył w 101 i 7 pytań o moc i sterowanie w 108. Pulsujący okrąg wskazuje miejsce na arkuszu. Po odpowiedzi widać żyły modelu z kolorem izolacji i zaciskami. Odpowiedzi są sprawdzane testem względem modelu obwodu.
- **Lekcja 101/108.** Duża scena rysunku z trzema widokami: Arkusz egzaminacyjny, Schemat lekcji, Tablica lekcji. Obok panel ze sterowaniem, stanem układu jako lampkami i wyborem toru. Instrukcja „Jak czytać ten schemat” pojawia się w kroku Zrozum.
- **Animacja prądu.** Na schemacie lekcji tor pod napięciem fazowym jest pomarańczowy, a powrót N z prądem niebieski. Na tablicy lekcji i w pracowni po żyłach z prądem płyną kropki w kierunku umownym dodatniej połówki. Animacja respektuje ograniczony ruch.
- **Pracownia.** Na pustej tablicy pojawia się panel z trzema drogami: nauka schematu, lekcja 101 albo gotowy układ 101 lub 108 do pracy.

## 4. Docelowy sposób nauki

Każde zadanie przechodzi te same pięć kroków na jednym modelu obwodu:

1. **Zobacz** — oryginalny arkusz z oznaczonymi miejscami.
2. **Czytaj** — krótkie pytania o symbole, liczbę żył i rodzaj połączenia, z odpowiedzią wskazaną na arkuszu i w modelu.
3. **Prześledź** — lekcja: schemat, tablica i prąd zsynchronizowane. Wybór toru podświetla go w obu widokach.
4. **Złóż** — montaż prowadzony, potem samodzielny, z oceną połączeń.
5. **Sprawdź** — przewidywanie skutku, próby z arkusza i pomiary.

## 5. Plan dalszej modernizacji

Kolejność według wpływu na naukę:

- **R1. Montaż prowadzony („Złóż krok po kroku”) dla 101 i 108.** Aparaty stoją na miejscach, przewodów brak. Aplikacja podaje kolejne połączenie słowami z arkusza, np. „Połącz B6:2 z COM łącznika Q1: żyła L, 1,5 mm², brązowa”. Uczeń klika dwa zaciski i od razu dostaje ocenę. Ocena porównuje sieci (`permanentNets`), a nie identyfikatory żył, więc dopuszcza równoważne rozwiązania. Wariant samodzielny pokazuje na końcu listę różnic: brakujące połączenia, zbędne połączenia i zamienione żyły.
- **R2. Schemat w stylu arkusza.** Dla każdego zadania ręcznie ułożony schemat w symbolach IEC, z układem jak na arkuszu: jednokreskowy dla 101, pionowe gałęzie sterowania dla 108. Symbole są powiązane z aparatami i zaciskami modelu, kolorowane na żywo i sprawdzane przez `diagramConflicts`. Zastępuje siatkę w widoku „Schemat” dla wzorców.
- **R3. Realistyczna tablica.** Przewody w korytkach z pasami i wiązkami. Otwarte puszki z jednolitym typem złączek (3- i 5-torowe). Wejście żyły z korytka prosto na zacisk. Reguły kolorów: PE tylko zielono-żółty, N niebieski.
- **R4. Ćwiczenia czytania dla każdego nowego zadania** (105, 103, 110…) w formacie `packages/knowledge/schematic-course.ts`, z testem zgodności z modelem.
- **R5. Prostsza pracownia.** W nagłówku trzy wejścia: Nauka, Zadania (połączone Przykłady i Ćwiczenia), Moje projekty. Pasek narzędzi zależny od trybu: Nauka, Montaż, Pomiary.
- **R6. Pomiary egzaminacyjne w lekcji:** ciągłość PE, rezystancja izolacji, próba RCD, z animacją sond miernika.
- **R7. Postęp nauki:** zapamiętane ukończone ćwiczenia i lekcje, widoczne na stronie startowej.

## 6. Bramki jakości dla każdego nowego zadania

Każde z kolejnych zadań z `docs/ele-exams/plan/zadania` musi przejść:

1. Test netlisty względem arkusza: pełne grupy zacisków i rozłączność grup.
2. `validateReference` bez błędów, w tym bez konfliktów rysunku.
3. Test `przewód nie przechodzi przez cudzy zacisk` dla tablicy wzorca.
4. Ćwiczenie czytania z odpowiedziami sprawdzonymi na modelu.
5. Po wdrożeniu R1: montaż prowadzony z tym samym modelem.

## 7. Stan testów po zmianach

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (335 testów) i `pnpm build` przechodzą.
- E2E: baza wiedzy, lekcje, wzorce 101/108, geometria przewodów, pracownia, biblioteka i edycja przewodów przechodzą. Testy e2e, które sprawdzały usunięte elementy UX, zaktualizowano.
- `layout.spec.ts`: test przeciągania silnika nie przechodzi także na kodzie sprzed zmian, a test przenoszenia RCD jest niestabilny na obu wersjach. Wymagają osobnej naprawy.

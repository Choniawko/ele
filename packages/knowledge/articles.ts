import { sources as s } from "./sources";
import type { Article, KnowledgeSource } from "./types";
const headings = [
  ["function", "Do czego służy"],
  ["appearance", "Wygląd i symbole"],
  ["operation", "Jak działa"],
  ["reference", "Stan odniesienia"],
  ["terminals", "Mapa zacisków"],
  ["parameters", "Jak czytać parametry"],
  ["applications", "Klasyczne zastosowania"],
  ["mistakes", "Typowe pomyłki"],
  ["practice", "Przykład krok po kroku"],
  ["limits", "Dane produktu i granice modelu"],
] as const;
function article(
  id: string,
  title: string,
  summary: string,
  synonyms: string[],
  illustrationProductId: string,
  exampleId: string | undefined,
  refs: KnowledgeSource[],
  text: Record<(typeof headings)[number][0], string>,
  related: string[],
): Article {
  return {
    id,
    slug: id,
    title,
    summary,
    synonyms,
    illustrationProductId,
    exampleId,
    qualifications: ["ELE.02", "ELE.05"],
    level: [
      "stycznik",
      "blok-pomocniczy",
      "silnik",
      "zabezpieczenia-silnikowe",
    ].includes(id)
      ? "Średni"
      : "Podstawy",
    status: "published",
    sections: headings.map(([sectionId, heading]) => ({
      id: sectionId,
      title: heading,
      paragraphs: text[sectionId].split("\n"),
      sourceIds: ["appearance", "terminals", "parameters"].includes(sectionId)
        ? refs.filter((r) => r.id !== "model").map((r) => r.id)
        : refs.filter((r) => r.id === "model").map((r) => r.id),
    })),
    sources: refs,
    related,
  };
}
export const articles: Article[] = [
  article(
    "laczniki",
    "Łączniki i przyciski NO/NC",
    "Rozróżnij stałe położenie łącznika i chwilowe działanie przycisku.",
    [
      "przycisk",
      "start",
      "stop",
      "NO",
      "NC",
      "normalnie otwarty",
      "normalnie zamkniety",
      "schodowy",
    ],
    "schneider-xb5aa35",
    "start-stop",
    [s.button, s.model],
    {
      function:
        "Łącznik utrzymuje wybrane położenie. Przycisk chwilowy wraca po puszczeniu. NO zamyka obwód po naciśnięciu, NC go przerywa. STOP w klasycznym sterowaniu wykorzystuje NC, aby naciśnięcie usunęło zasilanie cewki.",
      appearance:
        "Łącznik ścienny ma klawisz; przycisk panelowy ma operator i blok styków. Na rysunku przerwa przy ruchomym styku oznacza NO, a połączenie z oznaczeniem styku rozwiernego — NC. Nie rozpoznawaj funkcji wyłącznie z koloru operatora.",
      operation:
        "Operator porusza mechanizm. W przycisku wielostykowym jeden ruch może zamknąć NO i otworzyć NC; pary pozostają elektrycznie oddzielne. Przełącznik schodowy łączy wspólny COM z jednym z dwóch torów.",
      reference:
        "Dla chwilowego przycisku stan odniesienia oznacza brak nacisku. NO jest otwarty, NC zamknięty. Dla łącznika dwupołożeniowego rysunek pokazuje jawnie wybrane położenie; „bez napięcia” nie cofa mechanicznego klawisza.",
      terminals:
        "XB5AA35: 13–14 to NO, 21–22 to NC. Profil edu-start-stop ma inny zapis: STOP 1–2, START 3–4 oraz dwa niezależne operatory. Numery są własnością konkretnego modelu, a nie uniwersalnym skrótem funkcji.",
      parameters:
        "Sprawdź liczbę styków, prąd i napięcie dla obciążenia oraz sposób działania. Prąd dopuszczalny styku nie jest prądem cewki. Średnica otworu montażowego dotyczy operatora, nie szerokości modułu DIN.",
      applications:
        "START NO zasila chwilowo cewkę. STOP NC znajduje się w szeregu ze wszystkimi gałęziami START i podtrzymania. W instalacji schodowej dwa przełączniki COM/1/2 wybierają drogę fazy do lampy.",
      mistakes:
        "NC nie oznacza „zawsze pod napięciem”. Pomylenie NO z NC odwraca działanie. Połączenie STOP tylko z gałęzią START zostawia zasilony tor podtrzymania. Połączenie COM z N w obwodzie schodowym może powodować zwarcie.",
      practice:
        "W zweryfikowanej lekcji ELE.02-108 znajdź S1:3–4 (START NO) oraz S1:1–2 (STOP NC). Są to niezależne operatory dydaktycznego stanowiska, a nie jeden operator XB5AA35. Przewidź wynik, naciśnij i puść START, następnie STOP. Porównaj te same zaciski na tablicy i schemacie.",
      limits:
        "Rysunki są autorską pomocą do odczytu połączeń. Model nie symuluje drgań styków ani zużycia. XB5AA35 jest konkretnym SKU; obudowy i numeracja edu-* to jawne modele edukacyjne.",
    },
    ["stycznik", "blok-pomocniczy"],
  ),
  article(
    "stycznik",
    "Stycznik",
    "Cewka uruchamia wspólny mechanizm kilku oddzielnych torów.",
    ["kontaktor", "K1", "cewka", "A1", "A2", "TeSys", "LC1D09P7"],
    "schneider-lc1d09p7",
    "start-stop",
    [s.contactor, s.tesys, s.coil, s.model],
    {
      function:
        "Stycznik pozwala małym obwodem sterowania załączać oddzielny obwód odbiornika. Cewka uruchamia styki główne; styki pomocnicze przekazują informację o położeniu mechanizmu albo uczestniczą w logice sterowania.",
      appearance:
        "Obudowa ma zaciski mocy, cewki i ewentualne pomocnicze. Na schemacie prostokąt cewki i kilka symboli styków mogą leżeć daleko od siebie. Wspólne oznaczenie K1 oraz odniesienie do mechanizmu wiąże je w jeden aparat.",
      operation:
        "Napięcie cewki powoduje przyciągnięcie zwory. Mechanizm zamyka główne NO i pomocnicze NO, a otwiera NC. Po odłączeniu sprawna sprężyna przywraca spoczynek. Cewka i styki nie mają przez to wspólnego potencjału.",
      reference:
        "Rysunek dokumentacyjny pokazuje cewkę bez pobudzenia: NO otwarte, NC zamknięte. Przełącz „Widok działania”, aby zobaczyć stan wyliczony. Nie kopiuj zamkniętego podczas pracy NO jako jego symbolu odniesienia.",
      terminals:
        "LC1D09P7 ma A1/A2, trzy tory 1L1–2T1, 3L2–4T2, 5L3–6T3, NO 13–14 i NC 21–22. Rola NO wynika z połączeń, nie z numeru zacisku. W zweryfikowanym zadaniu ELE.02-108 własny K1:13–14 podtrzymuje prawy kierunek; K2:13–14 pozostaje niewykorzystany.",
      parameters:
        "Uc określa zasilanie cewki; LC1D09P7 ma 230 V AC. Prąd AC-3 opisuje użycie ze wskazanym rodzajem obciążenia. Nie zastępuj go dowolnym większym prądem AC-1 i nie obliczaj rezystancji DC cewki z poboru VA.",
      applications:
        "Załączanie silnika, grzałki oraz obwody START/STOP. Dwa styczniki mogą zmieniać kolejność faz, ale wymagają blokad. Stycznik sam nie zapewnia ochrony przeciążeniowej silnika.",
      mistakes:
        "A1/A2 nie są wejściem i wyjściem mocy. Samo zasilenie 13 nie pobudza cewki. Numer 13–14 nie nadaje automatycznie roli podtrzymania. Nie przypisuj wszystkim odmianom tej samej cewki ani dodatkowych styków.",
      practice:
        "W lekcji ELE.02-108 prześledź Q1 → Q2.AUX → STOP S1 i S3 → równoległe START S1/S3 oraz K1:13–14 → NC K2:21–22 → K1:A1, a K1:A2 → N. Po puszczeniu START cewka nadal ma drogę przez własny NO K1. Każdy STOP przecina wszystkie równoległe drogi. Lewy K2 działa tylko podczas trzymania S2 lub S4.",
      limits:
        "W katalogu dane znamionowe SKU oddzielono od rezystancyjnego modelu cewki. Solver nie odtwarza indukcyjności, udaru, łuku ani dynamiki zwory. Rezystancja DC cewki tego SKU jest nieznana; model pomiaru nie wymyśla jej wartości.",
    },
    ["laczniki", "blok-pomocniczy", "zabezpieczenia-silnikowe", "silnik"],
  ),
  article(
    "blok-pomocniczy",
    "Blok pomocniczy",
    "Dodatkowe styki należą do mechanizmu aparatu nadrzędnego.",
    ["LADN11", "KA1", "podtrzymanie", "53", "54", "61", "62"],
    "edu-auxiliary",
    "start-stop",
    [s.auxiliary, s.model],
    {
      function:
        "Blok zwiększa liczbę styków pomocniczych stycznika lub innego kompatybilnego aparatu. Nie ma własnej cewki. Do logiki można użyć NO, NC albo obu, zależnie od rzeczywistego wariantu.",
      appearance:
        "Fizycznie jest dołączany do aparatu nadrzędnego. Na rysunku jego styki mają własną identyfikację i odniesienie do rodzica. Przerywana relacja mechanizmu nie przedstawia żyły.",
      operation:
        "Ruch rodzica przenosi się na blok. W pracowni wymaga to sprzężenia assembly. Ustawienie bloków obok siebie na tablicy nie tworzy tego sprzężenia. Osobny interlock między stycznikami ma inną funkcję.",
      reference:
        "Dla niepobudzonego rodzica NO pozostaje otwarty, NC zamknięty. Stan bloku zależy od mechanizmu rodzica, także gdy zasilona cewka jest mechanicznie zablokowana.",
      terminals:
        "LADN11: NO 53–54, NC 61–62. LADN11P ma inną numerację: NO 13–14 i NC 21–22. Profil edu-auxiliary wykorzystuje pierwszy zapis, lecz nie jest opublikowanym modelem rzeczywistego LADN11.",
      parameters:
        "Sprawdź zgodność mechaniczną, liczbę styków i zdolność łączenia obciążenia sterowania. Sama pasująca numeracja nie potwierdza możliwości zamontowania bloku na dowolnym styczniku.",
      applications:
        "NO równoległy do START może podtrzymać cewkę. NC przeciwnego mechanizmu blokuje drugą cewkę w układzie prawo/lewo. Dodatkowy styk może też sterować sygnalizacją.",
      mistakes:
        "Przypisanie KA1 do K2 zamiast K1 zmienia logikę. Przewód od cewki do „mechanizmu” jest błędem pojęciowym. Nie mostkuj obu zacisków NO, bo wtedy styk nie ma możliwości przerwania obwodu.",
      practice:
        "Wybierz KA1:53–54. Znajdź oba końce gałęzi równoległej do S1. Załącz START i obserwuj zamknięcie KA1. Puść START: ścieżka przez KA1 pozostaje. STOP odbiera napięcie cewce, która otwiera także ten styk.",
      limits:
        "Model edukacyjny ma sprawdzone odniesienie numeracji, lecz nie geometrię pełnego SKU. Własna instalacja może nadać tym stykowym torom inne role; pomoc ogólna opisuje NO/NC, a funkcję podtrzymania opisuje tylko wzorzec.",
    },
    ["stycznik", "laczniki"],
  ),
  article(
    "przekaznik",
    "Przekaźnik elektromagnetyczny",
    "Oddziel obwód cewki od przełączanych zestyków.",
    ["relay", "COM", "11", "12", "14", "gniazdo"],
    "edu-relay",
    undefined,
    [s.finder, s.model],
    {
      function:
        "Przekaźnik elektromagnetyczny przekazuje stan obwodu sterującego do jednego lub kilku oddzielnych zestyków. Stycznik i przekaźnik wykorzystują podobną zasadę elektromagnetyczną, ale mają różne przeznaczenia i zdolności łączeniowe.",
      appearance:
        "Często widać przezroczystą obudowę w gnieździe; na schemacie cewkę oraz zestyk przełączny COM/NC/NO. Jeden wspólny zacisk przełącza się między dwiema drogami.",
      operation:
        "Po pobudzeniu cewki ruchomy styk przechodzi z NC do NO. Obwód zestyku wymaga własnego zasilania: cewka nie „wysyła” na niego napięcia. Kilka zestyków porusza się wspólnie, zachowując separację torów.",
      reference:
        "Bez pobudzenia cewki COM–NC jest połączone, COM–NO rozłączone. W dokumentacji stan odniesienia nie jest stwierdzeniem, że na COM nie ma napięcia.",
      terminals:
        "Profil edu-relay: A1/A2, pierwszy zestyk 11(COM),12(NC),14(NO), drugi 21/22/24. To mapa modelu dydaktycznego. Numery pinów samego przekaźnika mogą różnić się od napisów na gnieździe.",
      parameters:
        "Porównaj napięcie i rodzaj cewki, dopuszczalny prąd i kategorię obciążenia zestyków. Cewka DC z diodą może wymagać polaryzacji. Nie przenoś tych założeń na model AC.",
      applications:
        "Pośredniczenie między wyjściem sterownika a obciążeniem, sygnalizacja i logika przekaźnikowa. Do zasilania silnika stosuje się właściwie dobrany aparat łączeniowy, a nie dowolny mały przekaźnik.",
      mistakes:
        "Pomylenie NC z NO daje odwróconą reakcję. Połączenie z numerem pinu bez sprawdzenia podstawy może trafić w inny tor. Wspólny napis A1 nie potwierdza zgodności napięcia różnych cewek.",
      practice:
        "Na ilustracji odszukaj cewkę i pierwszy zestyk. Przewidź: przy odłączonej cewce droga 11–12 jest ciągła. Po pobudzeniu dostępna staje się 11–14. Narysuj osobne źródło obciążenia przy COM; nie prowadź żyły od symbolu cewki do styku.",
      limits:
        "Dostępny jest edu-relay. Brak zweryfikowanego opublikowanego zestawu przekaźnik + gniazdo i przygotowanego interaktywnego przykładu. Teoria i mapa modelu są dostępne; dobór konkretnej podstawy wymaga osobnej weryfikacji.",
    },
    ["stycznik", "zasilacze"],
  ),
  article(
    "bistabilny",
    "Przekaźnik bistabilny",
    "Kolejny impuls zmienia stan; puszczenie przycisku go nie odwraca.",
    ["impulsowy", "BIS-411", "pamiec", "wiele miejsc"],
    "edu-bistable",
    "bistabilny",
    [s.bistable, s.model],
    {
      function:
        "Bistabilny pozwala sterować oświetleniem chwilowymi przyciskami z wielu miejsc. Każdy poprawny impuls przełącza stan wyjścia. Nie wymaga gałęzi samopodtrzymania jak klasyczny stycznik.",
      appearance:
        "Moduł DIN ma przyłącza zasilania, wejścia sterującego i wyjścia. Na rysunku rozróżnij elektronikę sterującą od zestyku. Symbol zwykłego NO sam nie opisuje pamięci impulsowej urządzenia.",
      operation:
        "Przyciski równoległe podają impuls na wspólne wejście. Model reaguje na zbocze, po opóźnieniu 150 ms; przytrzymanie nie tworzy wielu impulsów. Kolejny impuls po puszczeniu wyłącza odbiornik.",
      reference:
        "Dla tej wersji modelu po zaniku zasilania pamięć jest kasowana. Niektóre inne urządzenia zachowują stan — sprawdź instrukcję wariantu zamiast przyjmować jedną zasadę dla wszystkich bistabilnych.",
      terminals:
        "Przejrzany wariant BIS-411 230 V i edu-bistable: N=1, L=3, wejście=6, COM=11, NC=10, NO=12. Nie używaj konwencji 11/12/14 zwykłego przekaźnika do tego modelu.",
      parameters:
        "Rodzaj impulsu i napięcie wejścia muszą pasować do zasilania. Prąd styku dotyczy obciążenia wyjścia. Ograniczenia dla LED wynikają również z udaru i wymagają danych producenta.",
      applications:
        "Kilka przycisków w korytarzu, sterowanie lampą z wielu miejsc. Każdy przycisk dołącza ten sam sygnał; nie jest przełącznikiem schodowym i nie wymaga dwóch korespondencji.",
      mistakes:
        "Podanie zasilania na COM nie zasila elektroniki. Zamiana 10 i 11 odwraca lub odcina wyjście. Dwa przyciski szeregowe wymagają jednoczesnego naciśnięcia, więc nie dają niezależnych miejsc sterowania.",
      practice:
        "Załącz zasilanie. Wciśnij S1, odczekaj 200 ms i puść. H1 pozostaje włączona. Wciśnij S2 po raz drugi i odczekaj: H1 gaśnie. W tabeli znajdź przewody od obu przycisków do wspólnego XT1.",
      limits:
        "BIS-411 pozostaje zablokowanym SKU, bo nie ma ukończonej weryfikacji geometrii. Demonstracja korzysta z edu-bistable, a nie fikcyjnie opublikowanego produktu. Opóźnienie i reset pamięci to jawny zakres modelu.",
    },
    ["laczniki", "czasowe"],
  ),
  article(
    "czasowe",
    "Przekaźniki czasowe i automat schodowy",
    "Odliczanie czasu i przełączanie styków to odrębne funkcje.",
    ["czasowka", "timer", "AS-212", "PCU-510", "opoznienie"],
    "edu-timer",
    undefined,
    [s.stairs, s.timer, s.model],
    {
      function:
        "Przekaźnik czasowy wykonuje wybraną zależność czasową, np. opóźnione załączenie. Automat schodowy zapala lampę po impulsie i wyłącza ją po ustawionym okresie. Łącznik schodowy jest mechaniczny i nie odmierza czasu.",
      appearance:
        "Moduł ma pokrętła czasu/funkcji i opis przyłączy. Schemat pokazuje zasilanie elektroniki oraz wyjście. Obok styku należy czytać oznaczenie funkcji czasowej lub wykres, a nie tylko NO/NC.",
      operation:
        "Dla opóźnienia załączenia A wejście zasilania rozpoczyna odliczanie, po którym przełącza się wyjście. Automat po impulsie utrzymuje światło. Restart, przedłużanie i reakcja na trzymanie przycisku zależą od modelu.",
      reference:
        "Przed pobudzeniem zestyki przełączne mają COM–NC. Stan po odliczeniu nie jest stanem odniesienia. Funkcje cykliczne zaczynające pracą lub przerwą dają różny pierwszy odcinek przebiegu.",
      terminals:
        "edu-staircase / odniesienie AS-212: N=1, L=3, sterowanie=6, fazowe wyjście=5. edu-timer / odniesienie PCU: 230 V przez 1–3 albo 24 V przez 4–3; COM 8/11, NC 7/10, NO 9/12.",
      parameters:
        "Zakres pokrętła i mnożnik razem określają czas. Oznaczenie napięcia nie pozwala podłączyć dwóch alternatywnych zasilań jednocześnie. Prąd dopuszczalny zależy od kategorii obciążenia.",
      applications:
        "Oświetlenie klatki schodowej, zwłoka uruchomienia, cykliczne wietrzenie. Automat może podawać fazę na wyjście, podczas gdy czasówka może mieć osobne styki bezpotencjałowe.",
      mistakes:
        "Zamiana wyjścia fazowego na suchy styk grozi zwarciem obwodów. Mylenie funkcji C i D zmienia pierwszy stan cyklu. Brak N odcina elektronikę mimo fazy na styku.",
      practice:
        "Na ilustracji rozdziel wejście zasilania od zestyku. Dla funkcji A i czasu 5 s przewidź: zaraz po zasileniu NO jest otwarty; po 5 s zamknięty; odłączenie resetuje cykl. Przykłady czasówki i automatu są także w menu Przykłady pracowni.",
      limits:
        "AS-212 i PCU-510 są rekordami ze zweryfikowaną topologią, bez ukończonego SKU. Diagram pokazuje profil edu-timer. Model czasu nie jest pomiarem tolerancji rzeczywistego urządzenia ani wszystkich jego funkcji.",
    },
    ["bistabilny", "przekaznik"],
  ),
  article(
    "mcb",
    "Wyłącznik nadprądowy MCB",
    "Przeciążenie i zwarcie wymagają ochrony nadprądowej.",
    ["eska", "bezpiecznik", "B16", "C", "MBN116E"],
    "hager-mbn116e",
    "lampa",
    [s.mcb, s.model],
    {
      function:
        "MCB rozłącza obwód przy nadmiernym prądzie. Część cieplna reaguje na przeciążenie, a elektromagnetyczna na duży prąd zwarciowy. Nie zastępuje ochrony różnicowoprądowej.",
      appearance:
        "Moduł DIN ma dźwignię, oznaczenie charakterystyki i prądu oraz zaciski. Symbol przedstawia tor rozłączany z funkcją zabezpieczenia; w rysunku edukacyjnym jest opisany MCB, aby nie pomylić go ze zwykłym łącznikiem.",
      operation:
        "Dłuższe przeciążenie nagrzewa mechanizm. Silny prąd powoduje szybkie wyzwolenie. Po wyzwoleniu usuwa się przyczynę i wykonuje wymagany reset; samo ponowne ON nie jest diagnozą.",
      reference:
        "Na rysunku odniesienia tor jest pokazany otwarty i opisany OFF. Dokument powinien podać położenie, bo brak napięcia nie przestawia automatycznie dźwigni MCB.",
      terminals:
        "MBN116E ma jeden tor 1–2. W wielobiegunowym modelu edu-mcb3 występują 1–2, 3–4, 5–6. Numeracja i sposób zasilenia zależą od instrukcji konkretnego aparatu.",
      parameters:
        "B16 oznacza charakterystykę B i prąd znamionowy 16 A, a 6 kA — zdolność zwarciową w podanych warunkach. Żadna z tych liczb nie jest oczekiwanym prądem roboczym odbiornika.",
      applications:
        "Ochrona przewodów obwodu oświetlenia lub gniazd. Dobór wymaga przekroju, sposobu ułożenia, obciążenia, impedancji pętli oraz koordynacji; same waty lampy nie wystarczają.",
      mistakes:
        "Większy prąd znamionowy nie naprawia powtarzającego się wyzwalania. MCB nie wykrywa dowolnego małego upływu. Oznaczenie C nie jest ogólnie „lepsze” od B.",
      practice:
        "W układzie lampy znajdź QF1 przed S1. Przy QF1 ON zamknięcie S1 zasila obie gałęzie lamp. Przy QF1 OFF S1 nie ma skąd doprowadzić fazy. Prześledź drogę do H1 i H2 w tabeli.",
      limits:
        "Parametry MBN116E są katalogowe; wyzwalanie w solverze ma jawne przybliżenie B/C i nagrzewania. Wynik nie odtwarza katalogowej krzywej ani nie potwierdza samoczynnego wyłączenia rzeczywistej instalacji.",
    },
    ["rcd", "zabezpieczenia-silnikowe"],
  ),
  article(
    "rcd",
    "RCD i RCBO",
    "Oddziel wykrywanie upływu od ochrony przeciążeniowej.",
    ["roznicowka", "RCCB", "RCBO", "TEST", "30 mA"],
    "edu-rcd",
    "bistabilny",
    [s.rcd, s.model],
    {
      function:
        "RCCB wykrywa różnicę prądów płynących przez kontrolowane tory. RCBO łączy funkcję różnicowoprądową z nadprądową. Prąd znamionowy RCCB opisuje dopuszczalny prąd toru, nie próg ochrony przeciążeniowej.",
      appearance:
        "Aparat ma dźwignię, TEST i oznaczenia prądów. Schemat musi pokazać wszystkie kontrolowane tory. PE nie przechodzi przez rozłączany tor RCD. W naszym rysunku opis „RCCB” odróżnia funkcję od MCB.",
      operation:
        "Prąd wracający przez N powinien równoważyć prąd fazy. Część wracająca przez PE lub inną drogę może uruchomić wyzwolenie. TEST tworzy wewnętrzną drogę próbną przy obecnym zasilaniu.",
      reference:
        "Rysunek OFF ma otwarte tory. Stan ON nie oznacza skutecznej ochrony w dowolnej błędnie zbudowanej instalacji. Przed pomiarem ciągłości trzeba odłączyć źródła; TEST jest inną czynnością.",
      terminals:
        "Profile edu-rcd / edu-rcbo mają 1–2 dla fazy oraz N-in–N-out. Są dydaktyczne. Nie przenoś położenia ani kierunku zasilania na dowolny aparat rzeczywisty; sprawdź jego oznaczenia.",
      parameters:
        "In dotyczy obciążalności, IΔn — znamionowego prądu różnicowego. Typ aparatu określa rozpoznawane przebiegi prądu. Symulator obsługuje ograniczony profil sinusoidalny; nie rozstrzyga doboru typu dla elektroniki.",
      applications:
        "Dodatkowa ochrona obwodów i kontrola prądu wracającego. Za RCCB odpowiednie zabezpieczenie nadprądowe pozostaje potrzebne. Neutralne różnych obwodów nie mogą dowolnie omijać ich aparatów.",
      mistakes:
        "Połączenie N i PE za RCD tworzy nieprawidłową drogę powrotu. Wspólny N z innego RCD może wyzwalać aparat. Przycisk TEST nie zastępuje pełnych pomiarów instalacji.",
      practice:
        "W przykładzie bistabilnym znajdź FI1 i osobny XPE1. Prześledź L i N przez FI1, a PE bezpośrednio od źródła. Zasilanie lampki zależy od wyjścia bistabilnego, ale jej PE pozostaje połączony także przy wyłączonym świetle.",
      limits:
        "Przykład używa edu-rcd. Solver upraszcza sumowanie prądów i orientację torów, bez pełnego modelu przekładnika i wszystkich przebiegów. Odczyt w demonstracji nie jest protokołem ochrony przeciwporażeniowej.",
    },
    ["mcb", "zlaczki"],
  ),
  article(
    "zabezpieczenia-silnikowe",
    "Zabezpieczenia silnikowe",
    "Termik, wyłącznik silnikowy i stycznik wykonują różne zadania.",
    ["termik", "95", "96", "97", "98", "przeciazenie", "MPCB"],
    "edu-thermal",
    "start-stop",
    [s.thermal, s.model],
    {
      function:
        "Przekaźnik przeciążeniowy wykrywa przeciążenie i otwiera tor sterowania stycznika. Wyłącznik silnikowy rozłącza tory mocy i ma własną funkcję przeciążeniową oraz zwarciową. Stycznik wykonuje częste łączenie, ale nie jest takim zabezpieczeniem.",
      appearance:
        "Termik zwykle współpracuje ze stycznikiem i ma nastawę prądu. Na rysunku pojawiają się tory pomiarowe mocy oraz osobno styki 95–96 i 97–98. Nie są to kolejne fazowe zaciski główne.",
      operation:
        "W profilu edu-thermal narasta stan cieplny. Wyzwolenie otwiera NC 95–96. Dopiero ta przerwa w szeregu z cewką powoduje odpadnięcie stycznika i rozłączenie mocy. Sam termik tego modelu nie otwiera torów głównych.",
      reference:
        "Nieprzeciążony termik ma zamknięte 95–96 i otwarte 97–98. Rysunek po wyzwoleniu wymaga opisu TRIPPED. Przyczyna zadziałania i możliwość resetu to odrębne zagadnienia.",
      terminals:
        "edu-thermal: trzy ciągłe tory 1L1–2T1, 3L2–4T2, 5L3–6T3; NC 95–96; NO 97–98. edu-motor-protection: rozłączane 1–2,3–4,5–6; osobny NO może być przypisany przez assembly.",
      parameters:
        "Nastawę dobiera się z tabliczki silnika i sposobu włączenia zabezpieczenia. Nie kopiuj prądu z innego silnika ani nie utożsamiaj nastawy z prądem zwarciowym. Dokładna klasa wyzwalania wymaga karty produktu.",
      applications:
        "Sterowanie silnika START/STOP: STOP i NC termika są szeregowo przed gałęziami podtrzymania. NO sygnalizacyjny może wskazywać wyzwolenie. Wyłącznik silnikowy przed stycznikiem może pełnić inną część ochrony.",
      mistakes:
        "Wpięcie 95–96 równolegle do START usuwa ochronę sterowania. Zmostkowanie tego styku maskuje przeciążenie. Termik nie zastępuje przewodu PE, a sam stycznik nie zastępuje termika.",
      practice:
        "Znajdź F1:95–96 między S0 a XC0. Prześledź, dlaczego przerwa w tym miejscu odbiera napięcie zarówno przy trzymanym START, jak i przy zamkniętym KA1. Oddziel to od trzech torów F1 w widoku mocy.",
      limits:
        "Dostępne są profile dydaktyczne termika i wyłącznika silnikowego. Brak opublikowanego zweryfikowanego SKU i katalogowych krzywych. Model cieplny uczy zależności obwodu, nie stanowi doboru przemysłowego zabezpieczenia.",
    },
    ["stycznik", "mcb", "silnik"],
  ),
  article(
    "zlaczki",
    "Złączki, listwy, mostki i szyna DIN",
    "Wspólny potencjał musi wynikać z połączenia elektrycznego.",
    ["WAGO", "listwa", "mostek", "szyna", "DIN", "TH35", "wezel"],
    "edu-bus-n",
    "lampa",
    [s.wago, s.model],
    {
      function:
        "Złączka utrzymuje połączenie żył. Listwa porządkuje wiele zacisków; mostek łączy wybrane potencjały. Szyna DIN utrzymuje mechanicznie aparaty. Sam montaż obok siebie nie łączy ich elektrycznie.",
      appearance:
        "Na tablicy widać otwory zacisków i ewentualny mostek. Na schemacie wspólny węzeł oznacza połączenie; samo skrzyżowanie bez kropki go nie tworzy. Każdy przewód w tabeli ma dwa rzeczywiste końce.",
      operation:
        "Wielowejściowa złączka jednego potencjału łączy wszystkie tory. Wielopiętrowa złączka może mieć kilka oddzielnych potencjałów. Liczba otworów nie pozwala rozstrzygnąć, który wariant oglądasz.",
      reference:
        "Pasywne połączenia nie zależą od nacisku ani napięcia. Na rysunku odniesienia mostek pozostaje połączeniem. Szyna mechaniczna nie jest automatycznie N ani PE.",
      terminals:
        "edu-bus-n ma wewnętrznie połączone 1–5; nazwa modelu nie nadaje potencjału N. W przykładzie XC0 przenosi fazę sterowania. edu-junction-terminal łączy 1–2. PE w edu-bus-pe jest jawnie połączony przewodami.",
      parameters:
        "Sprawdź przekrój, materiał żyły, dopuszczalną liczbę żył i sposób zakończenia. Moment dokręcenia jest daną producenta. Nie wciskaj dwóch żył w zacisk dopuszczający jedną.",
      applications:
        "Rozgałęzienie zasilania dwóch lamp, wspólny neutralny, rozdział PE, połączenia szafy sterowniczej. Mostki silnika tworzą Y/Δ i są częścią elektrycznej topologii.",
      mistakes:
        "Rysowanie kropki na przypadkowym skrzyżowaniu zmienia obwód. Traktowanie całej listwy jako jednego potencjału może zewrzeć fazy. Kolor obudowy nie zastępuje sprawdzenia mapy torów.",
      practice:
        "W układzie lampy znajdź XL2:1–3. Jedna żyła doprowadza fazę z S1, a dwie prowadzą do H1 i H2. Na schemacie węzeł streszcza trzy końce; w tabeli wciąż znajdują się trzy fizyczne odcinki.",
      limits:
        "Złączki demonstracyjne są profilami edukacyjnymi. Rzeczywiste WAGO i listwy wielopiętrowe wymagają weryfikacji torów i geometrii. Model nie wylicza jakości dokręcenia ani nagrzewania konkretnej podstawy.",
    },
    ["laczniki", "silnik"],
  ),
  article(
    "zasilacze",
    "Zasilacze i AC/DC",
    "Zasilanie cewki i rodzaj źródła muszą do siebie pasować.",
    ["HDR-60", "Mean Well", "24V", "230V", "plus", "minus", "polaryzacja"],
    "meanwell-hdr60-24",
    undefined,
    [s.supply, s.model],
    {
      function:
        "Zasilacz przekształca energię wejścia w wymagane napięcie wyjściowe. AC zmienia się okresowo, DC ma ustaloną polaryzację. Cewka 24 V DC nie jest zamiennikiem cewki 230 V AC.",
      appearance:
        "Moduł ma osobno zaciski wejściowe L/N i wyjściowe +V/−V. Symbol funkcjonalny oddziela te strony. Kilka zacisków +V może być powtórzeniem tego samego potencjału, a nie niezależnymi źródłami.",
      operation:
        "HDR-60-24 dostarcza izolowane 24 V DC. Prąd obciążenia wynika z obwodu; dopuszczalny prąd wyjścia ogranicza użyteczne obciążenie. Odłączenie AC w końcu usuwa zasilanie DC, choć model nie odtwarza czasu rozładowania.",
      reference:
        "Przy odłączonym wejściu demonstracyjny zasilacz nie dostarcza energii. −V nie staje się automatycznie N ani PE. Rysunek oddziela obie strony także w stanie pracy.",
      terminals:
        "Dla HDR-60-24 katalog używa L,N,−V1,−V2,+V1,+V2; aplikacyjne przyrostki odróżniają powtórzone wyprowadzenia. Rysunek producenta podaje fizyczne pozycje 1/2 −V,3/4 +V,5 L,6 N.",
      parameters:
        "24 V określa napięcie znamionowe, 2,5 A prąd znamionowy wariantu. Moc odbiorników, zakres wejściowy i warunki cieplne wpływają na dobór. Sprawność nie jest napięciem wyjściowym ani rezystancją izolacji.",
      applications:
        "Sterowanie DC, przekaźniki, sygnalizacja i czujniki. W pracowni przykład „DC” ma odrębną cewkę oraz szyny +/−. Zachowanie izolacji należy rozumieć niezależnie od koloru przewodu.",
      mistakes:
        "Podłączenie 230 V do cewki 24 V jest niepoprawne. Przy diodzie gaszącej odwrócona polaryzacja ma znaczenie. Połączenie −V z N bez uzasadnienia znosi założoną separację.",
      practice:
        "Na ilustracji odszukaj wejście L/N i oddzielne wyjście +V/−V. Prześledź prąd DC: +V → odbiornik → −V. Następnie porównaj odrębny obwód poboru AC, bez przewodu przez izolację.",
      limits:
        "HDR-60-24 jest opublikowanym SKU. Solver upraszcza ograniczenie prądu i nie symuluje tętnień, hiccup, udaru ani rozruchu. Rysunek modelu nie jest kompletnym schematem elektroniki wewnętrznej.",
    },
    ["przekaznik", "stycznik"],
  ),
  article(
    "silnik",
    "Silnik trójfazowy",
    "Rozpoznaj uzwojenia, mostki i kolejność faz.",
    [
      "motor",
      "gwiazda",
      "trojkat",
      "Y",
      "delta",
      "U1",
      "V1",
      "W1",
      "prawo",
      "lewo",
    ],
    "edu-motor-six",
    "prawo-lewo",
    [s.motor, s.model],
    {
      function:
        "Silnik zamienia energię elektryczną w ruch. Trzy fazy zasilają uzwojenia, wytwarzając wirujące pole. W przykładzie prawo/lewo zmiana dwóch faz zmienia kierunek; nie wymaga zmiany PE.",
      appearance:
        "Silnik ma korpus, tabliczkę i skrzynkę zaciskową. Na rysunku funkcjonalnym pokazujemy trzy uzwojenia z nazwami końców. PE łączy korpus ochronnie, a nie stanowi końca uzwojenia.",
      operation:
        "Prąd w trzech uzwojeniach zależy od napięć i połączenia. W gwieździe trzy końce tworzą wspólny punkt; w trójkącie koniec jednego łączy się z początkiem następnego. Kierunek wynika z kolejności faz.",
      reference:
        "Bez zasilania silnik nie jest pobudzony, ale mostki pozostają połączeniami. Schemat odniesienia pokazuje otwarte styczniki. Widok działania rozróżnia brak fazy, błędne mostki i pracę.",
      terminals:
        "edu-motor-six ma U1–U2,V1–V2,W1–W2 oraz PE. Gwiazda przykładu łączy U2,V2,W2. Trójkąt wymaga U1–W2,V1–U2,W1–V2. Geometryczne ustawienie śrub nie zastępuje odczytu ich oznaczeń.",
      parameters:
        "Tabliczka określa napięcia dla Δ/Y, prąd, moc i częstotliwość. Nie każdy silnik można połączyć w Δ przy danym napięciu sieci. Profil edukacyjny ma uzwojenia dla 230 V; przy około 400 V międzyfazowo wzorzec używa Y.",
      applications:
        "START/STOP, zmiana kierunku i rozruchy odpowiednie dla silnika. Prawo/lewo stosuje dwa styczniki oraz blokadę elektryczną i mechaniczną. Rozruch Y/Δ wymaga dodatkowego projektu i właściwej tabliczki.",
      mistakes:
        "Wspólny punkt Y nie jest automatycznie N. Brak jednego mostka nie tworzy poprawnej gwiazdy. Jednoczesne załączenie obu kierunków może zewrzeć fazy. Zamiana trzech faz cyklicznie nie odwraca kolejności.",
      practice:
        "W przykładzie uruchom K1, zatrzymaj STOP, uruchom K2. W widoku mocy odszukaj zamianę L1 i L3, w sterowaniu — NC przeciwnego bloku. Próba drugiego START przy pracującym pierwszym nie powinna załączyć drugiego mechanizmu.",
      limits:
        "Silnik jest modelem dydaktycznym rezystancyjnym. Solver rozpoznaje sieci Y/Δ i fazy; nie wylicza momentu, poślizgu, udaru ani obrotów rzeczywistej maszyny. Brak opublikowanego SKU silnika i tabliczki przemysłowej.",
    },
    ["stycznik", "zabezpieczenia-silnikowe", "zlaczki"],
  ),
];

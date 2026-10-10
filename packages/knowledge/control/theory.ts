// Theory for the "Układy sterowania" topic. It explains what the book shows
// only by example. Each section may embed a live circuit from circuits.ts.

export interface TheorySection {
  title: string;
  paragraphs: string[];
  list?: string[];
  table?: { head: string[]; rows: string[][] };
  /** Circuit id shown as a live simulation under the section. */
  demo?: string;
}
export interface TheoryArticle {
  id: string;
  title: string;
  lead: string;
  sections: TheorySection[];
  /** Circuits to practise afterwards. */
  practice: string[];
}

export const theoryArticles: TheoryArticle[] = [
  {
    id: "jak-czytac",
    title: "Jak czytać schemat stykowy",
    lead: "Schemat sterowania czyta się jak drabinę: dwie szyny zasilania i poziome szczeble — tu pionowe gałęzie — między nimi. Każda gałąź kończy się odbiornikiem.",
    sections: [
      {
        title: "Szyny i gałęzie",
        paragraphs: [
          "U góry jest szyna +24 V (lub L przy 230 V), na dole 0 V (lub N). Między nimi rysuje się pionowe gałęzie, czyli ścieżki prądowe. W każdej gałęzi u góry są styki (warunki), a na dole odbiornik: cewka, lampka, brzęczyk.",
          "Prąd płynie od szyny górnej w dół. Odbiornik działa, gdy wszystkie styki na drodze od góry do niego są zamknięte. Przy czytaniu idź więc od szyny +24 V w dół i przy każdym styku pytaj: czy jest teraz zamknięty?",
          "Gałęzie numeruje się od lewej do prawej (liczby nad szyną). Numer gałęzi to adres: mówi, gdzie na rysunku szukać danego styku.",
        ],
        demo: "uklad-1",
      },
      {
        title: "Stan spoczynku",
        paragraphs: [
          "Schemat zawsze przedstawia stan beznapięciowy: przyciski są puszczone, cewki bez napięcia, przekaźniki czasowe nie liczą. Styk NO jest wtedy otwarty, NC zamknięty.",
          "Ten sam rysunek opisuje więc wiele stanów pracy, a uczeń musi w myślach „przełączać” styki. W tej aplikacji symulator rysuje styki w aktualnym położeniu i oznacza zadziałany aparat strzałką ⇑ — tak jak w programie użytym w książce. Na papierze styki zawsze zostają w spoczynku.",
        ],
      },
      {
        title: "Jeden aparat, wiele symboli",
        paragraphs: [
          "Cewka stycznika K1 jest w jednej gałęzi, a jego styki mogą być w kilku innych. Łączy je tylko wspólne oznaczenie K1. Gdy cewka dostanie napięcie, wszystkie styki K1 przełączają się jednocześnie, gdziekolwiek są narysowane.",
          "Żeby szybko je odnaleźć, pod cewką rysuje się tabelę styków (odsyłacze): w lewej kolumnie numery gałęzi ze stykami rozwiernymi (NC), w prawej — ze zwiernymi (NO). Kliknij cewkę w symulatorze, a podświetlą się wszystkie styki tego aparatu.",
        ],
      },
      {
        title: "Oznaczenia literowe",
        paragraphs: [
          "Litera mówi, czym jest aparat, a liczba — który to egzemplarz.",
        ],
        table: {
          head: ["Oznaczenie", "Aparat"],
          rows: [
            ["S", "łącznik sterowniczy: przycisk, przełącznik, wyłącznik krańcowy"],
            ["K", "stycznik lub przekaźnik pomocniczy"],
            ["T, KT", "przekaźnik czasowy"],
            ["H", "lampka sygnalizacyjna"],
            ["HA", "sygnalizator dźwiękowy (brzęczyk, syrena)"],
            ["B", "czujnik (zbliżeniowy, krańcowy elektroniczny)"],
            ["Q", "łącznik w obwodzie mocy, np. wyłącznik silnikowy"],
            ["M", "silnik"],
          ],
        },
      },
      {
        title: "Numery zacisków",
        paragraphs: [
          "Numery stoją z prawej strony symbolu, nazwa aparatu z lewej. Z numeru da się odczytać rodzaj styku bez patrzenia na symbol.",
        ],
        table: {
          head: ["Zaciski", "Znaczenie"],
          rows: [
            ["A1–A2", "cewka (przy DC: A1 do plusa)"],
            ["x3–x4, np. 13–14, 23–24", "styk zwierny (NO); pierwsza cyfra to numer kolejny styku"],
            ["x1–x2, np. 21–22, 31–32", "styk rozwierny (NC)"],
            ["3–4 / 1–2 przy przyciskach", "styk NO / NC łącznika sterowniczego"],
            ["15–16, 25–26", "styk rozwierny przekaźnika czasowego (zwłoka)"],
            ["17–18, 27–28", "styk zwierny przekaźnika czasowego (zwłoka)"],
            ["15–16–18", "styk przełączny przekaźnika (15 wspólny)"],
            ["X1–X2", "lampka sygnalizacyjna"],
            ["1/L1–2/T1, 3/L2–4/T2, 5/L3–6/T3", "styki główne stycznika (zasilanie / odbiornik)"],
          ],
        },
      },
      {
        title: "Trzy pytania do każdej cewki",
        paragraphs: [
          "Najskuteczniejsza metoda analizy: dla każdej cewki odpowiedz na trzy pytania.",
        ],
        list: [
          "Co ją załącza? — styki NO, które trzeba zamknąć (START, warunek innego stycznika, styk czasowy).",
          "Co ją podtrzymuje? — styk NO tego samego aparatu równolegle do drogi startowej.",
          "Co ją wyłącza lub blokuje? — styki NC w szeregu (STOP, blokada innego stycznika, styk czasowy kończący etap).",
        ],
      },
      {
        title: "Obwód sterowania i obwód mocy",
        paragraphs: [
          "Obwód mocy (silnik, styki główne, zabezpieczenia) i obwód sterowania (przyciski, cewki, lampki) rysuje się oddzielnie, często obok siebie. Łączą je styczniki: cewka i styki pomocnicze są w sterowaniu, styki główne w obwodzie mocy (układ 30).",
          "Przewody sterowania prądu stałego mają izolację niebieską, prądu przemiennego czerwoną, obwody mocy — czarną. PE zawsze zielono-żółty.",
        ],
      },
    ],
    practice: ["podstawy-no-nc", "uklad-1", "uklad-30"],
  },
  {
    id: "logika",
    title: "Styki jako funkcje logiczne",
    lead: "Każdy układ stykowy realizuje logikę: szereg to I, równoległe to LUB, styk rozwierny to NIE. Na tych trzech regułach zbudowany jest każdy sterownik.",
    sections: [
      {
        title: "TAK i NIE",
        paragraphs: [
          "Styk zwierny przewodzi, gdy aparat zadziała: to funkcja TAK (wyjście = wejście). Styk rozwierny przewodzi, gdy aparat nie zadziała: to negacja NIE.",
        ],
        demo: "podstawy-no-nc",
      },
      {
        title: "I (koniunkcja) i LUB (alternatywa)",
        paragraphs: [
          "Szeregowo połączone styki przewodzą tylko wtedy, gdy przewodzą wszystkie — to I (AND). Równolegle połączone przewodzą, gdy przewodzi choć jeden — to LUB (OR).",
          "Zasada praktyczna: przyciski START z kilku miejsc łączy się równolegle (LUB), a STOP szeregowo (każdy NC to warunek „nie wciśnięto STOP”, wszystkie razem — I).",
        ],
        table: {
          head: ["S1", "S2", "I (szereg)", "LUB (równolegle)"],
          rows: [
            ["0", "0", "0", "0"],
            ["1", "0", "0", "1"],
            ["0", "1", "0", "1"],
            ["1", "1", "1", "1"],
          ],
        },
        demo: "podstawy-i",
      },
      {
        title: "Funkcje złożone",
        paragraphs: [
          "Z TAK, NIE, I oraz LUB składa się wszystko inne. NOR (żaden nie pracuje) to dwa styki NC szeregowo. XOR (dokładnie jeden pracuje) to dwie równoległe drogi „A i nie B” oraz „B i nie A”, albo dwa NO równolegle w szeregu z dwoma NC równolegle.",
          "Pamięć (samopodtrzymanie) to już nie czysta logika, tylko układ sekwencyjny: wynik zależy od tego, co działo się wcześniej.",
        ],
        demo: "uklad-14",
      },
    ],
    practice: ["podstawy-lub", "uklad-9", "uklad-14", "uklad-26"],
  },
  {
    id: "samopodtrzymanie",
    title: "Samopodtrzymanie: pamięć stycznika",
    lead: "Przycisk START działa chwilę, a maszyna ma pracować do naciśnięcia STOP. Rozwiązaniem jest styk stycznika, który podtrzymuje własną cewkę.",
    sections: [
      {
        title: "Na czym polega",
        paragraphs: [
          "Równolegle do przycisku START łączy się styk zwierny tego samego stycznika (zwykle 13–14). Po naciśnięciu START cewka dostaje napięcie i zamyka ten styk. Od tej chwili prąd ma dwie drogi; puszczenie START zamyka jedną, ale druga zostaje.",
          "W szeregu z całością stoi STOP — styk rozwierny. Jego naciśnięcie przerywa obwód cewki, stycznik odpada i otwiera styk podtrzymania. Po puszczeniu STOP nie ma już żadnej drogi, więc stycznik zostaje wyłączony.",
        ],
        demo: "podstawy-podtrzymanie",
      },
      {
        title: "Dlaczego STOP jest rozwierny",
        paragraphs: [
          "Gdyby STOP był zwierny i miał „wyłączać” przez zamknięcie obwodu, uszkodzony przycisk albo urwany przewód oznaczałby brak możliwości zatrzymania. Przy rozwiernym STOP przerwa w obwodzie zatrzymuje maszynę — usterka kończy się bezpiecznym stanem.",
          "Z tego samego powodu wyłączniki awaryjne, krańcowe bezpieczeństwa i styki zabezpieczeń (np. przekaźnika termicznego 95–96) wpina się szeregowo jako NC.",
        ],
      },
      {
        title: "Dominacja wyłączania i załączania",
        paragraphs: [
          "Gdy STOP stoi przed równoległym blokiem START/podtrzymanie, przy obu wciśniętych przyciskach stycznik jest wyłączony — dominuje wyłączanie. To standard w maszynach.",
          "Gdy STOP przerywa tylko drogę podtrzymania, a START omija go bokiem, przy obu wciśniętych stycznik pracuje — dominuje załączanie. Porównaj w symulatorze oba warianty, naciskając najpierw STOP, potem START.",
        ],
        demo: "podstawy-dominacja",
      },
      {
        title: "Ochrona zanikowa",
        paragraphs: [
          "Po zaniku napięcia stycznik odpada i otwiera podtrzymanie. Gdy napięcie wróci, nic samo nie ruszy — trzeba ponownie nacisnąć START. Samopodtrzymanie jest więc jednocześnie zabezpieczeniem przed samoczynnym ponownym uruchomieniem.",
          "Inaczej jest z przełącznikiem bistabilnym (układy 9, 20, 27): po powrocie napięcia jego styk dalej jest zamknięty i maszyna rusza sama. Dlatego bistabilnych łączników używa się do zezwoleń i wyborów, a nie do bezpośredniego startu napędów.",
        ],
      },
      {
        title: "Wiele miejsc sterowania",
        paragraphs: [
          "Kolejne przyciski START dokłada się równolegle (obok starego START i styku podtrzymania), a kolejne STOP — szeregowo. Od każdego stanowiska do szafy biegną wtedy trzy żyły.",
        ],
        demo: "uklad-8",
      },
      {
        title: "Typowe błędy",
        paragraphs: [],
        list: [
          "Styk podtrzymania podłączony równolegle do całej gałęzi razem ze STOP — STOP przestaje działać.",
          "Styk podtrzymania innego stycznika (np. K2 13–14 przy cewce K1) — pamięć zależy od niewłaściwego aparatu.",
          "Rozwierny styk w miejscu podtrzymania — stycznik drga albo nie trzyma.",
          "Lampka sygnalizacyjna zasilona z przycisku zamiast ze styku stycznika — pokazuje stan przycisku, a nie maszyny.",
        ],
      },
    ],
    practice: ["uklad-1", "uklad-2", "uklad-8", "uklad-22"],
  },
  {
    id: "blokady",
    title: "Blokady i zezwolenia",
    lead: "Styk innego stycznika w gałęzi cewki to warunek. Rozwierny zabrania pracy (blokada), zwierny na nią pozwala (zezwolenie).",
    sections: [
      {
        title: "Blokada elektryczna",
        paragraphs: [
          "W gałęzi cewki K1 umieszcza się styk rozwierny K2, a w gałęzi K2 — rozwierny K1. Gdy pracuje jeden, drugi nie dostanie napięcia. Tak zabezpiecza się układy nawrotne: K1 i K2 podają fazy w różnej kolejności, więc ich jednoczesne zamknięcie to zwarcie międzyfazowe.",
          "Blokadę elektryczną uzupełnia się blokadą mechaniczną (łącznik między stycznikami) i przyciskową: przyciski kierunków mają po dwa styki — NO do własnej gałęzi i NC w gałęzi przeciwnej.",
        ],
        demo: "uklad-3",
      },
      {
        title: "Gdzie stoi styk blokady",
        paragraphs: [
          "Jeśli NC drugiego stycznika jest w szeregu z całą gałęzią, drugi kierunek można uruchomić dopiero po STOP (układ 3, 30).",
          "Jeśli NC jest tylko w drodze podtrzymania, a przycisk go omija, naciśnięcie drugiego przycisku przełącza pracę bez STOP: „ostatni wygrywa” (układy 10 i 15). Ten wariant nie nadaje się do nawrotu silnika w biegu.",
        ],
        demo: "uklad-10",
      },
      {
        title: "Zezwolenie (priorytet)",
        paragraphs: [
          "Styk zwierny K1 w gałęzi K2 sprawia, że K2 może pracować tylko przy pracującym K1. Wyłączenie K1 automatycznie wyłącza K2. Tak łączy się np. pompę oleju i silnik główny, wentylator i grzałkę.",
        ],
        demo: "uklad-4",
      },
      {
        title: "Silnik nawrotny w praktyce",
        paragraphs: [
          "Kompletny układ nawrotny ma: wyłącznik silnikowy z przekaźnikiem przeciążeniowym, którego styk NC jest w obwodzie sterowania, blokadę elektryczną i mechaniczną, a przy częstych nawrotach także przerwę czasową na zatrzymanie silnika.",
        ],
        demo: "uklad-30",
      },
    ],
    practice: ["uklad-3", "uklad-7", "uklad-11", "uklad-12", "uklad-30"],
  },
  {
    id: "kolejnosc",
    title: "Kolejność załączania i wyłączania",
    lead: "Łańcuch zezwoleń wymusza kolejność startu, a styki mostkujące przyciski STOP — kolejność zatrzymania.",
    sections: [
      {
        title: "Kolejne załączanie",
        paragraphs: [
          "Każdy następny stycznik ma w gałęzi styk NO poprzedniego. Dzięki temu nie da się uruchomić ich w złej kolejności, a zatrzymanie pierwszego zatrzymuje wszystkie następne.",
        ],
        demo: "uklad-4",
      },
      {
        title: "Wyłączanie w odwrotnej kolejności",
        paragraphs: [
          "Równolegle do przycisku STOP danego stycznika wpina się styk NO stycznika, który musi być wyłączony wcześniej. Dopóki tamten pracuje, styk mostkuje STOP i naciśnięcie przycisku nic nie robi.",
          "Klasyczny przykład to ciąg przenośników: start od końca, zatrzymanie od początku, żeby nie zasypać stojącego taśmociągu.",
        ],
        demo: "uklad-5",
      },
    ],
    practice: ["uklad-5", "uklad-6", "uklad-11", "uklad-17"],
  },
  {
    id: "czasowe",
    title: "Przekaźniki czasowe",
    lead: "Przekaźnik czasowy to stycznik, którego styki przełączają się z zaplanowanym opóźnieniem. Dwie podstawowe funkcje: zwłoka przy załączeniu i zwłoka przy wyłączeniu.",
    sections: [
      {
        title: "Opóźnione załączanie (TON)",
        paragraphs: [
          "Po podaniu napięcia na cewkę przekaźnik odlicza nastawiony czas, a potem przełącza styki. Gdy napięcie zniknie — także w trakcie liczenia — styki wracają od razu, a czas kasuje się do zera.",
          "Symbol: cewka z prostokątem z krzyżykiem. Styk ma „spadochron” skierowany tak, że hamuje ruch przy zamykaniu.",
        ],
        demo: "uklad-16",
      },
      {
        title: "Opóźnione wyłączanie (TOF)",
        paragraphs: [
          "Styki przełączają się od razu po podaniu napięcia. Po jego zaniku przekaźnik odlicza czas i dopiero wtedy styki wracają. Ponowne podanie napięcia w trakcie liczenia kasuje odliczanie. Zastosowanie: wybieg wentylatora, oświetlenie klatki schodowej.",
          "Symbol: cewka z czarnym prostokątem, spadochron odwrócony. Uwaga na nazewnictwo — część producentów przekaźników wielofunkcyjnych nazywa „opóźnionym wyłączaniem” funkcję impulsową (wyjście załącza się z napięciem i wyłącza po czasie, mimo że napięcie dalej jest). Książka na s. 18 opisuje właśnie taką funkcję, natomiast w układach 20 i 34 przekaźniki z czarnym prostokątem działają jak zwłoka po zaniku sterowania.",
        ],
        demo: "podstawy-czasowe",
      },
      {
        title: "Diagram czasowy",
        paragraphs: [
          "Najprostszy sposób na zrozumienie układu czasowego to rysunek: oś czasu i pod nią jedna linia dla każdego aparatu (0 lub 1). Dla każdej zmiany zapisz, co ją spowodowało.",
          "Symulator pokazuje odmierzany czas w prostokącie cewki. Przycisk „następne zdarzenie” przewija czas do chwili, w której przełączy się najbliższy przekaźnik.",
        ],
      },
      {
        title: "Typowe zastosowania",
        paragraphs: [],
        list: [
          "Łańcuch czasowy: styk jednego przekaźnika zasila następny — czasy się sumują (układy 17, 21).",
          "Automatyczny STOP: styk NC przekaźnika w drodze podtrzymania kończy cykl (układy 22, 32).",
          "Okno czasowe lampki: NO jednego przekaźnika „od”, NC następnego „do” (układy 28, 33).",
          "Generator: dwa przekaźniki nawzajem się kasują (układy 18, 23, 27).",
        ],
      },
    ],
    practice: ["uklad-16", "uklad-17", "uklad-20", "uklad-21", "uklad-22"],
  },
  {
    id: "generatory",
    title: "Praca cykliczna i generatory",
    lead: "Gdy przekaźnik czasowy kasuje sam siebie albo swojego poprzednika, układ zaczyna pracować w kółko. Tak powstają migacze, cykle świateł i automatyczne nawroty.",
    sections: [
      {
        title: "Generator z dwóch przekaźników",
        paragraphs: [
          "T2 zasila się przez rozwierny styk T3, a T3 przez zwierny styk T2. Faza 1: liczy T2. Faza 2: liczy T3. Gdy T3 skończy, odcina T2, który odcina T3 — i wszystko zaczyna od nowa. Czas każdej fazy ustawia się osobno.",
        ],
        demo: "uklad-18",
      },
      {
        title: "Jak analizować cykl",
        paragraphs: [
          "Zacznij od stanu po START i zapisz, który przekaźnik liczy. Potem dla chwili, w której skończy, zapisz po kolei zmiany: jego styki, odbiorniki, które przez to dostały lub straciły napięcie, i kolejne przekaźniki. Szukaj chwili, w której stan wraca do początkowego — to koniec okresu.",
          "W symulatorze włącz „zwolnione tempo”: każda zmiana stanu pojawia się osobno, a w dzienniku „Co się stało” widać jej przyczynę.",
        ],
        demo: "uklad-27",
      },
      {
        title: "Sekwencer krokowy",
        paragraphs: [
          "Każdy etap ma swój stycznik z podtrzymaniem. Etap rozpoczyna styk przekaźnika czasowego poprzedniego etapu, a kończy styk NC etapu następnego. Taki układ łatwo wydłużyć o kolejne etapy (cykl świateł, układ 36).",
        ],
        demo: "uklad-36",
      },
    ],
    practice: ["uklad-23", "uklad-24", "uklad-32", "uklad-34", "uklad-35"],
  },
  {
    id: "pomiary",
    title: "Sprawdzanie układu: tabela pomiarowa",
    lead: "Zanim podasz napięcie, sprawdź połączenia omomierzem. Tabela pomiarowa mówi, czego się spodziewać na każdym odcinku.",
    sections: [
      {
        title: "Pomiar ciągłości przy wyłączonym zasilaniu",
        paragraphs: [
          "Zasilacz musi być odłączony. Omomierzem mierzy się kolejno: przewód między zaciskami (oczekiwane 0 Ω — ciągłość), styk w spoczynku (NO: ∞ — przerwa, NC: 0 Ω) i odbiornik (cewka: kilkaset omów, np. 180 Ω dla cewki 24 V DC).",
          "Każdy styk przycisku sprawdza się dwa razy: w spoczynku i po naciśnięciu. Wynik powinien się zamienić (∞ ↔ 0 Ω). Styki stycznika sprawdza się po ręcznym wciśnięciu zwory, jeśli aparat to umożliwia.",
        ],
      },
      {
        title: "Na co uważać",
        paragraphs: [
          "Omomierz w układzie mierzy wszystko, co jest połączone z mierzonymi punktami. Otwarty styk może pokazać skończoną wartość, jeśli istnieje droga przez inne odbiorniki (np. cewka i lampka połączone przez szyny). Wtedy odłącza się jeden koniec elementu albo porównuje wynik z sumą rezystancji tej drogi.",
          "Lampki LED i czujniki elektroniczne nie są rezystorami — omomierz pokazuje dla nich wartość zależną od miernika albo przerwę. Ich sprawność sprawdza się pod napięciem.",
        ],
      },
      {
        title: "Tabela w każdym układzie",
        paragraphs: [
          "Każdy układ w tym dziale ma pod schematem tabelę pomiarową wygenerowaną z tego samego modelu co rysunek i symulacja. Układy 1–4 w książce mają takie tabele; tutaj są dla wszystkich, z wartościami w spoczynku i po zadziałaniu.",
        ],
      },
    ],
    practice: ["uklad-1", "uklad-2", "uklad-3", "uklad-4"],
  },
];

export const theoryById = (id: string) => theoryArticles.find((t) => t.id === id);

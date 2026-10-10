// Reading drills on the original exam drawings. Every answer is checked by a
// unit test against the reference CircuitModel, so the drill cannot drift
// away from the circuit that the lesson and the board show.

export interface DrillQuestion {
  id: string;
  /** Where to look on the original drawing, in image pixels. */
  spots: { x: number; y: number; r: number }[];
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  /** Conductors of the reference model that realise this line. */
  wires?: string[];
}
export interface Drill {
  id: string;
  referenceId: string;
  title: string;
  intro: string;
  figure: { png: string; width: number; height: number; alt: string };
  questions: DrillQuestion[];
}

const count = (n: number) => ["1", "2", "3", "4", "5"].indexOf(String(n));
const counts = ["1", "2", "3", "4", "5"];

export const drills: Drill[] = [
  {
    id: "101-kreski",
    referenceId: "ele02-101",
    title: "Schemat jednokreskowy 101: policz żyły",
    intro:
      "Na schemacie jednokreskowym jedna linia oznacza cały przewód. Ukośne kreski mówią, ile ma żył. Kreska z kropką to N, kreska zakończona poprzeczką (T) to PE. Pozostałe kreski to żyły fazowe i łączeniowe.",
    figure: {
      png: "assets/schematy/ELE02_101_p1_ideowy.png",
      width: 1350,
      height: 638,
      alt: "Schemat ideowy instalacji ELE.02-101: RCD, B10 z H1 i gniazdem, B6 z H2 i dwiema oprawami sterowanymi łącznikami schodowymi",
    },
    questions: [
      {
        id: "zasilanie",
        spots: [{ x: 310, y: 95, r: 42 }],
        question: "Ile żył ma przewód zasilający przed RCD?",
        options: counts,
        correct: count(3),
        explanation:
          "Trzy kreski: L, N (kropka) i PE (poprzeczka). L i N przechodzą przez RCD, PE omija go i trafia na szynę PE.",
        wires: ["W1", "W2", "W3"],
      },
      {
        id: "h1",
        spots: [{ x: 470, y: 238, r: 36 }],
        question: "Ile żył prowadzi do lampki kontrolnej H1?",
        options: counts,
        correct: count(2),
        explanation:
          "Dwie kreski: L za B10 i N. Lampka modułowa nie ma zacisku PE, więc nie ma trzeciej żyły.",
        wires: ["W9", "W14"],
      },
      {
        id: "gniazdo",
        spots: [{ x: 535, y: 368, r: 40 }],
        question: "Ile żył ma przewód do gniazda?",
        options: counts,
        correct: count(3),
        explanation:
          "Trzy kreski: L za B10, N i PE do bolca ochronnego. Gniazdo działa niezależnie od łączników schodowych.",
        wires: ["W10", "W16", "W18"],
      },
      {
        id: "b6-p1",
        spots: [{ x: 885, y: 236, r: 40 }],
        question: "Ile żył biegnie od B6 do pierwszej puszki (węzeł OP1)?",
        options: counts,
        correct: count(3),
        explanation:
          "Trzy kreski: L za B6 (trafi do COM łącznika Q1), N i PE dla opraw.",
        wires: ["W13", "W17", "W19"],
      },
      {
        id: "q1",
        spots: [{ x: 975, y: 322, r: 40 }],
        question: "Ile żył dochodzi do łącznika schodowego Q1?",
        options: counts,
        correct: count(3),
        explanation:
          "Trzy: faza do zacisku COM i dwie korespondencje 1 i 2. Łącznik nie potrzebuje N.",
        wires: ["W13", "W20", "W23"],
      },
      {
        id: "op1",
        spots: [{ x: 975, y: 170, r: 40 }],
        question: "Ile żył dochodzi do oprawy OP1?",
        options: counts,
        correct: count(3),
        explanation:
          "Trzy: L po łącznikach (z COM Q2), N i PE. Oprawa klasy I ma zacisk ochronny.",
        wires: ["W26", "W28", "W31"],
      },
      {
        id: "p1-p2",
        spots: [{ x: 1088, y: 236, r: 44 }],
        question: "Ile żył jest między węzłami OP1 i OP2 (puszki P1–P2)?",
        options: counts,
        correct: count(5),
        explanation:
          "Pięć: dwie korespondencje do Q2, żyła łączeniowa z COM Q2 z powrotem do OP1, N i PE. To najczęstsza pomyłka: liczba żył wynika z tego, co musi przejść między puszkami, nie z liczby odbiorników.",
        wires: ["W21", "W24", "W26", "W29", "W32"],
      },
      {
        id: "q2",
        spots: [{ x: 1195, y: 322, r: 40 }],
        question: "Ile żył dochodzi do łącznika schodowego Q2?",
        options: counts,
        correct: count(3),
        explanation:
          "Trzy: dwie korespondencje z Q1 i COM, z którego wraca faza do obu opraw.",
        wires: ["W22", "W24", "W25"],
      },
    ],
  },
  {
    id: "108-sterowanie",
    referenceId: "ele02-108",
    title: "Schemat 108: obwód mocy i sterowania",
    intro:
      "Ten rysunek jest wielokreskowy: każda linia to jedna żyła. Po lewej obwód mocy (L1, L2, L3 do silnika), po prawej obwód sterowania (L1 przez przyciski do cewek K1 i K2, powrót przez N). Styki w sterowaniu narysowano w stanie spoczynku.",
    figure: {
      png: "assets/schematy/ELE02_108_p2_moc-i-sterowanie.png",
      width: 1350,
      height: 1281,
      alt: "Schemat ELE.02-108: obwód mocy z Q2, K1, K2 i silnikiem oraz obwód sterowania z Q1, Q2, przyciskami S1–S4 i cewkami K1, K2",
    },
    questions: [
      {
        id: "stopy",
        spots: [
          { x: 800, y: 272, r: 38 },
          { x: 1182, y: 356, r: 38 },
        ],
        question: "Jak połączone są przyciski STOP S1 i S3?",
        options: ["Szeregowo", "Równolegle", "Nie są połączone"],
        correct: 0,
        explanation:
          "Szeregowo: styk rozwierny S1 1–2, potem S3 1–2. Naciśnięcie dowolnego STOP przerywa zasilanie obu cewek.",
      },
      {
        id: "starty",
        spots: [
          { x: 692, y: 458, r: 36 },
          { x: 815, y: 465, r: 36 },
          { x: 1182, y: 458, r: 36 },
        ],
        question:
          "Jak połączone są START S1, START S3 i styk K1 13–14 w gałęzi prawych obrotów?",
        options: ["Szeregowo", "Równolegle", "Każdy w innej gałęzi"],
        correct: 1,
        explanation:
          "Równolegle: wystarczy, że zamknie się jeden z nich, aby prąd popłynął dalej do cewki K1.",
      },
      {
        id: "podtrzymanie",
        spots: [{ x: 695, y: 455, r: 48 }],
        question: "Do czego służy styk K1 13–14?",
        options: [
          "Do podtrzymania K1 po puszczeniu START",
          "Do blokady K2",
          "Do zasilania silnika",
        ],
        correct: 0,
        explanation:
          "K1 po załączeniu zamyka własny styk 13–14, który mostkuje START. Dlatego po puszczeniu przycisku silnik nadal pracuje w prawo.",
      },
      {
        id: "blokada",
        spots: [{ x: 815, y: 595, r: 52 }],
        question: "Co jest w szeregu z cewką K1, tuż przed zaciskiem A1?",
        options: [
          "Styk rozwierny K2 21–22",
          "Styk zwierny K1 13–14",
          "Przycisk S4",
        ],
        correct: 0,
        explanation:
          "Styk NC K2 21–22 to blokada elektryczna: gdy pracuje K2, jego styk się otwiera i K1 nie może się załączyć.",
      },
      {
        id: "lewy",
        spots: [
          { x: 970, y: 465, r: 36 },
          { x: 1290, y: 458, r: 36 },
        ],
        question:
          "Dlaczego lewe obroty działają tylko przy trzymaniu S2 lub S4?",
        options: [
          "K2 nie ma styku podtrzymania",
          "S2 i S4 są rozwierne",
          "K2 jest zasilany przez N",
        ],
        correct: 0,
        explanation:
          "Gałąź K2 ma tylko równoległe przyciski S2 i S4, bez styku K2 13–14. Po puszczeniu przycisku cewka traci zasilanie.",
      },
      {
        id: "fazy",
        spots: [{ x: 470, y: 555, r: 90 }],
        question: "Które fazy zamienia stycznik K2 na wyjściu do silnika?",
        options: ["L1 i L3", "L1 i L2", "L2 i L3"],
        correct: 0,
        explanation:
          "K2 2 idzie do W, a K2 6 do U; V zostaje bez zmian. Zamiana dwóch faz odwraca kierunek wirowania silnika.",
      },
      {
        id: "zgoda",
        spots: [
          { x: 800, y: 140, r: 34 },
          { x: 800, y: 210, r: 34 },
        ],
        question: "Co musi być załączone, żeby obwód sterowania miał napięcie?",
        options: [
          "Q1 i wyłącznik silnikowy Q2 (styk 13–14)",
          "Tylko Q1",
          "Tylko K1",
        ],
        correct: 0,
        explanation:
          "Faza L1 idzie przez Q1, a potem przez styk pomocniczy Q2 13–14. Wyłączenie lub zadziałanie Q2 odcina całe sterowanie.",
      },
    ],
  },
];

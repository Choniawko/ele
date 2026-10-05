# Zakres silnika

Solver nie importuje Reacta, JointJS, DOM ani store. Kompiluje aparaty, przewody, mostki, źródła i aktywne usterki do gałęzi. Zmiana położenia/koloru nie zmienia rezystancji ani przepływu. Rezystancja przewodu wynika z materiału, temperatury, przekroju i elektrycznej długości. Szyna DIN i korytko są wyłącznie mechaniczne.

MNA z eliminacją Gaussa i pivotowaniem rozwiązuje napięcia węzłów oraz prądy źródeł; dwie prawe strony przenoszą część rzeczywistą i urojoną fazora RMS. Wyszukiwanie wysp służy do ustalenia odniesienia, nie do obliczania napięć. Napięcie między niezależnymi wyspami jest nieokreślone. Sprzeczne źródła idealne i połączenie aktywnych AC z DC kończą się kontrolowanym błędem. Granice: 2000 gałęzi, 650 niewiadomych/wyspę, 24 iteracje stanów.

| Zjawisko | Implementacja / granica |
|---|---|
| AC 1-fazowe | Fazory 50 Hz, rezystancje, źródło Thévenina; bez składowych przejściowych i harmonicznych |
| DC | Osobne, izolowane źródła; minus nie jest automatycznie N/PE |
| TN-S | Jawny mostek N–PE tylko w źródle; PE omija tor RCD |
| Trzy fazy | 230 V fazowe / około 398 V międzyfazowe, przesunięcie 120°, kolejność i zanik fazy |
| Odbiornik | R=Un²/Pn, rzeczywiste I i P z rozwiązania; oprawa z zaciskiem PE jest profilem klasy I |
| Wentylator jednofazowy | Dydaktyczny odpowiednik R=Un²/Pn, 80 W / 230 V, zaciski L/N/PE. Animacja pokazuje stan pracy, nie obliczone RPM, rozruch ani wybieg |
| Stycznik/przekaźnik | Cewka AC/DC, próg podtrzymania i pickup, oddzielne mechanicznie sprzężone kontakty; rezystancyjna cewka, brak indukcyjności |
| MCB/RCBO | Zatrzask wyzwolenia, ręczny reset; model B: 4×In, C: 7,5×In; stan cieplny narasta według jawnego przybliżenia. To nie krzywa IEC konkretnego SKU |
| RCCB | Sinusoidalny profil 30 mA; nie jest zabezpieczeniem nadprądowym. Dydaktyczne RCD/RCBO 2P liczą mniejsze z modułów I_L+I_N oraz I_L−I_N, akceptując dowolną orientację każdego toru. Upływ do PE i ominięcie N nadal wyzwalają aparat |
| Obsługa RCD/RCBO | Dźwignia ON/OFF, po wyzwoleniu reset przez OFF przed ponownym ON. TEST przy zamkniętych stykach i napięciu AC L–N odpowiada wewnętrznemu rezystorowi 4600 Ω (około 50 mA przy 230 V); bez trwałej usterki, dodatkowego przewodu i katalogowego czasu wyzwolenia. Brak napięcia lub usterka RCD blokują TEST |
| Termik | Stan cieplny; otwiera 95–96 i zamyka 97–98. Tory mocy pozostają ciągłe; stycznik odpada przez okablowanie cewki |
| Bistabilny | Jedna zmiana na zbocze; przytrzymanie nie generuje serii impulsów; 150 ms profilu; reset po zaniku |
| Schodowy | Odmierzanie czasu po przycisku, przedłużenie, podtrzymanie podczas trzymania, utrata stanu po zaniku |
| Czasówka | Funkcje A/B/C/D inicjowane zasilaniem, dwa zestyki; zmiana nastaw w UI zatrzymuje próbę. Alternatywne 24 V i 230 V, kontrola podwójnego zasilania |
| HDR-60 | 24 V izolowane, Rwy=0,04 Ω, dydaktyczne ograniczenie do 2,5 A dopasowane do R obciążenia; pobór AC z mocy wyjścia i sprawności 90%. Bez hiccup, tętnień, temperatury i czasu rozruchu |
| Silnik | Starszy profil: ukryta gwiazda. Nowy `edu-motor-six`: trzy jawne uzwojenia, analiza Y/Δ z przewodów/mostków, napięć uzwojeń i faz; bez poślizgu, rozruchu, momentu i energii mechanicznej |
| Interlock | Osobne sprzężenie mechaniczne zapobiega ruchowi drugiego mechanizmu mimo zasilonej cewki. NC krzyżowe działają przez obwód elektryczny; ocena sprawdza je bez sprzężenia mechanicznego. Przy jednoczesnym żądaniu od spoczynku pierwszeństwo ma kolejność aparatów, bez dynamiki czasów ruchu |
| Bloki / przyciski | Wielostykowy przycisk ma jeden stan NO/NC. Osobny blok pomocniczy dziedziczy mechanizm rodzica przypisanego przez `assembly`. Wspólne styki główne i pomocnicze stycznika |

Dowolna orientacja każdego toru RCD/RCBO 2P jest świadomym uproszczeniem profilu dydaktycznego. Akceptuje także zasilanie L i N z przeciwnych stron aparatu; nie odtwarza wtedy sumowania strumieni w rzeczywistym przekładniku różnicowym. Geometria przewodów pozostaje niezależna od rozwiązania elektrycznego.

Obsługę TEST przy napięciu i ponownego załączenia przez OFF oparto na [instrukcji ABB F200](https://library.e.abb.com/public/6de074bdabef4a1eb0d5bc13e9c3903d/F200%20B%20PLUS_2013.pdf). To odniesienie do działania elementów sterujących, a nie deklaracja odwzorowania tego SKU. Miernik RCD akceptuje sondę na dowolnym końcu toru fazowego; prąd próbny musi przejść przez aparat, aby wywołać wyzwolenie.

Usterki są nakładkami: przerwa, dodatkowa rezystancja zacisku, skończone zwarcie/upływ, osobna izolacja, sklejony wskazany NO lub NC (starsze usterki bez pary zacisków zachowują działanie na NO), otwarta cewka, zablokowany mechanizm, zanik fazy i brak zadziałania RCD. Zwarcie daje prąd z rozwiązania i impedancji, nie stałą liczbę. Zanik N i PE modeluje przerwa odpowiedniej żyły. Usterka może rozpocząć się w zadanym czasie dokumentu; UI sandbox wprowadza ją od t=0.

Zegar używa czasu symulacji, pauzy, kroku 1 s i mnożników. Wyniki workera są oznaczone sesją/rewizją/sekwencją; stare odpowiedzi nie mogą nadpisać nowej instalacji. Deterministyczne akcje dają te same stany i logi. Otwarty projekt zaczyna bez energii, także dla źródeł niezależnych; po pierwszym załączeniu źródło niezależne może pozostać po głównym OFF. Edycja elektryczna zatrzymuje próbę.

Nieobsługiwane: TT/IT/TN-C, model elektrod uziemienia, R/L/C i przepięcia, pełne przebiegi czasowe, łuk, selektywność i katalogowe krzywe zabezpieczeń, obciążenia nieliniowe. Nie ma automatycznego zatwierdzania zgodności rzeczywistej instalacji.

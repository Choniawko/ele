# ADR 001: graf jako adapter, MNA jako silnik

Status: przyjęto, 2026-10-03.

Używamy otwartego `@joint/react` 4.3.6 oraz `@joint/core` 4.3.3, bez JointJS+. GraphProvider dostaje kontrolowane rekordy elementów i linków. Paper odpowiada za porty, routing i gesty. Katalog, inspector, historia, kopiowanie i układ są naszym kodem. Renderery są autorskimi SVG, a złącza dokładnie wskazują logiczne zaciski. Żółty pasek PE wykorzystuje eksperymentalny `useLinkLayout`; warstwa adaptera izoluje tę zależność. [API otwartej biblioteki](https://docs.jointjs.com/learn/features/react/).

Wspólny build zamiast wielu paczek publikowanych osobno upraszcza lokalną aplikację. Granice domeny zachowują czyste moduły, nie importy UI. React i JointJS nie wyznaczają potencjałów.

Wybrano zmodyfikowaną analizę węzłową z fazorami i rezystancjami. Pozwala sprawdzać KCL, prądy źródeł, spadki oraz zwarcia zamiast wnioskować o działaniu z samej łączności. Własny mały solver jest objęty analitycznymi testami. Koszt: brak reaktancji i przebiegów przejściowych, gęsta macierz zamiast solvera sparse. Te ograniczenia są jawne. Deterministyczny zegar aktualizuje stany do punktu stałego i wykrywa oscylacje.

Obliczenia trafiają do jednego workera. Sesja/rewizja/sekwencja odpowiedzi zabezpiecza zmiany projektu. Stan chwilowy nie jest zapisem instalacji.

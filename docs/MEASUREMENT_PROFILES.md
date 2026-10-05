# Przyrządy i interpretacja

Wynik zawiera status, wartość nullable, jednostkę, opis i szczegóły. Brak rozwiązania, błędna konfiguracja, przekroczony zakres, OL oraz nieokreślone odniesienie są osobnymi stanami. Nie są zamieniane na zero. Historia obejmuje sondy/żyłę/aparat, parametry, energię, rewizję i czas symulacji. Po edycji dawny odczyt pozostaje historyczny.

| Funkcja | Metoda | Warunki i ograniczenia |
|---|---|---|
| Napięcie AC | Moduł różnicy fazorów RMS, rezystancja wejściowa 10 MΩ | Wspólna wyspa AC; między niezależnymi wyspami wynik floating |
| Napięcie DC | Podpisana różnica potencjałów | Wspólna wyspa DC; odwrócenie sond zmienia znak |
| Ciągłość / Ω | Test 1 V w zdeenergizowanej sieci, R=U/I | Wszystkie aktywne źródła blokują pomiar. Opcjonalna kompensacja przewodów 0,2 Ω. Przerwa=OL, R>1 MΩ poza zakresem |
| Prąd / cęgi | Prąd pojedynczej wybranej gałęzi przewodu | Nie symuluje objęcia całego kabla ani prądu zbiorczego; wybór żyły jest jawny |
| Izolacja | Osobna sieć rezystancji izolacji żył do PE, test 100/250/500 V | Wszystkie źródła odłączone. Wysokie napięcie testu przy obecnej elektronice jest blokowane konserwatywnie na poziomie projektu. Brak dokładnego modelu odłączenia konkretnego aparatu i wszystkich połączeń L+N |
| Pętla zwarcia | R Thévenina po wyzerowaniu źródeł, Z=R, X=0, Ik=U/Z | Wymaga obwodu pod napięciem. Brak niskoprądowej procedury bez wyzwolenia RCD i wpływu reaktancji |
| RCD | Dydaktyczny kalibrowany upływ z fazy wyjściowej do PE, 0,5/1/2/5×30 mA | Właściwy aparat, tor fazy za nim i PE poza sumowaniem. Test rzeczywiście zmienia obwód, wyzwolenie pozostaje. 50 ms jest rozdzielczością okna, nie deklaracją czasu realnego produktu |
| Kolejność faz | Różnice fazorów źródła/silnika | Obwód 3-fazowy, wykrywa 123/132 i brak fazy; bez przebiegów chwilowych |

Podstawą wyników są równania i parametry modelu, nie gotowe teksty scenariusza. Zakres ochrony jest dydaktyczny, a nie pełnym modelem konkretnego miernika lub metrologii. Nie określamy automatycznie „spełnia normę”; takie kryterium wymaga osobno wybranego systemu, dokumentu i warunków oceny. Wydruk jest raportem szkoleniowym z rewizją i ograniczeniami.

## Cewki i diagnoza etapu 1

`TopologyDefinition.coil.dcResistanceOhm: null` oznacza, że nie znamy rezystancji DC produktu. Pomiar ciągłości odrzuca każdą drogę, w której prąd testowy przechodzi przez taką sprawną cewkę; nie tylko bezpośrednie A1–A2. Przerwana cewka jest usunięta z sieci i może dać OL. VA z karty nie są przeliczane na rezystancję dla omomierza. Dydaktyczne cewki zachowują swój jawny profil rezystancyjny.

Wynik pomiaru styku zapisuje stan mechanizmu i rodzaj styku z chwili pomiaru. Dzięki temu zaliczenie diagnozy sklejonego NC wymaga spadku napięcia podczas załączenia mechanizmu, zamiast poprawnej ciągłości NC w spoczynku. To dodatkowy kontekst wyniku, nie ujawnienie nakładki usterki. PE jest oceniany oddzielnie od pracy odbiornika.

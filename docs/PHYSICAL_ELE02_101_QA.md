# ELE.02-101 — weryfikacja warstwy fizycznej

Gałąź `feat/ele02-101-physical`, baza `feat/my-projects`. Środowisko: macOS 12.7.6 Intel, Node 24.18.0, pnpm 11.19.0, Playwright z zainstalowanym kanałem Google Chrome 150. Wyniki lokalne nie są potwierdzeniem uruchomienia GitHub Actions ani publikacji Pages.

## Obwód i kompatybilność

Nowy przykład zawiera 24 urządzenia, 33 żyły, 4 obudowy i 6 korytek. Testy obejmują cztery położenia Q1/Q2, wspólną pracę opraw, niezależność gniazda, B10/B6 i H1/H2, przerwanie L/N kontrolki, TEST RCD oraz cztery pomiary PE z wykrywaniem przerw. Usunięcie wszystkich żył pozostawia złączki w tej samej puszce elektrycznie niezależne; wewnętrzny mostek ma dotychczasowe 5 mΩ.

Testy edycji sprawdzają zachowanie obwodu, ID, długości elektrycznych, sesji symulacji i pomiarów przy zmianach pokryw oraz przesuwaniu obudowy, wycofanie niepoprawnego ruchu, undo, usuwanie urządzeń z metadanych i przypisanie wielu żył do korytka. Podświetlenie nie ujawnia lokalizacji ukrytej przerwy PE.

Nowe E2E korzystają z publicznego interfejsu importu/eksportu i IndexedDB, bez importów modułów developerskich Vite. Sprawdzają oba widoki tego samego obwodu, otwieranie pokryw, wkładanie i wyjmowanie złączki, przesunięcie całej puszki, zapis pomiaru, autosave, odświeżenie z wyłączonym zasilaniem i ponowny import z nowym ID projektu. Kontrola wyrenderowanego SVG sprawdza wszystkie 33 żyły: końce przy zaciskach i brak przejścia przez korpusy aparatów.

Dotychczasowe testy nadal obejmują bibliotekę folderów, migrację IndexedDB, niezależność kopii, ochronę przed opóźnionym autosave, odrzucanie importów, eksport całych folderów, odzyskiwanie nieczytelnych zapisów i ochronę ukrytych odpowiedzi. Oryginalny JSON bez obudów/korytek również przechodzi walidację i otwiera się w aplikacji.

## Porównanie wizualne

Zrzuty mają rozmiar 1366×768. „Przed” odtworzono przez otwarcie oryginalnego JSON-a użytkownika w aktualnej aplikacji; nie był dostępny osobny zrzut starej wersji. Materiał PDF i zdjęcie pozostają plikami referencyjnymi użytkownika, nie kopiowano ich do repozytorium.

- [Przed — oryginalny JSON](qa/ele101-before.png)
- [Po — widok zewnętrzny](qa/ele101-external.png)
- [Po — widok połączeń](qa/ele101-connections.png)

Porównanie z planem (PDF str. 2) i fotografią: PZ leży nad R po lewej, OP1/OP2 nad P1/P2, Q1/Q2 pod puszkami, GW po prawej. Rozdzielnica grupuje aparaty w kolejności RCD–B10–H1–B6–H2. Małe zielone kontrolki DIN różnią się od owalnych opraw z osłoną. Zniknęły duże listwy w miejscach puszek oraz niebieskie listwy używane do rozdziału faz. W widoku połączeń widoczne są cztery niezależne złączki w każdej puszce, N/PE rozdzielnicy i końce żył. Przyciski pokryw znajdują się pod obudowami, poza obszarem zacisków. Do montażu i odczytu małych zacisków należy powiększyć odpowiedni fragment tablicy.

Geometria jest dydaktyczna: istniejących korpusów aparatów nie rozciągano, więc rozdzielnica ma większy zapas miejsca niż na fotografii. Nie deklarujemy skali 1:1 ani wierności konkretnemu SKU. Szczegółowe ograniczenia modeli, długości i tras: [PHYSICAL_ELE02_101.md](PHYSICAL_ELE02_101.md).

## Kontrole

Końcowy przebieg jest w toku; wyniki zostaną wpisane po zakończeniu kontroli. Nie utworzono tagu ani wydania i nie uruchomiono deploymentu.

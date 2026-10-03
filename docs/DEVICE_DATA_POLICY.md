# Dane aparatów i publikacja

Rekord badawczy nie jest gotowym modelem. Katalog utrzymuje osobno SKU, topologię, zachowanie, symbole, renderer, wymiary, dowody oraz bramki publikacji. Wartość `null` oznacza nieznane dane. Pole `evidence` zapisuje źródło, lokalizację, datę i rodzaj weryfikacji. Pozycje zacisków skalowane z rysunku oraz ograniczenia konserwatywne są przybliżeniami; nie są pomiarami producenta.

Stan `published` wymaga przejścia bramek topologii, wyglądu i testów. Nieopublikowane SKU nie mogą wejść do projektu ani solvera. Profile dydaktyczne mają osobne identyfikatory `edu-*`, jawne etykiety i nie powiększają liczby ukończonych SKU. Raport wszystkich pozycji: `pnpm catalog:report`.

## Zweryfikowany przekrój

- **Hager MBN116E**: [strona producenta](https://hager.com/pl/katalog/produkt/mbn116e-mcb-6ka-1p-b-16a), wymiary 17,5 × 83 × 70 mm, znamionowe B16/6 kA, zdjęcie i diagram 1–2. [Zdjęcie producenta](https://assets.hager.com/step-content/P/HA_16378145/11/std.lang.all/MCN1XXE-MBN1XXE.webp). Porty są nakładką wskazującą drogę przewodu; konserwatywnie jeden przewód na zacisk. Spadek na stykach i profil wyzwalania są dydaktyczne, nie odtworzoną krzywą produktu.
- **Mean Well HDR-60-24**: [karta HDR-60-SPEC, rewizja 2026-04-03](https://www.meanwell.com/Upload/PDF/HDR-60/HDR-60-SPEC.PDF), str. 2 parametry i wymiary 52,5 × 90 × 54,5 mm; str. 4 rysunek i przypisanie 1/2 −V, 3/4 +V, 5 AC/L, 6 AC/N. Render autorski, pozycje skalowane z rysunku. Nazwy aplikacyjne −V1/−V2/+V1/+V2 identyfikują powtórzone wyprowadzenia. Wyjście jest odizolowane od AC/N/PE. Sprawność 90% dla wariantu 24 V; ograniczenie 2,5 A jest uproszczeniem, bez hiccup i udaru.

Odczyt źródeł: 2026-10-02/03. Zdjęć producentów nie dołączono jako własnych zasobów; służyły do przeglądu autorskich wektorów.

## Korekty względem załączonego seed

Oryginał zachowano. Korekty są w warstwie przeglądu i w profilach dydaktycznych:

- **BIS-411 230 V**, [instrukcja E240129](https://www.fif.com.pl/pl/index.php?controller=attachment&id_attachment=74) i [schemat producenta](https://www.fif.com.pl/img/cms/schematy/bis/2/BIS-411-pl-schemat.jpg): COM **11**, NC **10**, NO **12**. Dla sterowania impulsem L: N=1, L=3. Nie użyto błędnego COM=10 z seed. Oddzielny styk, brak pamięci po zaniku, opóźnienie dydaktyczne 150 ms.
- **AS-212**, [instrukcja E240306](https://fif.com.pl/pliki/0/746/AS-212-instructions-for-use-pl-1.pdf): N=1, L=3, sterowanie=6, wyjście=5. Tor 3–5 podaje fazę, nie jest stykiem bezpotencjałowym.
- **PCU-510 DUO**, [instrukcja E231117](https://www.fif.com.pl/pl/index.php?controller=attachment&id_attachment=361), str. 1–2 oraz 5–7: 230 V przez 1–3, alternatywne 24 V przez 4–3. C rozpoczyna pracą, D przerwą. COM=8/11, NC=7/10, NO=9/12. Zakaz obu zasilań naraz. W seed występowało inne przypisanie zacisków; stosujemy przejrzaną instrukcję.

Te trzy SKU są `topology-verified`, lecz nadal zablokowane: brakuje udokumentowanej geometrii rzeczywistych obudów i przeglądu rendererów. Geometria odpowiedników dydaktycznych nie stanowi takiego dowodu.

## Import i wersje

Import badawczy przyjmuje wyłącznie nieopublikowane rekordy, kontroluje liczbę/unikalność ID i referencje źródeł, normalizuje i zapisuje do osobnej tabeli IndexedDB. Nie uruchamia kodu ani nie zmienia wydanej biblioteki. Z UI można wyeksportować znormalizowany pakiet.

Projekt zapisuje rewizje produktów, ID snapshotu katalogu oraz pełne definicje użytych produktów w tabeli `snapshots`. Otwieranie wymaga zgodności aktualnych bindingów; obcy SKU, stary model i inna wersja dokumentu są kontrolowanie odrzucane. Nie ma jeszcze automatycznej migracji ani trybu odczytu niekompletnego projektu. Oryginalny JSON należy zachować; istniejący projekt nie jest zastępowany błędnym importem.

WAGO i zestawy przekaźnik+gniazdo wymagają osobnego przeglądu: nie wolno utożsamiać liczby torów wejściowych z liczbą potencjałów ani numerów przekaźnika z geometrią zacisków podstawy.

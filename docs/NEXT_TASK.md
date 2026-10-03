# Kontynuacja bez przebudowy projektu

Projekt `/Users/pawelchoniawko/Projekty/ele`. `pnpm dev`; dane użytkownika w IndexedDB profilu przeglądarki. Zależności i lockfile są gotowe. Zachowaj pakiet wejściowy i obecne moduły.

1. Uzupełnij geometrię i źródła F&F BIS-411/AS-212/PCU-510. Nie wracaj do błędnej numeracji seed: korekty w DEVICE_DATA_POLICY. Opublikuj SKU po przeglądzie renderera i testach rewizji.
2. Zweryfikuj WAGO 221-412/413/415 oraz Finder/Relpol razem z gniazdami. Utrzymuj właściwy wspólny potencjał i mapowanie base↔relay.
3. Poszerz rzeczywiste Hager/Schneider/ABB/Eaton/Legrand według CATALOG_REPORT. Nie licz `edu-*` jako ukończonych SKU.
4. Popraw rozwinięcie schematu, odnośniki cewek/styków, layout i routing. Memo/reuse runtime już dodane; dalsze poprawki mierz tym samym benchmarkiem 100/300.
5. Dodaj warianty diagnozy i zadania od pustej tablicy z własnymi kryteriami dowodów. Zachowaj brak wycieku usterek do eksportu i tutora.
6. Rozwiń izolację/pętlę/RCD w jawnych profilach ze źródłami oceny. Dodaj migracje i odczyt projektu z brakującym bindingiem.
7. Drugi silnik na wspieranym systemie, audyt WCAG, podział bundle i regresja gestów.

Stan i dowody: IMPLEMENTATION_STATUS i `docs/qa`. Sprawdzenia: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm catalog:report`, `pnpm test:e2e`. Chrome jest domyślnym kanałem. Nie publikuj i nie podłączaj prawdziwego sprzętu bez osobnej autoryzacji.

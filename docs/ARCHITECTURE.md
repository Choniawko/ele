# Architektura

React/TypeScript, Vite, pnpm. Logiczne pakiety mają osobne katalogi, ale wspólny build. CircuitModel jest jedynym źródłem topologii; layout fizyczny i schematyczny są niezależne. Graf diagramu jest projekcją. Czysty solver MNA działa w workerze, bez Reacta i DOM. Zustand integruje komendy, historię, runtime oraz persystencję IndexedDB (Dexie). Import przechodzi przez Zod oraz kontrolę referencji katalogu.

Plan: model i katalog → MNA i pomiary → interaktywny edytor i dwa widoki → aparaty czasowe, ochrona i ćwiczenia → weryfikacja liczb, gestów, persystencji i obrazu. Kryteria odbioru oraz dowody aktualizujemy w IMPLEMENTATION_STATUS.md. Dane producenta, topologia, profil dydaktyczny i renderer pozostają oddzielone. Produkty bez krytycznych dowodów nie trafiają do edytora.

Worker utrzymuje RuntimeSnapshot, zegar i seed. Każde żądanie/reply ma sesję, rewizję i sekwencję. Zustand odrzuca odpowiedź starego obwodu, zachowuje tożsamość niezmienionych stanów urządzeń, a memo adaptera zapobiega przebudowie grafu tylko z powodu zegara. Edycja topologii jest transakcją z nową rewizją i odłączeniem źródeł; zmiana layoutu ma własną flagę historii i nie zmienia rewizji elektrycznej.

Dexie v3: `projects`, `research`, `snapshots`. Zapis jest opóźniony o 350 ms, logi ograniczone do 300 zdarzeń, pomiary do 500. Stan energii i symulacji nie jest częścią dokumentu. Snapshot produktu przechowuje dane, ale uruchomienie nadal wymaga zgodnego, walidowanego bindingu zachowania. Nie wykonujemy dostarczonego JavaScript ani SVG przy imporcie.

Trening używa kopii projektu do prób działania i własnych reguł oceny. Kontrakt tutora przyjmuje tylko obserwacje i pomiary; nie ma operacji włączania źródeł ani dostępu do fault overlays. Do odtworzenia zachowania wystarcza projekt, rewizja katalogu, seed i sekwencja RuntimeAction; pełnego odtwarzacza nagrań nie zaimplementowano.

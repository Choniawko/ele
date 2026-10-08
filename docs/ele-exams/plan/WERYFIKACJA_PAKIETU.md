# Weryfikacja instrukcji wdrożenia — 8 października 2026

Przygotowano i sprawdzono pakiet instrukcji, a nie wdrożenie aplikacji. Repo origin/main sprawdzono na commicie 9c4895a817b5f5869d17b3cf23a3e9695d49f6cf. Kod aplikacji nie został zmieniony ani opublikowany.

Kontrola struktury potwierdziła:

- 15 etapów, 30 unikalnych jednostek i acykliczne zależności rzeczywistych modułów; 117 nie czeka na rozstrzygnięcie 114.
- Dokładnie 17 kontraktów odpowiadających dostarczonym zadaniom; każde przypisane raz do etapu.
- Wszystkie 82 próby przeniesione ze źródłowego opracowania bez zmiany action/expected/basis; wszystkie oznaczone jako specification, bez wymyślonych wyników testu.
- Zachowane powiązania BOM, ilości, mapowanie obecnych i planowanych modeli, 40 rysunków, 25 artykułów i 60 kategorii wyposażenia.
- 30 source issues pozostaje otwartych; wymagania 114 mają odrębną bramkę. Seed postępu nie twierdzi, że nowe układy są zrealizowane.
- 140 plików materiału wejściowego zachowuje SHA-256 z poprzedniego manifestu. Źródłowych rysunków, kart i podglądu nie zmieniono.
- Wszystkie lokalne odnośniki Markdown wewnątrz paczki istnieją. Szczegóły są w data/validation-plan.json; skrypt tools/validate-plan.py pozwala powtórzyć kontrolę.

Przejrzano instrukcję główną, wspólne wymagania, kontrakty danych oraz wymagania krytycznych modeli i zadania 114. Wymagania obejmują osobne symbole tego samego aparatu w rozwiniętym schemacie, jedną topologię solvera, powrót do kadru, pracę na nowej kopii, wersje instrukcji i dowody odbioru.

Nie wykonano nowych projektów elektrycznych dla pozostałych 15 zadań, nie uruchomiono ich prób i nie wykonano nowego E2E aplikacji. Kontrola pakietu instrukcji nie potwierdza tych przyszłych rezultatów. Dotychczasowe wyniki istniejących 101/108 oraz źródeł są w materialy/docs/WERYFIKACJA.md.

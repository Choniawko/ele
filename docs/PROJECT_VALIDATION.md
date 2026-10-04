# Walidacja projektów i odzyskiwanie zapisów — 2026-10-04

Branch: `fix/project-validation`. Zakres: dokument projektu, komendy, formularze, persystencja i odzyskiwanie; architektura solvera i model połączeń pozostają dotychczasowe.

## Odtworzenie przed poprawką

Na aktualnym kodzie po `261f5b3`, po review `826b6d5`, obie rozbieżności nadal występowały. W Chrome sprawdzono osobno nazwę długości 121 znaków i długość elektryczną istniejącego przewodu 10 001 m. Komendy przyjmowały wartości i autosave zapisywał je w IndexedDB. `restoreProject` odrzucał zapis przez ograniczenia schematu (120 znaków i 10 000 m); po odświeżeniu pojawiał się błąd odczytu. Import eksportowanego dokumentu stosował ten sam ostrzejszy schemat.

Przyczyną była walidacja transakcji ograniczona do `assertProjectCatalog`, podczas gdy import i odczyt używały również `projectSchema`. Ponadto zapis projektu i snapshotów katalogu odbywał się w oddzielnych operacjach.

## Zmiana

- `packages/device-catalog/project-validation.ts` łączy `projectSchema`, zgodność katalogu i dostępność wszystkich wskazanych rewizji produktów. Wszystkie wejścia dokumentu używają tej funkcji.
- Komenda pracuje na kopii. Dopiero poprawny wynik trafia do Zustand, historii i symulacji. Błąd zmienia komunikat; nie zmienia dokumentu, rewizji, undo/redo ani runtime. Akcje po transakcji wykonują się tylko po przyjęciu zmiany. Undo/redo walidują również wynikową rewizję.
- `projectLimits` i `numericSettingLimits` są źródłem limitów schematu, formularzy i roboczych parametrów przewodu. Kontrola działa także przy bezpośrednim wywołaniu komendy. Pola tekstowe używają wzorca zamiast natywnego `maxLength`, aby wklejenie zbyt długiej wartości prowadziło do odrzucenia i komunikatu, bez cichego przycinania. Po odrzuceniu formularz pokazuje poprzednią wartość. Hipoteza diagnozy ma wspólny limit w ćwiczeniu i sandboxie.
- `saveProject` waliduje i kopiuje dokument przed operacją asynchroniczną. Jedna transakcja Dexie zapisuje projekt, wymagane snapshoty i wskaźnik ostatniego projektu. Awaria wycofuje całość. Status zapisu czeka na sukces; spóźniony wynik wcześniejszego zapisu nie zastępuje statusu nowszej operacji.
- Dexie v4 dodaje `settings`; migracja zachowuje rekordy v3. Odczyt obsługuje dotychczasowy wskaźnik localStorage. Po migracji wskaźnik w IndexedDB jest częścią atomowego zapisu, a aktualizacja localStorage jest pomocnicza.
- Błąd walidacji zapisanego rekordu udostępnia kopię JSON w interfejsie. Oryginalny rekord nie jest kasowany, naprawiany ani nadpisywany. Lista zapisów toleruje również brak poprawnego dokumentu. Nadpisanie nieczytelnego rekordu pod tym samym identyfikatorem jest blokowane.
- Kopia do odzyskania zawiera dokument, bez logów i pomiarów. Dla ukrytych usterek, sesji treningu lub niejednoznacznych danych usterek zawiera tylko publiczne pola; pomija usterki, trening, identyfikator scenariusza i nieznane pola główne. Pełne dane pozostają w bazie. Dotychczasowy eksport chroniący odpowiedzi pozostaje dostępny.

## Test ręczny

1. Otwórz „Lampa i łącznik”. W menu projektu wklej nazwę długości 121 znaków i opuść pole. Powinien pojawić się komunikat o limicie 120, a pole powinno pokazać wcześniejszą nazwę.
2. Zaznacz przewód w inspektorze. Wprowadź długość 10 001 m, następnie opis długości 31 znaków; każdą zmianę zakończ opuszczeniem pola. Zmiany powinny zostać odrzucone z komunikatami; poprzednie wartości, zasilanie i historia powinny pozostać.
3. Wprowadź poprawną nazwę, długość 3,25 m i opis. Poczekaj na „Zapisano lokalnie”, odśwież stronę. Nazwa i parametry powinny pozostać; projekt otwiera się z odłączonym zasilaniem. Załącz zasilanie i sprawdź lampę.
4. Odzyskiwanie sprawdź na testowym projekcie w osobnym profilu przeglądarki. Poniższy kod w konsoli zmienia nazwę ostatniego zapisu na niepoprawną i odświeża stronę:

```js
const request = indexedDB.open("pracownia-elektryczna");
request.onsuccess = () => {
  const database = request.result;
  const transaction = database.transaction(
    ["settings", "projects"],
    "readwrite",
  );
  const pointer = transaction.objectStore("settings").get("last-project");
  pointer.onsuccess = () => {
    const projects = transaction.objectStore("projects");
    const record = projects.get(pointer.result.projectId);
    record.onsuccess = () => {
      const saved = record.result;
      saved.name = saved.document.name = "N".repeat(121);
      projects.put(saved);
    };
  };
  transaction.oncomplete = () => {
    database.close();
    location.reload();
  };
};
```

5. Powinien pojawić się opis błędu i przycisk „Pobierz kopię do odzyskania”. Pobierz plik i sprawdź, że zawiera niepoprawną nazwę. Oryginalny rekord powinien pozostać w IndexedDB. Powtórzenie z ćwiczeniem ukrytej diagnozy powinno dać kopię bez odpowiedzi i sesji treningu.
6. Aby odzyskać dokument, popraw niepoprawne pola w pobranym pliku i nadaj nowe `circuit.projectId`, np. `project-odzysk-20261004`, następnie użyj importu JSON. Nowy identyfikator pozwala zachować oryginał w bazie. Nie ma automatycznej naprawy dokumentów ani migracji niezgodnych SKU.

## Powtarzalna weryfikacja

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm catalog:validate
pnpm test:e2e
pnpm test:e2e:production
```

`tests/project-validation.test.ts` sprawdza stan komend i status zapisu; `tests/persistence.test.ts` używa rzeczywistego Dexie z `fake-indexeddb`, w tym migracji v3 i wycofania zapisu po awarii snapshotu. `tests/e2e/project-validation.spec.ts` używa formularzy i natywnego IndexedDB, bez importowania modułów Vite. Te same trzy scenariusze uruchamiają się na buildzie produkcyjnym przez `playwright.production.config.ts`, na porcie 4173.

Aktualne wyniki pełnego przebiegu znajdują się w [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md). Testy przeglądarkowe używają zainstalowanego Chrome na macOS 12.7.6 Intel.

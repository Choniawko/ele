# Konstruktor rozdzielnicy — weryfikacja

Gałąź: `feat/distribution-board-builder`, na bazie `feat/ele02-101-physical`. Nie publikowano wydania.

## Zakres

Profil `edu-modular-v1`, rewizja `1`, jest dydaktyczny: siatka 18 mm, 1–3 rzędy, 8 lub 12 pól w rzędzie, dwa niezależne rzędy przyłączeń. Nie jest produktem konkretnego producenta. Korpusy aparatów zachowują wymiary i rewizje katalogowe; szerokość zajmowana to zaokrąglenie w górę szerokości korpusu / 18 mm. RCD dydaktyczny 48 mm zajmuje trzy pola. Kontrola zajętości nie potwierdza termiki, głębokości ani zgodności normowej.

Dopuszczone fronty i przyłącza są jawnie wymienione w `packages/device-catalog/mounting-profiles.ts`. Styczniki, bloki pomocnicze i zasilacze bez profilu zgodności z maskownicą pozostają na tablicy. Obudowa nie tworzy mostków ani listwy N/PE; listwy są osobnymi aparatami z własnymi zaciskami.

Stare ręczne obudowy i przykład ELE.02-101 pozostają otwieralne bez konwersji. Nie dodano SKU obudów ani automatycznej migracji starych skrzynek. W pierwszym profilu nie ma drzwi; przyciski dotyczą maskownicy.

## Test ręczny

1. Otwórz **Moje projekty**, utwórz folder i pusty projekt.
2. Kliknij **+ Rozdzielnica**, wpisz nazwę i wybierz rzędy, pola i własne założenie rezerwy. Sprawdź podgląd i utwórz obudowę.
3. W **Edytuj wnętrze R1** kliknij rząd. Dodaj MCB/RCD z listy lub katalogu. Pole montażowe i zajętość uwzględniają szerokość korpusu.
4. Wybierz **Przyłącza 1/2** i dodaj N/PE/L jako rzeczywiste aparaty. Połącz zaciski przy zdjętej maskownicy.
5. Zaznacz aparat i przeciągnij go do wolnego pola; albo wybierz inny rząd, wpisz **Pierwsze pole** i kliknij **Przenieś zaznaczone na pole**. Końce przewodów pozostają połączone z tymi samymi zaciskami. Zajęte miejsce odrzuca zmianę.
6. W **Konfiguracja R1** rozbuduj obudowę. Podgląd pokazuje nowe rzędy i istniejące aparaty. Próba usunięcia zajętego rzędu lub zmniejszenia szerokości poniżej zajętości blokuje zatwierdzenie. Przenieś aparaty przed zmniejszeniem.
7. Załóż maskownicę: w każdym rzędzie zobaczysz fronty oraz zaślepki wolnych pól. Dźwignie i kontrolki pozostają dostępne; zaciski wymagają zdjęcia maskownicy.
8. Kliknij **Wróć do instalacji** / **Montuj poza rozdzielnicą**, dodaj źródło, odbiornik i łączniki oraz podłącz całość w tym samym projekcie. Uruchom symulację i wykonaj pomiar PE przy odłączonym zasilaniu.
9. Poczekaj na **Zapisano lokalnie**, odśwież. Układ, folder i pomiary zostają zachowane, zasilanie zaczyna wyłączone. Wyeksportuj projekt lub folder i importuj jako nowy: przypisania montażowe również mają się odtworzyć.
10. Przenieś całą skrzynkę za oznaczenie nad korpusem, cofnij zmianę i usuń samą obudowę. Aparaty i połączenia pozostają w projekcie.

## Automatyczna weryfikacja

Wyniki końcowych kontroli zostaną wpisane po zakończeniu przebiegów. Testy obejmują pełny rząd, kolizje, przyłącza, niezgodne profile, błędne pozycje w JSON, zmniejszenie zajętej obudowy, przenoszenie, undo, zachowanie symulacji oraz rzeczywisty zapis/odczyt i import projektu/folderu. E2E tworzy instalację od pustego projektu przez pomiar PE do pracy lampy i odtworzenia po odświeżeniu; konfiguracja produkcyjna uruchamia ten sam scenariusz pod `/ele/`.

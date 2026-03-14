# Checklist testów – usunięcie blokady clusterów

Po usunięciu mechanizmu blokowania clusterów sprawdź ręcznie poniższe scenariusze.

## 1. Lista clusterów (`/app/vocab/clusters`)

- [ ] Strona się ładuje bez błędów
- [ ] Wszystkie clustery (zalecane i dostępne) są widoczne
- [ ] Brak etykiet „Odblokowane” / „Zablokowane”
- [ ] Każdy cluster jest klikalny (brak stanu disabled)
- [ ] Ikona pinezki w prawym górnym rogu działa (przypinanie/odpinanie)
- [ ] Etykiety mastery: „Sprawdź to!”, „Potrzebujesz jeszcze trochę praktyki.”, „Ten zestaw dobrze ci idzie!”, „Mamy to!”

## 2. Szczegóły clustera (`/app/vocab/cluster/[slug]`)

- [ ] Strona się ładuje dla każdego clustera (np. make-do, bring-take, hear-listen, say-tell)
- [ ] Brak komunikatu „Ten cluster jest zablokowany”
- [ ] Teoria i wzorce są widoczne
- [ ] Przycisk „Ćwicz” prowadzi do praktyki

## 3. Praktyka clustera (`/app/vocab/cluster/[slug]/practice`)

- [ ] Strona praktyki się ładuje
- [ ] Pytania się wyświetlają
- [ ] Można wybierać odpowiedzi i wysyłać
- [ ] Po zakończeniu sesji wyświetla się podsumowanie

## 4. API

- [ ] `GET /api/vocab/clusters` zwraca `{ ok: true, clusters: [...] }` (bez `newlyUnlockedSlugs`)
- [ ] `GET /api/vocab/clusters/[slug]/questions` zwraca pytania (bez 403 LOCKED)
- [ ] `POST /api/vocab/clusters/[slug]/questions` przyjmuje odpowiedzi (bez 403 LOCKED)

## 5. Sekcja Clusters na stronie vocab (`/app/vocab`)

- [ ] ClustersSection wyświetla clustery
- [ ] Wszystkie clustery są klikalne
- [ ] Brak etykiet „Odblokowane” / „Zablokowane”

# Audyt techniczny: system Coach

**Data oryginału:** 2026-02-20  
**Aktualizacja:** 2026-03-19 — sugestie treningowe i profil zsynchronizowane z `CO_TRENOWAC_AUDIT.md`.

**Cel:** Mapowanie komponentów „coach” / podpowiedzi w layoutcie `/app` oraz rozróżnienie od **osobnego** endpointu `GET /api/app/suggestion` (pojedyncza sugestia — nadal w repo, **nie** = profil „Twój plan na teraz”).

---

## 1. Architektura

### 1.1 Lokalizacja komponentów

| Komponent | Plik | Umieszczenie |
|-----------|------|--------------|
| **GlobalCoach** | `app/app/GlobalCoach.tsx` | `app/app/layout.tsx` |
| **GlobalTrainingSuggestion** | `app/app/GlobalTrainingSuggestion.tsx` | `app/app/layout.tsx` |
| **Coach** (grammar) | `app/app/grammar/.../Coach.tsx` (wybrane czasy) | Per strona gramatyki |

### 1.2 Globalność vs per strona

- **GlobalCoach** i **GlobalTrainingSuggestion:** wszystkie trasy `/app/*`.
- **Coach (grammar):** tylko na podstronach, które go importują (nie każdy czas musi mieć Coach).

### 1.3 Client / Context

- Wszystkie powyższe: `"use client"`.
- Brak dedykowanego React Context dla Coach — stan lokalny (`useState`), GlobalCoach: `usePathname()`.

---

## 2. Źródła treści

### 2.1 GlobalCoach

- **Źródło:** `getCoachContent(pathname)` — stringi w kodzie, bez API.

### 2.2 GlobalTrainingSuggestion („Co trenować”)

- **Źródło:** `GET /api/suggestions` — pola `top` i `list` (bundling irregular, priorytety z knowledge + runs).
- **Fallback:** gdy brak danych, 3 statyczne opcje (jak wcześniej).
- **Sesja:** zamrożenie opcji (`lockedOptions`) + podświetlenie aktywnego `href` do czasu `subscribeTrainingCompleted`.
- Szczegóły: **`CO_TRENOWAC_AUDIT.md`**.

### 2.3 Coach (grammar)

- **Źródło:** statyczne `TIPS` w komponencie strony.

### 2.4 Profil — „Twój plan na teraz” (nie jest komponentem Coach)

- **Źródło:** `GET /api/suggestions` (ten sam endpoint co widget). **Nie** `GET /api/app/suggestion`.

### 2.5 Endpoint `GET /api/app/suggestion` (osobny produkt)

- Plik może istnieć w `app/api/app/suggestion/route.ts`. **Nie mylić** z `/api/suggestions`.
- **2026-03:** brak importów `/api/app/suggestion` w plikach `.ts`/`.tsx` — endpoint traktować jako **martwy w UI**, chyba że przywrócono użycie.

---

## 3. Logika decyzyjna (skrót)

### 3.1 GlobalCoach

- Treść zależna od `pathname` (czasy, domyślny komunikat powitalny).

### 3.2 GlobalTrainingSuggestion

- Kolejność i treść kart z API lub fallback; irregular jako jedna sesja targeted.

### 3.3 Coach (grammar)

- `tipIndex`, opcjonalnie `localStorage` (`grammarCoachHidden`).

---

## 4. Integracje

| Komponent | XP / streak | API treningowe |
|-----------|-------------|----------------|
| GlobalCoach | nie | nie |
| GlobalTrainingSuggestion | nie bezpośrednio | tak — `/api/suggestions`; po treningu refetch przez event |
| Coach (grammar) | nie | nie |

---

## 5. Odświeżanie

| Komponent | Kiedy się zmienia |
|-----------|-------------------|
| GlobalCoach | zmiana `pathname` |
| GlobalTrainingSuggestion | mount; po `emitTrainingCompleted` (jeśli nie trwa zablokowana sesja); po refetch — nowe `top`/`list` |
| Profil (sugestie) | mount; po `subscribeTrainingCompleted` — refetch `/api/suggestions` |

---

## 6. Ograniczenia (aktualne)

- **GlobalTrainingSuggestion** może pokazywać konkretne jednostki (np. grammar slug, cluster w `displayName`, irregular z listą form) — **nie** jest już „tylko 3 stałe kafelki”, o ile API zwraca dane.
- **GlobalCoach** nadal nie wskazuje pojedynczego słówka z puli — tylko treść edukacyjną po ścieżce.

---

## 7. Mapa porównawcza (skrót)

| Aspekt | GlobalCoach | GlobalTrainingSuggestion | Profil „plan” |
|--------|-------------|--------------------------|---------------|
| API | brak | `GET /api/suggestions` | `GET /api/suggestions` |
| `user_learning_unit_knowledge` | nie | pośrednio (przez API) | pośrednio (przez API) |
| Coach grammar | Osobny komponent | — | — |

---

*Szczegóły API sugestii: `app/api/suggestions/route.ts`. Koniec audytu.*

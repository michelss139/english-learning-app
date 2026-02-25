# Audyt techniczny: system Coach

**Data:** 2026-02-20  
**Cel:** Pełne zmapowanie stanu systemu Coach (chmurka z sugestiami). Tylko opis stanu obecnego.

---

## 1. Architektura

### 1.1 Lokalizacja komponentów

W systemie występują **trzy odrębne systemy** o charakterze „coach” / sugestii:

| Komponent | Plik | Umieszczenie |
|-----------|------|--------------|
| **GlobalCoach** | `app/app/GlobalCoach.tsx` | Layout globalny (`app/app/layout.tsx`) |
| **GlobalTrainingSuggestion** | `app/app/GlobalTrainingSuggestion.tsx` | Layout globalny (`app/app/layout.tsx`) |
| **Coach** (grammar) | `app/app/grammar/{present-simple,present-continuous,past-simple}/Coach.tsx` | Per strona gramatyki |

### 1.2 Globalność vs per strona

- **GlobalCoach:** globalny – renderowany w layout dla wszystkich stron pod `/app/*`.
- **GlobalTrainingSuggestion:** globalny – renderowany w layout dla wszystkich stron pod `/app/*`.
- **Coach (grammar):** per strona – używany tylko na stronach gramatyki (present-simple, present-continuous, past-simple). Past-continuous i inne czasy nie mają własnego Coacha.

### 1.3 Renderowanie (client/server)

- **GlobalCoach:** `"use client"` – komponent kliencki.
- **GlobalTrainingSuggestion:** `"use client"` – komponent kliencki.
- **Coach (grammar):** `"use client"` – komponent kliencki.

Wszystkie komponenty Coach są renderowane po stronie klienta.

### 1.4 Context / provider

- Brak React Context ani providera dla Coach.
- Stan (widoczność, indeks tipu) trzymany lokalnie w `useState`.
- GlobalCoach używa `usePathname()` z `next/navigation` do wyboru treści.

---

## 2. Źródło sugestii

### 2.1 GlobalCoach

- **Źródło:** brak API. Treść pochodzi z funkcji `getCoachContent(pathname)` – statyczne stringi w kodzie.
- **Response shape:** brak – nie ma wywołań sieciowych.
- **Determinizm:** tak – dla danego `pathname` zawsze ta sama treść.

### 2.2 GlobalTrainingSuggestion

- **Źródło:** brak API. Lista `options` jest statyczna w kodzie.
- **Response shape:** brak.
- **Determinizm:** tak – zawsze te same 3 opcje (Fiszki, Typowe błędy, Nieregularne czasowniki).

### 2.3 Coach (grammar)

- **Źródło:** brak API. Tablica `TIPS` jest statyczna w kodzie.
- **Determinizm:** tak – stałe tipy per strona gramatyki.

### 2.4 Training suggestion na profilu

- **Źródło:** `GET /api/app/suggestion` – endpoint zwraca jedną sugestię treningu.
- **Response shape:** `{ ok: true, suggestion: { title: string; description: string; href: string } }`.
- **Determinizm:** częściowo – wynik zależy od danych użytkownika (vocab_answer_events, irregular_verb_runs, v2_vocab_to_learn_total). Dla tych samych danych zwracana jest ta sama sugestia (brak losowości w API).

### 2.5 Źródła danych dla `/api/app/suggestion`

Endpoint **nie** korzysta z:
- `user_learning_unit_knowledge`
- `v2_vocab_repeat_suggestions` (repeat_suggestions)

Endpoint korzysta z:
- **v2_vocab_to_learn_total** – termy „do nauki” (student_id, term_en_norm).
- **vocab_answer_events** – ostatnie 500 eventów (question_mode, prompt, expected, context_type, context_id, pack_id, created_at).
- **irregular_verb_runs** – tylko sprawdzenie, czy użytkownik kiedykolwiek ćwiczył irregular (ostatni run).
- **vocab_packs** – slug „shop”, first pack.
- **vocab_clusters** – slug, title.

---

## 3. Logika decyzyjna

### 3.1 GlobalCoach – wybór treści

- Zależność od `pathname`:
  - `/app/grammar/present-simple` → jeden tip
  - `/app/grammar/present-continuous` → jeden tip
  - `/app/grammar/past-simple` → jeden tip
  - `/app/grammar/past-continuous` → tablica 3 tipów
  - itd. (present-perfect, past-perfect, future-*)
  - domyślnie → „Witaj na LANGBracket”
- Brak priorytetu – wybór wyłącznie na podstawie pathname.
- Brak losowości.
- Brak cache’a – `getCoachContent` wywoływane przy każdej zmianie pathname.
- Zależność od strony: **tak** – pathname determinuje treść.

### 3.2 GlobalTrainingSuggestion – wybór

- Zawsze pokazuje wszystkie 3 opcje (Fiszki, Typowe błędy, Nieregularne czasowniki).
- Brak priorytetu, losowości, cache’a.
- Nie zależy od pathname – identyczna treść na każdej stronie.

### 3.3 Coach (grammar) – wybór tipu

- `tipIndex` – użytkownik przełącza strzałkami (prev/next).
- Brak priorytetu i losowości.
- Stan ukrycia w `localStorage` (klucz `grammarCoachHidden`) – wspólny dla wszystkich stron gramatyki używających tego klucza.

### 3.4 `/api/app/suggestion` – wybór jednej sugestii

**Priorytet (kolejność):**

1. **Gdy toLearnSet.size > 0** (są termy do nauki):
   - Liczenie eventów z `vocab_answer_events` dla termów z toLearnSet:
     - `packCounts` – eventy z context_type=vocab_pack
     - `clusterCounts` – eventy z context_type=vocab_cluster
   - Jeśli `packTotal >= clusterTotal && packTotal > 0`:
     - Preferencja: pack „shop” (jeśli istnieje), w przeciwnym razie pack z największą liczbą eventów.
   - Jeśli brak sugestii pack i `clusterTotal > 0`:
     - Cluster z największą liczbą eventów.
   - Jeśli nadal brak:
     - Fallback: „Nieregularne czasowniki”.

2. **Gdy toLearnSet.size === 0** (brak termów do nauki):
   - Ostatni event z `vocab_answer_events`:
     - vocab_pack → sugestia packu
     - vocab_cluster → sugestia clustera
   - Jeśli ostatni event to irregular (sprawdzenie `irregular_verb_runs`):
     - „Nieregularne czasowniki”
   - Jeśli nadal brak:
     - Pack „shop” lub first published pack.
   - Ostateczny fallback: „Fiszki” → `/app/vocab/packs`.

**Losowość:** brak – wybór deterministyczny na podstawie liczb i kolejności.

**Cache:** brak – każdy request wykonuje zapytania do bazy.

**Pathname:** endpoint nie przyjmuje pathname – sugestia niezależna od aktualnej strony.

---

## 4. Integracje

### 4.1 GlobalCoach

- Nie korzysta z: XP, streak, completions, onboarding-status.
- Nie ma integracji z innymi systemami.

### 4.2 GlobalTrainingSuggestion

- Nie korzysta z: XP, streak, completions, onboarding-status.
- Statyczna lista – brak integracji.

### 4.3 Coach (grammar)

- Nie korzysta z: XP, streak, completions, onboarding-status.
- Jedyna integracja: `localStorage` (ukrycie).

### 4.4 Training suggestion (profil)

- **XP:** nie – sugestia nie zależy od XP.
- **Streak:** nie – sugestia nie zależy od streak.
- **Completions:** nie bezpośrednio. Endpoint `/api/app/suggestion` nie odczytuje `exercise_session_completions`.
- **Onboarding-status:** nie bezpośrednio. `onboarding-status` jest używany na profilu do pokazania sekcji „Co trenować” (onboardingSuggestions), ale **nie** do wyboru `trainingSuggestion` z API. `trainingSuggestion` pochodzi z `/api/app/suggestion` i jest niezależna od onboarding-status.

---

## 5. Aktualizacja

### 5.1 GlobalCoach

- **Odświeżanie:** przy zmianie `pathname` (usePathname) – `content` w useMemo, `tipIndex` resetowany w useEffect.
- **Reakcja na sesję:** nie – brak zależności od sesji/odpowiedzi.
- **Przeładowanie strony:** nie wymagane – pathname zmienia się przy nawigacji SPA.

### 5.2 GlobalTrainingSuggestion

- **Odświeżanie:** brak – treść statyczna.
- **Reakcja na sesję:** nie.
- **Przeładowanie strony:** nie wymagane.

### 5.3 Coach (grammar)

- **Odświeżanie:** stan z localStorage przy mount (useEffect).
- **Reakcja na sesję:** nie.
- **Przeładowanie strony:** nie wymagane – zmiana ukrycia zapisywana w localStorage.

### 5.4 Training suggestion (profil)

- **Odświeżanie:** przy pierwszym załadowaniu profilu (useEffect z pustą tablicą zależności – jeden run).
- **Reakcja na sesję:** nie – brak refetch po zakończeniu ćwiczenia.
- **Przeładowanie strony:** tak – aby zobaczyć nową sugestię po wykonaniu ćwiczenia, użytkownik musi przeładować profil.

---

## 6. Ograniczenia

### 6.1 Czy Coach potrafi sugerować konkretne słowo?

- **GlobalCoach:** nie – tylko tipy gramatyczne.
- **GlobalTrainingSuggestion:** nie – tylko ogólne kategorie (Fiszki, Typowe błędy, Irregular).
- **Coach (grammar):** nie – tylko tipy gramatyczne.
- **Training suggestion (API):** częściowo – może wskazać pack (np. „Fiszki: Shop”) lub cluster (np. „Typowe błędy: make-do-take-get”), ale **nie** konkretne słowo (term_en_norm). Href prowadzi do packu/clustera z parametrami (limit, direction, autostart), bez wskazania pojedynczego słowa.

### 6.2 Czy może podać kontekst (np. „take vs bring”)?

- **GlobalCoach / GlobalTrainingSuggestion / Coach (grammar):** nie – treści statyczne.
- **Training suggestion (API):** nie – tytuł to np. „Typowe błędy: make-do-take-get” (nazwa clustera), bez kontekstu typu „take vs bring”. Brak payloadu z porównaniem słów.

### 6.3 Czy obsługuje dynamiczne payloady?

- **GlobalCoach:** nie – pathname → statyczna treść.
- **GlobalTrainingSuggestion:** nie – stała lista.
- **Coach (grammar):** nie – stałe TIPS.
- **Training suggestion (API):** response ma stały shape `{ title, description, href }`. Brak parametrów w request (np. pathname, preferencje). Href może zawierać query (limit, direction, autostart), ale nie są to dynamiczne payloady w sensie kontekstu uczenia.

---

## 7. Podsumowanie – mapa komponentów

| Aspekt | GlobalCoach | GlobalTrainingSuggestion | Coach (grammar) | Training suggestion (profil) |
|--------|-------------|--------------------------|-----------------|------------------------------|
| Pozycja | top-right | bottom-right | bottom-right (grammar) | w sekcji „Przedłuż serię” |
| API | brak | brak | brak | GET /api/app/suggestion |
| Źródło danych | pathname → statyka | statyka | statyka | vocab_answer_events, v2_vocab_to_learn, irregular_verb_runs |
| user_learning_unit_knowledge | nie | nie | nie | **nie** |
| repeat_suggestions | nie | nie | nie | **nie** (repeatSuggestions z progress-extended osobno) |
| Odświeżanie po sesji | nie | nie | nie | **nie** (wymaga przeładowania) |
| Sugestia konkretnego słowa | nie | nie | nie | nie |

---

*Koniec audytu.*

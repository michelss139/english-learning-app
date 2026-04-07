# Raport: Knowledge engine vs system XP

**Data:** 2026-03-28  
**Cel:** Opisać, jak **agregacja wiedzy** (`user_learning_unit_knowledge` + eventy) współgra z **przyznawaniem XP** (`xp_events`, `awardXpAndBadges`), gdzie są **rozłączenia semantyczne**, a gdzie **fałszywe kolizje** w UX.  
**Powiązane:** `KNOWLEDGE_ENGINE_AND_TRAINING_SUGGESTIONS_AUDIT.md` (sugestie „co trenować”), `XP_BADGES.md`, `lib/xp/award.ts`.

---

## 1. Streszczenie

| Obszar | Knowledge engine | System XP |
|--------|------------------|-----------|
| **Źródło prawdy** | `user_learning_unit_knowledge` (+ `irregular_verb_runs` dla form) | `xp_events` + `user_xp` |
| **„Dzień”** | Brak globalnej definicji „dnia”; są timestampy ISO (np. `last_wrong_at`, `updated_at`) | **Kalendarz `Europe/Warsaw`** → `getWarsawDateString()` w `lib/xp/award.ts` |
| **Cel produktowy** | Kto wymaga nauki / powtórki (stan, accuracy, priorytet) | Ograniczenie farmy XP + nagroda za „ukończoną sesję” |
| **Powiązanie** | **Częściowe i niesymetryczne:** XP używa **innych** warunków „powtórki” niż ranking sugestii z knowledge | |

**Wniosek:** Systemy **nie są ze sobą sprzeczne na poziomie bazy** (inne tabele), ale **semantyka „powtórki” i „zasługujesz na XP” się rozjeżdża** — użytkownik może dostać mocną sugestię z knowledge i **0 XP** albo odwrotnie. Warto to świadomie uprościć lub oznaczyć w UI / API.

---

## 2. Knowledge engine (skrót)

- Aktualizacja: `updateLearningUnitKnowledge` z modułów: pakiety (sense), klastry (cluster), gramatyka (grammar), irregular (irregular), **oraz pula** (`/api/vocab/training/answer`, `unit_type: sense`).
- Sugestie `GET /api/suggestions`: scoring z **`user_learning_unit_knowledge`** (≥ `MIN_ATTEMPTS` = 3 odpowiedzi łącznie) + **irregular** z runów.
- Pula treningowa / overview: segmenty **review / learning / new / mastered** z `resolveSegment` w `lib/vocab/poolOverviewUtils.ts` (m.in. **72 h** od `last_wrong_at` wpływa na „review”).

To **nie** jest ten sam mechanizm co XP `repeatQualified` (patrz §4).

---

## 3. System XP — jedna wspólna funkcja

**Plik:** `lib/xp/award.ts` — `awardXpAndBadges`.

### 3.1 Definicja „dziś”

- Zawsze: data **YYYY-MM-DD w strefie `Europe/Warsaw`**, niezależnie od strefy użytkownika.

### 3.2 Warunek przyznania XP

Dla nowego wpisu do `xp_events` (uproszczenie):

1. `!awardedToday` — ostatni wpis z tym samym `dedupe_key` **nie** ma `awarded_on` równym dziś (Warszawa).
2. `eligibleForAward` — zwykle `true`; wyjątek np. irregular: sesja &lt; 5 odpowiedzi.
3. `(!hasAnyAward || repeatQualified)`  
   - **Pierwsza nagroda** w historii dla tego `dedupe_key`: `hasAnyAward === false` → przechodzi.  
   - **Kolejne dni / sesje:** jeśli `hasAnyAward === true`, **musi** być `repeatQualified === true`, inaczej **0 XP** (nawet przy „nowym dniu”).

### 3.3 `repeatQualified` — skąd się bierze (per moduł)

To jest **główny most** (lub jego brak) między „czy użytkownik ma co ćwiczyć” a „czy dostaje XP ponownie” — ale **nie** jest zsynchronizowany z czystym `knowledge_state`:

| Moduł | `repeatQualified` | Uwaga |
|-------|-------------------|--------|
| **Pakiet** | `hasToLearn`: przynajmniej jeden termin z sesji w **`v2_vocab_to_learn_total`** | To widok/zbiór „do nauki” (eventy/MV), **nie** to samo co `unstable` w knowledge |
| **Klaster** | Jak wyżej: **`v2_vocab_to_learn_total`** vs terminy z sesji | Sugestia klastra w `/api/suggestions` bierze **accuracy + knowledge row** — możesz być **wysoko w rankingu** i mieć **0 XP**, jeśli sesja nie trafi w `to_learn` |
| **Irregular** | `sessionHasToLearn`: błędne próby w **`irregular_verb_runs`** dla czasowników z sesji | Bliżej „słabych form”, częściowo zbieżne z sugestiami irregular |
| **Gramatyka** | **Zawsze `false`** w `grammar/complete` | Po **pierwszym** XP za `grammar:{slug}` kolejne completion **nie** dostają XP przez `repeatQualified` — praktycznie **jednorazowa nagroda za temat** (nie „raz dziennie”) |
| **Pula (quick training)** | **Brak** wywołań `awardXpAndBadges` | Wiedza **sense** się aktualizuje; **XP za sesję puli nie ma** |

---

## 4. Tabela: knowledge vs XP vs sugestia

| Akcja użytkownika | Aktualizacja knowledge? | XP (typowe) | Dedupe key (przykład) |
|-------------------|-------------------------|-------------|------------------------|
| Pakiet — odpowiedź | Tak (`sense`) | Przy **complete** sesji | `pack:{slug}:{direction}:{count_mode}` |
| Klaster — odpowiedź | Tak (`cluster`) | Przy **complete** | `cluster:{slug}` |
| Gramatyka — odpowiedź | Tak (`grammar`) | Przy **complete** (raz na temat w praktyce) | `grammar:{exercise_slug}` |
| Irregular — submit | Tak (wg implementacji submit) | Przy **complete** | `irregular:default` |
| **Pula — trening** | Tak (`sense`, `/training/answer`) | **Nie** | — |

---

## 5. Miejsca „kolizji” i napięć (niezgodności oczekiwań)

### 5.1 Sugestia silnika ≠ druga szansa na XP

- **Sugestie** priorytetyzują słabą **accuracy** i stany **`unstable` / `improving`** (bonus w `scorePriority`).
- **XP** przy powtórce (ten sam dzień już wykluczony przez `awardedToday`; inny dzień) wymaga **`repeatQualified`** opartego o **„to learn”** (pack/cluster) lub błędy w runach (irregular).
- Efekt: **„Silnik każe ćwiczyć hear/listen”**, a użytkownik kończy sesję **bez XP** — to może być **poprawne według reguł XP**, ale **źle komunikowane** („już dziś”) jeśli `xp_awarded === 0` z innego powodu.

### 5.2 Różne definicje „powtórki”

- **Pula / overview:** segment **review** (m.in. `unstable` lub błąd w **ostatnich 72 h**).
- **XP repeat (pack/cluster):** członkostwo termu w **`v2_vocab_to_learn_total`**.
- **Widok `vocab_repeat_suggestions`** (endpoint `repeat-suggestions`): **osobna** logika czasowa / spaced (np. ~30 dni w wizji DB) — **nie** jest to `user_learning_unit_knowledge`; w UI listy puli **już nie** pokazujemy `!` z tego endpointu, ale API nadal istnieje.

Te trzy byty **nie muszą** wskazywać na ten sam zestaw słów tego samego dnia.

### 5.3 Pula aktualizuje wiedzę, ale nie XP

- Zaangażowanie w **„Trenuj”** realnie zmienia **postęp** i sugestie **sense** w przyszłości.
- Gracz nie widzi **bezpośredniej** nagrody XP za tę ścieżkę — co jest świadomym wyborem produktowym lub luką.

### 5.4 Gramatyka: XP prawie wyłączone po pierwszym razie

- `repeatQualified: false` → po pierwszym sukcesie XP dla tematu **kolejne ukończenia nie dodają XP**, niezależnie od tego, że knowledge dalej rośnie i sugestia może wrócić.

### 5.5 Strefa czasowa

- XP: **Warszawa**.  
- Użytkownik poza PL może mieć wrażenie „nie robiłem tego dziś”, a kalendarz XP już „przeszedł” lub jest **inny dzień** niż lokalny.

### 5.6 UI klastra (i podobne)

- **`xp_awarded === 0`** jest mapowane na komunikat w stylu **„już dziś”**, podczas gdy powód może być **`repeatQualified`** lub **grammar-like** logika — to **błąd komunikacji**, niekoniecznie błąd silnika XP.

---

## 6. Rekomendacje (priorytet)

1. **API + UI:** zwracać przy complete **powód braku XP** (`already_today_warsaw` | `repeat_not_qualified` | `grammar_one_shot` | `below_eligible_threshold` | …) zamiast jednego „0 XP = dziś”.  
2. **Produkt:** zdecydować, czy **pula** ma dostać **część XP** (np. caps per dzień per użytkownik), żeby zachowanie było spójne z innymi ścieżkami.  
3. **Align:** rozważyć spięcie **`repeatQualified`** dla pack/cluster z tym samym sygnałem, którego używa ranking (np. „jest w `user_learning_unit_knowledge` ze stanem ≠ mastered lub last_wrong w X dni”) — albo jawnie udokumentować **dwa cele**: „sugestia nauki” vs „nagroda ekonomiczna”.  
4. **Gramatyka:** przejrzeć, czy **jednorazowe XP** jest zamierzone; jeśli tak — komunikat; jeśli nie — `repeatQualified` podobnie jak pack (np. po spadku accuracy).  
5. **Dokumentacja użytkownika:** jedno zdanie: **„XP liczone według kalendarza polskiego (CET).”**

---

## 7. Odniesienia do plików

| Temat | Plik |
|--------|------|
| Nagroda XP | `lib/xp/award.ts` |
| Complete pack | `app/api/vocab/packs/[slug]/complete/route.ts` |
| Complete cluster | `app/api/vocab/clusters/[slug]/complete/route.ts` |
| Complete grammar | `app/api/grammar/complete/route.ts` |
| Complete irregular | `app/api/irregular-verbs/complete/route.ts` |
| Pula — odpowiedź | `app/api/vocab/training/answer/route.ts` |
| Sugestie | `app/api/suggestions/route.ts` |
| Segmenty puli | `lib/vocab/poolOverviewUtils.ts` — `resolveSegment` |
| XP + odznaki (krótko) | `XP_BADGES.md` |

---

*Koniec raportu.*

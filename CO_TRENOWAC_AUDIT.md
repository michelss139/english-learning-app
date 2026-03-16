# Audyt: „Co trenować” – system sugestii treningowych

**Data:** 2026-03-06  
**Cel:** Zrozumieć, dlaczego „Co trenować” pokazuje zawsze te same opcje i jak sprawić, by system uczył się i zmieniał sugestie w zależności od tego, co jest najbardziej problematyczne.

---

## 1. Dwa odrębne systemy

W aplikacji istnieją **dwa różne** miejsca z sugestiami treningowymi:

| Miejsce | Komponent | Pozycja | API |
|---------|-----------|---------|-----|
| **„Co trenować”** | `GlobalTrainingSuggestion` | Prawy dolny róg, na wszystkich stronach `/app/*` | **Brak** |
| **„Twój plan na teraz”** | `ProfilePage` | Sekcja na stronie profilu | `GET /api/app/intelligent-suggestions-v2` |

---

## 2. GlobalTrainingSuggestion („Co trenować”)

### 2.1 Źródło danych

**Brak API.** Lista jest w 100% statyczna w kodzie:

```tsx
// app/app/GlobalTrainingSuggestion.tsx
const options: TrainingOption[] = [
  { title: "Fiszki (5 pytań)", ... },
  { title: "Typowe błędy", ... },
  { title: "Nieregularne czasowniki (min 5)", ... },
];
```

### 2.2 Zachowanie

- **Zawsze** pokazuje te same 3 opcje
- **Nigdy** nie zmienia się na podstawie wyników użytkownika
- **Nie** korzysta z: XP, streak, vocab_answer_events, user_learning_unit_knowledge, mv_user_*_accuracy
- **Nie** reaguje na zakończenie ćwiczeń (brak `subscribeTrainingCompleted`)

### 2.3 Wniosek

**GlobalTrainingSuggestion nie ma żadnej logiki uczenia się.** To jest po prostu stała lista linków.

---

## 3. Profile „Twój plan na teraz” (intelligent-suggestions-v2)

### 3.1 Źródło danych

`GET /api/app/intelligent-suggestions-v2` zwraca:

- **irregular** – czasowniki z `user_learning_unit_knowledge` (unit_type='irregular', knowledge_state in ['unstable','improving']), posortowane po wrong_count
- **packs** – z `mv_user_pack_accuracy` (accuracy < 0.9), posortowane od najgorszej
- **clusters** – z `mv_user_cluster_accuracy` (accuracy < 0.9), posortowane od najgorszej

### 3.2 Logika uczenia się

| Typ | Tabela / widok | Jak się aktualizuje |
|-----|----------------|---------------------|
| Packs | `mv_user_pack_accuracy` | Materialized view na podstawie `vocab_answer_events`. **Wymaga ręcznego REFRESH** (`refresh_intelligent_suggestion_views()`). |
| Clusters | `mv_user_cluster_accuracy` | J.w. |
| Irregular | `user_learning_unit_knowledge` | **Irregular verbs NIE wywołuje `updateLearningUnitKnowledge`** – tabela nie jest wypełniana dla irregular w runtime. Sekcja irregular jest zwykle pusta. |

### 3.3 Odświeżanie po sesji

Profil subskrybuje `subscribeTrainingCompleted` i po zakończeniu ćwiczenia (pack/cluster/irregular) robi refetch do intelligent-suggestions-v2. To działa **optymistycznie** – usuwa ukończony element z listy i pobiera nowe dane. Ale:

- **Materialized views** (`mv_user_pack_accuracy`, `mv_user_cluster_accuracy`) muszą być odświeżane (cron / trigger). Bez tego nowe odpowiedzi nie pojawią się w sugestiach.
- **Irregular** – nawet po refetch zwróci puste, bo `user_learning_unit_knowledge` nie ma wpisów dla irregular (irregular nie zapisuje tam danych).

---

## 4. Endpoint `/api/app/suggestion` (nieużywany w UI)

Istnieje endpoint `GET /api/app/suggestion`, który zwraca **jedną** sugestię. Używa:

- `v2_vocab_to_learn_total` – termy do nauki
- `vocab_answer_events` – ostatnie 500 eventów (liczy packCounts, clusterCounts)
- `irregular_verb_runs` – czy użytkownik kiedykolwiek ćwiczył irregular

**Nie** używa: `user_learning_unit_knowledge`, `mv_user_pack_accuracy`, `mv_user_cluster_accuracy`.

Endpoint **nie jest używany** przez żaden komponent w aplikacji. Profil korzysta z `intelligent-suggestions-v2`.

---

## 5. Główne problemy

### 5.1 „Co trenować” (GlobalTrainingSuggestion) – główny problem użytkownika

| Problem | Opis |
|---------|------|
| Brak integracji z API | Komponent nigdy nie wywołuje żadnego endpointu |
| Stała lista | Zawsze te same 3 opcje |
| Brak reakcji na postęp | Nie zmienia się po ćwiczeniach |

### 5.2 Intelligent suggestions (profil)

| Problem | Opis |
|---------|------|
| Materialized views | `mv_user_pack_accuracy` i `mv_user_cluster_accuracy` wymagają okresowego REFRESH. Brak widocznego crona/triggera. |
| Irregular bez integracji | `irregular_verb_runs` nie zapisuje do `user_learning_unit_knowledge`. Sekcja irregular w intelligent-suggestions-v2 jest zwykle pusta. |
| Widoczność | Inteligentne sugestie są tylko na profilu; użytkownik widzi „Co trenować” wszędzie – i to jest statyczne. |

### 5.3 Rozproszenie

- Dwa systemy (GlobalTrainingSuggestion vs profil)
- Dwa API (suggestion vs intelligent-suggestions-v2)
- Różne źródła danych, brak spójnej strategii

---

## 6. Rekomendacje

### 6.1 Krótkoterminowe („Co trenować” ma się uczyć)

**Podłączyć GlobalTrainingSuggestion do API z danymi użytkownika.**

Opcje:

1. **Użyć `intelligent-suggestions-v2`** – ten sam endpoint co profil. Zwraca irregular (puste w praktyce), packs, clusters. GlobalTrainingSuggestion mógłby:
   - Fetchować przy mount
   - Pokazywać 1–3 sugestie (np. top pack, top cluster, irregular jeśli są)
   - Subskrybować `subscribeTrainingCompleted` i refetchować po ćwiczeniu
   - Fallback do statycznej listy, gdy API zwróci puste

2. **Użyć `/api/app/suggestion`** – zwraca jedną sugestię. Prostsze, ale mniej bogate (jedna opcja zamiast wielu).

3. **Stworzyć dedykowany endpoint** – np. „co trenować” zwracający 2–3 opcje w formacie pasującym do GlobalTrainingSuggestion, łącząc logikę z intelligent-suggestions-v2 i suggestion.

### 6.2 Średnioterminowe (pełna spójność)

1. **Odświeżanie materialized views** – ustawić cron (np. Supabase pg_cron) wywołujący `refresh_intelligent_suggestion_views()` co X minut lub po zakończeniu sesji (trigger na vocab_answer_events – bardziej skomplikowane).

2. **Integracja irregular z user_learning_unit_knowledge** – w `app/api/irregular-verbs/complete/route.ts` dodać wywołanie `updateLearningUnitKnowledge` (mode: "session") per verb lub dla całej sesji. Wymaga decyzji: unit_id = irregular_verb_id vs "irregular:default".

3. **Ujednolicenie** – jeden system sugestii (np. intelligent-suggestions-v2) używany zarówno przez profil, jak i GlobalTrainingSuggestion.

### 6.3 Długoterminowe

- Rozważyć deprecację `/api/app/suggestion` lub jego scalenie z intelligent-suggestions-v2
- Dodać metryki: ile razy użytkownik kliknął sugestię vs wybrał coś innego (opcjonalnie)

---

## 7. Podsumowanie

| Aspekt | GlobalTrainingSuggestion („Co trenować”) | Profil („Twój plan na teraz”) |
|--------|----------------------------------------|-------------------------------|
| API | **Brak** | intelligent-suggestions-v2 |
| Źródło danych | Statyczna lista w kodzie | user_learning_unit_knowledge, mv_user_pack_accuracy, mv_user_cluster_accuracy |
| Uczenie się | **Nie** | Częściowo (packs/clusters – jeśli MV odświeżone; irregular – nie) |
| Odświeżanie po sesji | **Nie** | Tak (subscribeTrainingCompleted + refetch) |
| Widoczność | Wszędzie (prawy dolny róg) | Tylko na profilu |

**Główny wniosek:** „Co trenować” to statyczna lista. Aby system się uczył i zmieniał sugestie, GlobalTrainingSuggestion musi pobierać dane z API (np. intelligent-suggestions-v2) i reagować na zakończenie ćwiczeń. Dodatkowo trzeba zapewnić odświeżanie materialized views oraz integrację irregular z user_learning_unit_knowledge.

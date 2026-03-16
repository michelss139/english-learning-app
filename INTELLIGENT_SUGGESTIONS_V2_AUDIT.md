# Audyt: intelligent-suggestions-v2

**Data:** 2026-03-06  
**Cel:** Pełne wypisanie wszystkiego, co dotyczy systemu intelligent-suggestions-v2.

---

## 1. API Route

**Plik:** `app/api/app/intelligent-suggestions-v2/route.ts`  
**Metoda:** `GET`  
**Auth:** Wymaga JWT (Supabase `getUser()`)

### Request
- Brak parametrów
- Header: `Authorization: Bearer <token>`

### Response shape

```ts
type ApiResponse = {
  irregular:
    | {
        verbs: { id: string; base: string }[];
        total_problematic: number;
        href: "/app/irregular-verbs/train?focus=auto";
      }
    | null;
  packs: { slug: string; accuracy: number; href: string }[];
  clusters: { slug: string; accuracy: number; href: string }[];
};
```

### Packs
- `pack_slug` – slug packu
- `accuracy` – accuracy (0–1)
- `href` – `/app/vocab/pack/{slug}?autostart=1`

### Clusters
- `cluster_slug` – slug clustera
- `accuracy` – accuracy (0–1)
- `href` – `/app/vocab/cluster/{slug}?autostart=1`

### Irregular
- `verbs` – lista czasowników (id, base)
- `total_problematic` – liczba
- `href` – `/app/irregular-verbs/train?focus=auto`

---

## 2. Źródła danych (backend)

### 2.1 Irregular

| Tabela | Kolumny | Warunek |
|--------|---------|---------|
| `user_learning_unit_knowledge` | unit_id, knowledge_state, wrong_count | student_id, unit_type='irregular', knowledge_state IN ('unstable','improving'), limit 500 |

**Sortowanie:** 1) unstable przed improving, 2) wrong_count malejąco, 3) unit_id alfabetycznie.  
**Limit:** top 10.  
**Pobieranie:** `irregular_verbs` (id, base) dla znalezionych unit_id.

**Problem:** Irregular verbs **nie** wywołuje `updateLearningUnitKnowledge`. Tabela `user_learning_unit_knowledge` nie ma wpisów dla irregular w runtime. Sekcja irregular jest zwykle pusta.

### 2.2 Packs

| Widok | Kolumny | Warunek |
|-------|---------|---------|
| `mv_user_pack_accuracy` | pack_slug, accuracy | student_id, accuracy < 0.9 |

**Sortowanie:** accuracy rosnąco (najgorsze pierwsze).  
**Limit:** 10.

### 2.3 Clusters

| Widok | Kolumny | Warunek |
|-------|---------|---------|
| `mv_user_cluster_accuracy` | cluster_slug, accuracy | student_id, accuracy < 0.9 |

**Sortowanie:** accuracy rosnąco (najgorsze pierwsze).  
**Limit:** 10.

---

## 3. Materialized views (mv_user_pack_accuracy, mv_user_cluster_accuracy)

**Migracja:** `supabase/migrations/20260220_create_intelligent_suggestion_materialized_views.sql`

### mv_user_pack_accuracy

- **Źródło:** `vocab_answer_events` (context_type='vocab_pack'), join `vocab_packs`
- **Kolumny:** student_id, pack_id, pack_slug, total_answers, correct_answers, accuracy
- **Grupowanie:** student_id, pack_id, pack_slug

### mv_user_cluster_accuracy

- **Źródło:** `vocab_answer_events` (context_type='vocab_cluster')
- **Kolumny:** student_id, cluster_slug, total_answers, correct_answers, accuracy
- **Grupowanie:** student_id, cluster_slug

### Odświeżanie

```sql
public.refresh_intelligent_suggestion_views()
```

- `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_pack_accuracy`
- `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_cluster_accuracy`

**Brak:** Crona ani triggera. Widoki muszą być odświeżane ręcznie (np. pg_cron). Bez tego nowe odpowiedzi nie pojawią się w sugestiach.

---

## 4. Użycie w UI

### 4.1 Gdzie jest używane

| Komponent | Plik | Użycie |
|-----------|------|--------|
| ProfilePage | `app/app/profile/page.tsx` | Jedyny konsument |

### 4.2 Flow na profilu

1. **Mount:** `useEffect` z Promise.all – fetch do `/api/app/intelligent-suggestions-v2` wraz z xp, streak, badges.
2. **Wyświetlanie:** Sekcja „Twój plan na teraz” – 3 kafelki: Irregular Verbs, Packs, Clusters.
3. **subscribeTrainingCompleted:** Profil subskrybuje eventy po zakończeniu ćwiczenia.

### 4.3 Reakcja na zakończenie ćwiczenia

| Event | Źródło | Akcja |
|-------|--------|-------|
| `{ type: "pack", slug }` | PackTrainingClient | Optymistycznie usuwa pack z listy, refetch API, filtruje pendingPackRemovals |
| `{ type: "cluster", slug }` | ClusterClient | Optymistycznie usuwa cluster z listy, refetch API, filtruje pendingClusterRemovals |
| `{ type: "irregular" }` | TrainClient | Optymistycznie ustawia irregular: null, refetch API |

**Refetch:** Po każdym evencie – fetch do intelligent-suggestions-v2, aktualizacja state.

---

## 5. Training events (emitTrainingCompleted)

**Plik:** `lib/events/trainingEvents.ts`

**Mechanizm:** BroadcastChannel (lub fallback CustomEvent)

**Emisyjne miejsca:**
- `app/app/vocab/pack/[slug]/PackTrainingClient.tsx` – po complete: `emitTrainingCompleted({ type: "pack", slug })`
- `app/app/vocab/cluster/[slug]/ClusterClient.tsx` – po complete: `emitTrainingCompleted({ type: "cluster", slug })`
- `app/app/irregular-verbs/train/TrainClient.tsx` – po complete: `emitTrainingCompleted({ type: "irregular" })`

**Subskrybent:** Tylko ProfilePage (subscribeTrainingCompleted).

---

## 6. Typy w ProfilePage

```ts
type IntelligentSuggestions = {
  irregular:
    | {
        verbs: { id: string; base: string }[];
        total_problematic: number;
        href: string;
      }
    | null;
  packs: { slug: string; accuracy?: number | null; href: string }[];
  clusters: { slug: string; accuracy?: number | null; href: string }[];
};
```

---

## 7. UI na profilu

### Irregular Verbs
- Lista czasowników: `irregularPreview.join(", ")` + `+N` jeśli więcej
- Link: `intelligentSuggestions?.irregular?.href ?? "/app/irregular-verbs/train?focus=auto"`
- Pusta sekcja: „Wszystko gra — brak zaległości w Irregular Verbs”

### Packs
- Nawigacja: prev/next (packIndex)
- `currentPack` = packs[packIndex % packs.length]
- `formatSlugLabel(currentPack.slug)`, `formatAccuracy(currentPack.accuracy)`
- Link: `currentPack.href`
- Pusta sekcja: „Wszystko gra — brak packów do powtórki”

### Clusters
- Analogicznie do Packs (clusterIndex, currentCluster)

### Wszystko puste
- „Wszystko gra. Wybierz dowolne ćwiczenie i idź dalej.” + linki do Packs, Clusters, Irregular.

---

## 8. Powiązane pliki

| Plik | Zakres |
|------|--------|
| `app/api/app/intelligent-suggestions-v2/route.ts` | Implementacja API |
| `app/app/profile/page.tsx` | Jedyny konsument |
| `lib/events/trainingEvents.ts` | emit + subscribe |
| `app/app/vocab/pack/[slug]/PackTrainingClient.tsx` | emit pack |
| `app/app/vocab/cluster/[slug]/ClusterClient.tsx` | emit cluster |
| `app/app/irregular-verbs/train/TrainClient.tsx` | emit irregular |
| `supabase/migrations/20260220_create_intelligent_suggestion_materialized_views.sql` | MV + refresh |
| `lib/knowledge/updateLearningUnitKnowledge.ts` | Używane przez pack/cluster; irregular nie |

---

## 9. Znane problemy

| Problem | Opis |
|---------|------|
| **Irregular puste** | `user_learning_unit_knowledge` nie ma wpisów dla irregular – irregular nie wywołuje `updateLearningUnitKnowledge`. |
| **Materialized views** | Brak automatycznego REFRESH. Nowe odpowiedzi nie trafiają do sugestii bez ręcznego wywołania `refresh_intelligent_suggestion_views()`. |
| **Tylko profil** | GlobalTrainingSuggestion („Co trenować”) nie korzysta z tego API – ma statyczną listę. |

---

## 10. Rekomendacje

1. **Integracja irregular:** W `app/api/irregular-verbs/complete/route.ts` dodać wywołanie `updateLearningUnitKnowledge` (mode: "session") per verb lub dla całej sesji.
2. **Cron dla MV:** Ustawić pg_cron (lub inny scheduler) wywołujący `refresh_intelligent_suggestion_views()` co X minut.
3. **GlobalTrainingSuggestion:** Podłączyć do intelligent-suggestions-v2 zamiast statycznej listy.

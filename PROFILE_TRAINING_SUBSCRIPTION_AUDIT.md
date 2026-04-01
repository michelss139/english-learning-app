# Audyt: `subscribeTrainingCompleted` a profil i sugestie (2026-03-19)

**Zakres:** Jak **ProfilePage** i powiązane komponenty reagują na zakończenie treningu.  
**Poprzednia wersja** (2026-02-20) opisywała optimistic update + `intelligentSuggestions` (packs/clusters) — **ten model został usunięty** z profilu.

---

## 1. ProfilePage (`app/app/profile/page.tsx`)

### 1.1 Subskrypcja

```ts
useEffect(() => {
  const unsubscribe = subscribeTrainingCompleted(async () => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/suggestions", { headers: { Authorization: `Bearer ${token}` } });
    // setSuggestionsTop / setSuggestionsList z odpowiedzi
  });
  return unsubscribe;
}, []);
```

- **Brak** `setIntelligentSuggestions`, **brak** optimistic usuwania pack/cluster z listy.
- Po evencie: **pełny refetch** `GET /api/suggestions`.

### 1.2 Ocena

- **useEffect `[]`:** subskrypcja na cały cykl życia strony profilu — OK.
- **Cleanup:** `unsubscribe` — OK.
- **Race / optimistic:** problem opisany wcześniej (dwa szybkie eventy + refetch intelligent-v2) **nie dotyczy** obecnej logiki w ten sam sposób — brak lokalnej listy packów do synchronizacji z MV.

---

## 2. GlobalTrainingSuggestion

- Subskrybuje `subscribeTrainingCompleted`: czyści lock sesji (`activeSessionHref`, `lockedOptions`) i wywołuje `fetchSuggestions(true)`.
- Zob. **`KNOWLEDGE_ENGINE_AND_TRAINING_SUGGESTIONS_AUDIT.md`**.

---

## 3. Inni subskrybenci (training events)

- Sprawdź: `grep subscribeTrainingCompleted` w repozytorium — lista może się zmieniać.

---

## 4. Mechanizm eventów

- **Plik:** `lib/events/trainingEvents.ts` — BroadcastChannel lub `CustomEvent`.
- **Emit:** m.in. PackTrainingClient, ClusterClient, TrainClient po ukończeniu sesji.

---

## 5. Podsumowanie

| Temat | Status (2026-03) |
|-------|------------------|
| Profil + optimistic packs/clusters | **Usunięte** — zastąpione refetchem `/api/suggestions` |
| Stale closure w profilu | Handler async z aktualnym tokenem — typowy wzorzec |
| Race przy dwóch eventach | Mniejsze znaczenie (brak merge’owania list packów w stanie) |

---

*Koniec audytu.*

# Audyt techniczny: subskrypcja + optimistic update (ProfilePage)

**Data:** 2026-02-20  
**Zakres:** stabilność i poprawność `subscribeTrainingCompleted` oraz optimistic update. Bez refaktoru architektury.

---

## 1. Subskrypcja

### 1.1 useEffect i zależności

```ts
useEffect(() => {
  const unsubscribe = subscribeTrainingCompleted((event) => { ... });
  return unsubscribe;
}, []);
```

- **Zależności:** `[]` – subskrypcja montuje się raz przy mount.
- **Ocena:** OK. Brak zależności jest zamierzony – subskrypcja ma żyć przez cały cykl życia komponentu.

### 1.2 Cleanup unsubscribe

- **Return:** `return unsubscribe` – cleanup zwraca funkcję odsubskrybowania.
- **Ocena:** OK. Przy unmount React wywoła `unsubscribe()`, listener zostanie usunięty.

### 1.3 Hot reload / ponowny mount

- Przy HMR: stary efekt wykonuje cleanup → nowy efekt dodaje nową subskrypcję.
- **Ocena:** OK. Brak podwójnej subskrypcji.

### 1.4 Stale closure

- Handler używa `event` z argumentu – zawsze aktualny dla danego wywołania.
- `setIntelligentSuggestions((prev) => ...)` – `prev` pochodzi z Reacta w momencie wywołania.
- Async refetch używa `event` z closure – `event` jest stały w ramach jednego wywołania handlera.
- **Ocena:** Brak problemu ze stale closure. Nie potrzeba functional setState dla `event`.

---

## 2. Optimistic update – packs

### 2.1 Functional update

- `setIntelligentSuggestions((prev) => { ... })` – użycie functional update.
- **Ocena:** OK.

### 2.2 Korekta packIndex

- `setPackIndex((idx) => { if (nextPacks.length === 0) return 0; if (idx >= nextPacks.length) return 0; return idx; })`
- **Ocena:** OK. Pusta lista → 0, index poza zakresem → 0.

### 2.3 Side effect w setState

- `setPackIndex` wywoływane wewnątrz callbacka `setIntelligentSuggestions`.
- React zbatchuje oba setState w jednym cyklu.
- **Ocena:** Działa poprawnie, choć side effect w setState jest anty‑wzorcem. Nie blokuje działania.

### 2.4 Render – index out of bounds

- `currentPack = packs.length > 0 ? packs[packIndex % packs.length] : null`
- `packIndex % packs.length` zawsze w zakresie `[0, packs.length-1]`.
- **Ocena:** OK. Brak ryzyka undefined przy renderze.

---

## 3. Optimistic update – clusters

- Analogiczna logika jak dla packs.
- **Ocena:** OK. Brak problemów z indeksem ani undefined.

---

## 4. Optimistic update – irregular

### 4.1 Czy refetch nadpisuje optimistic?

W refetch:

```ts
setIntelligentSuggestions((prev) => {
  if (!prev) return json;
  if (event.type === "pack") return { ...json, packs: nextPacks };
  if (event.type === "cluster") return { ...json, clusters: nextClusters };
  return { ...json, irregular: null };  // event.type === "irregular"
});
```

- Dla `event.type === "irregular"` zawsze ustawiane jest `irregular: null`.
- **Ocena:** OK. Refetch nie cofa optimistic update dla irregular.

### 4.2 Zachowanie przy MV nieodświeżonym

- Nawet jeśli API zwróci `json.irregular` z danymi, kod wymusza `irregular: null`.
- **Ocena:** OK. Brak potrzeby dodatkowego mechanizmu.

---

## 5. Refetch

### 5.1 Równoległość

- `void (async () => { ... })()` – fire‑and‑forget.
- **Ocena:** OK. UI nie jest blokowane.

### 5.2 Błąd refetch

- `catch { /* Keep optimistic state */ }` – przy błędzie stan nie jest cofany.
- **Ocena:** OK.

### 5.3 Race condition (dwa szybkie eventy)

**Scenariusz:** użytkownik kończy pack A, od razu pack B (np. w różnych zakładkach).

1. Event 1 (pack A): optimistic usuwa A, start refetch 1.
2. Event 2 (pack B): optimistic usuwa B (z listy już bez A), start refetch 2.
3. Refetch 1 kończy się: `nextPacks = json1.packs.filter(slug !== A)`, setState.
4. Refetch 2 kończy się: `nextPacks = json2.packs.filter(slug !== B)`. MV może być nieodświeżona, więc `json2.packs` nadal zawiera A i B. `nextPacks` = lista bez B, ale z A.
5. `setIntelligentSuggestions({ ...json, packs: nextPacks })` – pack A wraca na listę.

**Problem:** Ostatni zakończony refetch może przywrócić wcześniej usunięty pack/cluster.

**Minimalna poprawka (bez localStorage, bez przebudowy):**

Dodać `useRef` z akumulowanymi usunięciami i filtrować wynik refetch:

```ts
const pendingPackRemovalsRef = useRef<Set<string>>(new Set());
const pendingClusterRemovalsRef = useRef<Set<string>>(new Set());
```

W handlerze, na początku (przed optimistic update):

```ts
if (event.type === "pack") pendingPackRemovalsRef.current.add(event.slug);
if (event.type === "cluster") pendingClusterRemovalsRef.current.add(event.slug);
```

W refetch, przed `setIntelligentSuggestions`:

```ts
const packsToSet = json.packs.filter((p) => !pendingPackRemovalsRef.current.has(p.slug));
const clustersToSet = json.clusters.filter((c) => !pendingClusterRemovalsRef.current.has(c.slug));
// ... używamy packsToSet i clustersToSet zamiast nextPacks/nextClusters
```

Refy są czyszczone przy unmount (nowy ref przy kolejnym mount). Opcjonalnie można czyścić wpisy, gdy dany slug przestaje występować w odpowiedzi API (MV odświeżony), ale nie jest to konieczne dla poprawności.

---

## 6. BroadcastChannel / fallback

### 6.1 Fallback window.dispatchEvent

- Gdy `BroadcastChannel` niedostępny: `window.addEventListener(WINDOW_EVENT_NAME, onWindowEvent)`.
- `emitTrainingCompleted` używa `window.dispatchEvent(new CustomEvent(..., { detail: event }))`.
- **Ocena:** OK. Handler otrzymuje `custom.detail` i działa poprawnie.

### 6.2 Cleanup listenera

- `return () => { ... window.removeEventListener(...) }` – przy wywołaniu `unsubscribe()` listener jest usuwany.
- **Ocena:** OK.

### 6.3 Memory leak

- Przy unmount `unsubscribe()` usuwa listener.
- **Ocena:** Brak memory leak.

---

## 7. Podsumowanie

| Aspekt | Status | Uwagi |
|--------|--------|-------|
| useEffect + cleanup | OK | Prawidłowa subskrypcja i odsubskrybowanie |
| Stale closure | OK | Brak problemu |
| Packs optimistic | OK | Functional update, bezpieczna korekta indeksu |
| Clusters optimistic | OK | Analogicznie jak packs |
| Irregular optimistic | OK | Refetch nie cofa ustawienia `irregular: null` |
| Refetch równoległy | OK | Fire‑and‑forget |
| Błąd refetch | OK | Optimistic state zachowany |
| Race (dwa eventy) | Problem | Ostatni refetch może przywrócić usunięty pack/cluster |
| BroadcastChannel fallback | OK | Listener poprawnie dodawany i usuwany |
| Memory leak | OK | Brak |

---

## 8. Rekomendacja

**Implementacja jest w większości bezpieczna produkcyjnie.** Jedyny istotny problem to race condition przy dwóch szybkich eventach (pack/cluster), gdzie refetch może przywrócić wcześniej usunięty element.

**Minimalna poprawka:** dodać `useRef` z `Set<string>` dla `pendingPackRemovals` i `pendingClusterRemovals`, uzupełniać je przy eventach i filtrować `json.packs` / `json.clusters` w refetch przed `setIntelligentSuggestions`.

---

*Koniec audytu.*

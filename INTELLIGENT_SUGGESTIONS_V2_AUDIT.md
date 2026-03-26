# intelligent-suggestions-v2 — status legacy (2026-03-19)

**Uwaga:** Interfejs użytkownika **nie** wywołuje już `GET /api/app/intelligent-suggestions-v2`. Profil i widget „Co trenować” korzystają z **`GET /api/suggestions`** (`app/api/suggestions/route.ts`).  
Pełny opis aktualnego systemu: **`CO_TRENOWAC_AUDIT.md`**.

---

## Po co ten plik

- **Plik API nadal istnieje:** `app/api/app/intelligent-suggestions-v2/route.ts` — zwraca irregular / packs / clusters z `user_learning_unit_knowledge` oraz materialized views `mv_user_pack_accuracy`, `mv_user_cluster_accuracy`.
- **Materialized views** i `refresh_intelligent_suggestion_views()` mogą być nadal istotne operacyjnie (cron), nawet jeśli UI przestał tego endpointu używać.
- Poniżej **skrót historyczny** poprzedniej wersji audytu (2026-03-06).

---

## Historyczny kształt odpowiedzi (API)

```ts
type ApiResponse = {
  irregular: { verbs: { id: string; base: string }[]; total_problematic: number; href: string } | null;
  packs: { slug: string; accuracy: number; href: string }[];
  clusters: { slug: string; accuracy: number; href: string }[];
};
```

- **Packs/clusters:** z MV, accuracy &lt; próg, sortowanie po accuracy.
- **Irregular:** z `user_learning_unit_knowledge` (`unit_type='irregular'`). W starszej analizie zwracano uwagę, że runtime mógł mieć mało wpisów, jeśli irregular nie aktualizował knowledge — **obecnie** trening irregular aktualizuje wiedzę m.in. przez `updateLearningUnitKnowledge` w flow submit (zob. kod).

---

## Migracja SQL (referencja)

- `supabase/migrations/20260220_create_intelligent_suggestion_materialized_views.sql` — MV + `refresh_intelligent_suggestion_views()`.

---

## Rekomendacje (2026-03)

1. **Decyzja produktowa:** usunąć route `intelligent-suggestions-v2`, jeśli nie planuje się powrotu do osobnego feedu pack/cluster, **albo** oznaczyć jako deprecated i monitorować logi.
2. **MV:** jeśli tylko `/api/suggestions` jest używane, ocenić, czy MV nadal są potrzebne do czegokolwiek innego (raporty, admin).

---

*Dokument zastąpił pełny audyt z 2026-03-06; szczegóły UI/profilu nie opisują już optimistic update dla tego endpointu.*

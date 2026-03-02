# Plan testów jednostkowych – English Platform

## Ograniczenie zakresu

**Bez testów związanych z bazą danych.** Tylko czysta logika – bez Supabase, bez mocków DB, bez operacji na danych. Funkcje deterministyczne, bez side-effectów.

---

## 1. Stan obecny

### Istniejące testy (Vitest)
- **lib/grammar/formEngine.test.ts** – 30 testów, czysta logika ✅
- **app/api/story-generator/route.test.ts** – mocki Supabase/OpenAI (brak realnej DB, pozostaje w scope)

### Testy poza Vitest
- **lib/vocab/clusterQualityGates.test.ts** – własny format, czysta logika
- **lib/vocab/verbForms.test.ts** – testuje `resolveVerbForm` (DB) → **pominięty**; zostają tylko `shouldShowVerbFormBadge`, `getVerbFormLabel`

### Konfiguracja Vitest
```ts
include: ["lib/grammar/**/*.test.ts", "app/api/story-generator/**/*.test.ts"]
```

---

## 2. Zakres: tylko czysta logika (bez DB)

### Moduły w scope

| Moduł | Plik | Funkcje czyste |
|-------|------|----------------|
| Grammar | formEngine.ts | ✅ Już testowane |
| Grammar | compare.ts | `getComparison`, `getComparisonCacheKey` |
| Grammar | practice.ts | `getGrammarPracticeExercise`, `getGrammarPracticeQuestion` |
| Grammar | tensePatterns.ts | `validateTenseForm` |
| Vocab | clusterQualityGates.ts | `normalizeText`, `tokenizeWords`, `buildAcceptedFormsForLemma`, `evaluateExample` |
| Vocab | metrics.ts | `calculateAccuracy`, `isLearned`, `needsRepetition`, `getErrorRate` |
| Vocab | verbForms.ts | `shouldShowVerbFormBadge`, `getVerbFormLabel` |
| XP | levels.ts | `levelRequirement`, `calculateLevelInfo` |
| XP | award.ts | `getWarsawDateString` |
| Streaks | streaks.ts | `getStreakDisplay` |
| Story | profiles.ts | Struktura `STORY_PROFILES` |

### Poza scope (DB / I/O)

- testLoader, award (awardXpAndBadges), updateStreak, perfect, resolveVerbForm
- Wszystkie API routes
- Skrypty content-pipeline

---

## 3. Plan implementacji (ograniczony)

### Faza 0: Konfiguracja
1. **Rozszerzyć `vitest.config.ts`** – dodać `lib/vocab/**/*.test.ts`, `lib/xp/**/*.test.ts`, `lib/streaks.test.ts`, `lib/story/**/*.test.ts`
2. **Przepisać `clusterQualityGates.test.ts`** – z assert na Vitest
3. **verbForms.test.ts** – usunąć testy `resolveVerbForm` (DB), zostawić tylko `shouldShowVerbFormBadge` i `getVerbFormLabel`

### Faza 1: Czyste funkcje

| Plik testowy | Funkcje |
|--------------|---------|
| **lib/xp/levels.test.ts** | `levelRequirement`, `calculateLevelInfo` |
| **lib/vocab/metrics.test.ts** | `calculateAccuracy`, `isLearned`, `needsRepetition`, `getErrorRate` |
| **lib/grammar/compare.test.ts** | `getComparison`, `getComparisonCacheKey` |
| **lib/grammar/practice.test.ts** | `getGrammarPracticeExercise`, `getGrammarPracticeQuestion` |
| **lib/grammar/tensePatterns.test.ts** | `validateTenseForm` |
| **lib/xp/award.test.ts** | `getWarsawDateString` |
| **lib/streaks.test.ts** | `getStreakDisplay` |
| **lib/story/profiles.test.ts** | Klucze i struktura `STORY_PROFILES` |
| **lib/vocab/verbForms.test.ts** | Tylko `shouldShowVerbFormBadge`, `getVerbFormLabel` |

---

## 4. Kolejność egzekucji

1. **Faza 0** – konfiguracja + clusterQualityGates
2. **Faza 1** – wszystkie czyste funkcje

---

## 5. Szacowany nakład

| Faza | Czas | Pliki |
|------|------|-------|
| 0 | 0.5 dnia | Modyfikacje + 1 przepisanie |
| 1 | 1 dzień | 8 nowych plików |
| **Razem** | **~1.5 dnia** | **~9 plików** |

---

## 6. Wymagania

- **Vitest** – bez mocków Supabase/DB
- **Izolacja** – zero sieci, zero plików, zero bazy
- **Deterministyczność** – dla `getWarsawDateString` można przekazać datę jako argument

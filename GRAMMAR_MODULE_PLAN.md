# Plan wdrożenia modułu Grammar

## KROK 1: Struktura podstawowa + routing + spis treści
**Cel:** Utworzenie podstawowej struktury modułu, routing, strona spisu treści

**Pliki do utworzenia:**
- `app/app/grammar/page.tsx` - strona spisu treści (lista czasów)
- `app/app/grammar/[slug]/page.tsx` - strona konkretnego czasu (placeholder na razie)
- `lib/grammar/content.ts` - struktura danych dla czasów (pusta na razie, będzie wypełniona w KROKU 2)
- `lib/grammar/types.ts` - typy TypeScript dla danych grammar

**Zmiany w istniejących plikach:**
- `app/app/page.tsx` - dodanie kafelka "Gramatyka" z linkiem do `/app/grammar`

**Testy:**
- Sprawdzenie czy `/app/grammar` się ładuje
- Sprawdzenie czy link w panelu ucznia działa
- Sprawdzenie czy routing `[slug]` działa (nawet z placeholderem)

---

## KROK 2: Treści czasów gramatycznych
**Cel:** Przeniesienie treści autorskich do systemu (6 czasów na start)

**Pliki do utworzenia/zmiany:**
- `lib/grammar/content.ts` - wypełnienie treściami dla:
  - present-simple
  - present-continuous
  - past-simple
  - past-continuous
  - present-perfect
  - present-perfect-continuous

**Zmiany w istniejących plikach:**
- `app/app/grammar/[slug]/page.tsx` - renderowanie treści z content.ts
- `app/app/grammar/page.tsx` - lista wszystkich dostępnych czasów

**Testy:**
- Sprawdzenie czy wszystkie 6 czasów się wyświetlają
- Sprawdzenie czy treści są czytelne
- Sprawdzenie czy slug routing działa dla każdego czasu

---

## KROK 3: Interaktywne elementy (chips, anchor links, "Zobacz też")
**Cel:** Dodanie klikalnych elementów w treściach

**Zmiany w istniejących plikach:**
- `lib/grammar/types.ts` - dodanie typów dla chips, anchor links, related links
- `lib/grammar/content.ts` - dodanie danych dla interaktywnych elementów
- `app/app/grammar/[slug]/page.tsx` - renderowanie chips, anchor links, "Zobacz też"

**Testy:**
- Sprawdzenie czy chips są klikalne (jeśli mają funkcjonalność)
- Sprawdzenie czy anchor links prowadzą do odpowiednich sekcji
- Sprawdzenie czy "Zobacz też" prowadzi do innych czasów

---

## KROK 4: Porównywarka czasów (MVP)
**Cel:** Implementacja porównywarki dla Present Simple vs Present Perfect oraz Present Continuous vs Present Simple

**Pliki do utworzenia:**
- `app/app/grammar/compare/page.tsx` - strona porównywarki (lub sekcja w [slug]/page.tsx)
- `lib/grammar/compare.ts` - logika porównywarki

**Zmiany w istniejących plikach:**
- `app/app/grammar/[slug]/page.tsx` - dodanie sekcji "Porównaj" z linkami do porównywarki
- `lib/grammar/content.ts` - dodanie danych dla porównań

**Testy:**
- Sprawdzenie czy porównywarka się wyświetla
- Sprawdzenie czy oba porównania działają
- Sprawdzenie czy linki z kart czasów prowadzą do porównywarki

---

## KROK 5: Tabela cache + API dla AI dialog
**Cel:** Utworzenie infrastruktury do cache'owania AI dialogów

**Pliki do utworzenia:**
- `supabase/migrations/20250122_add_grammar_ai_cache.sql` - migracja tabeli `grammar_ai_dialog_cache`
- `app/api/grammar/ai-dialog/route.ts` - endpoint GET (odczyt cache) i POST (generowanie + zapis)

**Testy:**
- Sprawdzenie czy migracja działa
- Sprawdzenie czy GET zwraca cache jeśli istnieje
- Sprawdzenie czy POST generuje i zapisuje (bez faktycznego wywołania AI na razie - mock)

---

## KROK 6: Integracja AI dialog w porównywarce
**Cel:** Dodanie przycisku "Wygeneruj dialog AI" w porównywarce z integracją API

**Zmiany w istniejących plikach:**
- `app/app/grammar/compare/page.tsx` - dodanie przycisku i integracja z API
- `app/api/grammar/ai-dialog/route.ts` - implementacja faktycznego wywołania AI (OpenAI)

**Testy:**
- Sprawdzenie czy przycisk działa
- Sprawdzenie czy AI generuje dialog (test z prawdziwym API)
- Sprawdzenie czy cache działa (drugie wywołanie nie generuje ponownie)
- Sprawdzenie czy UI pokazuje cache'owany dialog

---

## UWAGI TECHNICZNE

- **Styl:** Dark glassmorphism (spójny z resztą aplikacji)
- **Routing:** Next.js App Router (Server/Client Components)
- **Dane:** Statyczne pliki TS/JSON (nie DB na start dla treści)
- **Cache:** Supabase tabela dla AI dialogów
- **Auth:** JWT Bearer token dla POST endpoint (generowanie AI)
- **RLS:** Select dla zalogowanych, insert/update tylko przez backend

---

**Status:** Gotowe do wykonania KROKU 1

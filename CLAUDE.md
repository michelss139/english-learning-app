# CLAUDE.md — LANGBracket

Przeczytaj ten plik w całości przed każdą sesją. Zawiera filozofię projektu, konwencje techniczne i zasady współpracy.

## Czym jest LANGBracket

LANGBracket to prywatna platforma edukacyjna do nauki języka angielskiego dla dorosłych uczniów (30+). Projekt niekomercyjny, tworzony przez nauczyciela dla swoich uczniów.

Najważniejsza metafora: LANGBracket to inteligentny notatnik — nie aplikacja z kolorowymi ptaszkami. Odpowiedź na "mam chaotyczne notatki i nie wiem co teraz robić". Miejsce na uporządkowaną wiedzę, okraszone silnikiem który monitoruje słabe punkty nauki i je usprawnia.

Platforma ma ambicję stać się miejscem skupiającym nauczycieli i uczniów — gdzie nauczyciel zapisuje notatkę uczniowi, uczeń widzi co robił na lekcji i ma dostęp do wszystkich zagadnień językowych. Na ten moment: jeden nauczyciel, docelowo ~50 uczniów.

Filozofia nauki: Dobrze i trwale — nigdy szybko. Szybkość to złudzenie.

## Stack techniczny

* Framework: Next.js 16.1.1, App Router
* Język: TypeScript ^5 — używaj zawsze, `any` jest zakazane
* Style: Tailwind CSS ^4 z pluginem `@tailwindcss/postcss ^4`
* Baza danych: Supabase (PostgreSQL)
* Komponenty: zero zewnętrznych bibliotek UI (brak shadcn, Radix, MUI, Chakra)
* Ikony: wyłącznie Tabler Icons (outline) — nigdy filled, nigdy hand-drawn SVG paths
* Linting: ESLint ^9 + eslint-config-next 16.1.1. Prettier nie jest skonfigurowany — nie dodawaj go.

## Struktura projektu

```
app/               # Next.js App Router
  _components/     # Komponenty lokalne dla App Router
  api/             # API routes
  app/             # Strony aplikacji (auth required)
    admin/
    auth/
    courses/
    vocab/         # Fiszki i słownictwo
    grammar/       # Gramatyka
    ...
components/        # Komponenty współdzielone globalnie
  auth/
  dashboard/
  grammar/
  lessons/
lib/               # Logika biznesowa, helpery, typy
  auth/
  coach/
  events/
  exercises/
  grammar/
  knowledge/       # Knowledge engine — silnik sugestii
  learning/
  lessons/
  lexicon/         # CHRONIONY — patrz sekcja "Czego nie ruszać"
  story/
  suggestions/
  supabase/
  vocab/
  xp/
scripts/           # Skrypty seed/pipeline
content/           # Treści (generated/, imported/)
supabase/          # Migracje SQL
public/            # Statyczne assety
data/
docs/
```

## Role użytkowników

Trzy role zdefiniowane w `lib/auth/profile.ts`:

* `"admin"` — pełny dostęp
* `"teacher"` — zarządzanie uczniami i lekcjami
* `"student"` — dostęp do własnych danych i ćwiczeń

## Konwencje kodu

* Nazwy plików: PascalCase dla komponentów React, kebab-case dla reszty
* Komponenty: Server Components domyślnie. Client Component (`"use client"`) tylko gdy konieczne (interaktywność, hooki stanu)
* Zapytania do bazy: równoległe query zawsze przez `Promise.all` — nigdy sekwencyjnie
* Język interfejsu: polski (UI) / angielski (treści edukacyjne)
* Komentarze w kodzie: nie dodawaj — projekt jest czytelny bez nich
* TypeScript: strict, zero `any`, typy zawsze jawne dla parametrów funkcji i zwracanych wartości

## Design i UX

Styl: czysty, minimalistyczny, premium. Funkcjonalność ponad ozdobniki.

Kolory marki:

* Primary blue: `#178CF2` (akcenty, CTA, kolor marki)
* Dark text: `#0F172A`
* Ikony Tabler: outline only

Zasady UI:

* Zero zewnętrznych bibliotek komponentów
* Karty: `background: var(--color-background-primary)`, `border: 0.5px solid var(--color-border-tertiary)`, `border-radius: var(--border-radius-lg)`
* Metryki/statystyki: `background: var(--color-background-secondary)`, border-radius-md
* Nie używamy poziomów CEFR (A1/A2/B1 itd.) w interfejsie użytkownika — są tylko w bazie danych dla celów technicznych
* Fiszki dzielimy na tryb `daily` i `precise` — nie na poziomy
* System rang oparty na serii dni nauki (patrz sekcja "System rang")

## System rang (streak-based)

Ranga wyliczana dynamicznie z aktualnego `streak` — nigdy nie przechowywana w bazie.

```
0 dni        → Świeży rekrut         (ti-door-enter)
1–2 dni      → Nowy w biurze         (ti-coffee)
3–6 dni      → Regularny pracownik   (ti-briefcase)
7–13 dni     → Zaufany pracownik     (ti-badge)
14–20 dni    → Prawdziwy profesjonał (ti-certificate)
21–29 dni    → Ekspert               (ti-award)
30–59 dni    → Weteran               (ti-shield)
60+ dni      → Tytan pracy           (ti-flame)
```

Mechanika serii:

* Liczy się wyłącznie ukończona sesja ćwiczeniowa (samo wejście na stronę nie wystarczy)
* Bufor 1 dnia (grace day): pierwszy dzień bez sesji nie odejmuje punktu, dopiero drugi
* Każdy kolejny dzień bez sesji: streak -1 (minimum 0)
* Funkcja pomocnicza: `getRank(streak: number)` w `lib/xp/` — dostępna server i client side

## Czego absolutnie nie ruszać bez wyraźnego polecenia

### Leksykon (baza słów)

`lib/lexicon/` i powiązane tabele w Supabase zawierają rdzeń bazy słownictwa:

* Słowa (`lemma`, `pos`, `definition_en`, `cefr_level`, `domain`)
* Tłumaczenia (`translation_pl`)
* Przykłady zdań (`examples[]`)
* Formy czasownikowe (`past_simple`, `past_participle`)

Nie modyfikuj, nie usuwaj, nie migrujesz tych tabel bez osobnej, wyraźnej zgody. Jeśli zadanie wymaga zmiany w leksykonie — zatrzymaj się i zapytaj.

### Migracje bazy danych

Każda migracja SQL w `supabase/` wymaga potwierdzenia przed wykonaniem. Przedstaw plan migracji jako tekst, poczekaj na "tak", dopiero wtedy twórz plik.

### Knowledge engine

`lib/knowledge/` i `lib/suggestions/` — silnik podpowiadający co ćwiczyć. Nie refaktoryzuj bez kontekstu — logika jest nieoczywista i wpływa na całe doświadczenie ucznia.

## Zasady współpracy

1. Pytaj przed działaniem przy każdej większej decyzji architektonicznej lub gdy masz wątpliwości co do zakresu zadania
2. Nie instaluj nowych pakietów bez pytania — przedstaw propozycję z uzasadnieniem
3. Nie refaktoryzuj kodu który nie jest częścią bieżącego zadania — nawet jeśli widzisz "lepszy sposób"
4. Nie twórz nowych plików jeśli logika pasuje do istniejącego
5. Scope creep jest wrogiem — rób dokładnie to co jest w zadaniu, nic więcej
6. Jedno zadanie na raz — jeśli przy okazji widzisz inny problem, zgłoś go słownie, nie naprawiaj samodzielnie

## Aktualny stan platformy (aktualizuj po większych zmianach)

### Gotowe i stabilne

* System autentykacji (role: admin, teacher, student)
* Fiszki (paczki słów daily/precise, sesje, multiple choice, podsumowanie sesji)
* Klastry słów (make/do, say/tell, bring/take, hear/listen — więcej ukrytych w DB)
* Story Generator (generator historyjek kontrastujących czasy)
* Gramatyka (czasy, tryby warunkowe, czasowniki modalne)
* Nieregularne czasowniki
* Dashboard (kalendarz lekcji, nawigacja, seria nauki)
* Profil ucznia (rangi, metryki, odznaki)
* Logo LANGBracket (SVG + komponent React w `components/`)

### W trakcie / do dopieszczenia

* Odznaki (podwaliny gotowe, warunki zaimplementowane, grafika do dopracowania)
* Articles (dział czytania — migracja schematu świeża, wymaga dopieszczenia)
* Klastry — odblokować ukryte z DB + dodać nowe (see/look/watch, know/find out/learn, go/come)

### Zaplanowane (nie zaczęte)

* Phrasal Verbs Tier 1 (get, put, take, come, go, look, make, turn)
* Kolokacje jako pole w fiszkach rzeczownikowych
* Panel nauczyciela (zarządzanie uczniami bez Supabase)
* Backup bazy danych — priorytet bezpieczeństwa

### Rzeczy do zaadresowania (dług techniczny / otwarte kwestie)

* Brak backupu bazy Supabase — ryzyko utraty danych
* Duplikaty paczek słów w DB (garden-plants/garden-garden-plants, home-rooms/rooms-in-the-house itp.) — do wyczyszczenia
* Role teacher/admin — do uporządkowania i ewentualnego uproszczenia
* `shopping-groceries-and-food-items-daily` — paczka wyłączona bez wyraźnego powodu, sprawdzić

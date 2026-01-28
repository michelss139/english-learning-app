# Weryfikacja verb_form w lookup-word

Endpoint **nie** dodaje słówek do `user_vocab`. Zwraca obiekt `verb_form` tylko dla czasowników (pos=verb).

## Oczekiwane zachowanie

1. **Lookup formy nieregularnej (np. "went")**
   - `verb_form.base.lemma_norm === "go"`
   - `verb_form.base.lemma` – lemma z `lexicon_entries`
   - `verb_form.forms` – `{ past_simple: "went", past_participle: "gone" }` (jeśli w `lexicon_verb_forms`)
   - `verb_form.matched_form_type === "past_simple"`
   - `verb_form.matched_term === "went"` (oryginalny wpis)

2. **Lookup base lemma (np. "go")**
   - `verb_form.forms` – went/gone jeśli są w tabeli
   - `verb_form.matched_form_type === null`
   - `verb_form.matched_term === null`

3. **Lookup nie-czasownika (np. "ball")**
   - W odpowiedzi **nie ma** pola `verb_form` (lub jest `undefined`).

## Curl (podstawowe)

```bash
# Token z sesji (np. z aplikacji po zalogowaniu)
TOKEN="eyJ..."

# Lookup formy: "went"
curl -s -X POST "http://localhost:3000/api/vocab/lookup-word" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"lemma":"went"}' | jq '.verb_form, .entry.pos'

# Oczekiwane: verb_form.base.lemma_norm == "go", verb_form.forms, matched_form_type, matched_term

# Lookup base: "go"
curl -s -X POST "http://localhost:3000/api/vocab/lookup-word" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"lemma":"go"}' | jq '.verb_form, .entry.pos'

# Oczekiwane: verb_form.forms (went/gone), matched_form_type == null, matched_term == null

# Lookup nie-czasownika: "ball"
curl -s -X POST "http://localhost:3000/api/vocab/lookup-word" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"lemma":"ball"}' | jq 'has("verb_form")'

# Oczekiwane: false (brak verb_form)
```

## Weryfikacja w UI (manualna)

1. **Wyszukaj "went"**
   - Zakładka „Dodaj słówko” → wpisz **went** → Szukaj / Dodaj.
   - W modalu: nagłówek z **went** i badge **Forma: Past simple od 'go'** (tylko past_*, nigdy „Present simple (I) od do”).
   - Sekcja **Formy czasownika**: wiersz **Baza: go** z „w puli” lub **Dodaj do puli**; Past simple: went; Past participle: gone; przy formach – „w puli” lub **Dodaj do puli**.

2. **Wyszukaj "gone"**
   - Badge: **Forma: Past participle od 'go'**.
   - Sekcja Formy czasownika jak wyżej (baza + went/gone).

3. **Wyszukaj "go"**
   - Brak badge’a „Forma: … od …”.
   - Sekcja Formy czasownika: Baza (go), Past simple (went), Past participle (gone).
   - Na dole sekcji: **Zobacz też: went, gone** (klik w „went” ustawia wyszukiwanie na „went” i odpala lookup).

4. **Add-to-pool**
   - Dla bazy: **Dodaj do puli** przy „Baza: go” dodaje bazę (jeden sens) do puli; po dodaniu widoczny status „w puli”.
   - Dla form: **Dodaj do puli** przy „went” / „gone” dodaje formę jako custom lemma; po dodaniu „w puli”.
   - Baza nie jest dodawana automatycznie przy otwarciu modalu.

5. **Nie-czasownik (np. "ball")**
   - Brak sekcji Formy czasownika i brak badge’a.

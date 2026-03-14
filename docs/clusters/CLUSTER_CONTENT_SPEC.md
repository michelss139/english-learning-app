# Cluster Content Spec

## 1. Cluster Concept

Clusters teach practical differences between commonly confused English words.

Examples:
- `make / do`
- `bring / take`
- `lend / borrow`
- `lose / miss`

Clusters focus on real usage and collocations rather than abstract definitions.

## 2. Cluster Structure

Each cluster contains:
- theory
- core patterns
- practice tasks

Cluster page layout:
- Header
- Theory
- Core patterns
- Start practice

Example banks are not used in the UI.

## 3. Practice Tasks

Two task types are supported:
- `choice`
- `translation`

Correction tasks are not used in vocab clusters.

## 4. Session Composition

Practice session size: `10` tasks

Distribution:
- `6` choice tasks
- `4` translation tasks

Tasks are sampled randomly and shuffled.

## 5. Content Volume Per Cluster

Each cluster must contain:
- `25` choice examples
- `15` translation tasks

Do not exceed this amount.

## 6. Choice Task Format

Example:

```json
{
  "sentence_en": "I usually __ breakfast at 7.",
  "correct_word": "make",
  "distractors": ["do"],
  "difficulty": 1
}
```

Rules:
- exactly one blank `__`
- simple natural English
- avoid complex grammar
- focus on the cluster distinction

## 7. Translation Task Format

Example:

```json
{
  "sentence_pl": "Muszę zrobić plan.",
  "primary_answer": "I need to make a plan.",
  "accepted_variants": ["I have to make a plan."],
  "target_tokens": ["make"]
}
```

Rules:
- short Polish sentences
- simple English answers
- avoid complex grammar
- `target_tokens` should contain the core lemma or lemmas tested by the task
- use `accepted_variants` only for genuinely natural alternatives
- `key_phrase` may remain only as a legacy fallback for older content

## 8. Translation Scoring

The system validates translation tasks primarily using `target_tokens`.

Steps:

1. Normalize student answer:
   - lowercase
   - remove punctuation
   - collapse spaces
2. Tokenize the normalized answer into words.
3. Check whether any token belongs to the lemma family of any item in `target_tokens`.

If yes, the answer is correct.

If `target_tokens` does not exist, the system falls back to legacy `key_phrase` validation.

The full sentence is still stored in `vocab_answer_events`.

## 9. Patterns Section

Each cluster should contain `4-6` core patterns.

Example:

```json
{
  "title": "create vs result",
  "pattern_en": "make breakfast / make a plan / make a mistake",
  "pattern_pl": "zrobić śniadanie / zrobić plan / popełnić błąd",
  "usage_note": "...",
  "contrast_note": "...",
  "sort_order": 10
}
```

## 10. Content Quality Guidelines

Clusters should:
- focus on real usage
- use natural English
- use short sentences
- avoid rare vocabulary
- emphasize common learner mistakes

Target audience:
- Polish learners of English

## 11. Pre-Publish Checklist

- Theory explains the difference clearly in Polish (3-5 sentences).
- Verb clusters include verb forms (base / 3rd person / past / past participle).
- The cluster contains exactly:
  - 25 choice examples
  - 15 translation tasks.
- Choice sentences contain exactly one blank `__`.
- Sentences are short and natural (avoid complex grammar).
- The correct answers are balanced across the cluster words (avoid heavy bias toward one word).
- Translation tasks focus on the cluster distinction rather than grammar complexity.
- Each translation task has valid `target_tokens`.
- `accepted_variants` are used only when they are genuinely natural alternatives.
- Core patterns include 4-6 groups with clear contrast notes.
- No rare vocabulary or unnatural textbook sentences.
- Sentences sound like normal spoken or everyday English.

If any item fails, revise the cluster before seeding it into the database.

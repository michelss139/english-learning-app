import { requiredEnv, type AILexiconResponse, normLemma } from "@/lib/lexicon/lookupOrCreateLexiconEntry";

type EnrichmentMode = "default" | "core";

type BatchResultRaw =
  | {
      lemma: string;
      error: "invalid_or_uncertain";
    }
  | {
      lemma: string;
      pos: string;
      senses: Array<{
        definition_en?: unknown;
        translation_pl?: unknown;
        example_en?: unknown;
      }>;
    };

type BatchResponseRaw = {
  results?: BatchResultRaw[];
};

export type EnrichLexiconBatchResult =
  | {
      lemma: string;
      data: AILexiconResponse[];
      error?: undefined;
    }
  | {
      lemma: string;
      data?: undefined;
      error: "invalid_or_uncertain" | string;
    };

function cleanString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeLemmaList(lemmas: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const lemma of lemmas) {
    const normalized = normLemma(lemma);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }

  return out;
}

function parseStrictJson(content: string): BatchResponseRaw {
  let cleaned = content.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  return JSON.parse(cleaned.trim()) as BatchResponseRaw;
}

export async function enrichLexiconBatch(
  lemmas: string[],
  options?: { mode?: EnrichmentMode }
): Promise<EnrichLexiconBatchResult[]> {
  const normalizedLemmas = normalizeLemmaList(lemmas);
  if (normalizedLemmas.length === 0) return [];

  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = "gpt-4.1";
  const mode = options?.mode ?? "default";

  const coreModePrompt =
    mode === "core"
      ? `

You are generating vocabulary for beginner learners (A1-B1).

CRITICAL RULES:
- Prefer ONLY ONE meaning per word
- Allow a second meaning only if it is extremely common and clearly different
- Never return more than 2 senses
- Avoid rare, abstract, or secondary meanings
- Focus on the most basic everyday meaning
- If unsure, return ONLY ONE sense
`
      : "";

  const prompt = `You are generating vocabulary entries for a language learning system.

Your output will be used in a production lexicon.
Accuracy, clarity, and realism are critical.
${coreModePrompt}

You will receive multiple English lemmas.
Generate structured data for each lemma separately.

STRICT RULES:
- Every input lemma MUST appear exactly once in output
- If a lemma cannot be generated confidently, return:
  { "lemma": "word", "error": "invalid_or_uncertain" }
- Do not omit any lemma
- Do not merge lemmas together
- Do not add extra lemmas
- Keep only common, real-world meanings
- Avoid rare, technical, or inappropriate meanings
- Keep definitions simple and learner-friendly
- Keep examples short and natural
- In default mode, return at most 3 senses per lemma
- In core mode, prefer 1 sense and never more than 2

Return STRICT JSON ONLY in this exact format:
{
  "results": [
    {
      "lemma": "word",
      "pos": "noun" | "verb" | "adjective",
      "senses": [
        {
          "definition_en": "...",
          "translation_pl": "...",
          "example_en": "..."
        }
      ]
    }
  ]
}

Input lemmas:
${normalizedLemmas.map((lemma) => `- ${lemma}`).join("\n")}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You output strictly valid JSON and nothing else. If confidence is insufficient for a lemma, return error invalid_or_uncertain for that lemma.",
        },
        {
          role: "user",
          content: prompt.trim(),
        },
      ],
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}: ${text}`);
  }

  let outerJson: any;
  try {
    outerJson = JSON.parse(text);
  } catch {
    throw new Error(`OpenAI response not JSON: ${text}`);
  }

  const content = outerJson?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI returned empty content.");
  }

  let parsed: BatchResponseRaw;
  try {
    parsed = parseStrictJson(content);
  } catch {
    throw new Error(`Model did not return strict JSON: ${content}`);
  }

  const byLemma = new Map<string, EnrichLexiconBatchResult>();
  const rawResults = Array.isArray(parsed.results) ? parsed.results : [];

  for (const raw of rawResults) {
    const lemma = normLemma(raw?.lemma ?? "");
    if (!lemma || !normalizedLemmas.includes(lemma) || byLemma.has(lemma)) continue;

    if ("error" in raw && raw.error === "invalid_or_uncertain") {
      byLemma.set(lemma, {
        lemma,
        error: "invalid_or_uncertain",
      });
      continue;
    }

    const pos = cleanString((raw as { pos?: unknown }).pos);
    const sensesRaw = Array.isArray((raw as { senses?: unknown }).senses) ? (raw as { senses: Array<any> }).senses : [];

    const cleanedSenses = sensesRaw
      .map((sense) => ({
        definition_en: cleanString(sense?.definition_en),
        translation_pl: cleanString(sense?.translation_pl),
        example_en: cleanString(sense?.example_en),
      }))
      .filter((sense) => sense.definition_en && sense.translation_pl && sense.example_en);

    if (!pos || cleanedSenses.length === 0) {
      byLemma.set(lemma, {
        lemma,
        error: "invalid_or_uncertain",
      });
      continue;
    }

    const limitedSenses = cleanedSenses.slice(0, mode === "core" ? 2 : 3);
    if (limitedSenses.length === 0) {
      byLemma.set(lemma, {
        lemma,
        error: "invalid_or_uncertain",
      });
      continue;
    }

    byLemma.set(lemma, {
      lemma,
      data: [
        {
          lemma,
          pos,
          senses: limitedSenses,
          verb_forms: undefined,
        },
      ],
    });
  }

  return normalizedLemmas.map((lemma) => {
    const existing = byLemma.get(lemma);
    if (existing) return existing;
    return {
      lemma,
      error: "invalid_or_uncertain",
    };
  });
}

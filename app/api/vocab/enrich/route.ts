import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type ProviderFetchResult =
  | { ok: true; url: string; status: number; data: any }
  | { ok: false; url: string; error: string };

type EnrichmentUpsert = {
  term_en_norm: string;
  translation_pl_suggested: string | null;
  example_en: string | null;
  ipa: string | null;
  audio_url: string | null;

  provider_name: string;
  provider_source: string | null;
  provider_source_url: string | null;
  provider_license: string | null;
  provider_payload: any | null;

  updated_at: string;
};

function normTerm(term: string): string {
  return term.trim().toLowerCase();
}

function uniqSemicolon(list: string[]): string | null {
  const cleaned = list
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.toLowerCase());

  const uniq = Array.from(new Set(cleaned));
  return uniq.length ? uniq.join("; ") : null;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isBadExampleForTerm(example: string, termNorm: string): boolean {
  const ex = example.trim();
  const exLower = ex.toLowerCase();

  // Basic quality gates
  if (ex.length < 12) return true;
  if (!/[a-z]/i.test(ex)) return true;
  if (!/[.?!]$/.test(ex)) return true;

  // Must contain the term as a whole word (or for phrases, contain the phrase)
  // For single word: \bterm\b
  // For phrase: simple substring check
  if (termNorm.includes(" ")) {
    if (!exLower.includes(termNorm)) return true;
  } else {
    const re = new RegExp(`\\b${escapeRegExp(termNorm)}\\b`, "i");
    if (!re.test(ex)) return true;
  }

  // Filter out common "bad/metadata-like" patterns (make of, kind of, etc.)
  // Specifically target "what/which make of ..."
  if (termNorm === "make") {
    if (/^\s*(what|which)\s+make\s+of\b/i.test(ex)) return true;
    if (/\bmake\s+of\b/i.test(exLower)) return true;
  }

  // Generic patterns that often produce low learning value
  if (/^\s*(what|which)\s+\w+\s+of\b/i.test(ex)) return true;

  return false;
}

function pickFromDictionaryApi(payload: any, termNorm: string): { ipa: string | null; audio_url: string | null; example_en: string | null } {
  try {
    if (!Array.isArray(payload) || payload.length === 0) return { ipa: null, audio_url: null, example_en: null };
    const entry = payload[0];

    const ipa =
      (typeof entry?.phonetic === "string" && entry.phonetic.trim()) ||
      (Array.isArray(entry?.phonetics)
        ? entry.phonetics
            .map((p: any) => (typeof p?.text === "string" ? p.text.trim() : ""))
            .find((t: string) => t)
        : null) ||
      null;

    const audio_url =
      (Array.isArray(entry?.phonetics)
        ? entry.phonetics
            .map((p: any) => (typeof p?.audio === "string" ? p.audio.trim() : ""))
            .find((a: string) => a)
        : null) ||
      null;

    // Collect candidate examples and pick the first "good" one
    const candidates: string[] = [];
    if (Array.isArray(entry?.meanings)) {
      for (const m of entry.meanings) {
        if (!Array.isArray(m?.definitions)) continue;
        for (const d of m.definitions) {
          if (typeof d?.example === "string" && d.example.trim()) {
            candidates.push(d.example.trim());
          }
        }
      }
    }

    let example_en: string | null = null;
    for (const ex of candidates) {
      if (!isBadExampleForTerm(ex, termNorm)) {
        example_en = ex;
        break;
      }
    }

    return { ipa, audio_url, example_en };
  } catch {
    return { ipa: null, audio_url: null, example_en: null };
  }
}

function pickPlTranslationsFromFreeDictionary(payload: any): { translation_pl_suggested: string | null; source_url: string | null } {
  try {
    const word: string | null =
      (typeof payload?.word === "string" && payload.word) ||
      (Array.isArray(payload) && typeof payload?.[0]?.word === "string" ? payload[0].word : null) ||
      null;

    const source_url = word ? `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}` : null;

    const translationsContainer =
      payload?.translations ??
      (Array.isArray(payload) ? payload?.[0]?.translations : null) ??
      null;

    const pl =
      translationsContainer?.pl ??
      translationsContainer?.polish ??
      translationsContainer?.Polish ??
      null;

    const values: string[] = [];
    const pushAny = (v: any) => {
      if (!v) return;
      if (typeof v === "string") {
        values.push(v);
        return;
      }
      if (Array.isArray(v)) {
        for (const item of v) pushAny(item);
        return;
      }
      if (typeof v === "object") {
        const cand = v.translation ?? v.text ?? v.word ?? v.value ?? null;
        if (typeof cand === "string") values.push(cand);
      }
    };

    pushAny(pl);

    return { translation_pl_suggested: uniqSemicolon(values), source_url };
  } catch {
    return { translation_pl_suggested: null, source_url: null };
  }
}

async function fetchJsonWithDiag(url: string): Promise<ProviderFetchResult> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "user-agent": "english-platform/1.0 (Next.js server)",
      },
    });

    const status = res.status;
    const text = await res.text();

    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      return { ok: false, url, error: `HTTP ${status}: ${typeof data === "string" ? data : JSON.stringify(data)}` };
    }

    return { ok: true, url, status, data };
  } catch (e: any) {
    return { ok: false, url, error: e?.message ?? String(e) };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const term_en = (body?.term_en ?? "").toString();

    if (!term_en.trim()) {
      return NextResponse.json({ error: "term_en is required" }, { status: 400 });
    }

    const term_en_norm = normTerm(term_en);

    const dictUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term_en_norm)}`;
    const freeUrl = `https://api.freedictionaryapi.com/api/v1/entries/en/${encodeURIComponent(term_en_norm)}?translations=true`;

    const [dictRes, freeRes] = await Promise.all([fetchJsonWithDiag(dictUrl), fetchJsonWithDiag(freeUrl)]);

    const dictData = dictRes.ok ? dictRes.data : null;
    const freeData = freeRes.ok ? freeRes.data : null;

    const { ipa, audio_url, example_en } = dictData
      ? pickFromDictionaryApi(dictData, term_en_norm)
      : { ipa: null, audio_url: null, example_en: null };

    const { translation_pl_suggested, source_url } = freeData
      ? pickPlTranslationsFromFreeDictionary(freeData)
      : { translation_pl_suggested: null, source_url: null };

    const upsert: EnrichmentUpsert = {
      term_en_norm,
      translation_pl_suggested,
      example_en,
      ipa,
      audio_url,

      provider_name: "open_data",
      provider_source: "wiktionary(freedictionaryapi)+dictionaryapi.dev",
      provider_source_url: source_url,
      provider_license: "Wiktionary CC BY-SA 4.0 (via FreeDictionaryAPI) + dictionaryapi.dev (source dependent)",
      provider_payload: {
        provider_results: {
          dictionaryapi: dictRes,
          freedictionaryapi: freeRes,
        },
        example_quality: {
          filtered_for_term: term_en_norm,
        },
      },

      updated_at: new Date().toISOString(),
    };

    const supabase = createSupabaseAdmin();

    const { error } = await supabase
      .from("vocab_enrichments")
      .upsert(upsert, { onConflict: "term_en_norm" });

    if (error) {
      return NextResponse.json({ error: error.message, debug: upsert.provider_payload }, { status: 500 });
    }

    return NextResponse.json({ ok: true, enrichment: upsert });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

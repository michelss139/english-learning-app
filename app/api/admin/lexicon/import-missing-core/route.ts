import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserIdFromApiRequest } from "@/lib/auth/adminApiAuth";
import { normLemma } from "@/lib/lexicon/lookupOrCreateLexiconEntry";
import { importLexiconBatch } from "@/lib/lexicon/importLexiconBatch";

const IN_CHUNK = 150;
const MAX_IMPORT_BATCH = 30;

function uniqueNormalizedOrder(words: unknown): string[] | null {
  if (!Array.isArray(words)) return null;
  const seen = new Set<string>();
  const out: string[] = [];

  for (const w of words) {
    if (typeof w !== "string") return null;
    const n = normLemma(w);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }

  return out;
}

async function fetchExistingLemmaNorms(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  norms: string[]
): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < norms.length; i += IN_CHUNK) {
    const chunk = norms.slice(i, i + IN_CHUNK);
    const { data, error } = await supabase.from("lexicon_entries").select("lemma_norm").in("lemma_norm", chunk);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      if (row?.lemma_norm) found.add(row.lemma_norm);
    }
  }
  return found;
}

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseAdmin();

    const userId = await getUserIdFromApiRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profErr || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body !== "object" || !("words" in body)) {
      return NextResponse.json({ error: 'Expected JSON: { "words": string[] }' }, { status: 400 });
    }

    const ordered = uniqueNormalizedOrder((body as { words: unknown }).words);
    if (ordered === null) {
      return NextResponse.json({ error: '"words" must be an array of strings' }, { status: 400 });
    }

    if (ordered.length === 0) {
      return NextResponse.json({ created: [], skipped: [], failed: [] });
    }

    const inDb = await fetchExistingLemmaNorms(supabase, ordered);
    const created: string[] = [];
    const skipped: string[] = [];
    const failed: Array<{ word: string; error: string }> = [];
    const missing: string[] = [];

    for (const norm of ordered) {
      if (inDb.has(norm)) skipped.push(norm);
      else missing.push(norm);
    }

    const importBatch = missing.slice(0, MAX_IMPORT_BATCH);
    const warning = missing.length > MAX_IMPORT_BATCH ? "partial_batch_processed" : undefined;
    const importResult = await importLexiconBatch(supabase, importBatch, { mode: "core" });
    created.push(...importResult.created);
    failed.push(...importResult.failed);

    return NextResponse.json({
      created,
      skipped,
      failed,
      ...(warning ? { warning } : {}),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserIdFromApiRequest } from "@/lib/auth/adminApiAuth";
import { analyzePackWordsAgainstLexicon, normalizeWordsInput } from "@/lib/vocab/packBuilder";

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseAdmin();

    const userId = await getUserIdFromApiRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const slug = typeof (body as { slug?: unknown })?.slug === "string" ? (body as { slug: string }).slug.trim().toLowerCase() : "";
    if (!slug) {
      return NextResponse.json({ error: '"slug" is required' }, { status: 400 });
    }

    const normalizedWords = normalizeWordsInput((body as { words?: unknown })?.words);
    if (!normalizedWords) {
      return NextResponse.json({ error: '"words" must be an array of strings' }, { status: 400 });
    }

    const { data: existingPack, error: packError } = await supabase
      .from("vocab_packs")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (packError) {
      return NextResponse.json({ error: packError.message }, { status: 500 });
    }

    const analysis = await analyzePackWordsAgainstLexicon(supabase, normalizedWords.normalized);

    return NextResponse.json({
      slug_exists: Boolean(existingPack),
      total_input: normalizedWords.totalInput,
      normalized_unique: normalizedWords.normalized.length,
      duplicates: normalizedWords.duplicates,
      existing_ready: analysis.ready,
      ambiguous_existing: analysis.ambiguous,
      missing: analysis.missing,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function normQ(q: string) {
  return q.trim().toLowerCase();
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = normQ(url.searchParams.get("q") ?? "");

    const supabase = createSupabaseAdmin();

    // NOTE: This is a sanity endpoint using service role.
    // It returns GLOBAL pool (all users) unless we scope to the current user.
    // To keep it safe, we will scope by the authenticated user id via header.
    // For now, we will require x-user-id header. Next step we will wire it properly.
    //
    // Since you already have Auth in /app, we will in the next step replace this with your
    // real server auth. For now, this endpoint will return only words linked to any user
    // if no header is provided, which is NOT acceptable for production.
    //
    // Therefore we block unless x-user-id is provided.
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Missing x-user-id header (temporary sanity endpoint)" },
        { status: 401 }
      );
    }

    const { data: links, error: linkErr } = await supabase
      .from("user_vocab")
      .select("student_id, global_vocab_item_id, global_vocab_items(term_en, term_en_norm)")
      .eq("student_id", userId)
      .order("created_at", { ascending: false });

    if (linkErr) {
      return NextResponse.json({ error: linkErr.message }, { status: 500 });
    }

    const words = (links ?? [])
      .map((x: any) => x.global_vocab_items)
      .filter(Boolean) as { term_en: string; term_en_norm: string }[];

    const filtered = q ? words.filter((w) => w.term_en_norm.includes(q)) : words;

    const norms = filtered.map((w) => w.term_en_norm);

    let enrichmentsByNorm: Record<string, any> = {};
    if (norms.length) {
      const { data: enrich, error: enrichErr } = await supabase
        .from("vocab_enrichments")
        .select("term_en_norm, translation_pl_suggested, example_en, ipa, audio_url")
        .in("term_en_norm", norms);

      if (enrichErr) {
        return NextResponse.json({ error: enrichErr.message }, { status: 500 });
      }
      enrichmentsByNorm = Object.fromEntries((enrich ?? []).map((e: any) => [e.term_en_norm, e]));
    }

    const rows = filtered.map((w) => {
      const e = enrichmentsByNorm[w.term_en_norm] ?? null;
      return {
        term_en: w.term_en,
        term_en_norm: w.term_en_norm,
        translation_pl_suggested: e?.translation_pl_suggested ?? null,
        example_en: e?.example_en ?? null,
        ipa: e?.ipa ?? null,
        audio_url: e?.audio_url ?? null,
      };
    });

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

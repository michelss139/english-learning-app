import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function normQ(q: string) {
  return q.trim().toLowerCase();
}

export async function GET(req: Request) {
  try {
    // Auth: verify JWT token (replacing unsafe x-user-id header)
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = userData.user.id;

    const url = new URL(req.url);
    const q = normQ(url.searchParams.get("q") ?? "");

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

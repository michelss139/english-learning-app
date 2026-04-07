import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { aggregatePackItemCounts } from "@/lib/vocab/aggregatePackItemCounts";

type PackListItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  order_index: number;
  vocab_mode: string;
  category: string;
  item_count: number;
};

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseRouteClient();
    const {
      data: { user },
      error: sessionErr,
    } = await supabase.auth.getUser();
    if (sessionErr || !user?.id) {
      return NextResponse.json({ error: "Authentication failed", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const url = new URL(req.url);
    const modeParam = (url.searchParams.get("vocab_mode") ?? "").toLowerCase();
    const modeFilter = modeParam === "daily" || modeParam === "mixed" || modeParam === "precise" ? modeParam : null;

    let packsQuery = supabase
      .from("vocab_packs")
      .select("id, slug, title, description, order_index, vocab_mode, category")
      .eq("is_published", true)
      .order("order_index", { ascending: true })
      .order("title", { ascending: true });

    if (modeFilter) {
      packsQuery = packsQuery.eq("vocab_mode", modeFilter);
    }

    const { data: packs, error: packsErr } = await packsQuery;

    if (packsErr) {
      return NextResponse.json({ error: packsErr.message }, { status: 500 });
    }

    const packIds = (packs ?? []).map((p) => p.id);
    const counts = packIds.length > 0 ? await aggregatePackItemCounts(supabase, packIds) : new Map<string, number>();

    const payload: PackListItem[] = (packs ?? []).map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description ?? null,
      order_index: p.order_index ?? 0,
      vocab_mode: p.vocab_mode ?? "mixed",
      category: p.category ?? "general",
      item_count: counts.get(p.id) ?? 0,
    }));

    return NextResponse.json({ ok: true, packs: payload });
  } catch (e: any) {
    console.error("[packs] Error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { aggregatePackItemCounts } from "@/lib/vocab/aggregatePackItemCounts";
import { comparePacksForCatalog } from "@/lib/vocab/packCatalogOrder";

type PackListItem = {
  id: string;
  slug: string;
  title: string;
  presentation_title: string;
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const isAdmin = profile?.role === "admin";

    const url = new URL(req.url);
    const modeParam = (url.searchParams.get("vocab_mode") ?? "").toLowerCase();
    // DB allows only daily | precise; legacy "mixed" was migrated to daily — treat as daily.
    const modeFilter =
      modeParam === "daily" || modeParam === "mixed"
        ? "daily"
        : modeParam === "precise"
          ? "precise"
          : null;

    let packsQuery = supabase
      .from("vocab_packs")
      .select("id, slug, title, display_title, description, order_index, vocab_mode, category, featured_rank, is_archived")
      .eq("is_published", true);

    if (!isAdmin) {
      packsQuery = packsQuery.eq("is_archived", false);
    }

    if (modeFilter) {
      packsQuery = packsQuery.eq("vocab_mode", modeFilter);
    }

    const { data: packs, error: packsErr } = await packsQuery;

    if (packsErr) {
      return NextResponse.json({ error: packsErr.message }, { status: 500 });
    }

    const rows = [...(packs ?? [])];
    const presentation = (p: { display_title: string | null; title: string }) =>
      (p.display_title?.trim() || p.title || "").trim();

    rows.sort((a: any, b: any) =>
      comparePacksForCatalog(
        {
          featured_rank: a.featured_rank ?? null,
          order_index: a.order_index ?? 0,
          presentation_title: presentation(a),
        },
        {
          featured_rank: b.featured_rank ?? null,
          order_index: b.order_index ?? 0,
          presentation_title: presentation(b),
        },
      ),
    );

    const packIds = rows.map((p) => p.id);
    const counts = packIds.length > 0 ? await aggregatePackItemCounts(supabase, packIds) : new Map<string, number>();

    const payload: PackListItem[] = rows.map((p: any) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      presentation_title: presentation(p),
      description: p.description ?? null,
      order_index: p.order_index ?? 0,
      vocab_mode: p.vocab_mode ?? "daily",
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

import { NextResponse } from "next/server";
import { createSupabaseServerWithToken } from "@/lib/supabase/server";

type PackListItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  order_index: number;
  item_count: number;
};

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization bearer token", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const supabase = await createSupabaseServerWithToken(token);
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: "Authentication failed", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const { data: packs, error: packsErr } = await supabase
      .from("vocab_packs")
      .select("id, slug, title, description, order_index")
      .eq("is_published", true)
      .order("order_index", { ascending: true })
      .order("title", { ascending: true });

    if (packsErr) {
      return NextResponse.json({ error: packsErr.message }, { status: 500 });
    }

    const packIds = (packs ?? []).map((p) => p.id);
    let counts = new Map<string, number>();

    if (packIds.length > 0) {
      const { data: items, error: itemsErr } = await supabase
        .from("vocab_pack_items")
        .select("pack_id")
        .in("pack_id", packIds);

      if (itemsErr) {
        return NextResponse.json({ error: itemsErr.message }, { status: 500 });
      }

      counts = new Map<string, number>();
      for (const item of items ?? []) {
        const current = counts.get(item.pack_id) ?? 0;
        counts.set(item.pack_id, current + 1);
      }
    }

    const payload: PackListItem[] = (packs ?? []).map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description ?? null,
      order_index: p.order_index ?? 0,
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

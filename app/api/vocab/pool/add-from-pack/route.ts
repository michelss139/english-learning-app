import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createSupabaseAdmin();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id)
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const userId = userData.user.id;
    const body = (await req.json()) as { pack_id?: string };
    const packId = body.pack_id;
    if (!packId) return NextResponse.json({ error: "pack_id required" }, { status: 400 });

    // All sense_ids in this pack
    const { data: packItems, error: packErr } = await supabase
      .from("vocab_pack_items")
      .select("sense_id")
      .eq("pack_id", packId);

    if (packErr) return NextResponse.json({ error: packErr.message }, { status: 500 });

    const senseIds = (packItems ?? [])
      .map((i: { sense_id: string | null }) => i.sense_id)
      .filter((id): id is string => Boolean(id));

    if (senseIds.length === 0)
      return NextResponse.json({ ok: true, added: 0, skipped: 0 });

    // User's existing sense_ids from this pack
    const { data: existing } = await supabase
      .from("user_vocab_items")
      .select("sense_id")
      .eq("student_id", userId)
      .in("sense_id", senseIds);

    const existingSet = new Set((existing ?? []).map((i: { sense_id: string | null }) => i.sense_id));
    const newIds = senseIds.filter((id) => !existingSet.has(id));

    if (newIds.length === 0)
      return NextResponse.json({ ok: true, added: 0, skipped: senseIds.length });

    const { error: insertErr } = await supabase.from("user_vocab_items").insert(
      newIds.map((sense_id) => ({
        student_id: userId,
        sense_id,
        source: "lexicon",
        verified: true,
      }))
    );

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, added: newIds.length, skipped: existingSet.size });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

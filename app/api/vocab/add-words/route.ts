import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type Body = {
  sense_ids: string[];
};

export async function POST(req: Request) {
  try {
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

    const body = (await req.json().catch(() => null)) as Body | null;
    const senseIds = Array.isArray(body?.sense_ids) ? body?.sense_ids.filter(Boolean) : [];
    const uniqueSenseIds = Array.from(new Set(senseIds));

    if (uniqueSenseIds.length === 0) {
      return NextResponse.json({ error: "sense_ids is required" }, { status: 400 });
    }

    const { data: existingSenses, error: sensesErr } = await supabase
      .from("lexicon_senses")
      .select("id")
      .in("id", uniqueSenseIds);

    if (sensesErr) {
      return NextResponse.json({ error: `Failed to verify senses: ${sensesErr.message}` }, { status: 500 });
    }

    const verifiedIds = new Set((existingSenses ?? []).map((row) => row.id));
    const verifiedSenseIds = uniqueSenseIds.filter((id) => verifiedIds.has(id));

    if (verifiedSenseIds.length === 0) {
      return NextResponse.json({ ok: true, added: 0, skipped: uniqueSenseIds.length, added_ids: [] });
    }

    const { data: existingItems, error: existingErr } = await supabase
      .from("user_vocab_items")
      .select("sense_id")
      .eq("student_id", userId)
      .in("sense_id", verifiedSenseIds);

    if (existingErr) {
      return NextResponse.json({ error: `Failed to check existing items: ${existingErr.message}` }, { status: 500 });
    }

    const existingSet = new Set((existingItems ?? []).map((row) => row.sense_id).filter(Boolean));
    const toInsert = verifiedSenseIds.filter((id) => !existingSet.has(id));

    if (toInsert.length === 0) {
      return NextResponse.json({ ok: true, added: 0, skipped: verifiedSenseIds.length, added_ids: [] });
    }

    const insertRows = toInsert.map((sense_id) => ({
      student_id: userId,
      sense_id,
      source: "lexicon",
      verified: true,
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from("user_vocab_items")
      .insert(insertRows)
      .select("id, sense_id");

    if (insertErr) {
      return NextResponse.json({ error: `Failed to add words: ${insertErr.message}` }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      added: inserted?.length ?? 0,
      skipped: verifiedSenseIds.length - (inserted?.length ?? 0),
      added_ids: (inserted ?? []).map((row) => row.sense_id),
    });
  } catch (e: any) {
    console.error("[add-words] Error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}

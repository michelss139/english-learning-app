import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type Action = "delete" | "mark_mastered";

type Body = {
  action: Action;
  user_vocab_item_ids: string[];
};

const MAX_IDS = 200;

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
    const action = body?.action;
    const ids = Array.isArray(body?.user_vocab_item_ids) ? body.user_vocab_item_ids.filter(Boolean) : [];

    if (action !== "delete" && action !== "mark_mastered") {
      return NextResponse.json({ error: "action must be delete or mark_mastered" }, { status: 400 });
    }
    if (ids.length === 0) {
      return NextResponse.json({ error: "user_vocab_item_ids is required" }, { status: 400 });
    }
    if (ids.length > MAX_IDS) {
      return NextResponse.json({ error: `At most ${MAX_IDS} items per request` }, { status: 400 });
    }

    const { data: rows, error: fetchErr } = await supabase
      .from("user_vocab_items")
      .select("id, student_id, sense_id")
      .in("id", ids);

    if (fetchErr) {
      return NextResponse.json({ error: `Failed to verify items: ${fetchErr.message}` }, { status: 500 });
    }

    const owned = (rows ?? []).filter((r) => r.student_id === userId);
    const ownedIds = owned.map((r) => r.id);

    if (ownedIds.length === 0) {
      return NextResponse.json({ error: "No matching items for this user" }, { status: 404 });
    }

    if (action === "delete") {
      const { error: deleteErr } = await supabase.from("user_vocab_items").delete().in("id", ownedIds);

      if (deleteErr) {
        return NextResponse.json({ error: `Failed to delete: ${deleteErr.message}` }, { status: 500 });
      }

      return NextResponse.json({ ok: true, deleted: ownedIds.length });
    }

    // mark_mastered — only lexicon senses have knowledge rows
    const senseIds = [...new Set(owned.map((r) => r.sense_id).filter((sid): sid is string => Boolean(sid)))];
    const nowIso = new Date().toISOString();
    let updated = 0;

    for (const senseId of senseIds) {
      const { data: existing, error: selErr } = await supabase
        .from("user_learning_unit_knowledge")
        .select("total_attempts, correct_count, wrong_count")
        .eq("student_id", userId)
        .eq("unit_type", "sense")
        .eq("unit_id", senseId)
        .maybeSingle();

      if (selErr) {
        return NextResponse.json({ error: `Failed to read knowledge: ${selErr.message}` }, { status: 500 });
      }

      const wrong = Number(existing?.wrong_count ?? 0);
      const correct = Math.max(Number(existing?.correct_count ?? 0), wrong + 2);
      const total = Math.max(Number(existing?.total_attempts ?? 0), correct + wrong, 5);
      const stabilityScore = correct * 2 - wrong * 3;

      const payload = {
        total_attempts: total,
        correct_count: correct,
        wrong_count: wrong,
        last_attempt_at: nowIso,
        last_correct_at: nowIso,
        last_wrong_at: null as string | null,
        stability_score: stabilityScore,
        knowledge_state: "mastered" as const,
        updated_at: nowIso,
      };

      if (existing) {
        const { error: upErr } = await supabase
          .from("user_learning_unit_knowledge")
          .update(payload)
          .eq("student_id", userId)
          .eq("unit_type", "sense")
          .eq("unit_id", senseId);
        if (upErr) {
          return NextResponse.json({ error: `Failed to update knowledge: ${upErr.message}` }, { status: 500 });
        }
      } else {
        const { error: insErr } = await supabase.from("user_learning_unit_knowledge").insert({
          student_id: userId,
          unit_type: "sense",
          unit_id: senseId,
          ...payload,
          created_at: nowIso,
        });
        if (insErr) {
          return NextResponse.json({ error: `Failed to insert knowledge: ${insErr.message}` }, { status: 500 });
        }
      }
      updated += 1;
    }

    const skippedNoSense = owned.filter((r) => !r.sense_id).length;

    return NextResponse.json({
      ok: true,
      senses_updated: updated,
      items_considered: ownedIds.length,
      skipped_no_sense_id: skippedNoSense,
    });
  } catch (e: unknown) {
    console.error("[pool/bulk] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

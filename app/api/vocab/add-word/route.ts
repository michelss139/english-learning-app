import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * POST /api/vocab/add-word
 * 
 * Add selected sense to user's vocabulary pool.
 * This endpoint saves the word to user_vocab_items.
 */

type Body = {
  sense_id: string; // Selected sense ID from lexicon_senses
  notes?: string; // Optional user notes
  status?: string; // Optional status (e.g., 'learning', 'review')
  lesson_id?: string; // Optional: if adding from lesson context, also pin to lesson
};

export async function POST(req: Request) {
  try {
    // Auth: verify JWT token
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
    const sense_id = body?.sense_id;

    if (!sense_id) {
      return NextResponse.json({ error: "sense_id is required" }, { status: 400 });
    }

    // Verify sense exists
    const { data: sense, error: senseErr } = await supabase
      .from("lexicon_senses")
      .select("id")
      .eq("id", sense_id)
      .maybeSingle();

    if (senseErr) {
      return NextResponse.json({ error: `Failed to verify sense: ${senseErr.message}` }, { status: 500 });
    }

    if (!sense) {
      return NextResponse.json({ error: "Sense not found" }, { status: 404 });
    }

    // Check if already in user's pool
    const { data: existing, error: existingErr } = await supabase
      .from("user_vocab_items")
      .select("id")
      .eq("student_id", userId)
      .eq("sense_id", sense_id)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json({ error: `Failed to check existing: ${existingErr.message}` }, { status: 500 });
    }

    if (existing) {
      // If already in pool and lesson_id provided, just pin to lesson
      if (body?.lesson_id) {
        const { error: pinErr } = await supabase.from("lesson_vocab_items").insert({
          student_lesson_id: body.lesson_id,
          user_vocab_item_id: existing.id,
        });

        if (pinErr && !String(pinErr.message).toLowerCase().includes("duplicate")) {
          return NextResponse.json(
            { error: `Failed to pin to lesson: ${pinErr.message}` },
            { status: 500 }
          );
        }

        return NextResponse.json({
          ok: true,
          user_vocab_item_id: existing.id,
          pinned_to_lesson: true,
          already_in_pool: true,
        });
      }

      return NextResponse.json({ error: "Word already in your pool" }, { status: 409 });
    }

    // Insert into user_vocab_items
    const { data: newItem, error: insertErr } = await supabase
      .from("user_vocab_items")
      .insert({
        student_id: userId,
        sense_id,
        notes: body?.notes?.trim() || null,
        status: body?.status || null,
        source: "lexicon",
        verified: true,
      })
      .select("id")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: `Failed to add word: ${insertErr.message}` }, { status: 500 });
    }

    const userVocabItemId = newItem.id;

    // If lesson_id provided, also pin to lesson
    if (body?.lesson_id) {
      const { error: pinErr } = await supabase.from("lesson_vocab_items").insert({
        student_lesson_id: body.lesson_id,
        user_vocab_item_id: userVocabItemId,
      });

      if (pinErr) {
        // If duplicate, that's OK - word already in lesson
        if (!String(pinErr.message).toLowerCase().includes("duplicate")) {
          return NextResponse.json(
            { error: `Failed to pin to lesson: ${pinErr.message}` },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      user_vocab_item_id: userVocabItemId,
      pinned_to_lesson: Boolean(body?.lesson_id),
    });
  } catch (e: any) {
    console.error("[add-word] Error:", e);
    return NextResponse.json(
      {
        error: e?.message ?? "Unknown error",
        stack: process.env.NODE_ENV === "development" ? e?.stack : undefined,
      },
      { status: 500 }
    );
  }
}

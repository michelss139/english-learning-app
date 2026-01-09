import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * POST /api/irregular-verbs/next
 * Returns a random irregular verb from user's pinned verbs
 * 
 * Body: (optional)
 * - exclude_ids: array of verb IDs to exclude (for avoiding repeats)
 * 
 * Auth: Required (JWT Bearer token)
 */
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

    const body = await req.json().catch(() => null);
    const excludeIds = Array.isArray(body?.exclude_ids) ? body.exclude_ids : [];

    // Get user's pinned verbs
    const { data: pinned, error: pinnedError } = await supabase
      .from("user_irregular_verbs")
      .select("irregular_verb_id")
      .eq("student_id", userId);

    if (pinnedError) {
      console.error("[irregular-verbs/next] Error fetching pinned verbs:", pinnedError);
      return NextResponse.json({ error: pinnedError.message }, { status: 500 });
    }

    if (!pinned || pinned.length === 0) {
      return NextResponse.json(
        { error: "No pinned verbs. Please pin some verbs first." },
        { status: 400 }
      );
    }

    // Filter out excluded IDs
    const availableIds = pinned
      .map((p) => p.irregular_verb_id)
      .filter((id) => !excludeIds.includes(id));

    if (availableIds.length === 0) {
      return NextResponse.json(
        { error: "All pinned verbs have been excluded. Reset exclude_ids or pin more verbs." },
        { status: 400 }
      );
    }

    // Pick random verb ID
    const randomIndex = Math.floor(Math.random() * availableIds.length);
    const selectedVerbId = availableIds[randomIndex];

    // Get verb details
    const { data: verb, error: verbError } = await supabase
      .from("irregular_verbs")
      .select("id, base, base_norm, past_simple, past_simple_variants, past_participle, past_participle_variants")
      .eq("id", selectedVerbId)
      .single();

    if (verbError || !verb) {
      console.error("[irregular-verbs/next] Error fetching verb:", verbError);
      return NextResponse.json(
        { error: verbError?.message ?? "Verb not found" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: verb.id,
      base: verb.base,
      past_simple: verb.past_simple,
      past_simple_variants: verb.past_simple_variants || [],
      past_participle: verb.past_participle,
      past_participle_variants: verb.past_participle_variants || [],
    });
  } catch (e: any) {
    console.error("[irregular-verbs/next] Error:", e);
    return NextResponse.json(
      {
        error: e?.message ?? "Unknown error",
        stack: process.env.NODE_ENV === "development" ? e?.stack : undefined,
      },
      { status: 500 }
    );
  }
}

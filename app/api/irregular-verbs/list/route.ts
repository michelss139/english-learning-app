import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/irregular-verbs/list
 * Returns list of all irregular verbs with user's pinned status
 * 
 * Query params (optional):
 * - search: filter by base form (case-insensitive)
 * 
 * Auth: Optional (if authenticated, shows pinned status)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";

    // Optional auth - if token provided, show pinned status
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

    let userId: string | null = null;
    if (token) {
      const supabase = createSupabaseAdmin();
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (!userErr && userData?.user?.id) {
        userId = userData.user.id;
      }
    }

    const supabase = createSupabaseAdmin();

    // Get all verbs
    let query = supabase.from("irregular_verbs").select("id, base, base_norm, past_simple, past_simple_variants, past_participle, past_participle_variants").order("base_norm");

    if (search) {
      query = query.ilike("base_norm", `%${search}%`);
    }

    const { data: verbs, error: verbsError } = await query;

    if (verbsError) {
      console.error("[irregular-verbs/list] Error fetching verbs:", verbsError);
      return NextResponse.json({ error: verbsError.message }, { status: 500 });
    }

    // Get user's pinned verbs if authenticated
    let pinnedVerbIds: Set<string> = new Set();
    if (userId) {
      const { data: pinned, error: pinnedError } = await supabase
        .from("user_irregular_verbs")
        .select("irregular_verb_id")
        .eq("student_id", userId);

      if (pinnedError) {
        console.error("[irregular-verbs/list] Error fetching pinned verbs:", pinnedError);
        // Continue without pinned status if error
      } else if (pinned) {
        pinnedVerbIds = new Set(pinned.map((p) => p.irregular_verb_id));
      }
    }

    // Combine data
    const result = (verbs || []).map((verb) => ({
      id: verb.id,
      base: verb.base,
      past_simple: verb.past_simple,
      past_simple_variants: verb.past_simple_variants || [],
      past_participle: verb.past_participle,
      past_participle_variants: verb.past_participle_variants || [],
      pinned: userId ? pinnedVerbIds.has(verb.id) : false,
    }));

    return NextResponse.json({
      verbs: result,
      total: result.length,
    });
  } catch (e: any) {
    console.error("[irregular-verbs/list] Error:", e);
    return NextResponse.json(
      {
        error: e?.message ?? "Unknown error",
        stack: process.env.NODE_ENV === "development" ? e?.stack : undefined,
      },
      { status: 500 }
    );
  }
}

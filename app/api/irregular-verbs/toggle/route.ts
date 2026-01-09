import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * POST /api/irregular-verbs/toggle
 * Pin or unpin an irregular verb for the authenticated user
 * 
 * Body:
 * - verb_id: uuid of the irregular verb
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
    const verbId = body?.verb_id;

    if (!verbId || typeof verbId !== "string") {
      return NextResponse.json({ error: "verb_id is required (uuid)" }, { status: 400 });
    }

    // Verify verb exists
    const { data: verb, error: verbError } = await supabase
      .from("irregular_verbs")
      .select("id")
      .eq("id", verbId)
      .maybeSingle();

    if (verbError) {
      console.error("[irregular-verbs/toggle] Error checking verb:", verbError);
      return NextResponse.json({ error: verbError.message }, { status: 500 });
    }

    if (!verb) {
      return NextResponse.json({ error: "Verb not found" }, { status: 404 });
    }

    // Check if already pinned
    const { data: existing, error: checkError } = await supabase
      .from("user_irregular_verbs")
      .select("student_id, irregular_verb_id")
      .eq("student_id", userId)
      .eq("irregular_verb_id", verbId)
      .maybeSingle();

    if (checkError) {
      console.error("[irregular-verbs/toggle] Error checking pinned status:", checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existing) {
      // Unpin: delete the record
      const { error: deleteError } = await supabase
        .from("user_irregular_verbs")
        .delete()
        .eq("student_id", userId)
        .eq("irregular_verb_id", verbId);

      if (deleteError) {
        console.error("[irregular-verbs/toggle] Error unpinning:", deleteError);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      return NextResponse.json({ pinned: false, verb_id: verbId });
    } else {
      // Pin: insert the record
      const { error: insertError } = await supabase.from("user_irregular_verbs").insert({
        student_id: userId,
        irregular_verb_id: verbId,
      });

      if (insertError) {
        console.error("[irregular-verbs/toggle] Error pinning:", insertError);
        // Ignore duplicate errors (race condition)
        if (!String(insertError.message).toLowerCase().includes("duplicate")) {
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }
      }

      return NextResponse.json({ pinned: true, verb_id: verbId });
    }
  } catch (e: any) {
    console.error("[irregular-verbs/toggle] Error:", e);
    return NextResponse.json(
      {
        error: e?.message ?? "Unknown error",
        stack: process.env.NODE_ENV === "development" ? e?.stack : undefined,
      },
      { status: 500 }
    );
  }
}

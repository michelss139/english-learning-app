import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * POST /api/irregular-verbs/submit
 * Checks user's answer and logs the result
 * 
 * Body:
 * - verb_id: uuid of the irregular verb
 * - entered_past_simple: user's answer for past simple
 * - entered_past_participle: user's answer for past participle
 * 
 * Auth: Required (JWT Bearer token)
 * 
 * Returns:
 * - correct: boolean (both answers correct)
 * - past_simple_correct: boolean
 * - past_participle_correct: boolean
 * - correct_past_simple: string (correct answer)
 * - correct_past_participle: string (correct answer)
 */
function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase();
}

function checkAnswer(
  entered: string,
  correct: string,
  variants: string[] | null
): boolean {
  const normalized = normalizeAnswer(entered);
  const correctNormalized = normalizeAnswer(correct);

  if (normalized === correctNormalized) {
    return true;
  }

  // Check variants if provided
  if (variants && variants.length > 0) {
    for (const variant of variants) {
      if (normalizeAnswer(variant) === normalized) {
        return true;
      }
    }
  }

  return false;
}

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
    const enteredPastSimple = (body?.entered_past_simple ?? "").toString();
    const enteredPastParticiple = (body?.entered_past_participle ?? "").toString();

    if (!verbId || typeof verbId !== "string") {
      return NextResponse.json({ error: "verb_id is required (uuid)" }, { status: 400 });
    }

    // Get verb details
    const { data: verb, error: verbError } = await supabase
      .from("irregular_verbs")
      .select("id, past_simple, past_simple_variants, past_participle, past_participle_variants")
      .eq("id", verbId)
      .single();

    if (verbError || !verb) {
      console.error("[irregular-verbs/submit] Error fetching verb:", verbError);
      return NextResponse.json(
        { error: verbError?.message ?? "Verb not found" },
        { status: 404 }
      );
    }

    // Check answers
    const pastSimpleCorrect = checkAnswer(
      enteredPastSimple,
      verb.past_simple,
      verb.past_simple_variants
    );

    const pastParticipleCorrect = checkAnswer(
      enteredPastParticiple,
      verb.past_participle,
      verb.past_participle_variants
    );

    const overallCorrect = pastSimpleCorrect && pastParticipleCorrect;

    // Log the result
    const { error: logError } = await supabase.from("irregular_verb_runs").insert({
      student_id: userId,
      irregular_verb_id: verbId,
      entered_past_simple: enteredPastSimple,
      entered_past_participle: enteredPastParticiple,
      correct: overallCorrect,
    });

    if (logError) {
      console.error("[irregular-verbs/submit] Error logging run:", logError);
      // Continue even if logging fails - return the result anyway
    }

    return NextResponse.json({
      correct: overallCorrect,
      past_simple_correct: pastSimpleCorrect,
      past_participle_correct: pastParticipleCorrect,
      correct_past_simple: verb.past_simple,
      correct_past_participle: verb.past_participle,
      entered_past_simple: enteredPastSimple,
      entered_past_participle: enteredPastParticiple,
    });
  } catch (e: any) {
    console.error("[irregular-verbs/submit] Error:", e);
    return NextResponse.json(
      {
        error: e?.message ?? "Unknown error",
        stack: process.env.NODE_ENV === "development" ? e?.stack : undefined,
      },
      { status: 500 }
    );
  }
}

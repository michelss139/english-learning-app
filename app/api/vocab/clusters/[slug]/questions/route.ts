import { NextResponse } from "next/server";
import { createSupabaseServerWithToken } from "@/lib/supabase/server";

/**
 * GET /api/vocab/clusters/[slug]/questions?limit=10
 *
 * Get questions for a vocab cluster from vocab_cluster_questions table.
 * Questions are manually curated, not generated from lexicon_examples.
 */

type ClusterQuestionRow = {
  id: string;
  prompt: string;
  slot: string;
  choices: string[];
  explanation: string | null;
};

function errorResponse(step: string, error: any, status = 500) {
  return NextResponse.json(
    {
      ok: false,
      step,
      message: error?.message || "Unknown error",
      details: error?.details || null,
      hint: error?.hint || null,
      code: error?.code || null,
    },
    { status }
  );
}

type ScoreBody = {
  questionId: string;
  chosen: string;
};

function normalizeChoice(value: string): string {
  return value.trim().toLowerCase();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = (await req.json().catch(() => null)) as ScoreBody | null;
    if (!body || !body.questionId || !body.chosen) {
      return errorResponse("parse_body", { message: "Missing questionId or chosen" }, 400);
    }

    // Auth
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

    if (!token) {
      return errorResponse("auth", { message: "Missing Authorization bearer token", code: "UNAUTHORIZED" }, 401);
    }

    const supabase = await createSupabaseServerWithToken(token);
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return errorResponse("verify_user", userErr || { message: "Authentication failed" }, 401);
    }
    const userId = userData.user.id;

    // Load cluster (for context + unlock check)
    const { data: cluster, error: clusterErr } = await supabase
      .from("vocab_clusters")
      .select("id, slug, title, is_recommended, is_unlockable")
      .eq("slug", slug)
      .single();

    if (clusterErr || !cluster) {
      return errorResponse(
        "fetch_cluster",
        clusterErr || { message: `Cluster with slug \"${slug}\" not found`, code: "NOT_FOUND" },
        clusterErr?.code === "PGRST116" ? 404 : 500
      );
    }

    // Unlock check – same logic as in GET
    if (!cluster.is_recommended && cluster.is_unlockable) {
      const { data: unlocked, error: unlockedErr } = await supabase
        .from("user_unlocked_vocab_clusters")
        .select("unlocked_at")
        .eq("student_id", userId)
        .eq("cluster_id", cluster.id)
        .maybeSingle();

      if (unlockedErr) {
        return errorResponse("check_unlock", unlockedErr, 500);
      }
      if (!unlocked) {
        return errorResponse(
          "check_unlock",
          {
            message: "Cluster is locked. Add all words from this cluster to your pool to unlock it.",
            code: "LOCKED",
          },
          403
        );
      }
    }

    // Load question with correct_choice
    const { data: question, error: questionErr } = await supabase
      .from("vocab_cluster_questions")
      .select("id, prompt, correct_choice, choices")
      .eq("id", body.questionId)
      .eq("cluster_id", cluster.id)
      .maybeSingle();

    if (questionErr) {
      return errorResponse("fetch_question", questionErr, 500);
    }
    if (!question) {
      return errorResponse(
        "fetch_question",
        { message: `Question ${body.questionId} not found for cluster ${slug}`, code: "NOT_FOUND" },
        404
      );
    }

    const normalizedChosen = normalizeChoice(body.chosen);
    const normalizedCorrect = normalizeChoice(question.correct_choice);
    const isCorrect = normalizedChosen === normalizedCorrect;

    // Log event to vocab_answer_events
    try {
      const insertData = {
        student_id: userId,
        test_run_id: null,
        user_vocab_item_id: null,
        question_mode: "cluster-choice",
        prompt: question.prompt,
        expected: question.correct_choice,
        given: body.chosen,
        is_correct: isCorrect,
        evaluation: isCorrect ? "correct" : "wrong",
        context_type: "vocab_cluster",
        context_id: slug,
      };

      const { error: insertError } = await supabase.from("vocab_answer_events").insert(insertData);
      if (insertError) {
        console.error("[clusters/questions:POST] Failed to log answer event:", {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
        });
      }
    } catch (e: any) {
      console.error("[clusters/questions:POST] Exception logging answer event:", {
        message: e?.message,
        stack: e?.stack,
      });
    }

    return NextResponse.json({
      ok: true,
      isCorrect,
      correct_choice: question.correct_choice,
    });
  } catch (e: any) {
    console.error("[clusters/questions:POST] Unexpected error:", e);
    return errorResponse("unexpected", e, 500);
  }
}


export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  let limit = 10;
  
  try {
    limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 10) : 10;
  } catch (e) {
    console.error("[clusters/questions] Invalid limit param:", limitParam);
    limit = 10;
  }

  console.log("[clusters/questions] Request:", { slug, limit });

  try {
    // Step 1: Auth - verify JWT token
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

    if (!token) {
      console.error("[clusters/questions] Step 1: Missing token");
      return errorResponse("auth", { message: "Missing Authorization bearer token", code: "UNAUTHORIZED" }, 401);
    }

    // Step 2: Create Supabase client with user auth context (for RLS)
    let supabase;
    try {
      supabase = await createSupabaseServerWithToken(token);
      console.log("[clusters/questions] Step 2: Supabase client created");
    } catch (e: any) {
      console.error("[clusters/questions] Step 2: Failed to create client:", e);
      return errorResponse("create_client", e, 500);
    }

    // Step 3: Verify token and get user
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) {
      console.error("[clusters/questions] Step 3: Auth failed:", { userErr, userId: userData?.user?.id });
      return errorResponse("verify_user", userErr || { message: "Authentication failed" }, 401);
    }

    const userId = userData.user.id;
    console.log("[clusters/questions] Step 3: User verified:", { userId, slug, limit });

    // Step 4: Get cluster
    const { data: cluster, error: clusterErr } = await supabase
      .from("vocab_clusters")
      .select("id, slug, title, is_recommended, is_unlockable")
      .eq("slug", slug)
      .single();

    if (clusterErr) {
      console.error("[clusters/questions] Step 4: Cluster fetch error:", clusterErr);
      if (clusterErr.code === "PGRST116") {
        return errorResponse("fetch_cluster", { ...clusterErr, message: `Cluster with slug "${slug}" does not exist"` }, 404);
      }
      if (clusterErr.code === "42501" || clusterErr.message?.includes("permission denied")) {
        return errorResponse("fetch_cluster", { ...clusterErr, message: "Row Level Security policy prevented access" }, 403);
      }
      return errorResponse("fetch_cluster", clusterErr, 500);
    }

    if (!cluster) {
      console.error("[clusters/questions] Step 4: Cluster not found (null)");
      return errorResponse("fetch_cluster", { message: `Cluster with slug "${slug}" not found`, code: "NOT_FOUND" }, 404);
    }

    console.log("[clusters/questions] Step 4: Cluster found:", {
      id: cluster.id,
      slug: cluster.slug,
      is_recommended: cluster.is_recommended,
      is_unlockable: cluster.is_unlockable,
    });

    // Step 5: Check unlock status
    let isUnlocked = false;
    if (cluster.is_recommended) {
      isUnlocked = true;
      console.log("[clusters/questions] Step 5: Recommended cluster - always unlocked");
    } else if (cluster.is_unlockable) {
      // For unlockable clusters, require unlock record
      // Table has composite PK (student_id, cluster_id), no id column
      const { data: unlocked, error: unlockedErr } = await supabase
        .from("user_unlocked_vocab_clusters")
        .select("unlocked_at")
        .eq("student_id", userId)
        .eq("cluster_id", cluster.id)
        .maybeSingle();

      if (unlockedErr) {
        console.error("[clusters/questions] Step 5: Unlock check error:", unlockedErr);
        if (unlockedErr.code === "42501" || unlockedErr.message?.includes("permission denied")) {
          return errorResponse("check_unlock", { ...unlockedErr, message: "Row Level Security policy prevented access" }, 403);
        }
        return errorResponse("check_unlock", unlockedErr, 500);
      }

      isUnlocked = !!unlocked;
      console.log("[clusters/questions] Step 5: Unlockable cluster - unlocked:", isUnlocked, unlocked ? `(unlocked_at: ${unlocked.unlocked_at})` : "");

      if (!isUnlocked) {
        return errorResponse("check_unlock", { 
          message: "Cluster is locked. Add all words from this cluster to your pool to unlock it.",
          code: "LOCKED" 
        }, 403);
      }
    }

    // Step 6: Load questions from vocab_cluster_questions (rotation by last_used_at)
    const { data: questions, error: questionsErr } = await supabase
      .from("vocab_cluster_questions")
      .select("id, prompt, slot, choices, explanation, last_used_at")
      .eq("cluster_id", cluster.id)
      .order("last_used_at", { ascending: true, nullsFirst: true })
      .limit(limit);

    if (questionsErr) {
      console.error("[clusters/questions] Step 6: Questions fetch error:", questionsErr);
      // Fail soft: return empty list so UI can say \"Brak pytań — wkrótce\"
      return NextResponse.json({ ok: true, questions: [] });
    }

    if (!questions || questions.length === 0) {
      console.log("[clusters/questions] Step 6: No questions in vocab_cluster_questions");
      return NextResponse.json({ ok: true, questions: [] });
    }

    console.log("[clusters/questions] Step 6: Questions loaded:", questions.length);

    // Step 7: Update last_used_at for served questions ONLY
    const questionIds = questions.map((q) => q.id);
    try {
      const { error: updateErr } = await supabase
        .from("vocab_cluster_questions")
        .update({ last_used_at: new Date().toISOString() })
        .in("id", questionIds);

      if (updateErr) {
        console.error("[clusters/questions] Step 7: Update last_used_at error:", updateErr);
      } else {
        console.log("[clusters/questions] Step 7: Updated last_used_at for", questionIds.length, "questions");
      }
    } catch (e: any) {
      console.error("[clusters/questions] Step 7: Exception updating last_used_at:", e);
    }

    const payload: ClusterQuestionRow[] = questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      slot: q.slot,
      choices: q.choices,
      explanation: q.explanation ?? null,
    }));

    return NextResponse.json({
      ok: true,
      questions: payload,
    });
  } catch (e: any) {
    console.error("[clusters/questions] Unexpected error:", e);
    return errorResponse("unexpected", e, 500);
  }
}

import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { updateLearningUnitKnowledge } from "@/lib/knowledge/updateLearningUnitKnowledge";
import {
  evaluateClusterTranslation,
  isClusterTaskAnswerCorrect,
  loadClusterPageData,
  type ClusterTask,
  type ClusterTaskType,
} from "@/lib/vocab/clusterLoader";

/**
 * GET /api/vocab/clusters/[slug]/questions?limit=10
 *
 * Get questions for a vocab cluster from vocab_cluster_questions table.
 * Questions are manually curated, not generated from lexicon_examples.
 */

type ClusterQuestionDto = {
  id: string;
  prompt: string;
  slot?: string;
  choices: string[];
  explanation: string | null;
  task_type: ClusterTaskType;
  instruction?: string | null;
  source_text?: string | null;
};

type ErrorLike = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

type ClusterQuestionRecord = {
  id: string;
  prompt: string;
  source_text: string | null;
  task_type: ClusterTaskType | null;
  correct_choice: string | null;
  expected_answer: string | null;
  accepted_answers: string[] | null;
  target_tokens: string[] | null;
  explanation: string | null;
  choices: string[] | null;
};

function serializeClusterQuestion(task: ClusterTask): ClusterQuestionDto {
  return {
    id: task.id,
    prompt: task.prompt,
    slot: task.slot,
    choices: task.task_type === "choice" ? task.choices : [],
    explanation: task.explanation ?? null,
    task_type: task.task_type,
    instruction: task.instruction ?? null,
    source_text: task.source_text ?? null,
  };
}

function errorResponse(step: string, error: ErrorLike, status = 500) {
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
  session_id: string;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = (await req.json().catch(() => null)) as ScoreBody | null;
    if (!body || !body.questionId || !body.chosen || !body.session_id) {
      return errorResponse("parse_body", { message: "Missing questionId, chosen, or session_id" }, 400);
    }

    const supabase = await createSupabaseRouteClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user?.id) {
      return errorResponse("verify_user", userErr || { message: "Authentication failed" }, 401);
    }
    const userId = user.id;

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

    // Load task definition
    const { data: question, error: questionErr } = await supabase
      .from("vocab_cluster_questions")
      .select(
        "id, prompt, source_text, task_type, correct_choice, expected_answer, accepted_answers, target_tokens, explanation, choices",
      )
      .eq("id", body.questionId)
      .eq("cluster_id", cluster.id)
      .maybeSingle<ClusterQuestionRecord>();

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

    const taskType = question.task_type ?? "choice";
    const canonicalAnswer = question.expected_answer ?? question.correct_choice ?? "";
    const isCorrect = isClusterTaskAnswerCorrect(
      {
        ...question,
        choices: question.choices ?? undefined,
      },
      body.chosen
    );

    let translationFeedback: { cluster_correct: boolean; sentence_exact: boolean; diff: { index: number; user: string; expected: string }[] } | undefined;
    if (taskType === "translation") {
      const evalResult = evaluateClusterTranslation(
        {
          ...question,
          choices: question.choices ?? undefined,
        },
        body.chosen
      );
      translationFeedback = {
        cluster_correct: evalResult.cluster_correct,
        sentence_exact: evalResult.sentence_exact,
        diff: evalResult.diff,
      };
    }

    // Log event to vocab_answer_events
    try {
      const insertData = {
        student_id: userId,
        test_run_id: null,
        user_vocab_item_id: null,
        question_mode:
          taskType === "choice" ? "cluster-choice" : taskType === "correction" ? "cluster-correction" : "cluster-translation",
        prompt: question.source_text || question.prompt,
        expected: canonicalAnswer,
        given: body.chosen,
        is_correct: isCorrect,
        evaluation: isCorrect ? "correct" : "wrong",
        context_type: "vocab_cluster",
        context_id: slug,
        session_id: body.session_id,
      };

      const { error: insertError } = await supabase.from("vocab_answer_events").insert(insertData);
      if (insertError) {
        console.error("[clusters/questions:POST] Failed to log answer event:", {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
        });
      } else if (slug) {
        const knowledgeResult = await updateLearningUnitKnowledge({
          supabase,
          studentId: userId,
          unitType: "cluster",
          unitId: slug,
          payload: { mode: "answer", isCorrect },
        });
        if (!knowledgeResult.ok) {
          console.error("[clusters/questions:POST] Knowledge update failed:", {
            studentId: userId,
            unitType: "cluster",
            unitId: slug,
            message: knowledgeResult.error,
            cause: knowledgeResult.cause,
          });
        }
      }
    } catch (e: unknown) {
      console.error("[clusters/questions:POST] Exception logging answer event:", {
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      });
    }

    const payload: Record<string, unknown> = {
      ok: true,
      isCorrect,
      task_type: taskType,
      correct_choice: question.correct_choice,
      expected_answer: canonicalAnswer,
    };
    if (translationFeedback) {
      payload.translation_feedback = translationFeedback;
    }
    return NextResponse.json(payload);
  } catch (e: unknown) {
    console.error("[clusters/questions:POST] Unexpected error:", e);
    return errorResponse("unexpected", {
      message: e instanceof Error ? e.message : "Unknown error",
    }, 500);
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
  } catch {
    console.error("[clusters/questions] Invalid limit param:", limitParam);
    limit = 10;
  }

  try {
    const supabase = await createSupabaseRouteClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user?.id) {
      return errorResponse("verify_user", userErr || { message: "Authentication failed" }, 401);
    }
    const result = await loadClusterPageData({
      supabase,
      studentId: user.id,
      slug,
      limit,
      includeAnswers: false,
    });

    if (result.status === "not_found") {
      return errorResponse("fetch_cluster", { message: `Cluster with slug "${slug}" not found`, code: "NOT_FOUND" }, 404);
    }

    if (result.data.tasks.length === 0) {
      return NextResponse.json({ ok: true, questions: [] });
    }

    const payload: ClusterQuestionDto[] = result.data.tasks.map(serializeClusterQuestion);

    return NextResponse.json({
      ok: true,
      questions: payload,
    });
  } catch (e: unknown) {
    console.error("[clusters/questions] Unexpected error:", e);
    return errorResponse("unexpected", {
      message: e instanceof Error ? e.message : "Unknown error",
    }, 500);
  }
}

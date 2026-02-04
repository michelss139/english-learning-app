import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type ExerciseType = "pack" | "cluster" | "irregular";

export type SessionSummary = {
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
  started_at?: string | null;
  finished_at: string | null;
  wrong_items?: Array<{
    prompt: string | null;
    expected: string | null;
    question_mode?: string | null;
  }>;
};

type CompletionRow = {
  completed_at: string;
};

export async function getSessionSummary(
  studentId: string,
  sessionId: string,
  exerciseType: ExerciseType
): Promise<SessionSummary> {
  const supabase = createSupabaseAdmin();

  const { data: completion } = await supabase
    .from("exercise_session_completions")
    .select("completed_at")
    .eq("student_id", studentId)
    .eq("exercise_type", exerciseType)
    .eq("session_id", sessionId)
    .maybeSingle();

  const finishedAt = (completion as CompletionRow | null)?.completed_at ?? null;

  if (exerciseType === "irregular") {
    const { count: totalCount } = await supabase
      .from("irregular_verb_runs")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("session_id", sessionId);

    const { count: wrongCount } = await supabase
      .from("irregular_verb_runs")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("session_id", sessionId)
      .eq("correct", false);

    const { data: firstRow } = await supabase
      .from("irregular_verb_runs")
      .select("created_at")
      .eq("student_id", studentId)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: wrongItems } = await supabase
      .from("irregular_verb_runs")
      .select("entered_past_simple, entered_past_participle")
      .eq("student_id", studentId)
      .eq("session_id", sessionId)
      .eq("correct", false)
      .limit(10);

    const total = totalCount ?? 0;
    const wrong = wrongCount ?? 0;
    const correct = Math.max(total - wrong, 0);

    return {
      total,
      correct,
      wrong,
      accuracy: total > 0 ? correct / total : 0,
      started_at: (firstRow as any)?.created_at ?? null,
      finished_at: finishedAt,
      wrong_items: (wrongItems ?? []).map((row: any) => ({
        prompt: row.entered_past_simple ?? null,
        expected: row.entered_past_participle ?? null,
      })),
    };
  }

  const contextType = exerciseType === "pack" ? "vocab_pack" : "vocab_cluster";

  const { count: totalCount } = await supabase
    .from("vocab_answer_events")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("context_type", contextType)
    .eq("session_id", sessionId);

  const { count: wrongCount } = await supabase
    .from("vocab_answer_events")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("context_type", contextType)
    .eq("session_id", sessionId)
    .eq("is_correct", false);

  const { data: firstRow } = await supabase
    .from("vocab_answer_events")
    .select("created_at")
    .eq("student_id", studentId)
    .eq("context_type", contextType)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: wrongItems } = await supabase
    .from("vocab_answer_events")
    .select("prompt, expected, question_mode")
    .eq("student_id", studentId)
    .eq("context_type", contextType)
    .eq("session_id", sessionId)
    .eq("is_correct", false)
    .limit(10);

  const total = totalCount ?? 0;
  const wrong = wrongCount ?? 0;
  const correct = Math.max(total - wrong, 0);

  return {
    total,
    correct,
    wrong,
    accuracy: total > 0 ? correct / total : 0,
    started_at: (firstRow as any)?.created_at ?? null,
    finished_at: finishedAt,
    wrong_items: (wrongItems ?? []).map((row: any) => ({
      prompt: row.prompt ?? null,
      expected: row.expected ?? null,
      question_mode: row.question_mode ?? null,
    })),
  };
}

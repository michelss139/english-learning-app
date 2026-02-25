import type { SupabaseClient } from "@supabase/supabase-js";

export type LearningUnitType = "sense" | "cluster" | "irregular";
export type KnowledgeState = "new" | "unstable" | "improving" | "mastered";

type LearningUnitRow = {
  student_id: string;
  unit_type: LearningUnitType;
  unit_id: string;
  total_attempts: number | null;
  correct_count: number | null;
  wrong_count: number | null;
  last_attempt_at: string | null;
  last_correct_at: string | null;
  last_wrong_at: string | null;
  stability_score: number | null;
  knowledge_state: KnowledgeState | null;
  created_at: string | null;
  updated_at: string | null;
};

type UpdateLearningUnitKnowledgeParams = {
  supabase: SupabaseClient;
  studentId: string;
  unitType: LearningUnitType;
  unitId: string;
  payload: KnowledgePayload;
};

export type KnowledgePayload =
  | { mode: "answer"; isCorrect: boolean }
  | { mode: "session"; total: number; correct: number };

type UpdateLearningUnitKnowledgeSuccess = {
  ok: true;
  data: {
    student_id: string;
    unit_type: LearningUnitType;
    unit_id: string;
    total_attempts: number;
    correct_count: number;
    wrong_count: number;
    last_attempt_at: string;
    last_correct_at: string | null;
    last_wrong_at: string | null;
    stability_score: number;
    knowledge_state: KnowledgeState;
    created_at: string | null;
    updated_at: string;
  };
};

type UpdateLearningUnitKnowledgeFailure = {
  ok: false;
  error: string;
  cause?: unknown;
};

export type UpdateLearningUnitKnowledgeResult =
  | UpdateLearningUnitKnowledgeSuccess
  | UpdateLearningUnitKnowledgeFailure;

function toInt(value: number | null | undefined): number {
  return Number.isFinite(value as number) ? Number(value) : 0;
}

function isStrictlyAfter(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const aMs = Date.parse(a);
  const bMs = Date.parse(b);
  if (!Number.isFinite(aMs) || !Number.isFinite(bMs)) return false;
  return aMs > bMs;
}

function computeKnowledgeState(args: {
  totalAttempts: number;
  correctCount: number;
  isCorrect: boolean;
  wrongCount: number;
  lastCorrectAt: string | null;
  lastWrongAt: string | null;
}): KnowledgeState {
  const { totalAttempts, correctCount, isCorrect, wrongCount, lastCorrectAt, lastWrongAt } = args;

  if (totalAttempts === 1 && isCorrect) return "mastered";
  if (totalAttempts === 1 && !isCorrect) return "unstable";

  if (lastWrongAt && (!lastCorrectAt || isStrictlyAfter(lastWrongAt, lastCorrectAt))) {
    return "unstable";
  }

  if (lastCorrectAt && (!lastWrongAt || isStrictlyAfter(lastCorrectAt, lastWrongAt))) {
    const diff = correctCount - wrongCount;

    if (diff >= 1) return "mastered";
    return "improving";
  }

  return "unstable";
}

function computeSessionKnowledgeState(args: {
  totalAttempts: number;
  accuracy: number;
  previousAccuracy: number | null;
}): KnowledgeState {
  const { totalAttempts, accuracy, previousAccuracy } = args;

  if (totalAttempts === 1) {
    if (accuracy === 1) return "mastered";
    if (accuracy >= 0.7) return "improving";
    return "unstable";
  }

  if (accuracy === 1) return "mastered";
  if (previousAccuracy === null) return "improving";
  if (accuracy > previousAccuracy) return "improving";
  if (accuracy < previousAccuracy) return "unstable";
  return "improving";
}

function clampInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  return Math.floor(value);
}

export async function updateLearningUnitKnowledge(
  params: UpdateLearningUnitKnowledgeParams
): Promise<UpdateLearningUnitKnowledgeResult> {
  const { supabase, studentId, unitType, unitId, payload } = params;

  if (!studentId || !unitId) {
    return { ok: false, error: "studentId and unitId are required" };
  }

  try {
    const { data: existing, error: selectErr } = await supabase
      .from("user_learning_unit_knowledge")
      .select(
        `
        student_id,
        unit_type,
        unit_id,
        total_attempts,
        correct_count,
        wrong_count,
        last_attempt_at,
        last_correct_at,
        last_wrong_at,
        stability_score,
        knowledge_state,
        created_at,
        updated_at
      `
      )
      .eq("student_id", studentId)
      .eq("unit_type", unitType)
      .eq("unit_id", unitId)
      .maybeSingle<LearningUnitRow>();

    if (selectErr) {
      return { ok: false, error: selectErr.message, cause: selectErr };
    }

    const nowIso = new Date().toISOString();

    const prevTotalAttempts = toInt(existing?.total_attempts);
    const prevCorrectCount = toInt(existing?.correct_count);
    const prevWrongCount = toInt(existing?.wrong_count);
    let totalAttempts = prevTotalAttempts + 1;
    let correctCount = prevCorrectCount;
    let wrongCount = prevWrongCount;
    const lastAttemptAt = nowIso;
    let lastCorrectAt = existing?.last_correct_at ?? null;
    let lastWrongAt = existing?.last_wrong_at ?? null;
    let knowledgeState: KnowledgeState;

    if (payload.mode === "answer") {
      const isCorrect = payload.isCorrect;
      correctCount = prevCorrectCount + (isCorrect ? 1 : 0);
      wrongCount = prevWrongCount + (isCorrect ? 0 : 1);
      lastCorrectAt = isCorrect ? nowIso : lastCorrectAt;
      lastWrongAt = isCorrect ? lastWrongAt : nowIso;
      knowledgeState = computeKnowledgeState({
        totalAttempts,
        correctCount,
        isCorrect,
        wrongCount,
        lastCorrectAt,
        lastWrongAt,
      });
    } else {
      const sessionTotal = clampInt(payload.total);
      const requestedCorrect = clampInt(payload.correct);
      const sessionCorrect = Math.min(requestedCorrect, sessionTotal);

      if (sessionTotal <= 0) {
        return { ok: false, error: "payload.total must be > 0 for session mode" };
      }

      const sessionWrong = sessionTotal - sessionCorrect;
      correctCount = prevCorrectCount + sessionCorrect;
      wrongCount = prevWrongCount + sessionWrong;
      if (sessionCorrect > 0) lastCorrectAt = nowIso;
      if (sessionWrong > 0) lastWrongAt = nowIso;

      const accuracy = sessionCorrect / sessionTotal;
      const prevAnswered = prevCorrectCount + prevWrongCount;
      const previousAccuracy = prevAnswered > 0 ? prevCorrectCount / prevAnswered : null;

      knowledgeState = computeSessionKnowledgeState({
        totalAttempts,
        accuracy,
        previousAccuracy,
      });
    }

    const stabilityScore = correctCount * 2 - wrongCount * 3;

    if (!existing) {
      const insertPayload = {
        student_id: studentId,
        unit_type: unitType,
        unit_id: unitId,
        total_attempts: totalAttempts,
        correct_count: correctCount,
        wrong_count: wrongCount,
        last_attempt_at: lastAttemptAt,
        last_correct_at: lastCorrectAt,
        last_wrong_at: lastWrongAt,
        stability_score: stabilityScore,
        knowledge_state: knowledgeState,
        created_at: nowIso,
        updated_at: nowIso,
      };

      const { error: insertErr } = await supabase
        .from("user_learning_unit_knowledge")
        .insert(insertPayload);

      if (insertErr) {
        return { ok: false, error: insertErr.message, cause: insertErr };
      }

      return {
        ok: true,
        data: {
          ...insertPayload,
          unit_type: unitType,
        },
      };
    }

    const updatePayload = {
      total_attempts: totalAttempts,
      correct_count: correctCount,
      wrong_count: wrongCount,
      last_attempt_at: lastAttemptAt,
      last_correct_at: lastCorrectAt,
      last_wrong_at: lastWrongAt,
      stability_score: stabilityScore,
      knowledge_state: knowledgeState,
      updated_at: nowIso,
    };

    const { error: updateErr } = await supabase
      .from("user_learning_unit_knowledge")
      .update(updatePayload)
      .eq("student_id", studentId)
      .eq("unit_type", unitType)
      .eq("unit_id", unitId);

    if (updateErr) {
      return { ok: false, error: updateErr.message, cause: updateErr };
    }

    return {
      ok: true,
      data: {
        student_id: studentId,
        unit_type: unitType,
        unit_id: unitId,
        ...updatePayload,
        created_at: existing.created_at ?? null,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unknown error",
      cause: e,
    };
  }
}

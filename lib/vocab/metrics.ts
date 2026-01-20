/**
 * Vocab Metrics Helper
 * 
 * Maps vocab_answer_events to dashboard semantics.
 * Single point of integration for all metrics features.
 * 
 * vocab_answer_events is the single source of truth.
 */

export type AccuracyMetrics = {
  correct_today: number;
  total_today: number;
  correct_3d: number;
  total_3d: number;
  correct_7d: number;
  total_7d: number;
  correct_14d: number;
  total_14d: number;
};

export type LearnedWord = {
  term_en_norm: string;
};

export type ToLearnWord = {
  term_en_norm: string;
};

export type RepeatSuggestion = {
  term_en_norm: string;
  last_correct_at: string | null;
};

export type CurrentStreak = {
  term_en_norm: string;
  current_streak: number;
};

/**
 * Calculate accuracy from correct/wrong counts
 */
export function calculateAccuracy(correct: number, total: number): number {
  if (!total || total === 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * Check if word is learned (≥3 correct, no errors)
 */
export function isLearned(correctCount: number, wrongCount: number): boolean {
  return correctCount >= 3 && wrongCount === 0;
}

/**
 * Check if word needs repetition based on error rate
 */
export function needsRepetition(
  correctCount: number,
  wrongCount: number,
  lastAttemptAt: Date | null,
  daysSinceLastAttempt: number
): boolean {
  const total = correctCount + wrongCount;
  if (total === 0) return false;

  const errorRate = wrongCount / total;

  // Needs repetition if:
  // - Error rate > 0.3
  // - Has wrong answers in last 7 days
  // - Not practiced for 14+ days
  return (
    errorRate > 0.3 ||
    (wrongCount > 0 && daysSinceLastAttempt <= 7) ||
    daysSinceLastAttempt >= 14
  );
}

/**
 * Get error rate for a word
 */
export function getErrorRate(correctCount: number, wrongCount: number): number {
  const total = correctCount + wrongCount;
  if (total === 0) return 0;
  return wrongCount / total;
}

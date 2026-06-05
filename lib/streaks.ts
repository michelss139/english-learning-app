type StreakRow = {
  student_id: string;
  current_streak: number;
  best_streak: number;
  last_activity_date: string | null;
  last_session_date: string | null;
  streak_grace_used: boolean;
};

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getTodayDateString() {
  return toDateString(new Date());
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/**
 * Called on login — decays streak if days were missed, applying one grace day buffer.
 * Does NOT increment the streak; that happens in completeSession.
 */
export async function syncStreakOnLogin(
  supabase: any,
  studentId: string,
  todayOverride?: string
): Promise<StreakRow> {
  const today = todayOverride ?? getTodayDateString();

  const { data: existing, error: selectError } = await supabase
    .from("user_streaks")
    .select("student_id,current_streak,best_streak,last_activity_date,last_session_date,streak_grace_used")
    .eq("student_id", studentId)
    .maybeSingle();

  if (selectError) throw selectError;
  if (!existing) return existing; // no record yet — will be created on first session

  const lastSession = existing.last_session_date ?? existing.last_activity_date;
  if (!lastSession) return existing as StreakRow;

  const daysMissed = daysBetween(lastSession, today);

  if (daysMissed === 0) return existing as StreakRow;

  let { current_streak: streak, streak_grace_used: graceUsed } = existing;

  if (daysMissed === 1 && !graceUsed) {
    // first missed day — use grace, streak unchanged
    const { data, error } = await supabase
      .from("user_streaks")
      .update({ streak_grace_used: true, updated_at: new Date().toISOString() })
      .eq("student_id", studentId)
      .select("student_id,current_streak,best_streak,last_activity_date,last_session_date,streak_grace_used")
      .single();
    if (error) throw error;
    return data as StreakRow;
  }

  // Grace already used OR 2+ days missed — decay streak
  const daysToDecay = graceUsed ? daysMissed - 1 : daysMissed - 1;
  streak = Math.max(0, streak - daysToDecay);

  const { data, error } = await supabase
    .from("user_streaks")
    .update({
      current_streak: streak,
      streak_grace_used: true,
      updated_at: new Date().toISOString(),
    })
    .eq("student_id", studentId)
    .select("student_id,current_streak,best_streak,last_activity_date,last_session_date,streak_grace_used")
    .single();
  if (error) throw error;
  return data as StreakRow;
}

/**
 * Called when user completes a training session. Increments streak and resets grace.
 */
export async function updateStreak(
  supabase: any,
  studentId: string,
  todayOverride?: string
): Promise<StreakRow> {
  const today = todayOverride ?? getTodayDateString();

  const { data: existing, error: selectError } = await supabase
    .from("user_streaks")
    .select("student_id,current_streak,best_streak,last_activity_date,last_session_date,streak_grace_used")
    .eq("student_id", studentId)
    .maybeSingle();

  if (selectError) throw selectError;

  if (!existing) {
    const fresh = {
      student_id: studentId,
      current_streak: 1,
      best_streak: 1,
      last_activity_date: today,
      last_session_date: today,
      streak_grace_used: false,
    };
    const { data: inserted, error: insertError } = await supabase
      .from("user_streaks")
      .insert(fresh)
      .select("student_id,current_streak,best_streak,last_activity_date,last_session_date,streak_grace_used")
      .single();
    if (insertError) throw insertError;
    return inserted as StreakRow;
  }

  // Already completed a session today — no-op
  if (existing.last_session_date === today) return existing as StreakRow;

  const newStreak = (existing.current_streak ?? 0) + 1;
  const bestStreak = Math.max(existing.best_streak ?? 0, newStreak);

  const { data: updated, error: updateError } = await supabase
    .from("user_streaks")
    .update({
      current_streak: newStreak,
      best_streak: bestStreak,
      last_activity_date: today,
      last_session_date: today,
      streak_grace_used: false,
      updated_at: new Date().toISOString(),
    })
    .eq("student_id", studentId)
    .select("student_id,current_streak,best_streak,last_activity_date,last_session_date,streak_grace_used")
    .single();

  if (updateError) throw updateError;
  return updated as StreakRow;
}

export function getStreakDisplay(currentStreak?: number | null, lastActivityDate?: string | null) {
  if (!lastActivityDate) return 0;
  return currentStreak ?? 0;
}

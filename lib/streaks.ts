type StreakRow = {
  student_id: string;
  current_streak: number;
  best_streak: number;
  last_activity_date: string | null;
};

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getTodayDateString() {
  return toDateString(new Date());
}

function getYesterdayDateString(today: string) {
  const [year, month, day] = today.split("-").map((value) => Number(value));
  const utc = Date.UTC(year, month - 1, day);
  return toDateString(new Date(utc - 24 * 60 * 60 * 1000));
}

export async function updateStreak(
  supabase: any,
  studentId: string,
  todayOverride?: string
): Promise<StreakRow> {
  const today = todayOverride ?? getTodayDateString();
  const yesterday = getYesterdayDateString(today);

  const { data: existing, error: selectError } = await supabase
    .from("user_streaks")
    .select("student_id,current_streak,best_streak,last_activity_date")
    .eq("student_id", studentId)
    .maybeSingle();

  if (selectError) throw selectError;

  if (!existing) {
    const fresh = {
      student_id: studentId,
      current_streak: 1,
      best_streak: 1,
      last_activity_date: today,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("user_streaks")
      .insert(fresh)
      .select("student_id,current_streak,best_streak,last_activity_date")
      .single();

    if (insertError) throw insertError;
    return inserted as StreakRow;
  }

  if (existing.last_activity_date === today) {
    return existing as StreakRow;
  }

  let currentStreak = 1;
  if (existing.last_activity_date === yesterday) {
    currentStreak = (existing.current_streak ?? 0) + 1;
  }

  const bestStreak = Math.max(existing.best_streak ?? 0, currentStreak);

  const { data: updated, error: updateError } = await supabase
    .from("user_streaks")
    .update({
      current_streak: currentStreak,
      best_streak: bestStreak,
      last_activity_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq("student_id", studentId)
    .select("student_id,current_streak,best_streak,last_activity_date")
    .single();

  if (updateError) throw updateError;
  return updated as StreakRow;
}

export function getStreakDisplay(currentStreak?: number | null, lastActivityDate?: string | null) {
  if (!lastActivityDate) return 0;
  return currentStreak ?? 0;
}

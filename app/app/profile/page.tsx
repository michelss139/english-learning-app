import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getRank } from "@/lib/rank";
import { resolveAvatarUrl } from "@/lib/avatars";
import { calculateLevelInfo } from "@/lib/xp/levels";

// ── helpers ────────────────────────────────────────────────────────────────

const MONTHS_PL = [
  "stycznia","lutego","marca","kwietnia","maja","czerwca",
  "lipca","sierpnia","września","października","listopada","grudnia",
];

function fmtDate(iso: string) {
  const [, mStr = "1", dStr = "1"] = iso.split("-");
  return `${Number(dStr)} ${MONTHS_PL[Number(mStr) - 1] ?? ""}`;
}

// ── badge definitions ──────────────────────────────────────────────────────

const BADGE_DEFS = [
  { id: "first_streak", label: "Pierwsza seria", icon: "ti-flame",   bg: "#E6F1FB", color: "#185FA5" },
  { id: "words_100",    label: "100 słówek",     icon: "ti-book",    bg: "#EAF3DE", color: "#3B6D11" },
  { id: "perfection",   label: "Perfekcja",       icon: "ti-star",    bg: "#FAEEDA", color: "#854F0B" },
  { id: "streak_7",     label: "7-dniowa seria", icon: "ti-shield",  bg: "#EEEDFE", color: "#3C3489" },
  { id: "words_500",    label: "500 słówek",     icon: "ti-books",   bg: "#E1F5EE", color: "#0F6E56" },
  { id: "grammar",      label: "Gramatyk",        icon: "ti-grammar", bg: "#FBEAF0", color: "#993556" },
] as const;

// ── page ───────────────────────────────────────────────────────────────────

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const admin = createSupabaseAdmin();
  const userId = user.id;
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().slice(0, 10);

  // Monday of current week
  const dayOfWeek = (todayDate.getDay() + 6) % 7;
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - dayOfWeek);
  const mondayStr = monday.toISOString().slice(0, 10);

  // Lessons range: previous + current month
  const prevMonthDate = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1);
  const prevMonthStart = `${prevMonthDate.toISOString().slice(0, 7)}-01`;

  const [
    profileRes,
    xpRes,
    streakRes,
    vocabEventsRes,
    sessionsCountRes,
    weekSessionsRes,
    grammarCountRes,
    lessonsRes,
  ] = await Promise.all([
    admin.from("profiles").select("id,email,username,avatar_url,role").eq("id", userId).single(),
    admin.from("user_xp").select("xp_total").eq("user_id", userId).maybeSingle(),
    admin.from("user_streaks").select("current_streak,best_streak,last_session_date").eq("student_id", userId).maybeSingle(),
    admin.from("vocab_answer_events").select("user_vocab_item_id,is_correct").eq("student_id", userId),
    admin.from("training_sessions").select("id", { count: "exact", head: true }).eq("student_id", userId).eq("status", "completed"),
    admin.from("training_sessions").select("completed_at").eq("student_id", userId).eq("status", "completed").gte("completed_at", mondayStr),
    admin.from("grammar_sessions").select("id", { count: "exact", head: true }).eq("student_id", userId),
    admin.from("lessons").select("id,lesson_date,topic,vocab_pairs").eq("student_id", userId).gte("lesson_date", prevMonthStart).order("lesson_date"),
  ]);

  // ── derive values ──────────────────────────────────────────────────────

  const profile = profileRes.data;
  const avatarSrc = resolveAvatarUrl(profile?.avatar_url, userId);

  const xpTotal = xpRes.data?.xp_total ?? 0;
  const levelInfo = calculateLevelInfo(xpTotal);
  const xpPercent = levelInfo.xp_to_next_level > 0
    ? Math.min(Math.round((levelInfo.xp_in_current_level / levelInfo.xp_to_next_level) * 100), 100)
    : 0;

  const streakData = streakRes.data;
  const currentStreak = streakData?.current_streak ?? 0;
  const bestStreak = streakData?.best_streak ?? 0;
  const rank = getRank(currentStreak);

  const vocabEvents = vocabEventsRes.data ?? [];
  const wordsCorrect = new Set(
    vocabEvents.filter((e) => e.is_correct && e.user_vocab_item_id).map((e) => e.user_vocab_item_id)
  );
  const wordsMastered = wordsCorrect.size;
  const totalAnswers = vocabEvents.length;
  const correctAnswers = vocabEvents.filter((e) => e.is_correct).length;
  const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

  const sessionsCompleted = sessionsCountRes.count ?? 0;

  // Week activity circles
  const weekSessionDates = new Set(
    (weekSessionsRes.data ?? [])
      .map((s) => (s.completed_at as string | null)?.slice(0, 10))
      .filter(Boolean)
  );
  const WEEK_LABELS = ["PN", "WT", "ŚR", "CZ", "PT", "SB", "ND"];
  const weekDays = WEEK_LABELS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    return { label, iso, done: weekSessionDates.has(iso), isToday: iso === todayStr, isFuture: iso > todayStr };
  });

  // Badges
  const hasPerfectSession = (() => {
    const bySession = new Map<string, { total: number; correct: number }>();
    for (const e of vocabEvents) {
      const sid = (e as any).session_id as string | null;
      if (!sid) continue;
      const row = bySession.get(sid) ?? { total: 0, correct: 0 };
      row.total++;
      if (e.is_correct) row.correct++;
      bySession.set(sid, row);
    }
    return [...bySession.values()].some((r) => r.total > 0 && r.total === r.correct);
  })();

  const unlockedIds = new Set<string>();
  if (bestStreak >= 1) unlockedIds.add("first_streak");
  if (wordsMastered >= 100) unlockedIds.add("words_100");
  if (hasPerfectSession) unlockedIds.add("perfection");
  if (bestStreak >= 7) unlockedIds.add("streak_7");
  if (wordsMastered >= 500) unlockedIds.add("words_500");
  if ((grammarCountRes.count ?? 0) > 0) unlockedIds.add("grammar");

  // Lessons
  const allLessons = (lessonsRes.data ?? []) as { id: string; lesson_date: string; topic: string; vocab_pairs: string | null }[];
  const lastLesson = [...allLessons].filter((l) => l.lesson_date <= todayStr).at(-1) ?? null;
  const nextLesson = allLessons.find((l) => l.lesson_date > todayStr) ?? null;

  // ── render ─────────────────────────────────────────────────────────────

  return (
    <main className="flex flex-col gap-4">

      {/* ── Sekcja 1: Nagłówek ── */}
      <header className="flex items-center gap-3">
        <img
          src={avatarSrc}
          alt=""
          className="h-11 w-11 shrink-0 rounded-full border border-slate-200 object-cover"
        />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {profile?.username || profile?.email || "Profil"}
        </h1>

        {/* Pill rangi */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-100 px-3 py-1 text-[13px] font-medium text-slate-600">
          <i className={`${rank.icon}`} style={{ fontSize: 14 }} />
          {rank.label}
        </span>

        {/* XP — po prawej */}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black text-slate-900">{levelInfo.level}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">poziom</span>
          </div>
          <div style={{ minWidth: 100 }}>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              {levelInfo.xp_in_current_level} / {levelInfo.xp_to_next_level} XP
            </div>
          </div>
        </div>
      </header>

      {/* ── Sekcja 2: Trzy metryki ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Słówka opanowane", value: wordsMastered.toLocaleString("pl-PL"), color: "#178CF2" },
          { label: "Sesji ukończonych", value: sessionsCompleted.toLocaleString("pl-PL"), color: "#0F6E56" },
          { label: "Skuteczność",       value: `${accuracy}%`,                            color: "#FA8C27" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm"
          >
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</p>
            <p className="text-4xl font-black leading-none" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Sekcja 3: Seria + Lekcje ── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Karta: Seria nauki */}
        <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
            <i className="ti-flame" style={{ fontSize: 14, color: "#FA8C27" }} />
            Seria nauki
          </h2>

          <div className="mb-4 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-slate-900">{currentStreak}</span>
              <span className="text-base font-medium text-slate-500">
                {currentStreak === 1 ? "dzień" : "dni"}
              </span>
            </div>
            {bestStreak > 0 && (
              <div className="text-right">
                <div className="text-xs font-medium text-slate-400">rekord</div>
                <div className="text-base font-bold text-slate-700">{bestStreak} dni</div>
              </div>
            )}
          </div>

          {/* Kółka dni tygodnia */}
          <div className="flex gap-2">
            {weekDays.map((day) => (
              <div key={day.label} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-colors"
                  style={{
                    background: day.done ? "linear-gradient(135deg,#fbbf24,#f97316)" : "#f1f5f9",
                    color: day.done ? "#fff" : "#94a3b8",
                    opacity: day.isFuture ? 0.35 : 1,
                    outline: day.isToday ? "2px solid #f97316" : "none",
                    outlineOffset: 1,
                  }}
                >
                  {day.isToday && day.done ? "✓" : null}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wide text-slate-300">
                  {day.label}
                </span>
              </div>
            ))}
          </div>

          {/* Ranga */}
          <p className="mt-4 text-[12px] text-slate-500">
            {rank.next === null
              ? "Jesteś: Tytan pracy · Szczyt osiągnięty 🏆"
              : `Jesteś: ${rank.label} · Do ${rank.next.label}: ${rank.next.daysNeeded} dni`}
          </p>
        </div>

        {/* Karta: Moje lekcje */}
        <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
            <i className="ti-calendar" style={{ fontSize: 14, color: "#178CF2" }} />
            Moje lekcje
          </h2>

          {lastLesson ? (
            <a
              href={`/app/lessons/${lastLesson.id}`}
              className="block rounded-xl border border-slate-100 bg-white p-3 transition hover:border-slate-200 hover:shadow-sm"
            >
              <p className="text-[10px] text-slate-400">{fmtDate(lastLesson.lesson_date)}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-slate-700">{lastLesson.topic || "Brak tematu"}</p>
            </a>
          ) : (
            <p className="text-sm text-slate-400">Brak ostatniej lekcji</p>
          )}

          <div className="my-3 h-px bg-slate-100" />

          {nextLesson ? (
            <a
              href={`/app/lessons/${nextLesson.id}`}
              className="block rounded-xl border border-slate-100 bg-white p-3 transition hover:border-slate-200 hover:shadow-sm"
            >
              <p className="text-[10px] text-slate-400">{fmtDate(nextLesson.lesson_date)}</p>
              <p className="mt-0.5 text-[13px] font-semibold leading-snug text-slate-900">{nextLesson.topic || "Brak tematu"}</p>
            </a>
          ) : (
            <p className="text-sm text-slate-400">Brak następnej lekcji</p>
          )}
        </div>
      </div>

      {/* ── Sekcja 4: Odznaki ── */}
      <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
          <i className="ti-award" style={{ fontSize: 14, color: "#534AB7" }} />
          Odznaki
        </h2>
        <div className="grid grid-cols-6 gap-3">
          {BADGE_DEFS.map((badge) => {
            const unlocked = unlockedIds.has(badge.id);
            return (
              <div key={badge.id} className="flex flex-col items-center gap-2">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full"
                  style={unlocked
                    ? { background: badge.bg }
                    : { background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)" }
                  }
                >
                  <i
                    className={unlocked ? badge.icon : "ti-lock"}
                    style={{ fontSize: 22, color: unlocked ? badge.color : "var(--color-text-tertiary)" }}
                  />
                </div>
                <span
                  className="text-center text-[10px] leading-tight"
                  style={{ color: unlocked ? "#64748b" : "var(--color-text-tertiary)" }}
                >
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </main>
  );
}

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getRank } from "@/lib/rank";
import { resolveAvatarUrl } from "@/lib/avatars";
import { calculateLevelInfo } from "@/lib/xp/levels";
import StreakWidget from "@/components/dashboard/StreakWidget";

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
  { id: "first_streak", label: "Pierwsza seria", icon: "ti-flame"   },
  { id: "words_100",    label: "100 słówek",     icon: "ti-book"    },
  { id: "perfection",   label: "Perfekcja",       icon: "ti-star"    },
  { id: "streak_7",     label: "7-dniowa seria", icon: "ti-shield"  },
  { id: "words_500",    label: "500 słówek",     icon: "ti-books"   },
  { id: "grammar",      label: "Gramatyk",        icon: "ti-grammar" },
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

  // Start of current month
  const startOfMonth = `${todayDate.toISOString().slice(0, 7)}-01`;

  // Lessons range: previous + current month
  const prevMonthDate = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1);
  const prevMonthStart = `${prevMonthDate.toISOString().slice(0, 7)}-01`;

  const [
    profileRes,
    xpRes,
    streakRes,
    vocabTotalRes,
    vocabMonthRes,
    weekSessionsRes,
    lessonsRes,
  ] = await Promise.all([
    admin.from("profiles").select("id,email,username,avatar_url,role").eq("id", userId).single(),
    admin.from("user_xp").select("xp_total").eq("user_id", userId).maybeSingle(),
    admin.from("user_streaks").select("current_streak,best_streak,last_session_date").eq("student_id", userId).maybeSingle(),
    admin.from("vocab_answer_events").select("id", { count: "exact", head: true }).eq("student_id", userId).eq("is_correct", true),
    admin.from("vocab_answer_events").select("id", { count: "exact", head: true }).eq("student_id", userId).eq("is_correct", true).gte("created_at", startOfMonth),
    admin.from("training_sessions").select("completed_at").eq("student_id", userId).eq("status", "completed").gte("completed_at", mondayStr),
    admin.from("lessons").select("id,lesson_date,topic").eq("student_id", userId).gte("lesson_date", prevMonthStart).order("lesson_date"),
  ]);

  // ── derive values ──────────────────────────────────────────────────────

  const profile = profileRes.data;
  const avatarSrc = resolveAvatarUrl(profile?.avatar_url, userId);

  const xpTotal = xpRes.data?.xp_total ?? 0;
  const levelInfo = calculateLevelInfo(xpTotal);
  const xpPercent = levelInfo.xp_to_next_level > 0
    ? Math.min(Math.round((levelInfo.xp_in_current_level / levelInfo.xp_to_next_level) * 100), 100)
    : 0;
  const xpMissing = levelInfo.xp_to_next_level - levelInfo.xp_in_current_level;

  const streakData = streakRes.data;
  const currentStreak = streakData?.current_streak ?? 0;
  const bestStreak = streakData?.best_streak ?? 0;
  const rank = getRank(currentStreak);

  const wordsMastered = vocabTotalRes.count ?? 0;
  const wordsThisMonth = vocabMonthRes.count ?? 0;

  // Week activity bars (based on actual session dates)
  const weekSessionDates = new Set(
    (weekSessionsRes.data ?? [])
      .map((s) => (s.completed_at as string | null)?.slice(0, 10))
      .filter(Boolean)
  );
  const WEEK_LABELS = ["PN", "WT", "ŚR", "CZ", "PT", "SB", "ND"];
  const weekActivity = WEEK_LABELS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    return { label, done: weekSessionDates.has(iso) };
  });

  // Lessons
  const allLessons = (lessonsRes.data ?? []) as { id: string; lesson_date: string; topic: string }[];
  const lastLesson = [...allLessons].filter((l) => l.lesson_date <= todayStr).at(-1) ?? null;
  const nextLesson = allLessons.find((l) => l.lesson_date > todayStr) ?? null;

  // ── render ─────────────────────────────────────────────────────────────

  return (
    <main className="flex flex-col gap-6">

      {/* ── Strefa 1: Nagłówek profilu ── */}
      <header className="flex items-center gap-4 px-1">
        <img
          src={avatarSrc}
          alt=""
          className="h-11 w-11 shrink-0 rounded-full border border-slate-200 object-cover"
        />
        <span className="text-3xl font-bold tracking-tight text-slate-900">
          {profile?.username || profile?.email || "Profil"}
        </span>

        {/* Pasek XP — rozciągnięty między imieniem a poziomem */}
        <div className="mx-4 flex flex-1 flex-col justify-center">
          <div
            style={{
              height: 20,
              borderRadius: 99,
              background: "#DBEAFE",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${xpPercent}%`,
                height: "100%",
                background: "#178CF2",
                borderRadius: 99,
                transition: "width 0.5s",
              }}
            />
          </div>
          <span className="mt-1 text-xs font-bold tracking-tight text-slate-400">
            Do poziomu {levelInfo.level + 1}: {xpMissing} XP
          </span>
        </div>

        {/* Poziom — po prawej */}
        <div className="flex flex-col items-end">
          <span className="text-3xl font-bold tracking-tight text-slate-900">
            Poziom {levelInfo.level}
          </span>
          <span className="text-sm font-bold tracking-tight text-slate-400">
            {levelInfo.xp_in_current_level} / {levelInfo.xp_to_next_level} XP
          </span>
        </div>
      </header>

      {/* ── Strefa 2: 4 kafelki w siatce 2×2 ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* [1,1] Moje lekcje */}
        <div className="flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 shadow-[0_4px_24px_rgba(251,146,60,0.28)]">
          <div className="flex shrink-0 items-center px-5 py-4">
            <h2 className="text-2xl font-black tracking-tight text-white">Moje lekcje</h2>
          </div>
          <div className="m-[3px] flex flex-1 flex-col rounded-xl bg-white p-5">
            <p style={{ fontSize: 11, letterSpacing: "0.08em" }} className="font-bold uppercase text-slate-400">Ostatnia lekcja</p>
            {lastLesson ? (
              <>
                <p className="mt-1 text-[13px] text-slate-400">{fmtDate(lastLesson.lesson_date)}</p>
                <p className="mt-0.5 text-[17px] font-medium leading-snug text-slate-800">{lastLesson.topic || "Brak tematu"}</p>
                <a href={`/app/lessons/${lastLesson.id}`} className="mt-3 inline-block rounded-lg border border-slate-200 px-4 py-2 text-[13px] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50">← Zobacz notatki</a>
              </>
            ) : (
              <p className="mt-1 text-sm italic text-slate-400">Brak ostatniej lekcji</p>
            )}
            <div className="my-4 h-px bg-slate-100" />
            <p style={{ fontSize: 11, letterSpacing: "0.08em" }} className="font-bold uppercase text-slate-400">Następna lekcja</p>
            {nextLesson ? (
              <>
                <p className="mt-1 text-[13px] text-slate-400">{fmtDate(nextLesson.lesson_date)}</p>
                <p className="mt-0.5 text-[17px] font-medium leading-snug text-slate-800">{nextLesson.topic || "Brak tematu"}</p>
              </>
            ) : (
              <p className="mt-1 text-sm italic text-slate-400">Brak zaplanowanych lekcji</p>
            )}
          </div>
        </div>

        {/* [1,2] Ranga */}
        <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Ranga</h2>
          <div className="flex items-center gap-2">
            <i className={rank.icon} style={{ fontSize: 22, color: "#178CF2" }} />
            <span className="text-3xl font-bold tracking-tight text-slate-900">{rank.label}</span>
          </div>
        </div>

        {/* [2,1] Statystyki + Odznaki */}
        <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Statystyki</h2>
              {[
                { icon: "ti-book-2",         color: "#178CF2", label: "Słówka opanowane",      value: wordsMastered.toLocaleString("pl-PL") },
                { icon: "ti-calendar-stats", color: "#0F6E56", label: "Słówka w tym miesiącu", value: wordsThisMonth.toLocaleString("pl-PL") },
                { icon: "ti-trophy",         color: "#FA8C27", label: "Najlepsza seria",        value: `${bestStreak} dni` },
              ].map(({ icon, color, label, value }) => (
                <div key={label} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
                  <i className={icon} style={{ fontSize: 20, color }} />
                  <div>
                    <p className="text-[10px] text-slate-400">{label}</p>
                    <p className="text-lg font-semibold leading-tight" style={{ color }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Odznaki</h2>
              <div className="grid grid-cols-3 gap-2">
                {BADGE_DEFS.map((badge) => (
                  <div key={badge.id} className="flex flex-col items-center gap-1.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                      <i className={badge.icon} style={{ fontSize: 18, color: "#cbd5e1" }} />
                    </div>
                    <span className="text-center text-[9px] leading-tight text-slate-300">{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* [2,2] Seria nauki */}
        <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
          <h2
            className="flex items-center gap-1.5"
            style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-tertiary)", marginBottom: "0.75rem" }}
          >
            <i className="ti-flame" style={{ fontSize: 14, color: "#FA8C27" }} />
            Seria nauki
          </h2>
          <StreakWidget
            currentStreak={currentStreak}
            bestStreak={bestStreak}
            weekActivity={weekActivity}
          />
        </div>

      </div>

      {/* ── Sekcja Odznaki — ukryta, do dopracowania ── */}

    </main>
  );
}

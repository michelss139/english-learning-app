"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type ProgressExtended = {
  accuracy: {
    correct_today: number;
    total_today: number;
    correct_3d: number;
    total_3d: number;
    correct_7d: number;
    total_7d: number;
    correct_14d: number;
    total_14d: number;
  };
  learned: {
    today: { term_en_norm: string }[];
    week: { term_en_norm: string }[];
    total: { term_en_norm: string }[];
  };
  toLearn: {
    today: { term_en_norm: string }[];
    week: { term_en_norm: string }[];
    total: { term_en_norm: string }[];
  };
  repeatSuggestions: { term_en_norm: string; last_correct_at: string }[];
};

export default function StatusPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<ProgressExtended | null>(null);
  const [xp, setXp] = useState<{
    xp_total: number;
    level: number;
    xp_in_current_level: number;
    xp_to_next_level: number;
  } | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (!token) return;

        const [progressRes, xpRes] = await Promise.all([
          fetch("/api/vocab/progress-extended", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/profile/xp", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const progressJson = await progressRes.json();
        if (!progressRes.ok) throw new Error(progressJson?.error ?? "Błąd dashboardu");
        setData(progressJson);

        const xpJson = await xpRes.json();
        if (xpRes.ok && xpJson?.ok) {
          setXp({
            xp_total: xpJson.xp_total ?? 0,
            level: xpJson.level ?? 0,
            xp_in_current_level: xpJson.xp_in_current_level ?? 0,
            xp_to_next_level: xpJson.xp_to_next_level ?? 0,
          });
        } else {
          setXp({
            xp_total: 0,
            level: 0,
            xp_in_current_level: 0,
            xp_to_next_level: 0,
          });
        }
      } catch (e: any) {
        setError(e?.message ?? "Nieznany błąd.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [router]);

  if (loading) {
    return <div className="text-white/70">Ładuję dashboard…</div>;
  }

  if (error || !data) {
    return <div className="text-rose-300">Błąd: {error || "Brak danych."}</div>;
  }

  function pct(correct: number, total: number) {
    if (!total || total === 0) return 0;
    return Math.round((correct / total) * 100);
  }

  const accToday = pct(data.accuracy.correct_today, data.accuracy.total_today);
  const acc3d = pct(data.accuracy.correct_3d, data.accuracy.total_3d);
  const acc7d = pct(data.accuracy.correct_7d, data.accuracy.total_7d);
  const acc14d = pct(data.accuracy.correct_14d, data.accuracy.total_14d);
  const xpInLevel = xp?.xp_in_current_level ?? 0;
  const xpToNext = xp?.xp_to_next_level ?? 0;
  const xpPercent = xpToNext > 0 ? Math.round((xpInLevel / xpToNext) * 100) : 0;

  // Listy słów (bez hooków, bo to lekkie operacje)
  const learnedToday = uniqSort(data.learned.today.map((x) => x.term_en_norm));
  const learnedWeek = uniqSort(data.learned.week.map((x) => x.term_en_norm));
  const learnedTotal = uniqSort(data.learned.total.map((x) => x.term_en_norm));

  const toLearnToday = uniqSort(data.toLearn.today.map((x) => x.term_en_norm));
  const toLearnWeek = uniqSort(data.toLearn.week.map((x) => x.term_en_norm));
  const toLearnTotal = uniqSort(data.toLearn.total.map((x) => x.term_en_norm));

  return (
    <main className="space-y-8">
      {/* EXP BAR */}
      <section className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 space-y-2">
        <div className="flex justify-between text-sm text-white/70">
          <span>EXP</span>
          <span>Poziom {xp?.level ?? 0}</span>
        </div>
        <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-emerald-400 transition-all" style={{ width: `${xpPercent}%` }} />
        </div>
        <div className="text-xs text-white/50">
          {xpInLevel}/{xpToNext} XP do następnego poziomu
        </div>
      </section>

      {/* ACCURACY */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatBox label="Skuteczność dziś" value={`${accToday}%`} />
        <StatBox label="Skuteczność 3 dni" value={`${acc3d}%`} />
        <StatBox label="Skuteczność 7 dni" value={`${acc7d}%`} />
        <StatBox label="Skuteczność 14 dni" value={`${acc14d}%`} />
      </section>

      {/* ACTIONS */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
          <div className="text-white/70 text-sm">Ilość wykonanych dziś ćwiczeń</div>
          <div className="text-3xl font-semibold text-white">{data.accuracy.total_today}</div>
        </div>

        <button
          onClick={() => router.push("/app/vocab")}
          className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition"
        >
          <div className="text-white/70 text-sm">Akcja</div>
          <div className="text-lg font-semibold text-white">Powtórz ostatnie ćwiczenie</div>
          <div className="text-xs text-white/50 mt-1">
            (Na razie: przejście do treningu. Kontynuacja sesji dojdzie, gdy wprowadzimy testy wieloetapowe.)
          </div>
        </button>
      </section>

      {/* LEARNED / TO LEARN */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEARNED */}
        <div className="space-y-4">
          <GreenBox title="Słowa nauczone dziś" count={learnedToday.length} words={learnedToday} />
          <GreenBox title="Słowa nauczone w tym tygodniu" count={learnedWeek.length} words={learnedWeek} />
          <GreenBox title="Słowa nauczone ogółem" count={learnedTotal.length} words={learnedTotal} />
        </div>

        {/* TO LEARN */}
        <div className="space-y-4">
          <RedBox title="Do nauczenia dziś" count={toLearnToday.length} words={toLearnToday} />
          <RedBox title="Do nauczenia w tym tygodniu" count={toLearnWeek.length} words={toLearnWeek} />
          <RedBox title="Do nauczenia ogółem" count={toLearnTotal.length} words={toLearnTotal} />
        </div>
      </section>
    </main>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
      <div className="text-white/70 text-sm">{label}</div>
      <div className="text-3xl font-semibold text-white">{value}</div>
    </div>
  );
}

function WordChips({ words, limit = 12 }: { words: string[]; limit?: number }) {
  const shown = words.slice(0, limit);
  const rest = Math.max(0, words.length - shown.length);

  if (words.length === 0) {
    return <div className="text-xs text-white/50">Brak</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {shown.map((w) => (
        <span key={w} className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white" title={w}>
          {w}
        </span>
      ))}
      {rest > 0 ? <span className="text-xs text-white/60">+{rest} więcej</span> : null}
    </div>
  );
}

function GreenBox({ title, count, words }: { title: string; count: number; words: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="text-slate-700 text-sm">{title}</div>
        <div className="text-3xl font-semibold text-white">{count}</div>
      </div>
      <WordChips words={words} />
    </div>
  );
}

function RedBox({ title, count, words }: { title: string; count: number; words: string[] }) {
  return (
    <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="text-rose-100 text-sm">{title}</div>
        <div className="text-3xl font-semibold text-white">{count}</div>
      </div>
      <WordChips words={words} />
    </div>
  );
}

function uniqSort(arr: string[]) {
  return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
}

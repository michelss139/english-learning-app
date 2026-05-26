"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getAllGrammarTenses } from "@/lib/grammar/content";
import {
  TENSE_GROUPS,
  TENSE_GROUP_ENTRIES,
  TENSE_LABEL,
  LEVEL_COLOR,
  type TenseGroupKey,
} from "@/lib/story/tenseGroups";

// ─── Types ────────────────────────────────────────────────────────────────────

type StoryGap = {
  id: string;
  baseVerb: string;
  correctAnswer: string;
  tense: string;
};

type StoryData = {
  group: TenseGroupKey;
  story: string;
  gaps: StoryGap[];
};

type StoryApiResponse =
  | { ok: true; data: StoryData; source?: "cache" | "generated" }
  | { ok: false; reason?: string; error?: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `story-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

const FRIENDLY_ERRORS: Record<string, string> = {
  group_required: "Wybierz grupę czasów przed wygenerowaniem historii.",
  invalid_group: "Wybrana grupa jest nieprawidłowa.",
  generation_failed: "Nie udało się wygenerować historii. Spróbuj ponownie.",
  missing_api_key: "Brak konfiguracji API. Skontaktuj się z administratorem.",
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function StoryGeneratorClient() {
  const router = useRouter();

  const [selectedGroup, setSelectedGroup] = useState<TenseGroupKey | null>(null);
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isChecked, setIsChecked] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [storyVisible, setStoryVisible] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [awardedSessionId, setAwardedSessionId] = useState("");
  const [xpMessage, setXpMessage] = useState("");

  const tenseMap = useMemo(
    () => new Map(getAllGrammarTenses().map((t) => [t.slug, t.title])),
    []
  );

  const gapsById = useMemo(
    () => new Map((storyData?.gaps ?? []).map((gap) => [gap.id, gap])),
    [storyData?.gaps]
  );

  const storyParts = useMemo(() => {
    if (!storyData) return [];
    return storyData.story.split(/(\{\{g\d+\}\})/g);
  }, [storyData]);

  const selectedGroupConfig = selectedGroup ? TENSE_GROUPS[selectedGroup] : null;

  // ── Generate ────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!selectedGroup) {
      setError("Wybierz grupę czasów.");
      return;
    }

    setIsLoading(true);
    setError("");
    setXpMessage("");
    setStoryVisible(false);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setError("Brak sesji. Zaloguj się ponownie.");
        return;
      }

      const res = await fetch("/api/story-generator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ group: selectedGroup }),
      });

      const data = (await res.json().catch(() => null)) as StoryApiResponse | null;

      if (!res.ok || !data?.ok) {
        const reason = (data as { reason?: string; error?: string } | null)?.reason;
        const msg =
          (reason && FRIENDLY_ERRORS[reason]) ||
          (reason ? `Błąd: ${reason}` : null) ||
          "Nie udało się wygenerować historii.";
        throw new Error(msg);
      }

      setStoryData(data.data);
      setSessionId(createSessionId());
      setUserAnswers({});
      setIsChecked(false);
      setScore(null);

      requestAnimationFrame(() => setStoryVisible(true));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nie udało się wygenerować historii.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Check answers ────────────────────────────────────────────────────────────

  const handleCheck = async () => {
    if (!storyData) return;

    let correct = 0;
    for (const gap of storyData.gaps) {
      const given = normalizeAnswer(userAnswers[gap.id] ?? "");
      const expected = normalizeAnswer(gap.correctAnswer);
      if (given === expected && expected.length > 0) correct += 1;
    }

    const total = storyData.gaps.length;
    setScore({ correct, total });
    setIsChecked(true);

    if (!sessionId || awardedSessionId === sessionId) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const res = await fetch("/api/story-generator/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: sessionId, correct, total }),
      });

      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        xp_awarded?: number;
      } | null;

      if (res.ok && json?.ok) {
        setAwardedSessionId(sessionId);
        const xp = Number(json.xp_awarded ?? 0);
        setXpMessage(xp > 0 ? `+${xp} XP` : "XP już przyznane dziś");
      }
    } catch {
      // Non-blocking — checking answers must not fail due to XP errors
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const usedTenses =
    (storyData ? TENSE_GROUPS[storyData.group]?.tenses : null) ??
    selectedGroupConfig?.tenses ??
    [];

  return (
    <section className="space-y-6">
      {/* Page header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          AI Story Generator
        </h1>
        <p className="text-sm text-slate-500">
          Wybierz grupę czasów — AI wygeneruje historię z lukami do uzupełnienia.
          Ćwicz rozróżnianie czasów w kontekście.
        </p>
      </header>

      {/* Group selection */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 backdrop-blur-sm">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-[0.08em] text-slate-400">
          Wybierz grupę czasów
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Każda grupa zawiera czasy, które studenci najczęściej mylą w kontekście.
        </p>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {TENSE_GROUP_ENTRIES.map(([key, group]) => {
            const active = selectedGroup === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedGroup(key)}
                className={`rounded-xl border px-4 py-3 text-left transition-all duration-150 ${
                  active
                    ? "border-slate-900 bg-white shadow-sm"
                    : "border-slate-200 bg-white/60 hover:border-slate-300 hover:bg-white hover:shadow-sm"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{group.label}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${LEVEL_COLOR[group.level]}`}
                  >
                    {group.level}
                  </span>
                </div>
                <p className="mb-2.5 text-xs leading-snug text-slate-500">{group.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.tenses.map((slug) => (
                    <span
                      key={slug}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                    >
                      {TENSE_LABEL[slug] ?? slug}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading || !selectedGroup}
            className="rounded-xl border border-slate-900 bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Generuję…" : "Generuj historię"}
          </button>
          {isLoading && (
            <p className="text-xs text-slate-400 animate-pulse">
              AI pisze historię — chwilę…
            </p>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-medium text-rose-700">{error}</p>
        </div>
      )}

      {/* Story */}
      {storyData && (
        <article
          className={`rounded-2xl border border-slate-200/80 bg-white/80 p-6 backdrop-blur-sm transition-opacity duration-300 ${
            storyVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Story header */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              {TENSE_GROUPS[storyData.group]?.label ?? "Historia"}
            </h2>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                LEVEL_COLOR[TENSE_GROUPS[storyData.group]?.level ?? "B1"]
              }`}
            >
              {TENSE_GROUPS[storyData.group]?.level}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TENSE_GROUPS[storyData.group]?.tenses.map((slug) => (
                <span
                  key={slug}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500"
                >
                  {TENSE_LABEL[slug] ?? slug}
                </span>
              ))}
            </div>
          </div>

          {/* Story text with inline inputs */}
          <p className="leading-9 text-slate-800">
            {storyParts.map((part, idx) => {
              const match = part.match(/^\{\{(g\d+)\}\}$/);
              if (!match) {
                return <span key={`text-${idx}`}>{part}</span>;
              }

              const gapId = match[1];
              const gap = gapsById.get(gapId);
              const value = userAnswers[gapId] ?? "";
              const isCorrect =
                gap
                  ? normalizeAnswer(value) === normalizeAnswer(gap.correctAnswer)
                  : false;
              const tenseName = gap ? (TENSE_LABEL[gap.tense as keyof typeof TENSE_LABEL] ?? gap.tense) : "";

              return (
                <span
                  key={`gap-${gapId}-${idx}`}
                  className="mx-1 inline-flex flex-col items-center gap-0 align-middle"
                >
                  <span className="inline-flex items-center gap-1">
                    <input
                      value={value}
                      onChange={(e) =>
                        setUserAnswers((prev) => ({ ...prev, [gapId]: e.target.value }))
                      }
                      disabled={isChecked}
                      className={`inline-block w-36 rounded-lg border-2 bg-white px-2 py-1 text-sm font-medium outline-none transition-colors ${
                        !isChecked
                          ? "border-slate-300 focus:border-slate-600"
                          : isCorrect
                            ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                            : "border-rose-400 bg-rose-50 text-rose-800"
                      }`}
                      aria-label={`Odpowiedź dla ${gap?.baseVerb ?? gapId}`}
                    />
                    <span className="text-[10px] text-slate-400">({gap?.baseVerb ?? "verb"})</span>
                  </span>
                  {/* Show correct answer + tense label on wrong answer after check */}
                  {isChecked && !isCorrect && gap && (
                    <span className="mt-0.5 text-[10px] font-semibold text-rose-600">
                      → {gap.correctAnswer}
                      <span className="ml-1 font-normal text-slate-400">
                        [{tenseName}]
                      </span>
                    </span>
                  )}
                </span>
              );
            })}
          </p>

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!isChecked ? (
              <button
                type="button"
                onClick={handleCheck}
                className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Sprawdź odpowiedzi
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setStoryData(null);
                  setStoryVisible(false);
                  setIsChecked(false);
                  setScore(null);
                  setUserAnswers({});
                  setXpMessage("");
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Nowa historia
              </button>
            )}

            {score && (
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-semibold ${
                    score.correct === score.total
                      ? "text-emerald-600"
                      : score.correct >= score.total / 2
                        ? "text-amber-600"
                        : "text-rose-600"
                  }`}
                >
                  {score.correct} / {score.total}
                  {score.correct === score.total ? " 🎉" : ""}
                </span>
                {xpMessage && (
                  <span className="text-xs font-medium text-slate-500">{xpMessage}</span>
                )}
              </div>
            )}
          </div>

          {/* Theory links */}
          <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Przypomnij teorię
            </p>
            <div className="flex flex-wrap gap-2">
              {(TENSE_GROUPS[storyData.group]?.tenses ?? []).map((slug) => (
                <Link
                  key={slug}
                  href={`/app/grammar/${slug}`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {tenseMap.get(slug) ?? TENSE_LABEL[slug] ?? slug}
                </Link>
              ))}
            </div>
          </div>
        </article>
      )}
    </section>
  );
}

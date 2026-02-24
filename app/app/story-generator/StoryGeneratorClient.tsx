"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getAllGrammarTenses } from "@/lib/grammar/content";
import { STORY_PROFILES, type StoryProfileKey } from "@/lib/story/profiles";

type StoryGap = {
  id: string;
  baseVerb: string;
  correctAnswer: string;
  tense: string;
};

type StoryData = {
  title: string;
  story: string;
  gaps: StoryGap[];
  profile?: StoryProfileKey;
};

type StoryApiResponse =
  | { ok: true; data: StoryData; source?: "cache" | "generated" }
  | { ok: false; reason?: string; error?: string };

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `story-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase();
}

const PROFILE_ENTRIES = Object.entries(STORY_PROFILES) as Array<
  [StoryProfileKey, (typeof STORY_PROFILES)[StoryProfileKey]]
>;

export default function StoryGeneratorClient() {
  const router = useRouter();
  const [selectedProfile, setSelectedProfile] = useState<StoryProfileKey | null>(null);
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

  const tenseMap = useMemo(() => new Map(getAllGrammarTenses().map((t) => [t.slug, t.title])), []);
  const selectedProfileConfig = useMemo(
    () => (selectedProfile ? STORY_PROFILES[selectedProfile] : null),
    [selectedProfile]
  );

  const gapsById = useMemo(() => {
    return new Map((storyData?.gaps ?? []).map((gap) => [gap.id, gap]));
  }, [storyData?.gaps]);

  const storyParts = useMemo(() => {
    if (!storyData) return [];
    return storyData.story.split(/(\{\{g\d+\}\})/g);
  }, [storyData]);

  const handleGenerate = async () => {
    if (!selectedProfile) {
      setError("Wybierz profil historii.");
      return;
    }

    setIsLoading(true);
    setError("");
    setXpMessage("");
    setStoryVisible(false);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const res = await fetch("/api/story-generator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ profile: selectedProfile }),
      });

      const data = (await res.json().catch(() => null)) as StoryApiResponse | null;
      if (!res.ok || !data?.ok || !data?.data) {
        const err = data as { reason?: string; error?: string } | null;
        const reason = err?.reason ?? err?.error;
        const friendly: Record<string, string> = {
          validation_failed: "Walidacja form czasownikowych nie powiodla sie. Sprobuj ponownie.",
          irregular_load_failed: "Blad ladowania slownika czasownikow nieregularnych.",
          profile_required: "Profil historii jest wymagany.",
          invalid_profile: "Wybrany profil jest nieprawidlowy.",
          parse_error: "Odpowiedz AI ma nieprawidlowy format.",
          openai_error: "Blad polaczenia z usluga AI.",
          gap_injection_failed: "Nie udalo sie przygotowac luk. Sprobuj ponownie.",
        };
        const msg =
          (reason && friendly[reason]) ||
          (reason ? `Nie udalo sie: ${reason}` : null) ||
          "Nie udalo sie wygenerowac historii.";
        throw new Error(msg);
      }

      setStoryData(data.data);
      setSessionId(createSessionId());
      setUserAnswers({});
      setIsChecked(false);
      setScore(null);

      requestAnimationFrame(() => setStoryVisible(true));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Nie udalo sie wygenerowac historii.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheck = async () => {
    if (!storyData) return;

    let correct = 0;
    for (const gap of storyData.gaps) {
      const given = normalizeAnswer(userAnswers[gap.id] ?? "");
      const expected = normalizeAnswer(gap.correctAnswer);
      if (given === expected && expected.length > 0) {
        correct += 1;
      }
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
        body: JSON.stringify({
          session_id: sessionId,
          correct,
          total,
        }),
      });

      const data = (await res.json().catch(() => null)) as { ok?: boolean; xp_awarded?: number } | null;
      if (res.ok && data?.ok) {
        setAwardedSessionId(sessionId);
        const xp = Number(data.xp_awarded ?? 0);
        setXpMessage(xp > 0 ? `+${xp} XP` : "XP juz przyznane dzisiaj");
      }
    } catch {
      // Non-blocking: checking answers must not fail because of XP.
    }
  };

  const usedTenses = selectedProfileConfig?.tenses ?? [];

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">AI Story Generator</h1>
        <p className="text-sm text-slate-600">Wybierz profil narracyjny, wygeneruj historie i uzupelnij luki czasownikowe.</p>
      </header>

      <div className="rounded-3xl border-2 border-slate-900 bg-white p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Wybierz profil historii</h2>
          <p className="text-sm text-slate-600">Kazdy profil ma gotowy zestaw czasow i styl narracji.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {PROFILE_ENTRIES.map(([profileKey, profile]) => {
            const active = selectedProfile === profileKey;
            return (
              <button
                key={profileKey}
                type="button"
                onClick={() => setSelectedProfile(profileKey)}
                className={`rounded-2xl border bg-white p-4 text-left transition ${
                  active ? "border-slate-900 shadow-sm" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="space-y-2">
                  <p className="text-base font-semibold text-slate-900">{profile.label}</p>
                  <p className="text-sm text-slate-600">{profile.description}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {profile.tenses.map((slug) => (
                      <span
                        key={`${profileKey}-${slug}`}
                        className="rounded-full border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-700"
                      >
                        {tenseMap.get(slug) ?? slug}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading || !selectedProfile}
          className="rounded-xl border-2 border-slate-900 bg-white px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {isLoading ? "Generuje..." : "Generuj tekst"}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
          <span className="font-semibold">Blad: </span>
          {error}
        </div>
      ) : null}

      {storyData ? (
        <article
          className={`rounded-3xl border-2 border-slate-900 bg-white p-6 transition-opacity duration-300 ${
            storyVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-slate-900">{storyData.title}</h2>
            <p className="text-sm text-slate-700">
              Uzyte czasy:{" "}
              {usedTenses.map((slug, idx) => (
                <span key={`used-${slug}`}>
                  {tenseMap.get(slug) ?? slug}
                  {idx < usedTenses.length - 1 ? ", " : ""}
                </span>
              ))}
            </p>
          </div>

          <p className="mt-5 leading-8 text-slate-900">
            {storyParts.map((part, idx) => {
              const match = part.match(/^\{\{(g\d+)\}\}$/);
              if (!match) return <span key={`text-${idx}`}>{part}</span>;

              const gapId = match[1];
              const gap = gapsById.get(gapId);
              const value = userAnswers[gapId] ?? "";
              const isCorrect = gap ? normalizeAnswer(value) === normalizeAnswer(gap.correctAnswer) : false;

              return (
                <span key={`gap-${gapId}-${idx}`} className="mx-1 inline-flex items-center gap-1 align-middle">
                  <input
                    value={value}
                    onChange={(e) =>
                      setUserAnswers((prev) => ({
                        ...prev,
                        [gapId]: e.target.value,
                      }))
                    }
                    className={`inline-block w-32 rounded-md border-2 bg-white px-2 py-1 text-sm outline-none ${
                      !isChecked
                        ? "border-slate-400"
                        : isCorrect
                          ? "border-emerald-500"
                          : "border-rose-500"
                    }`}
                    aria-label={`Odpowiedz dla luki ${gapId}`}
                  />
                  <span className="text-xs text-slate-500">({gap?.baseVerb ?? "verb"})</span>
                </span>
              );
            })}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCheck}
              className="rounded-xl border-2 border-slate-900 bg-white px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Sprawdz
            </button>
            {score ? (
              <p className="text-sm font-medium text-slate-800">
                Wynik: {score.correct} / {score.total}
              </p>
            ) : null}
            {xpMessage ? <p className="text-sm text-slate-600">{xpMessage}</p> : null}
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Przypomnij teorie:</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {usedTenses.map((slug) => (
                <Link
                  key={`theory-${slug}`}
                  href={`/app/grammar/${slug}`}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm text-slate-800 transition hover:bg-slate-100"
                >
                  {tenseMap.get(slug) ?? slug}
                </Link>
              ))}
            </div>
          </section>
        </article>
      ) : null}
    </section>
  );
}

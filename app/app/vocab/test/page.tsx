"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";

type VocabItem = {
  id: string;
  term_en: string;
  translation_pl: string | null;
};

type Mistake = {
  term: string;
  expected: string;
  given: string;
};

function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ETAP 2: normalizacja + sprawdzanie wielu dopuszczalnych tłumaczeń po ";"
function normPL(input: string) {
  return input.trim().toLowerCase();
}

function parseTranslationsPl(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(";")
    .map(normPL)
    .filter(Boolean);
}

function isCorrectTranslation(userAnswerRaw: string, translationPlRaw: string | null | undefined) {
  const user = normPL(userAnswerRaw);
  if (!user) return false;

  const variants = parseTranslationsPl(translationPlRaw);
  return variants.includes(user);
}

function pill(tone: "neutral" | "good" | "bad") {
  if (tone === "good") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  if (tone === "bad") return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  return "border-white/15 bg-white/5 text-white/80";
}

export default function VocabTestPage() {
  return (
    <Suspense fallback={<main>Ładuję test…</main>}>
      <VocabTestInner />
    </Suspense>
  );
}

function VocabTestInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const idsParam = searchParams.get("ids") ?? "";
  const modeParam = searchParams.get("mode") ?? "en-pl";

  const ids = useMemo(
    () =>
      idsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [idsParam]
  );

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [words, setWords] = useState<VocabItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"neutral" | "good" | "bad">("neutral");
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [completed, setCompleted] = useState(false);
  const [savingResult, setSavingResult] = useState(false);
  const [saveError, setSaveError] = useState("");

  const current = words[currentIndex];
  const total = words.length;

  useEffect(() => {
    const run = async () => {
      try {
        if (ids.length === 0) {
          setError("Brak identyfikatorów słówek w adresie URL.");
          return;
        }

        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          router.push("/login");
          return;
        }

        const p = await getOrCreateProfile();
        if (!p) {
          router.push("/login");
          return;
        }

        setProfile(p);

        const vocabRes = await supabase
          .from("vocab_items")
          .select("id,term_en,translation_pl")
          .in("id", ids);

        if (vocabRes.error) throw vocabRes.error;

        const list = (vocabRes.data ?? []) as VocabItem[];
        if (list.length === 0) {
          setError("Nie znaleziono słówek. Sprawdź, czy jesteś zalogowany na właściwe konto.");
          return;
        }

        setWords(shuffle(list));
      } catch (e: any) {
        setError(e?.message ?? "Nie udało się wczytać testu.");
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, idsParam]);

  useEffect(() => {
    const saveResult = async () => {
      if (!completed || !profile || total === 0) return;
      setSavingResult(true);
      setSaveError("");
      try {
        const { error: insertError } = await supabase.from("vocab_test_runs").insert({
          student_id: profile.id,
          mode: modeParam || "en-pl",
          total,
          correct: correctCount,
          item_ids: words.map((w) => w.id),
        });
        if (insertError) throw insertError;
      } catch (e: any) {
        setSaveError(e?.message ?? "Nie udało się zapisać wyniku.");
      } finally {
        setSavingResult(false);
      }
    };

    saveResult();
  }, [completed, profile, total, correctCount, modeParam, words]);

  const checkAnswer = () => {
    if (!current) return;

    setChecked(true);

    const expectedRaw = current.translation_pl;
    const givenRaw = answer;

    if (!expectedRaw) {
      setFeedback("Brak tłumaczenia w bazie – to pytanie nie liczy się do wyniku.");
      setFeedbackTone("neutral");
      return;
    }

    const isCorrect = isCorrectTranslation(givenRaw, expectedRaw);

    if (isCorrect) {
      setFeedback("Poprawnie!");
      setFeedbackTone("good");
      setCorrectCount((c) => c + 1);
    } else {
      setFeedback("Źle. Zobacz poprawną odpowiedź poniżej.");
      setFeedbackTone("bad");
      setMistakes((prev) => [
        ...prev,
        {
          term: current.term_en,
          expected: expectedRaw,
          given: normPL(givenRaw) ? givenRaw.trim() : "(pusto)",
        },
      ]);
    }
  };

  const goNext = () => {
    if (currentIndex >= total - 1) {
      setCompleted(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setAnswer("");
    setChecked(false);
    setFeedback("");
    setFeedbackTone("neutral");
  };

  if (loading) return <main>Ładuję test…</main>;

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Test słówek</h1>
            <p className="text-sm text-white/75">
              Tryb: <span className="font-medium text-white">{modeParam || "en-pl"}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
              href="/app/vocab"
            >
              ← Trening słówek
            </a>
            <a
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-medium text-white/90 hover:bg-white/10 hover:text-white transition"
              href="/app"
            >
              Panel
            </a>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4">
          <p className="text-sm text-rose-100">
            <span className="font-semibold">Błąd: </span>
            {error}
          </p>
        </div>
      ) : null}

      {!error && !completed && current ? (
        <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-4">
          <div className="flex items-center justify-between text-sm text-white/75">
            <span>
              Pytanie <span className="font-medium text-white">{currentIndex + 1}</span>/{total}
            </span>
            <span>
              Poprawne: <span className="font-medium text-white">{correctCount}</span>
            </span>
          </div>

          <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 space-y-3">
            <div className="text-xl font-semibold tracking-tight text-white">{current.term_en}</div>

            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!checked) checkAnswer();
                else goNext();
              }}
            >
              <input
                className="w-full rounded-2xl border-2 border-white/10 bg-black/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                placeholder="Twoja odpowiedź (PL)"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={checked}
              />

              {checked ? (
                <div className={`rounded-2xl border-2 px-4 py-3 text-sm ${pill(feedbackTone)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{feedback}</p>
                    <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold">
                      {feedbackTone === "good" ? "OK" : feedbackTone === "bad" ? "BŁĄD" : "INFO"}
                    </span>
                  </div>

                  {feedbackTone === "bad" ? (
                    <p className="mt-2">
                      Poprawna odpowiedź:{" "}
                      <span className="font-medium text-white">{current.translation_pl ?? "-"}</span>
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-white/60">
                  Wskazówka: jeśli jest kilka poprawnych tłumaczeń, wpisz jedno z nich (w bazie są oddzielone średnikiem
                  <span className="font-medium text-white"> ;</span>).
                </p>
              )}

              <button
                className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition disabled:opacity-60"
                type="submit"
                disabled={!current}
              >
                {checked ? (currentIndex === total - 1 ? "Zakończ" : "Dalej") : "Sprawdź"}
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {!error && completed ? (
        <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-white">Wynik</h2>
            <span className="rounded-xl border border-white/15 bg-white/5 px-3 py-1 text-sm font-semibold text-white">
              {correctCount} / {total}
            </span>
          </div>

          {mistakes.length === 0 ? (
            <div className="rounded-2xl border-2 border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
              Brak błędów. Świetnie!
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-white">Twoje błędy:</p>
              <ul className="space-y-2">
                {mistakes.map((m, idx) => (
                  <li
                    key={`${m.term}-${idx}`}
                    className="rounded-2xl border-2 border-white/10 bg-white/5 px-4 py-3 text-sm"
                  >
                    <div className="font-medium text-white">{m.term}</div>
                    <div className="text-white/75">
                      Poprawna: <span className="text-white">{m.expected}</span> • Twoja:{" "}
                      <span className="text-white">{m.given}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
            {saveError ? (
              <p className="text-sm text-rose-100">Błąd zapisu wyniku: {saveError}</p>
            ) : savingResult ? (
              <p className="text-sm text-white/75">Zapisuję wynik…</p>
            ) : (
              <p className="text-sm text-white/75">Wynik zapisany.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 transition"
              href="/app/vocab"
            >
              Wróć do treningu
            </a>
          </div>
        </section>
      ) : null}
    </main>
  );
}

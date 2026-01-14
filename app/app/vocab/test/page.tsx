"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";
import { TestItem } from "@/lib/vocab/testLoader";

type TestItemWithMode = TestItem & {
  questionMode: "en-pl" | "pl-en"; // Determined per item
};

type Mistake = {
  term: string;
  expected: string;
  given: string;
  questionMode: "en-pl" | "pl-en";
};

// Deterministic random: returns 0 or 1 based on seed
function deterministicRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % 2;
}

// Assign question mode to each item deterministically
function assignQuestionModes(items: TestItem[], testRunId: string): TestItemWithMode[] {
  return items.map((item) => {
    const seed = `${testRunId}-${item.id}`;
    const randomValue = deterministicRandom(seed);
    const questionMode: "en-pl" | "pl-en" = randomValue === 0 ? "en-pl" : "pl-en";
    return { ...item, questionMode };
  });
}

function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Normalization functions
function normPL(input: string) {
  return input.trim().toLowerCase();
}

function normEN(input: string) {
  return input.trim().toLowerCase();
}

function parseTranslationsPl(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(";")
    .map(normPL)
    .filter(Boolean);
}

// Check answer for en-pl mode
function isCorrectEnPl(userAnswerRaw: string, translationPlRaw: string | null | undefined): boolean {
  const user = normPL(userAnswerRaw);
  if (!user) return false;
  const variants = parseTranslationsPl(translationPlRaw);
  return variants.includes(user);
}

// Check answer for pl-en mode (exact match after normalization)
function isCorrectPlEn(userAnswerRaw: string, termEnRaw: string): boolean {
  const user = normEN(userAnswerRaw);
  const expected = normEN(termEnRaw);
  if (!user || !expected) return false;
  return user === expected;
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

  // Parse query params
  // Canonical: always use selectedIds (user_vocab_item_ids)
  // source=ids is legacy but still uses selectedIds
  const sourceParam = searchParams.get("source") || "ids"; // pool, lesson, or ids (legacy)
  const selectedIdsParam = searchParams.get("selectedIds") || searchParams.get("ids") || ""; // Support both for backward compat
  const lessonIdParam = searchParams.get("lessonId") || "";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [testRunId] = useState(() => crypto.randomUUID()); // Generate once on mount
  const [testRunCreated, setTestRunCreated] = useState(false); // Track if test_run was created
  const [items, setItems] = useState<TestItemWithMode[]>([]);
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
  const [eventLogErrors, setEventLogErrors] = useState(0);

  const current = items[currentIndex];
  const total = items.length;

  // Load test items
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");

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

        const token = session.data.session.access_token;

        // Load test items via API
        const loadBody: any = {
          source: sourceParam,
        };

        if (sourceParam === "pool") {
          const selectedIds = selectedIdsParam
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          if (selectedIds.length === 0) {
            setError("Brak zaznaczonych słówek. Zaznacz słówka w puli i stwórz test.");
            return;
          }
          loadBody.selectedIds = selectedIds;
        } else if (sourceParam === "lesson") {
          if (!lessonIdParam) {
            setError("Brak identyfikatora lekcji.");
            return;
          }
          const selectedIds = selectedIdsParam
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          if (selectedIds.length === 0) {
            setError("Brak zaznaczonych słówek. Zaznacz słówka w lekcji i stwórz test.");
            return;
          }
          loadBody.lessonId = lessonIdParam;
          loadBody.selectedIds = selectedIds;
        } else if (sourceParam === "ids") {
          // Legacy: ids source (but still uses selectedIds parameter)
          const selectedIds = selectedIdsParam
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          if (selectedIds.length === 0) {
            setError("Brak identyfikatorów słówek w adresie URL.");
            return;
          }
          loadBody.selectedIds = selectedIds; // Use selectedIds for consistency
        }

        const res = await fetch("/api/vocab/load-test-items", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(loadBody),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(errorData.error || "Nie udało się wczytać testu.");
        }

        const data = await res.json();
        if (!data.ok || !Array.isArray(data.items)) {
          throw new Error("Nieprawidłowa odpowiedź serwera.");
        }

        const testItems: TestItem[] = data.items;
        if (testItems.length === 0) {
          setError("Nie znaleziono słówek do testu.");
          return;
        }

        // Assign question modes deterministically and shuffle
        const itemsWithModes = assignQuestionModes(testItems, testRunId);
        setItems(shuffle(itemsWithModes));

        // Create test_run record at the start (before events are logged)
        const { error: runCreateError } = await supabase.from("vocab_test_runs").insert({
          id: testRunId,
          student_id: p.id,
          mode: "mixed",
          total: testItems.length,
          correct: 0, // Will be updated at the end
          item_ids: testItems.map((item) => item.id),
        });

        if (runCreateError) {
          throw new Error(`Failed to create test run: ${runCreateError.message}`);
        }

        setTestRunCreated(true);
      } catch (e: any) {
        setError(e?.message ?? "Nie udało się wczytać testu.");
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, sourceParam, selectedIdsParam, lessonIdParam, testRunId]);

  // Update test run with final results
  useEffect(() => {
    const updateResult = async () => {
      if (!completed || !profile || total === 0 || !testRunCreated) return;
      setSavingResult(true);
      setSaveError("");

      try {
        const session = await supabase.auth.getSession();
        if (!session.data.session) return;

        // Update test run with final results
        const { error: runError } = await supabase
          .from("vocab_test_runs")
          .update({
            total,
            correct: correctCount,
            item_ids: items.map((item) => item.id), // user_vocab_item_ids
          })
          .eq("id", testRunId);

        if (runError) throw runError;
      } catch (e: any) {
        setSaveError(e?.message ?? "Nie udało się zaktualizować wyniku.");
      } finally {
        setSavingResult(false);
      }
    };

    updateResult();
  }, [completed, profile, total, correctCount, items, testRunId, testRunCreated]);

  const checkAnswer = async () => {
    if (!current) return;

    setChecked(true);

    const questionMode = current.questionMode;
    let isCorrect = false;
    let expected: string | null = null;
    let prompt: string | null = null;

    if (questionMode === "en-pl") {
      // EN -> PL: prompt = term_en, expected = translation_pl
      prompt = current.term_en;
      expected = current.translation_pl;

      if (!expected) {
        setFeedback("Brak tłumaczenia w bazie – to pytanie nie liczy się do wyniku.");
        setFeedbackTone("neutral");
        // Log as skipped (no translation available)
        await logAnswerEvent(current.id, questionMode, prompt || "", null, answer, "skipped");
        return;
      }

      isCorrect = isCorrectEnPl(answer, expected);
    } else {
      // PL -> EN: prompt = translation_pl, expected = term_en
      prompt = current.translation_pl;
      expected = current.term_en;

      if (!prompt) {
        setFeedback("Brak tłumaczenia w bazie – to pytanie nie liczy się do wyniku.");
        setFeedbackTone("neutral");
        // Log as skipped (no translation available)
        await logAnswerEvent(current.id, questionMode, prompt || "", null, answer, "skipped");
        return;
      }

      isCorrect = isCorrectPlEn(answer, expected);
    }

    // Log answer event with evaluation
    const evaluation: "correct" | "wrong" = isCorrect ? "correct" : "wrong";
    await logAnswerEvent(current.id, questionMode, prompt || "", expected || "", answer, evaluation);

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
          term: questionMode === "en-pl" ? current.term_en : current.translation_pl || "",
          expected: expected || "",
          given: answer.trim() || "(pusto)",
          questionMode,
        },
      ]);
    }
  };

  const logAnswerEvent = async (
    userVocabItemId: string,
    questionMode: "en-pl" | "pl-en",
    prompt: string,
    expected: string | null,
    given: string,
    evaluation: "correct" | "wrong" | "skipped" | "invalid"
  ) => {
    if (!profile || !testRunCreated) {
      // Don't log if test_run hasn't been created yet
      console.warn("Cannot log event: test_run not created yet");
      return;
    }

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) return;

      // Determine is_correct based on evaluation
      // correct => is_correct=true
      // wrong => is_correct=false
      // skipped/invalid => is_correct=null
      const isCorrectValue =
        evaluation === "correct" ? true : evaluation === "wrong" ? false : null;

      // Log event with all required fields
      const { error: insertError } = await supabase.from("vocab_answer_events").insert({
        student_id: profile.id,
        test_run_id: testRunId,
        user_vocab_item_id: userVocabItemId,
        question_mode: questionMode,
        prompt: prompt || "", // Ensure non-empty string
        expected: evaluation === "skipped" || evaluation === "invalid" ? null : expected || null,
        given: given.trim() || "(pusto)",
        is_correct: isCorrectValue,
        evaluation,
      });

      if (insertError) {
        console.error("Failed to log answer event:", insertError);
        setEventLogErrors((prev) => prev + 1);
        // Don't block UI on logging errors
      }
    } catch (e) {
      console.error("Failed to log answer event:", e);
      setEventLogErrors((prev) => prev + 1);
      // Don't block UI on logging errors
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

  const questionMode = current?.questionMode || "en-pl";
  const isEnPl = questionMode === "en-pl";
  const promptText = isEnPl ? current?.term_en : current?.translation_pl;
  const placeholderText = isEnPl ? "Twoja odpowiedź (PL)" : "Twoja odpowiedź (EN)";

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Test słówek</h1>
            <p className="text-sm text-white/75">
              Tryb: <span className="font-medium text-white">{isEnPl ? "EN → PL" : "PL → EN"}</span>
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
            <div className="space-y-2">
              <div className="text-xs text-white/60 uppercase tracking-wide">
                {isEnPl ? "Angielski → Polski" : "Polski → Angielski"}
              </div>
              <div className="text-xl font-semibold tracking-tight text-white">{promptText || "—"}</div>
            </div>

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
                placeholder={placeholderText}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={checked}
                autoFocus
              />

              {checked ? (
                <div className={`rounded-2xl border-2 px-4 py-3 text-sm ${pill(feedbackTone)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{feedback}</p>
                    <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold">
                      {feedbackTone === "good" ? "OK" : feedbackTone === "bad" ? "BŁĄD" : "INFO"}
                    </span>
                  </div>

                  {feedbackTone === "bad" && current ? (
                    <p className="mt-2">
                      Poprawna odpowiedź:{" "}
                      <span className="font-medium text-white">
                        {isEnPl ? current.translation_pl || "-" : current.term_en}
                      </span>
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-white/60">
                  {isEnPl
                    ? "Wskazówka: jeśli jest kilka poprawnych tłumaczeń, wpisz jedno z nich (w bazie są oddzielone średnikiem ;)."
                    : "Wpisz dokładnie słówko po angielsku (jak w bazie)."}
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
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium text-white">{m.term}</div>
                      <span className="px-2 py-0.5 rounded-lg border border-white/20 bg-white/10 text-xs text-white/70">
                        {m.questionMode === "en-pl" ? "EN→PL" : "PL→EN"}
                      </span>
                    </div>
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

          {eventLogErrors > 0 && (
            <div className="rounded-2xl border-2 border-amber-400/30 bg-amber-400/10 p-4">
              <p className="text-sm text-amber-100">
                <span className="font-semibold">Uwaga: </span>
                Nie udało się zapisać {eventLogErrors} {eventLogErrors === 1 ? "zdarzenia" : "zdarzeń"} do historii. Wynik testu został zapisany, ale statystyki mogą być niepełne.
              </p>
            </div>
          )}

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

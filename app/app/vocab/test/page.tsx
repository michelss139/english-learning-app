"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";
import { TestItem } from "@/lib/vocab/testLoader";
import { CorrectIcon, WrongIcon } from "@/app/_components/FeedbackIcons";

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
function normalizeSpacing(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function stripDiacritics(value: string) {
  const decomposed = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return decomposed
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ż/g, "z")
    .replace(/ź/g, "z");
}

function normPL(input: string) {
  return stripDiacritics(normalizeSpacing(input));
}

function normEN(input: string) {
  return normalizeSpacing(input);
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
  return "border-slate-200 bg-slate-50 text-slate-700";
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
        const token = session.data.session?.access_token;
        if (!token) return;

        const p = await getOrCreateProfile();
        if (!p) {
          setError("Nie udało się wczytać profilu.");
          return;
        }

        setProfile(p);

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
          setError(
            "Nie znaleziono słówek do testu. Sprawdź, czy zaznaczone słówka istnieją i czy jesteś zalogowany na właściwe konto."
          );
          return;
        }

        // Assign question modes deterministically and shuffle
        const itemsWithModes = assignQuestionModes(testItems, testRunId);
        setItems(shuffle(itemsWithModes));

        // Create test_run record at the start (before events are logged)
        // Check if test_run already exists (e.g., from page refresh)
        const { data: existingRun } = await supabase
          .from("vocab_test_runs")
          .select("id")
          .eq("id", testRunId)
          .maybeSingle();

        if (!existingRun) {
          // Only insert if it doesn't exist
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

  if (loading) {
    return (
      <main className="mx-auto max-w-xl">
        <div className="flex items-center justify-center py-16">
          <div className="text-sm text-slate-500">Ładuję test…</div>
        </div>
      </main>
    );
  }

  const questionMode = current?.questionMode || "en-pl";
  const isEnPl = questionMode === "en-pl";
  const promptText = isEnPl ? current?.term_en : current?.translation_pl;
  const placeholderText = isEnPl ? "Twoja odpowiedź (PL)" : "Twoja odpowiedź (EN)";
  const progress = total > 0 ? (currentIndex / total) * 100 : 0;

  return (
    <main className="mx-auto max-w-xl space-y-5">
      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Test słówek</h1>
        </div>
        <div className="flex gap-2">
          <a
            href="/app/vocab/pool"
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
          >
            ← Trening słówek
          </a>
          <a
            href="/app"
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
          >
            Panel
          </a>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <span className="font-semibold">Błąd: </span>{error}
        </div>
      )}

      {/* Question */}
      {!error && !completed && current && (
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-medium tabular-nums text-slate-400">
              {currentIndex + 1} / {total}
            </span>
          </div>

          {/* Prompt card */}
          <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-6 text-center shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
              {isEnPl ? "Angielski → Polski" : "Polski → Angielski"}
            </p>
            <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">
              {promptText || "—"}
            </p>
          </div>

          {/* Answer form */}
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!checked) checkAnswer();
              else goNext();
            }}
          >
            <input
              className={`w-full rounded-xl border px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${
                checked
                  ? feedbackTone === "good"
                    ? "border-emerald-300 bg-emerald-50"
                    : feedbackTone === "bad"
                    ? "border-rose-300 bg-rose-50"
                    : "border-slate-200 bg-slate-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
              placeholder={placeholderText}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={checked}
              autoFocus
            />

            {/* Feedback */}
            {checked && (
              <div
                className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
                  feedbackTone === "good"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : feedbackTone === "bad"
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <span className="mt-px shrink-0">
                  {feedbackTone === "good" ? (
                    <CorrectIcon size={18} />
                  ) : feedbackTone === "bad" ? (
                    <WrongIcon size={18} />
                  ) : null}
                </span>
                <div>
                  <p className="font-medium">{feedback}</p>
                  {feedbackTone === "bad" && current && (
                    <p className="mt-0.5 text-rose-600">
                      Poprawna odpowiedź:{" "}
                      <span className="font-semibold">
                        {isEnPl ? current.translation_pl || "—" : current.term_en}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {!checked && (
              <p className="text-xs text-slate-400">
                {isEnPl
                  ? "Jeśli jest kilka tłumaczeń, wpisz jedno z nich."
                  : "Wpisz dokładnie słówko po angielsku."}
              </p>
            )}

            <div className="flex items-center justify-between gap-3">
              {checked ? (
                <span className={`text-sm font-semibold ${feedbackTone === "good" ? "text-emerald-700" : "text-rose-700"}`}>
                  {feedbackTone === "good" ? "Dobrze!" : `Poprawnie: ${isEnPl ? current.translation_pl || "—" : current.term_en}`}
                </span>
              ) : (
                <span className="text-xs text-slate-400 tabular-nums">
                  Poprawne: {correctCount}
                </span>
              )}
              <button
                type="submit"
                disabled={!current}
                className="relative inline-flex items-center overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-bold transition hover:brightness-110 disabled:opacity-60"
                style={{ color: "#fff" }}
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                <span className="relative">
                  {checked
                    ? currentIndex === total - 1
                      ? "Wynik →"
                      : "Dalej →"
                    : "Sprawdź"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Results */}
      {!error && completed && (
        <div className="space-y-4">
          {/* Score card */}
          <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-8 text-center shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Wynik testu</p>
            <p className="mt-3 text-5xl" role="img">
              {total > 0 && correctCount / total >= 0.8 ? "🎉" : correctCount / total >= 0.5 ? "💪" : "📚"}
            </p>
            <p className="mt-3 text-4xl font-black tracking-tight text-slate-900">
              {total > 0 ? Math.round((correctCount / total) * 100) : 0}%
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {correctCount} z {total} poprawnych
            </p>
          </div>

          {/* Mistakes */}
          {mistakes.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-800">
              Brak błędów — świetnie!
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
                Twoje błędy
              </p>
              <ul className="space-y-2">
                {mistakes.map((m, idx) => (
                  <li
                    key={`${m.term}-${idx}`}
                    className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <WrongIcon size={16} />
                      <span className="font-semibold text-slate-900">{m.term}</span>
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        {m.questionMode === "en-pl" ? "EN→PL" : "PL→EN"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                      <span>
                        Poprawna:{" "}
                        <span className="font-medium text-emerald-700">{m.expected}</span>
                      </span>
                      <span>
                        Twoja:{" "}
                        <span className="font-medium text-rose-600">{m.given}</span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Save status */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            {saveError
              ? <span className="text-rose-600">Błąd zapisu: {saveError}</span>
              : savingResult
              ? "Zapisuję wynik…"
              : "Wynik zapisany."}
          </div>

          {eventLogErrors > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <span className="font-semibold">Uwaga: </span>
              Nie udało się zapisać {eventLogErrors}{" "}
              {eventLogErrors === 1 ? "zdarzenia" : "zdarzeń"} do historii. Statystyki mogą być niepełne.
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center gap-3">
            <a
              href="/app/vocab/pool"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              ← Trening słówek
            </a>
            <a
              href="/app/vocab"
              className="relative inline-flex items-center overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-bold transition hover:brightness-110"
              style={{ color: "#fff" }}
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
              <span className="relative">Słownictwo →</span>
            </a>
          </div>
        </div>
      )}
    </main>
  );
}

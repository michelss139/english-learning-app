"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";

type Question = {
  id: string;
  prompt: string;
  choices: string[];
  slot?: string;
  explanation?: string | null;
  answer?: string; // filled after scoring
};

export default function VocabClusterPage() {
  return (
    <Suspense fallback={<main>Ładuję…</main>}>
      <VocabClusterInner />
    </Suspense>
  );
}

function VocabClusterInner() {
  const router = useRouter();
  const params = useParams();
  const slug = (params?.slug as string) || "";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [eventLogErrors, setEventLogErrors] = useState(0);

  const current = questions[currentIndex];
  const total = questions.length;

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

        // Load questions
        const res = await fetch(`/api/vocab/clusters/${slug}/questions?limit=10`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          if (res.status === 403) {
            throw new Error("Ten cluster jest zablokowany. Dodaj wszystkie słowa z tego clustera do puli, aby odblokować.");
          }
          throw new Error(errorData.error || "Nie udało się wczytać pytań.");
        }

        const data = await res.json();
        if (!data.ok || !Array.isArray(data.questions)) {
          throw new Error("Nieprawidłowa odpowiedź serwera.");
        }

        if (data.questions.length === 0) {
          setError("Brak dostępnych pytań dla tego clustera.");
          return;
        }

        setQuestions(data.questions);
      } catch (e: any) {
        setError(e?.message ?? "Nie udało się wczytać pytań.");
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, slug]);

  const checkAnswer = async (choice: string) => {
    if (!current || checked) return;

    setSelectedChoice(choice);

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error("Brak sesji użytkownika.");
      }
      const token = session.data.session.access_token;

      const res = await fetch(`/api/vocab/clusters/${slug}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questionId: current.id, chosen: choice }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        throw new Error(errorData.message || "Nie udało się sprawdzić odpowiedzi.");
      }

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.message || "Nie udało się sprawdzić odpowiedzi.");
      }

      const isCorrect: boolean = !!data.isCorrect;
      const correctAnswer: string = data.correct_choice;

      if (isCorrect) {
        setCorrectCount((c) => c + 1);
      }

      // Store correct answer in questions state for UI feedback
      setQuestions((prev) =>
        prev.map((q) => (q.id === current.id ? { ...q, answer: correctAnswer } : q))
      );

      setChecked(true);
    } catch (e: any) {
      console.error("[cluster] checkAnswer error:", e);
      setEventLogErrors((prev) => prev + 1);
      setChecked(true);
    }
  };

  const goNext = () => {
    if (currentIndex >= total - 1) {
      setCompleted(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedChoice(null);
    setChecked(false);
  };

  if (loading) return <main>Ładuję…</main>;

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Cluster: {slug.replace(/-/g, " / ")}</h1>
            <p className="text-sm text-white/75">Wybierz właściwe słowo w kontekście.</p>
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

          <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 space-y-4">
            <div className="text-lg font-medium text-white">{current.prompt}</div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {current.choices.map((choice) => {
                const isSelected = selectedChoice === choice;
                const isCorrect = current.answer ? choice === current.answer : false;
                const showFeedback = checked && isSelected;

                let buttonClass =
                  "rounded-xl border-2 px-4 py-3 text-sm font-medium transition disabled:opacity-60";
                if (checked) {
                  if (isCorrect) {
                    buttonClass += " border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
                  } else if (isSelected) {
                    buttonClass += " border-rose-400/30 bg-rose-400/10 text-rose-100";
                  } else {
                    buttonClass += " border-white/10 bg-white/5 text-white/50";
                  }
                } else {
                  buttonClass += " border-white/15 bg-white/10 text-white hover:bg-white/15";
                }

                return (
                  <button
                    key={choice}
                    onClick={() => checkAnswer(choice)}
                    disabled={checked}
                    className={buttonClass}
                  >
                    {choice}
                    {showFeedback && isCorrect && " ✓"}
                    {showFeedback && !isCorrect && " ✗"}
                  </button>
                );
              })}
            </div>

            {checked && (
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-white/75">
                    {current.answer
                      ? selectedChoice === current.answer
                        ? "Poprawnie!"
                        : `Poprawna odpowiedź: ${current.answer}`
                      : "Sprawdź kolejne pytanie."}
                  </p>
                  {current.explanation ? (
                    <p className="text-sm text-white/65">{current.explanation}</p>
                  ) : null}
                </div>
                <button
                  className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
                  onClick={goNext}
                >
                  {currentIndex === total - 1 ? "Zakończ" : "Dalej"}
                </button>
              </div>
            )}
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

          {eventLogErrors > 0 && (
            <div className="rounded-2xl border-2 border-amber-400/30 bg-amber-400/10 p-4">
              <p className="text-sm text-amber-100">
                <span className="font-semibold">Uwaga: </span>
                Nie udało się zapisać {eventLogErrors} {eventLogErrors === 1 ? "zdarzenia" : "zdarzeń"} do historii.
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

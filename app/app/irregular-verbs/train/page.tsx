"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";

type Verb = {
  id: string;
  base: string;
  past_simple: string;
  past_simple_variants: string[];
  past_participle: string;
  past_participle_variants: string[];
};

type SubmitResult = {
  correct: boolean;
  past_simple_correct: boolean;
  past_participle_correct: boolean;
  correct_past_simple: string;
  correct_past_participle: string;
  entered_past_simple: string;
  entered_past_participle: string;
};

function pill(tone: "neutral" | "good" | "bad") {
  if (tone === "good") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  if (tone === "bad") return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  return "border-white/15 bg-white/5 text-white/80";
}

export default function IrregularVerbsTrainPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentVerb, setCurrentVerb] = useState<Verb | null>(null);
  const [pastSimple, setPastSimple] = useState("");
  const [pastParticiple, setPastParticiple] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    const run = async () => {
      try {
        const session = await supabase.auth.getSession();
        if (!session?.data?.session) {
          router.push("/login");
          return;
        }

        const prof = await getOrCreateProfile();
        setProfile(prof);

        await loadNextVerb();
      } catch (e: any) {
        setError(e?.message ?? "Błąd ładowania");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [router]);

  const loadNextVerb = async () => {
    try {
      setError("");
      setResult(null);
      setPastSimple("");
      setPastParticiple("");

      const sess = await supabase.auth.getSession();
      const token = sess?.data?.session?.access_token;

      if (!token) {
        setError("Brak sesji. Zaloguj się ponownie.");
        return;
      }

      const res = await fetch("/api/irregular-verbs/next", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ exclude_ids: usedIds }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        if (res.status === 400 && errorData.error?.includes("No pinned")) {
          setError("Brak przypiętych czasowników. Wróć do listy i przypnij kilka czasowników.");
        } else if (res.status === 400 && errorData.error?.includes("All pinned verbs have been excluded")) {
          // Reset exclude_ids and retry once
          setUsedIds([]);
          // Retry with empty exclude_ids
          const retryRes = await fetch("/api/irregular-verbs/next", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ exclude_ids: [] }),
          });

          if (!retryRes.ok) {
            const retryErrorData = await retryRes.json().catch(() => ({ error: "Unknown error" }));
            throw new Error(retryErrorData.error || `HTTP ${retryRes.status}`);
          }

          const verb: Verb = await retryRes.json();
          setCurrentVerb(verb);
          setUsedIds([verb.id]);
          return;
        } else {
          throw new Error(errorData.error || `HTTP ${res.status}`);
        }
        return;
      }

      const verb: Verb = await res.json();
      setCurrentVerb(verb);
      setUsedIds((prev) => [...prev, verb.id]);
    } catch (e: any) {
      setError(e?.message ?? "Błąd ładowania czasownika");
    }
  };

  const handleSubmit = async () => {
    if (!currentVerb || submitting) return;

    if (!pastSimple.trim() || !pastParticiple.trim()) {
      setError("Wypełnij oba pola");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const sess = await supabase.auth.getSession();
      const token = sess?.data?.session?.access_token;

      if (!token) {
        setError("Brak sesji. Zaloguj się ponownie.");
        return;
      }

      const res = await fetch("/api/irregular-verbs/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          verb_id: currentVerb.id,
          entered_past_simple: pastSimple.trim(),
          entered_past_participle: pastParticiple.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const submitResult: SubmitResult = await res.json();
      setResult(submitResult);
      setStats((prev) => ({
        correct: prev.correct + (submitResult.correct ? 1 : 0),
        total: prev.total + 1,
      }));
    } catch (e: any) {
      setError(e?.message ?? "Błąd sprawdzania odpowiedzi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    loadNextVerb();
  };

  if (loading) return <main>Ładuję…</main>;

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Test czasowników nieregularnych</h1>
            <p className="text-sm text-white/75">
              Poprawne: <span className="font-medium text-white">{stats.correct}</span> / {stats.total}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
              href="/app/irregular-verbs"
            >
              ← Lista
            </a>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4 text-rose-100">
          {error}
        </div>
      ) : null}

      {currentVerb ? (
        <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="text-4xl font-bold text-white">{currentVerb.base}</div>
            <div className="text-sm text-white/60">Podaj formy czasownika</div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Past Simple</label>
              <input
                type="text"
                value={pastSimple}
                onChange={(e) => setPastSimple(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !result) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                disabled={!!result || submitting}
                className="w-full rounded-xl border-2 border-white/10 bg-black/10 px-4 py-3 text-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30 disabled:opacity-60"
                placeholder="np. went"
                autoFocus
              />
              {result && (
                <div className={`mt-2 rounded-xl border-2 p-3 ${pill(result.past_simple_correct ? "good" : "bad")}`}>
                  {result.past_simple_correct ? (
                    <span>✓ Poprawnie: {result.correct_past_simple}</span>
                  ) : (
                    <span>
                      ✗ Źle. Poprawna odpowiedź: <strong>{result.correct_past_simple}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Past Participle</label>
              <input
                type="text"
                value={pastParticiple}
                onChange={(e) => setPastParticiple(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !result) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                disabled={!!result || submitting}
                className="w-full rounded-xl border-2 border-white/10 bg-black/10 px-4 py-3 text-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/30 disabled:opacity-60"
                placeholder="np. gone"
              />
              {result && (
                <div className={`mt-2 rounded-xl border-2 p-3 ${pill(result.past_participle_correct ? "good" : "bad")}`}>
                  {result.past_participle_correct ? (
                    <span>✓ Poprawnie: {result.correct_past_participle}</span>
                  ) : (
                    <span>
                      ✗ Źle. Poprawna odpowiedź: <strong>{result.correct_past_participle}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {result ? (
            <div className="space-y-3">
              <div className={`rounded-xl border-2 p-4 text-center ${pill(result.correct ? "good" : "bad")}`}>
                <div className="text-lg font-semibold">
                  {result.correct ? "✓ Wszystko poprawne!" : "✗ Spróbuj ponownie"}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-xl border-2 border-white/15 bg-white/10 px-4 py-3 font-medium text-white hover:bg-white/15 transition"
                  onClick={handleNext}
                >
                  Następny czasownik
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-xl border-2 border-emerald-400/30 bg-emerald-400/10 px-4 py-3 font-medium text-emerald-100 hover:bg-emerald-400/20 transition disabled:opacity-60"
                onClick={handleSubmit}
                disabled={submitting || !pastSimple.trim() || !pastParticiple.trim()}
              >
                {submitting ? "Sprawdzam…" : "Sprawdź"}
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-6 text-center text-white/60">
          Brak czasowników do treningu. Wróć do listy i przypnij kilka czasowników.
        </section>
      )}
    </main>
  );
}

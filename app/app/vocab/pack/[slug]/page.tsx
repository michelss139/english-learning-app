"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type PackMeta = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
};

type PackItem = {
  id: string;
  sense_id: string;
  lemma: string | null;
  translation_pl: string | null;
  example_en: string | null;
  definition_en: string | null;
  order_index: number;
};

type AnswerState = {
  given: string;
  expected: string | null;
  isCorrect: boolean;
};

type AwardBadge = {
  slug: string;
  title: string;
  description: string | null;
};

type AwardResult = {
  xp_awarded: number;
  xp_total: number;
  level: number;
  xp_in_current_level: number;
  xp_to_next_level: number;
  newly_awarded_badges: AwardBadge[];
};

type RecommendationItem = {
  sense_id: string;
  lemma: string | null;
  translation_pl: string | null;
  example_en: string | null;
  definition_en: string | null;
};

type Direction = "en-pl" | "pl-en" | "mix";
type CountChoice = "5" | "10" | "all";

function shuffleArray<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function VocabPackPage() {
  return (
    <Suspense fallback={<main>Ładuję…</main>}>
      <VocabPackInner />
    </Suspense>
  );
}

function VocabPackInner() {
  const router = useRouter();
  const params = useParams();
  const slug = (params?.slug as string) || "";

  const [pack, setPack] = useState<PackMeta | null>(null);
  const [allItems, setAllItems] = useState<PackItem[]>([]);
  const [sessionItems, setSessionItems] = useState<PackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [direction, setDirection] = useState<Direction>("en-pl");
  const [countChoice, setCountChoice] = useState<CountChoice>("all");
  const [started, setStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [completed, setCompleted] = useState(false);
  const [sessionDirections, setSessionDirections] = useState<Record<string, "en-pl" | "pl-en">>({});

  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [addStatus, setAddStatus] = useState("");
  const [adding, setAdding] = useState(false);
  const [award, setAward] = useState<AwardResult | null>(null);
  const [xpAlreadyAwarded, setXpAlreadyAwarded] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [awardError, setAwardError] = useState("");
  const [awardedSessionId, setAwardedSessionId] = useState("");

  const current = sessionItems[currentIndex];
  const currentDirection =
    direction === "mix" ? sessionDirections[current?.sense_id ?? ""] ?? "en-pl" : direction;
  const currentAnswer = current ? answers[current.sense_id] : null;
  const checked = !!currentAnswer;

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        setCompleted(false);
        setRecommendations([]);
        setAddStatus("");

        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          router.push("/login");
          return;
        }

        const token = session.data.session.access_token;
        const res = await fetch(`/api/vocab/packs/${slug}/items`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(errorData.error || "Nie udało się wczytać packa.");
        }

        const data = await res.json();
        if (!data.ok || !Array.isArray(data.items) || !data.pack) {
          throw new Error("Nieprawidłowa odpowiedź serwera.");
        }

        setPack(data.pack);
        setAllItems(data.items);
        setSessionItems([]);
        setStarted(false);
        setCurrentIndex(0);
        setAnswers({});
        setInput("");
        setSessionDirections({});
        setAward(null);
        setAwardError("");
        setAwardedSessionId("");
        setXpAlreadyAwarded(false);
      } catch (e: any) {
        setError(e?.message ?? "Nie udało się wczytać packa.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [router, slug]);

  useEffect(() => {
    if (!current) return;
    const existing = answers[current.sense_id];
    setInput(existing?.given ?? "");
  }, [current?.sense_id, answers]);

  const total = sessionItems.length;
  const progress = useMemo(() => Object.keys(answers).length, [answers]);
  const correctCount = useMemo(
    () => sessionItems.filter((item) => answers[item.sense_id]?.isCorrect).length,
    [answers, sessionItems]
  );
  const percentCorrect = useMemo(() => {
    if (progress === 0) return 0;
    return Math.round((correctCount / progress) * 100);
  }, [correctCount, progress]);

  const startSession = (itemsOverride?: PackItem[]) => {
    if (allItems.length === 0 && !itemsOverride) {
      setError("Brak fiszek w tym packu.");
      return;
    }

    const source = itemsOverride ?? allItems;
    let selection = shuffleArray(source);

    if (!itemsOverride && countChoice !== "all") {
      const size = countChoice === "5" ? 5 : 10;
      selection = selection.slice(0, Math.min(size, selection.length));
    }

    setSessionItems(selection);
    setSessionId(createSessionId());
    setAnswers({});
    setInput("");
    setSessionDirections(
      direction === "mix"
        ? selection.reduce<Record<string, "en-pl" | "pl-en">>((acc, item) => {
            acc[item.sense_id] = Math.random() < 0.5 ? "en-pl" : "pl-en";
            return acc;
          }, {})
        : {}
    );
    setCurrentIndex(0);
    setCompleted(false);
    setRecommendations([]);
    setAddStatus("");
    setAward(null);
    setAwardError("");
    setAwardedSessionId("");
    setXpAlreadyAwarded(false);
    setStarted(true);
  };

  const checkAnswer = async () => {
    if (!current || checked) return;
    if (!input.trim()) {
      setError("Wpisz tłumaczenie.");
      return;
    }

    try {
      setError("");
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        router.push("/login");
        return;
      }

      const token = session.data.session.access_token;
      const res = await fetch(`/api/vocab/packs/${slug}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sense_id: current.sense_id,
          given: input,
          direction: currentDirection,
          session_id: sessionId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorData.error || "Nie udało się sprawdzić odpowiedzi.");
      }

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.message || "Nie udało się sprawdzić odpowiedzi.");
      }

      setAnswers((prev) => ({
        ...prev,
        [current.sense_id]: {
          given: input,
          expected: data.expected ?? null,
          isCorrect: !!data.isCorrect,
        },
      }));
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się sprawdzić odpowiedzi.");
    }
  };

  const goNext = () => {
    if (currentIndex >= total - 1) {
      setCompleted(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
  };

  const goPrev = () => {
    if (currentIndex <= 0) return;
    setCurrentIndex((i) => i - 1);
  };

  useEffect(() => {
    const loadRecommendations = async () => {
      if (!completed || !sessionId) return;
      try {
        setLoadingRecs(true);
        setError("");

        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          router.push("/login");
          return;
        }

        const token = session.data.session.access_token;
        const res = await fetch(`/api/vocab/packs/${slug}/recommendations?sessionId=${sessionId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(errorData.error || "Nie udało się wczytać rekomendacji.");
        }

        const data = await res.json();
        if (!data.ok || !Array.isArray(data.items)) {
          throw new Error("Nieprawidłowa odpowiedź serwera.");
        }

        setRecommendations(data.items);
      } catch (e: any) {
        setError(e?.message ?? "Nie udało się wczytać rekomendacji.");
      } finally {
        setLoadingRecs(false);
      }
    };

    void loadRecommendations();
  }, [completed, router, slug, sessionId]);

  useEffect(() => {
    const awardXp = async () => {
      if (!completed || !sessionId) return;
      if (awardedSessionId === sessionId) return;

      try {
        setAwarding(true);
        setAwardError("");

        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          router.push("/login");
          return;
        }

        const token = session.data.session.access_token;
        const res = await fetch(`/api/vocab/packs/${slug}/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            session_id: sessionId,
            direction,
            count_mode: countChoice,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(errorData.error || "Nie udało się przyznać XP.");
        }

        const data = await res.json();
        if (!data.ok) {
          throw new Error(data.error || "Nie udało się przyznać XP.");
        }

        setAward({
          xp_awarded: data.xp_awarded ?? 0,
          xp_total: data.xp_total ?? 0,
          level: data.level ?? 0,
          xp_in_current_level: data.xp_in_current_level ?? 0,
          xp_to_next_level: data.xp_to_next_level ?? 0,
          newly_awarded_badges: data.newly_awarded_badges ?? [],
        });
        setXpAlreadyAwarded((data.xp_awarded ?? 0) === 0);
        setAwardedSessionId(sessionId);
      } catch (e: any) {
        setAwardError(e?.message ?? "Nie udało się przyznać XP.");
      } finally {
        setAwarding(false);
      }
    };

    void awardXp();
  }, [awardedSessionId, completed, countChoice, direction, router, sessionId, slug]);

  const wrongItems = useMemo(
    () => sessionItems.filter((item) => answers[item.sense_id]?.isCorrect === false),
    [answers, sessionItems]
  );

  const addRecommendations = async () => {
    if (recommendations.length === 0) return;
    try {
      setAdding(true);
      setAddStatus("");
      setError("");

      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        router.push("/login");
        return;
      }

      const token = session.data.session.access_token;
      const res = await fetch("/api/vocab/add-words", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sense_ids: recommendations.map((r) => r.sense_id) }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorData.error || "Nie udało się dodać słówek.");
      }

      const data = await res.json();
      if (!data.ok) {
        throw new Error("Nie udało się dodać słówek.");
      }

      setAddStatus(`Dodano do puli: ${data.added ?? 0}`);
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się dodać słówek.");
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <main>Ładuję…</main>;

  if (!started) {
    return (
      <main className="space-y-6">
        <header className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-white">Pack: {pack?.title ?? slug}</h1>
              <p className="text-sm text-white/75">{pack?.description ?? "Ćwicz szybkie tłumaczenia."}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
                href="/app/vocab/packs"
              >
                ← Lista packów
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

        <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">Ustawienia sesji</h2>
            <p className="text-sm text-white/75">Wybierz kierunek i liczbę fiszek.</p>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-white/70">Kierunek</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDirection("en-pl")}
                className={`rounded-xl border-2 px-3 py-2 text-sm font-medium transition ${
                  direction === "en-pl"
                    ? "border-white/20 bg-white/15 text-white"
                    : "border-white/12 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                ENG → PL
              </button>
              <button
                type="button"
                onClick={() => setDirection("pl-en")}
                className={`rounded-xl border-2 px-3 py-2 text-sm font-medium transition ${
                  direction === "pl-en"
                    ? "border-white/20 bg-white/15 text-white"
                    : "border-white/12 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                PL → ENG
              </button>
              <button
                type="button"
                onClick={() => setDirection("mix")}
                className={`rounded-xl border-2 px-3 py-2 text-sm font-medium transition ${
                  direction === "mix"
                    ? "border-white/20 bg-white/15 text-white"
                    : "border-white/12 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                MIX
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-white/70">Liczba fiszek</div>
            <div className="flex flex-wrap gap-2">
              {(["5", "10", "all"] as CountChoice[]).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setCountChoice(choice)}
                  className={`rounded-xl border-2 px-3 py-2 text-sm font-medium transition ${
                    countChoice === choice
                      ? "border-white/20 bg-white/15 text-white"
                      : "border-white/12 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {choice === "all" ? "Wszystkie" : choice}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => startSession()}
            className="rounded-xl border-2 border-emerald-400/30 bg-emerald-400/10 px-4 py-2 font-medium text-emerald-100 hover:bg-emerald-400/20 transition"
          >
            Start
          </button>
        </section>
      </main>
    );
  }

  if (completed) {
    return (
      <main className="space-y-6">
        <header className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-white">Pack: {pack?.title ?? slug}</h1>
              <p className="text-sm text-white/75">Rekomendacje na podstawie Twoich odpowiedzi.</p>
            </div>
            <a
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
              href="/app/vocab/packs"
            >
              ← Lista packów
            </a>
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

        <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-4">
          <div className="flex items-center justify-between text-sm text-white/75">
            <span>
              Poprawne: <span className="font-medium text-white">{correctCount}</span>/{total}
            </span>
            <span>
              Skuteczność: <span className="font-medium text-white">{total ? Math.round((correctCount / total) * 100) : 0}%</span>
            </span>
          </div>

          <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 space-y-2">
            <div className="text-sm text-white/75">Postęp XP</div>
            {award ? (
              <div className="space-y-1 text-sm text-white/80">
                {xpAlreadyAwarded ? (
                  <div className="text-amber-100">
                    Już dostałeś XP za to ćwiczenie dziś. Wróć jutro, lub spróbuj innych ćwiczeń, aby dostać więcej XP!
                  </div>
                ) : (
                  <div>
                    Zdobyte XP: <span className="font-medium text-white">+{award.xp_awarded}</span>
                  </div>
                )}
                <div>
                  Poziom: <span className="font-medium text-white">{award.level}</span> · XP w poziomie:{" "}
                  <span className="font-medium text-white">
                    {award.xp_in_current_level}/{award.xp_to_next_level}
                  </span>
                </div>
              </div>
            ) : awarding ? (
              <div className="text-sm text-white/60">Przyznaję XP…</div>
            ) : awardError ? (
              <div className="text-sm text-rose-200">{awardError}</div>
            ) : (
              <div className="text-sm text-white/60">Brak danych o XP.</div>
            )}
          </div>

          {award?.newly_awarded_badges?.length ? (
            <div className="rounded-2xl border-2 border-amber-400/30 bg-amber-400/10 p-4 space-y-2">
              <div className="text-sm font-semibold text-amber-100">Nowe odznaki</div>
              {award.newly_awarded_badges.map((badge) => (
                <div key={badge.slug} className="text-sm text-amber-100">
                  {badge.title}
                  {badge.description ? ` — ${badge.description}` : ""}
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">Dodaj do mojej puli</h2>
              <p className="text-sm text-white/75">Słówka, które sprawiły trudność w tym packu.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 transition disabled:opacity-60"
                onClick={() => startSession(sessionItems)}
                disabled={sessionItems.length === 0}
              >
                Jeszcze raz to samo
              </button>
              <button
                className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 transition disabled:opacity-60"
                onClick={() => startSession(wrongItems)}
                disabled={wrongItems.length === 0}
              >
                Jeszcze raz tylko złe
              </button>
              <button
                className="rounded-xl border-2 border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-400/20 transition disabled:opacity-60"
                onClick={addRecommendations}
                disabled={adding || recommendations.length === 0}
              >
                {adding ? "Dodaję..." : "Dodaj do mojej puli"}
              </button>
            </div>
          </div>

          {addStatus ? (
            <div className="rounded-2xl border-2 border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
              {addStatus}
            </div>
          ) : null}

          {loadingRecs ? <div className="text-sm text-white/75">Ładuję rekomendacje…</div> : null}

          {!loadingRecs && recommendations.length === 0 ? (
            <div className="text-sm text-white/75">Brak rekomendacji — świetna robota!</div>
          ) : null}

          <div className="space-y-3">
            {recommendations.map((item) => (
              <div key={item.sense_id} className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
                <div className="text-lg font-semibold text-white">{item.lemma ?? "—"}</div>
                <div className="text-sm text-white/70">{item.translation_pl ?? "—"}</div>
                {item.example_en ? (
                  <div className="text-sm text-white/70 italic">"{item.example_en}"</div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <header className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Pack: {pack?.title ?? slug}</h1>
            <p className="text-sm text-white/75">{pack?.description ?? "Ćwicz szybkie tłumaczenia."}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
              href="/app/vocab/packs"
            >
              ← Lista packów
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

      {current ? (
        <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-4">
          <div className="flex items-center justify-between text-sm text-white/75">
            <span>
              Fiszka <span className="font-medium text-white">{currentIndex + 1}</span>/{total}
            </span>
            <span>
              Postęp: <span className="font-medium text-white">{progress}</span>/{total} ·{" "}
              <span className="font-medium text-white">{percentCorrect}%</span>
            </span>
          </div>

          <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-4 space-y-4">
            <div className="text-lg font-medium text-white">
              {currentDirection === "en-pl" ? current.lemma ?? "—" : current.translation_pl ?? "—"}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/70">
                {currentDirection === "en-pl" ? "Tłumaczenie (PL)" : "Odpowiedź (ENG)"}
              </label>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={currentDirection === "en-pl" ? "Wpisz tłumaczenie..." : "Wpisz słowo po angielsku..."}
                className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 outline-none text-white placeholder:text-white/40"
                disabled={checked}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (!checked) {
                    void checkAnswer();
                  } else {
                    goNext();
                  }
                }}
              />
            </div>

            {checked ? (
              <div className="space-y-2">
                <p className={`text-sm ${currentAnswer?.isCorrect ? "text-emerald-200" : "text-rose-200"}`}>
                  {currentAnswer?.isCorrect ? "Poprawnie!" : "Błędna odpowiedź."}
                </p>
                <p className="text-sm text-white/75">
                  Poprawna odpowiedź: <span className="text-white">{currentAnswer?.expected ?? "—"}</span>
                </p>
                {current.definition_en ? (
                  <p className="text-sm text-white/60">{current.definition_en}</p>
                ) : null}
                {current.example_en ? <p className="text-sm text-white/60 italic">"{current.example_en}"</p> : null}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition disabled:opacity-60"
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                >
                  Wstecz
                </button>
                <button
                  className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition disabled:opacity-60"
                  onClick={goNext}
                  disabled={!checked}
                >
                  {currentIndex === total - 1 ? "Zakończ" : "Dalej"}
                </button>
              </div>
              <button
                className="rounded-xl border-2 border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-100 hover:bg-sky-400/20 transition disabled:opacity-60"
                onClick={checkAnswer}
                disabled={checked}
              >
                Sprawdź
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5">
          <div className="text-sm text-white/75">Brak fiszek w tym packu.</div>
        </section>
      )}
    </main>
  );
}

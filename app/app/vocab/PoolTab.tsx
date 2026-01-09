"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type PoolRow = {
  global_vocab_item_id: string;
  term_en: string;
  term_en_norm: string;

  translation_pl_suggested: string | null;

  // open data example (legacy field)
  example_en: string | null;

  // new fields
  example_en_manual: string | null;
  example_en_ai: string | null;

  ipa: string | null;
  audio_url: string | null;
};

type ActiveTest = {
  term: string;
  term_norm: string;
  masked: string;
  correct: string;
  options: string[];
  source: "manual" | "ai" | "open" | null;
};

export default function PoolTab() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingNorm, setLoadingNorm] = useState<string | null>(null);
  const [loadingAiNorm, setLoadingAiNorm] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  const [q, setQ] = useState("");
  const [rows, setRows] = useState<PoolRow[]>([]);

  const [activeTest, setActiveTest] = useState<ActiveTest | null>(null);
  const [answerResult, setAnswerResult] = useState<"ok" | "bad" | null>(null);
  const [logging, setLogging] = useState(false);

  // term_en_norm -> czy pokazać sugestię powtórki
  const [repeatSet, setRepeatSet] = useState<Set<string>>(new Set());

  async function fetchRepeatSuggestions(token: string): Promise<Set<string>> {
    const res = await fetch("/api/vocab/repeat-suggestions", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const ct = res.headers.get("content-type") ?? "";
    const payload = ct.includes("application/json")
      ? await res.json().catch(() => null)
      : await res.text().catch(() => "");

    if (!res.ok) {
      const msg = typeof payload === "string" ? payload : payload?.error ?? JSON.stringify(payload);
      throw new Error(`repeat-suggestions HTTP ${res.status}: ${msg}`);
    }

    const terms = (payload?.terms ?? []) as unknown;
    const arr = Array.isArray(terms) ? (terms as string[]) : [];

    return new Set(arr.filter(Boolean));
  }

  async function load() {
    try {
      setLoading(true);
      setError("");

      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        router.push("/login");
        return;
      }

      const token = sess.session.access_token;
      const userId = sess.session.user.id;

      // 1) dociągnij repeat suggestions (oddzielnie, tanio)
      // Jeśli coś pójdzie nie tak, NIE blokujemy całej puli — pokażemy błąd tylko w konsoli
      try {
        const s = await fetchRepeatSuggestions(token);
        setRepeatSet(s);
      } catch (e) {
        console.warn("repeat-suggestions failed:", e);
        setRepeatSet(new Set());
      }

      // 2) dociągnij pulę słów (z filtrowaniem po student_id dla bezpieczeństwa)
      const { data: links, error: linkErr } = await supabase
        .from("user_vocab")
        .select("global_vocab_item_id, global_vocab_items(term_en, term_en_norm)")
        .eq("student_id", userId)
        .order("created_at", { ascending: false });

      if (linkErr) throw linkErr;

      const items = (links ?? [])
        .map((x: any) => ({
          global_vocab_item_id: x.global_vocab_item_id as string,
          term_en: x.global_vocab_items?.term_en as string,
          term_en_norm: x.global_vocab_items?.term_en_norm as string,
        }))
        .filter((x) => x.term_en_norm);

      const qn = q.trim().toLowerCase();
      const filtered = qn ? items.filter((it) => it.term_en_norm.includes(qn)) : items;

      const norms = filtered.map((it) => it.term_en_norm);

      let enrichByNorm: Record<string, any> = {};
      if (norms.length) {
        const { data: enrich, error: enrichErr } = await supabase
          .from("vocab_enrichments")
          .select("term_en_norm, translation_pl_suggested, example_en, example_en_manual, example_en_ai, ipa, audio_url")
          .in("term_en_norm", norms);

        if (enrichErr) throw enrichErr;

        enrichByNorm = Object.fromEntries((enrich ?? []).map((e: any) => [e.term_en_norm, e]));
      }

      const merged: PoolRow[] = filtered.map((it) => {
        const e = enrichByNorm[it.term_en_norm] ?? null;
        return {
          global_vocab_item_id: it.global_vocab_item_id,
          term_en: it.term_en,
          term_en_norm: it.term_en_norm,
          translation_pl_suggested: e?.translation_pl_suggested ?? null,
          example_en: e?.example_en ?? null,
          example_en_manual: e?.example_en_manual ?? null,
          example_en_ai: e?.example_en_ai ?? null,
          ipa: e?.ipa ?? null,
          audio_url: e?.audio_url ?? null,
        };
      });

      setRows(merged);
    } catch (e: any) {
      setError(e?.message ?? "Nieznany błąd ładowania puli.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    await load();
  }

  async function enrichOpenData(term_en: string, term_en_norm: string) {
    try {
      setLoadingNorm(term_en_norm);

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/vocab/enrich", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ term_en }),
      });

      const ct = res.headers.get("content-type") ?? "";
      const payload = ct.includes("application/json")
        ? await res.json().catch(() => null)
        : await res.text().catch(() => "");

      if (!res.ok) {
        const msg = typeof payload === "string" ? payload : payload?.error ?? JSON.stringify(payload);
        throw new Error(`enrich HTTP ${res.status}: ${msg}`);
      }

      await load();
    } catch (e: any) {
      alert(e?.message ?? "Błąd enrich (open data).");
    } finally {
      setLoadingNorm(null);
    }
  }

  async function generateAiExample(term_en: string, term_en_norm: string) {
    try {
      setLoadingAiNorm(term_en_norm);

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/vocab/generate-example", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          term_en,
          level: "A2",
          style: "daily",
          force: false,
        }),
      });

      const ct = res.headers.get("content-type") ?? "";
      const payload = ct.includes("application/json")
        ? await res.json().catch(() => null)
        : await res.text().catch(() => "");

      if (!res.ok) {
        const msg = typeof payload === "string" ? payload : payload?.error ?? JSON.stringify(payload);
        throw new Error(`AI HTTP ${res.status}: ${msg}`);
      }

      await load();
    } catch (e: any) {
      alert(e?.message ?? "Błąd generowania AI.");
    } finally {
      setLoadingAiNorm(null);
    }
  }

  async function buildGapTest(term: string, term_norm: string, source: ActiveTest["source"]) {
    try {
      setAnswerResult(null);

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/vocab/build-gap-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ term_en: term }),
      });

      const responseData = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = responseData?.error ?? `HTTP ${res.status}`;
        throw new Error(msg);
      }

      if (!responseData?.masked || !responseData?.correct || !Array.isArray(responseData?.options)) {
        throw new Error("Niepoprawna odpowiedź z /api/vocab/build-gap-test");
      }

      setActiveTest({
        term,
        term_norm,
        masked: responseData.masked,
        correct: responseData.correct,
        options: responseData.options,
        source,
      });

      setAnswerResult(null);
    } catch (e: any) {
      alert(e?.message ?? "Błąd testu luki");
    }
  }

  async function logExercise(params: {
    term_en_norm: string;
    correct: boolean;
    chosen: string;
    masked: string;
    source: ActiveTest["source"];
  }) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      router.push("/login");
      return;
    }

    const res = await fetch("/api/vocab/log-exercise", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mode: "gap",
        term_en_norm: params.term_en_norm,
        correct: params.correct,
        chosen: params.chosen,
        masked: params.masked,
        source: params.source,
      }),
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(payload?.error ?? `log HTTP ${res.status}`);
    }
  }

  function playAudio(url: string | null) {
    if (!url) return;
    const audio = new Audio(url);
    audio.play().catch(() => {});
  }

  function pickBestExample(r: PoolRow): { label: string; text: string | null; source: ActiveTest["source"] } {
    if (r.example_en_manual) return { label: "Przykład (manual)", text: r.example_en_manual, source: "manual" };
    if (r.example_en_ai) return { label: "Przykład (AI)", text: r.example_en_ai, source: "ai" };
    if (r.example_en) return { label: "Przykład (open data)", text: r.example_en, source: "open" };
    return { label: "Przykład", text: null, source: null };
  }

  const content = useMemo(() => rows, [rows]);

  return (
    <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">Cała pula</h2>
        <p className="text-sm text-white/75">
          Manual → AI cache → open data. AI generuje tylko raz i potem jest używane w testach bez kosztu.
        </p>
      </div>

      <form onSubmit={onSearchSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Szukaj w puli (np. go, take, flow...)"
          className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 outline-none text-white placeholder:text-white/40"
        />
        <button
          type="submit"
          className="rounded-xl border-2 border-white/15 bg-white/10 px-5 py-3 font-medium text-white hover:bg-white/15 transition"
        >
          Szukaj
        </button>
      </form>

      {loading ? <div className="text-sm text-white/75">Ładuję…</div> : null}

      {error ? (
        <div className="rounded-2xl border-2 border-rose-400/30 bg-rose-400/10 p-4">
          <p className="text-sm text-rose-100">
            <span className="font-semibold">Błąd: </span>
            {error}
          </p>
        </div>
      ) : null}

      {activeTest ? (
        <div className="rounded-3xl border-2 border-emerald-400/30 bg-emerald-400/10 p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm text-emerald-100 font-semibold">Ćwiczenie – uzupełnij lukę</div>
              <div className="text-xs text-white/70">
                Słowo: <span className="font-medium text-white">{activeTest.term}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveTest(null);
                setAnswerResult(null);
              }}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition"
            >
              Zamknij
            </button>
          </div>

          <div className="text-lg text-white font-medium">{activeTest.masked}</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeTest.options.map((opt) => {
              const disabled = logging || answerResult !== null;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={disabled}
                  onClick={async () => {
                    if (!activeTest) return;

                    const isCorrect = opt === activeTest.correct;

                    try {
                      setLogging(true);
                      await logExercise({
                        term_en_norm: activeTest.term_norm,
                        correct: isCorrect,
                        chosen: opt,
                        masked: activeTest.masked,
                        source: activeTest.source,
                      });
                    } catch (e: any) {
                      alert(e?.message ?? "Błąd zapisu progresu.");
                    } finally {
                      setLogging(false);
                    }

                    setAnswerResult(isCorrect ? "ok" : "bad");
                  }}
                  className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-3 text-white hover:bg-white/15 transition disabled:opacity-60"
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {answerResult === "ok" ? <div className="text-emerald-300 font-semibold">Dobrze!</div> : null}

          {answerResult === "bad" ? (
            <div className="text-rose-300 font-semibold">
              Błędna odpowiedź. Poprawna: <span className="text-white">{activeTest.correct}</span>
            </div>
          ) : null}

          {logging ? <div className="text-xs text-white/70">Zapisuję wynik…</div> : null}
        </div>
      ) : null}

      <div className="space-y-3">
        {content.map((r) => {
          const best = pickBestExample(r);
          const showRepeat = repeatSet.has(r.term_en_norm);

          return (
            <div key={r.term_en_norm} className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-semibold text-white">{r.term_en}</div>

                      {showRepeat ? (
                        <span className="relative group">
                          <span
                            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-white/20 bg-amber-400/20 px-1.5 text-xs font-bold text-amber-200"
                            aria-label="Sugestia powtórki (minęło 30 dni)"
                            title="Sugestia powtórki (minęło 30 dni)"
                          >
                            !
                          </span>

                          {/* Tooltip */}
                          <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-max -translate-x-1/2 rounded-xl border border-white/15 bg-black/70 px-3 py-2 text-xs text-white/90 opacity-0 backdrop-blur-md transition group-hover:opacity-100">
                            Sugestia powtórki (minęło 30 dni)
                          </span>
                        </span>
                      ) : null}
                    </div>

                    <div className="text-sm text-white/60">{r.term_en_norm}</div>
                  </div>

                  <div className="text-sm">
                    <div className="text-white/70">Tłumaczenie</div>
                    <div className="text-white">
                      {r.translation_pl_suggested ?? <span className="text-white/40">—</span>}
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="text-white/70">{best.label}</div>
                    <div className="text-white">{best.text ?? <span className="text-white/40">—</span>}</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div>
                      <span className="text-white/70">IPA: </span>
                      <span className="text-white">{r.ipa ?? "—"}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => playAudio(r.audio_url)}
                      disabled={!r.audio_url}
                      className="rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-white disabled:opacity-50"
                      title="Odtwórz wymowę"
                    >
                      Głośnik
                    </button>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => enrichOpenData(r.term_en, r.term_en_norm)}
                    disabled={loadingNorm === r.term_en_norm}
                    className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 transition disabled:opacity-60"
                  >
                    {loadingNorm === r.term_en_norm ? "Pobieram..." : "Pobierz dane (open)"}
                  </button>

                  <button
                    type="button"
                    onClick={() => generateAiExample(r.term_en, r.term_en_norm)}
                    disabled={loadingAiNorm === r.term_en_norm}
                    className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 transition disabled:opacity-60"
                    title="Wygeneruj zdanie (Premium). Zostanie zapisane w cache i użyte w testach bez dodatkowego kosztu."
                  >
                    {loadingAiNorm === r.term_en_norm ? "Generuję..." : "Wygeneruj zdanie (AI)"}
                  </button>

                  <button
                    type="button"
                    onClick={() => buildGapTest(r.term_en, r.term_en_norm, best.source)}
                    className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 transition"
                    title="Zbuduj ćwiczenie z istniejącego przykładu (manual/AI/open). Bez dodatkowych kosztów."
                  >
                    Testuj lukę
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

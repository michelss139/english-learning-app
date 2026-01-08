"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type PoolRow = {
  global_vocab_item_id: string;
  term_en: string;
  term_en_norm: string;
  translation_pl_suggested: string | null;
  example_en: string | null;
  ipa: string | null;
  audio_url: string | null;
};

export default function PoolClient() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingNorm, setLoadingNorm] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  const [q, setQ] = useState("");
  const [rows, setRows] = useState<PoolRow[]>([]);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        router.push("/login");
        return;
      }

      // 1) user_vocab links + join to global_vocab_items (via FK)
      const { data: links, error: linkErr } = await supabase
        .from("user_vocab")
        .select("global_vocab_item_id, global_vocab_items(term_en, term_en_norm)")
        .order("created_at", { ascending: false });

      if (linkErr) throw linkErr;

      const items = (links ?? [])
        .map((x: any) => ({
          global_vocab_item_id: x.global_vocab_item_id as string,
          term_en: x.global_vocab_items?.term_en as string,
          term_en_norm: x.global_vocab_items?.term_en_norm as string,
        }))
        .filter((x) => x.term_en_norm);

      // 2) filter by search query (client-side for now; fine for MVP)
      const qn = q.trim().toLowerCase();
      const filtered = qn ? items.filter((it) => it.term_en_norm.includes(qn)) : items;

      // 3) fetch enrichments for visible norms
      const norms = filtered.map((it) => it.term_en_norm);

      let enrichByNorm: Record<string, any> = {};
      if (norms.length) {
        const { data: enrich, error: enrichErr } = await supabase
          .from("vocab_enrichments")
          .select("term_en_norm, translation_pl_suggested, example_en, ipa, audio_url")
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

  async function enrich(term_en: string, term_en_norm: string) {
    try {
      setLoadingNorm(term_en_norm);

      const res = await fetch("/api/vocab/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term_en }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Błąd enrich.");
      }

      await load();
    } catch (e: any) {
      alert(e?.message ?? "Błąd enrich.");
    } finally {
      setLoadingNorm(null);
    }
  }

  function playAudio(url: string | null) {
    if (!url) return; // <-- naprawa TypeScript (string | null)
    const audio = new Audio(url);
    audio.play().catch(() => {});
  }

  const content = useMemo(() => rows, [rows]);

  return (
    <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-4">
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

      {!loading && !error && content.length === 0 ? (
        <div className="text-sm text-white/70">Brak słów w puli dla tego filtra.</div>
      ) : null}

      <div className="space-y-3">
        {content.map((r) => (
          <div key={r.term_en_norm} className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div>
                  <div className="text-lg font-semibold text-white">{r.term_en}</div>
                  <div className="text-sm text-white/60">{r.term_en_norm}</div>
                </div>

                <div className="text-sm">
                  <div className="text-white/70">Tłumaczenie</div>
                  <div className="text-white">
                    {r.translation_pl_suggested ?? <span className="text-white/40">—</span>}
                  </div>
                </div>

                <div className="text-sm">
                  <div className="text-white/70">Przykład</div>
                  <div className="text-white">
                    {r.example_en ?? <span className="text-white/40">—</span>}
                  </div>
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

              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => enrich(r.term_en, r.term_en_norm)}
                  disabled={loadingNorm === r.term_en_norm}
                  className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 transition disabled:opacity-60"
                >
                  {loadingNorm === r.term_en_norm ? "Pobieram..." : "Pobierz dane"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

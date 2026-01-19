"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { resolveVerbForm, getVerbFormLabel, shouldShowVerbFormBadge, type VerbFormResult } from "@/lib/vocab/verbForms";

type PoolRow = {
  user_vocab_item_id: string;
  sense_id: string | null;
  custom_lemma: string | null;
  custom_translation_pl: string | null;
  verified: boolean;
  source: "lexicon" | "custom";
  // Lexicon data (if verified)
  lemma: string | null;
  pos: string | null;
  definition_en: string | null;
  translation_pl: string | null;
  example_en: string | null;
};

export default function PoolTab() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingSenseId, setLoadingSenseId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  const [q, setQ] = useState("");
  const [rows, setRows] = useState<PoolRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // term_en_norm -> czy pokazać sugestię powtórki
  const [repeatSet, setRepeatSet] = useState<Set<string>>(new Set());
  
  // Cache for verb form resolutions: lemma -> VerbFormResult
  const [verbFormCache, setVerbFormCache] = useState<Map<string, VerbFormResult | null>>(new Map());

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

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

      // 1) Fetch repeat suggestions (separately, cheap)
      try {
        const s = await fetchRepeatSuggestions(token);
        setRepeatSet(s);
      } catch (e) {
        console.warn("repeat-suggestions failed:", e);
        setRepeatSet(new Set());
      }

      // 2) Fetch user vocab items with lexicon data
      const { data: userItems, error: itemsErr } = await supabase
        .from("user_vocab_items")
        .select(
          `
          id,
          sense_id,
          custom_lemma,
          custom_translation_pl,
          verified,
          source,
          lexicon_senses(
            id,
            definition_en,
            lexicon_entries(lemma, pos),
            lexicon_translations(translation_pl),
            lexicon_examples(example_en)
          )
        `
        )
        .eq("student_id", userId)
        .order("created_at", { ascending: false });

      if (itemsErr) throw itemsErr;

      // Helper to extract translation_pl from Supabase embed (handles both object and array)
      const pickTranslationPl = (embed: any): string | null => {
        if (!embed) return null;
        if (Array.isArray(embed)) {
          return embed[0]?.translation_pl || null;
        }
        if (typeof embed === "object" && embed.translation_pl) {
          return embed.translation_pl;
        }
        return null;
      };

      // Helper to extract example_en from Supabase embed (handles both object and array)
      const pickExampleEn = (embed: any): string | null => {
        if (!embed) return null;
        if (Array.isArray(embed)) {
          return embed[0]?.example_en || null;
        }
        if (typeof embed === "object" && embed.example_en) {
          return embed.example_en;
        }
        return null;
      };

      const mapped: PoolRow[] = (userItems || []).map((item: any) => {
        const sense = item.lexicon_senses;
        const entry = sense?.lexicon_entries;
        const translationEmbed = sense?.lexicon_translations;
        const exampleEmbed = sense?.lexicon_examples;

        return {
          user_vocab_item_id: item.id,
          sense_id: item.sense_id,
          custom_lemma: item.custom_lemma,
          custom_translation_pl: item.custom_translation_pl,
          verified: item.verified,
          source: item.source,
          // Lexicon data
          lemma: entry?.lemma || null,
          pos: entry?.pos || null,
          definition_en: sense?.definition_en || null,
          translation_pl: pickTranslationPl(translationEmbed),
          example_en: pickExampleEn(exampleEmbed),
        };
      });

      // Filter by search query
      const qn = q.trim().toLowerCase();
      const filtered = qn
        ? mapped.filter((r) => {
            const searchText = (r.lemma || r.custom_lemma || "").toLowerCase();
            return searchText.includes(qn);
          })
        : mapped;

      setRows(filtered);
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

  // Check verb forms for all loaded lemmas
  useEffect(() => {
    if (rows.length === 0) return;
    
    const checkAllVerbForms = async () => {
      for (const row of rows) {
        const lemma = getDisplayLemma(row);
        if (lemma && lemma !== "—" && !verbFormCache.has(lemma)) {
          await checkVerbForm(lemma);
        }
      }
    };
    
    checkAllVerbForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  async function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    await load();
  }

  async function generateAiExample(senseId: string) {
    try {
      setLoadingSenseId(senseId);

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
          sense_id: senseId,
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
      setLoadingSenseId(null);
    }
  }

  function getDisplayLemma(row: PoolRow): string {
    return row.lemma || row.custom_lemma || "—";
  }

  async function checkVerbForm(lemma: string): Promise<VerbFormResult | null> {
    if (!lemma || verbFormCache.has(lemma)) {
      return verbFormCache.get(lemma) ?? null;
    }

    try {
      const result = await resolveVerbForm(lemma, supabase);
      setVerbFormCache((prev) => new Map(prev).set(lemma, result));
      return result;
    } catch (e) {
      console.error("[PoolTab] Error resolving verb form:", e);
      setVerbFormCache((prev) => new Map(prev).set(lemma, null));
      return null;
    }
  }

  function getDisplayTranslation(row: PoolRow, verbForm: VerbFormResult | null): string {
    // Only show "Forma od:" for past_simple/past_participle verb forms
    if (verbForm && shouldShowVerbFormBadge(row.pos, verbForm)) {
      return `Forma od: ${verbForm.baseLemma}`;
    }
    return row.translation_pl || row.custom_translation_pl || "—";
  }

  const toggleSelected = (userVocabItemId: string) => {
    setSelected((prev) => ({ ...prev, [userVocabItemId]: !prev[userVocabItemId] }));
  };

  const selectAll = () => {
    const next: Record<string, boolean> = {};
    for (const r of rows) next[r.user_vocab_item_id] = true;
    setSelected(next);
  };

  const clearAll = () => setSelected({});

  const startTest = () => {
    const ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (ids.length === 0) {
      setError("Zaznacz przynajmniej jedno słówko do testu.");
      return;
    }

    // Clear selections (auto-unselect)
    setSelected({});

    // Navigate to test page
    const q = encodeURIComponent(ids.join(","));
    router.push(`/app/vocab/test?source=pool&selectedIds=${q}`);
  };

  const content = useMemo(() => rows, [rows]);

  return (
    <section className="rounded-3xl border-2 border-white/15 bg-white/5 backdrop-blur-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">Moja pula</h2>
          <p className="text-sm text-white/75">Twoje słówka z automatycznymi tłumaczeniami i przykładami.</p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {rows.length >= 2 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/75 hover:bg-white/10 hover:text-white transition"
              >
                Zaznacz wszystkie
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/75 hover:bg-white/10 hover:text-white transition"
              >
                Odznacz wszystkie
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={startTest}
            disabled={selectedCount === 0}
            className="rounded-xl border-2 border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-100 hover:bg-sky-400/20 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Stwórz test ({selectedCount})
          </button>
        </div>
      </div>

      <form onSubmit={onSearchSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Szukaj w puli (np. ball, work, happy...)"
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

      <div className="space-y-3">
        {content.map((r) => {
          const lemma = getDisplayLemma(r);
          const lemmaNorm = lemma.toLowerCase();
          const showRepeat = repeatSet.has(lemmaNorm);
          const isCustom = r.source === "custom" || !r.verified;
          const verbForm = verbFormCache.get(lemma) ?? null;

          return (
            <div key={r.user_vocab_item_id} className="rounded-2xl border-2 border-white/10 bg-white/5 p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={!!selected[r.user_vocab_item_id]}
                  onChange={() => toggleSelected(r.user_vocab_item_id)}
                  className="mt-1 w-5 h-5 rounded border-2 border-white/20 bg-white/5 text-sky-400 focus:ring-2 focus:ring-sky-400/30"
                />
                <div className="flex items-start justify-between gap-4 flex-1">
                  <div className="space-y-2 flex-1">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-lg font-semibold text-white">{lemma}</div>
                      {r.pos && (
                        <span className="px-3 py-1 rounded-lg border-2 border-emerald-400/40 bg-emerald-400/20 text-emerald-200 text-sm font-semibold">
                          [{r.pos}]
                        </span>
                      )}
                      {shouldShowVerbFormBadge(r.pos, verbForm) && (
                        <span className="px-2 py-0.5 rounded-lg border border-purple-400/30 bg-purple-400/10 text-xs text-purple-200">
                          Forma: {getVerbFormLabel(verbForm.formType)} od '{verbForm.baseLemma}'
                        </span>
                      )}
                      {isCustom && (
                        <span className="text-xs px-2 py-0.5 rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-200">
                          własne
                        </span>
                      )}

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
                  </div>

                  <div className="text-sm">
                    <div className="text-white/70">Tłumaczenie</div>
                    <div className="text-white">
                      {getDisplayTranslation(r, verbForm)}
                      {shouldShowVerbFormBadge(r.pos, verbForm) && r.translation_pl && (
                        <span className="text-xs text-white/50 ml-2">
                          (tłumaczenie bazowe: {r.translation_pl})
                        </span>
                      )}
                    </div>
                  </div>

                  {r.definition_en && (
                    <div className="text-sm">
                      <div className="text-white/70">Definicja</div>
                      <div className="text-white">{r.definition_en}</div>
                    </div>
                  )}

                  {r.example_en && (
                    <div className="text-sm">
                      <div className="text-white/70">Przykład</div>
                      <div className="text-white italic">"{r.example_en}"</div>
                    </div>
                  )}

                  {!r.example_en && r.sense_id && (
                    <div className="text-xs text-white/50">Brak przykładu. Kliknij "Wygeneruj przykład AI".</div>
                  )}
                  </div>

                  <div className="shrink-0 flex flex-col gap-2">
                  {r.sense_id && (
                    <button
                      type="button"
                      onClick={() => generateAiExample(r.sense_id!)}
                      disabled={loadingSenseId === r.sense_id}
                      className="rounded-xl border-2 border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-100 hover:bg-sky-400/20 transition disabled:opacity-60"
                      title="Wygeneruj nowy przykład zdania (AI). Zostanie zapisany w puli przykładów."
                    >
                      {loadingSenseId === r.sense_id ? "Generuję..." : "Wygeneruj przykład AI"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(`Czy na pewno chcesz usunąć słówko "${lemma}"?`)) return;

                      try {
                        const session = await supabase.auth.getSession();
                        const token = session?.data?.session?.access_token;
                        if (!token) {
                          setError("Musisz być zalogowany");
                          return;
                        }

                        const res = await fetch("/api/vocab/delete-word", {
                          method: "DELETE",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ user_vocab_item_id: r.user_vocab_item_id }),
                        });

                        if (!res.ok) {
                          const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
                          throw new Error(errorData.error || `HTTP ${res.status}`);
                        }

                        await load();
                      } catch (e: any) {
                        setError(e?.message ?? "Nie udało się usunąć słówka.");
                      }
                    }}
                    className="rounded-xl border-2 border-rose-400/40 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-400/20 transition"
                    title="Usuń słówko z puli"
                  >
                    Usuń
                  </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {content.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-sm text-white/75">Nie masz jeszcze słówek w puli.</p>
          <p className="text-xs text-white/60 mt-2">Dodaj słówka w sekcji "Dodaj słówko".</p>
        </div>
      )}
    </section>
  );
}

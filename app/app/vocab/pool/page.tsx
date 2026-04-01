"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";
import type { VocabPackSearchRow } from "@/lib/vocab/packSearchTypes";
import PoolTab from "../PoolTab";
import PoolTrainTab from "./PoolTrainTab";
import SenseSelectionModal from "../SenseSelectionModal";

type PackSelectedSense = {
  sense_id: string;
  lemma: string;
  pos: string;
  translation: string | null;
  definition: string;
  example: string | null;
  pack_title: string;
};

/** Set to false to hide pack autocomplete and rely on Szukaj / Dodaj (AI) only. */
const USE_PACK_SEARCH = true;

function normPackQ(s: string): string {
  return s.trim().toLowerCase();
}

function HighlightLemmaMatch({ lemma, query }: { lemma: string; query: string }) {
  const q = normPackQ(query);
  if (!q) {
    return <span className="font-semibold tracking-tight text-slate-900">{lemma}</span>;
  }
  const lower = lemma.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) {
    return <span className="font-semibold tracking-tight text-slate-900">{lemma}</span>;
  }
  return (
    <span className="font-semibold tracking-tight text-slate-900">
      {lemma.slice(0, idx)}
      <strong className="font-bold text-sky-800">{lemma.slice(idx, idx + q.length)}</strong>
      {lemma.slice(idx + q.length)}
    </span>
  );
}

type VocabItem = {
  id: string;
  term_en: string;
  translation_pl: string | null;
  is_personal: boolean;
};

type Tab = "train" | "words" | "add";

function parsePoolTab(v: string | null): Tab {
  if (v === "train" || v === "words" || v === "add") return v;
  if (v === "pool") return "words";
  if (v === "personal") return "add";
  return "train";
}

function segmentedTab(active: boolean) {
  return `rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 sm:px-3.5 sm:py-1.5 sm:text-sm ${
    active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
  }`;
}

export default function VocabPoolPage() {
  return (
    <Suspense fallback={<main>Ładuję…</main>}>
      <VocabPoolInner />
    </Suspense>
  );
}

function VocabPoolInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const tabFromUrl = parsePoolTab(searchParams.get("tab"));
  const [tab, setTab] = useState<Tab>(tabFromUrl);

  const navigateTab = useCallback(
    (t: Tab) => {
      setTab(t);
      const p = new URLSearchParams(searchParams.toString());
      p.set("tab", t);
      router.replace(`/app/vocab/pool?${p.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    setTab(parsePoolTab(searchParams.get("tab")));
  }, [searchParams]);

  const [personal, setPersonal] = useState<VocabItem[]>([]);
  const [newWord, setNewWord] = useState("");
  const [showSenseModal, setShowSenseModal] = useState(false);
  const [addingWord, setAddingWord] = useState(false);
  const [packSearchResults, setPackSearchResults] = useState<VocabPackSearchRow[]>([]);
  const [packSearchLoading, setPackSearchLoading] = useState(false);
  const [lastCompletedPackQuery, setLastCompletedPackQuery] = useState<string | null>(null);
  const [modalCustomOnly, setModalCustomOnly] = useState(false);
  const [selectedSense, setSelectedSense] = useState<PackSelectedSense | null>(null);
  const [inlinePackAddLoading, setInlinePackAddLoading] = useState(false);
  const [packInlineSuccess, setPackInlineSuccess] = useState("");
  const [isAdded, setIsAdded] = useState(false);
  const [packDropdownOpen, setPackDropdownOpen] = useState(false);
  const [packActiveIndex, setPackActiveIndex] = useState(-1);
  const packBlurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const packListRef = useRef<HTMLUListElement | null>(null);
  const packSearchInputRef = useRef<HTMLInputElement | null>(null);

  const personalCount = personal.length;

  const selectPackRow = useCallback((row: VocabPackSearchRow) => {
    setError("");
    setPackInlineSuccess("");
    setIsAdded(false);
    setSelectedSense({
      sense_id: row.sense_id,
      lemma: row.lemma,
      pos: row.pos,
      translation: row.translation_pl,
      definition: row.definition_en,
      example: null,
      pack_title: row.pack_title,
    });
    setPackDropdownOpen(false);
    setPackActiveIndex(-1);
  }, []);

  const clearPackSelection = useCallback(() => {
    setSelectedSense(null);
    setIsAdded(false);
    if (USE_PACK_SEARCH && normPackQ(newWord).length >= 2 && packSearchResults.length > 0) {
      setPackDropdownOpen(true);
    }
  }, [newWord, packSearchResults.length]);

  const handlePackAddAnother = useCallback(() => {
    setNewWord("");
    setSelectedSense(null);
    setIsAdded(false);
    setPackInlineSuccess("");
    setPackSearchResults([]);
    setLastCompletedPackQuery(null);
    setPackDropdownOpen(false);
    setPackActiveIndex(-1);
    requestAnimationFrame(() => packSearchInputRef.current?.focus());
  }, []);

  const refreshPersonal = async () => {
    if (!profile?.id) return;

    const personalRes = await supabase
      .from("user_vocab_items")
      .select(
        `
        id,
        custom_lemma,
        custom_translation_pl,
        lexicon_senses(
          lexicon_entries(lemma),
          lexicon_translations(translation_pl)
        )
      `
      )
      .eq("student_id", profile.id)
      .or("custom_lemma.not.is.null,source.eq.custom")
      .order("created_at", { ascending: false });

    if (personalRes.error) {
      const oldRes = await supabase
        .from("vocab_items")
        .select("id,term_en,translation_pl,is_personal")
        .eq("is_personal", true)
        .order("created_at", { ascending: false });

      if (oldRes.error) throw oldRes.error;
      setPersonal(
        (oldRes.data ?? []).map((v: any) => ({
          id: v.id,
          term_en: v.term_en,
          translation_pl: v.translation_pl,
          is_personal: v.is_personal,
        })) as VocabItem[]
      );
      return;
    }

    const mapped = (personalRes.data ?? []).map((uvi: any) => {
      const lemma = uvi.custom_lemma || uvi.lexicon_senses?.lexicon_entries?.lemma || "";
      const translation =
        uvi.custom_translation_pl || uvi.lexicon_senses?.lexicon_translations?.[0]?.translation_pl || null;
      return {
        id: uvi.id,
        term_en: lemma,
        translation_pl: translation,
        is_personal: true,
        user_vocab_item_id: uvi.id,
      };
    });

    setPersonal(mapped as any);
  };

  useEffect(() => {
    const run = async () => {
      try {
        const p = await getOrCreateProfile();
        if (!p) {
          setError("Nie udało się wczytać profilu.");
          return;
        }

        setProfile(p);
        await refreshPersonal();
      } catch (e: any) {
        setError(e?.message ?? "Nieznany błąd");
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!USE_PACK_SEARCH) return;

    const q = normPackQ(newWord);
    if (q.length < 2) {
      setPackSearchResults([]);
      setPackSearchLoading(false);
      setLastCompletedPackQuery(null);
      return;
    }

    const ac = new AbortController();
    const timer = setTimeout(async () => {
      setPackSearchLoading(true);
      try {
        const session = await supabase.auth.getSession();
        const token = session?.data?.session?.access_token;
        if (!token) {
          setPackSearchResults([]);
          return;
        }

        const res = await fetch(`/api/vocab/search?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setPackSearchResults([]);
          return;
        }

        const data = (await res.json()) as { results?: VocabPackSearchRow[] };
        setPackSearchResults(data.results ?? []);
        setLastCompletedPackQuery(q);
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setPackSearchResults([]);
        setLastCompletedPackQuery(q);
      } finally {
        if (!ac.signal.aborted) {
          setPackSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [newWord]);

  useEffect(() => {
    setPackActiveIndex(-1);
  }, [packSearchResults, newWord]);

  useEffect(() => {
    return () => {
      if (packBlurTimerRef.current) clearTimeout(packBlurTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!USE_PACK_SEARCH || packActiveIndex < 0 || !packListRef.current) return;
    const el = packListRef.current.querySelector(`[data-pack-idx="${packActiveIndex}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [packActiveIndex, packSearchResults]);

  useEffect(() => {
    const sid = selectedSense?.sense_id;
    if (!sid) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("lexicon_examples")
        .select("example_en")
        .eq("sense_id", sid)
        .limit(1)
        .maybeSingle();
      if (cancelled || error || !data?.example_en?.trim()) return;
      setSelectedSense((prev) => (prev?.sense_id === sid ? { ...prev, example: data.example_en } : prev));
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSense?.sense_id]);

  useEffect(() => {
    if (!packInlineSuccess) return;
    const t = setTimeout(() => setPackInlineSuccess(""), 3500);
    return () => clearTimeout(t);
  }, [packInlineSuccess]);

  const handleLookupWord = () => {
    if (!newWord.trim()) {
      setError("Wpisz słówko po angielsku.");
      return;
    }
    setError("");
    setSelectedSense(null);
    setIsAdded(false);
    setModalCustomOnly(false);
    setShowSenseModal(true);
  };

  const handleInlinePackAdd = async () => {
    if (!selectedSense) return;
    setInlinePackAddLoading(true);
    setError("");
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      if (!token) {
        setError("Musisz być zalogowany");
        return;
      }

      const res = await fetch("/api/vocab/add-word", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sense_id: selectedSense.sense_id }),
      });

      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };

      if (res.status === 409) {
        setNewWord("");
        setPackSearchResults([]);
        setLastCompletedPackQuery(null);
        setPackInlineSuccess("To słówko już jest w Twojej puli.");
        setIsAdded(true);
        await refreshPersonal();
        if (tab === "words") {
          router.refresh();
        }
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      if (!data.ok) {
        throw new Error("Nie udało się dodać słówka");
      }

      setNewWord("");
      setPackSearchResults([]);
      setLastCompletedPackQuery(null);
      setPackInlineSuccess("Dodano do puli.");
      setIsAdded(true);

      await refreshPersonal();
      if (tab === "words") {
        router.refresh();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nie udało się dodać słówka.");
    } finally {
      setInlinePackAddLoading(false);
    }
  };

  const handleSenseSelected = async (senseId: string, entry?: any) => {
    if (entry?.verb_forms) {
      const forms = [entry.verb_forms.past_simple, entry.verb_forms.past_participle].filter(Boolean);
      if (forms.length > 0) {
        const highlightParam = forms.join(",");
        setNewWord("");
        setShowSenseModal(false);
        router.push(`/app/vocab/pool?tab=words&highlight=${encodeURIComponent(highlightParam)}`);
        return;
      }
    }
    setNewWord("");
    setShowSenseModal(false);
    setModalCustomOnly(false);
    await refreshPersonal();
    if (tab === "words") {
      router.refresh();
    }
  };

  const handleCustomWord = async (lemma: string, translation: string | null) => {
    if (!profile?.id) {
      setError("Brak profilu. Zaloguj się ponownie.");
      return;
    }

    setAddingWord(true);
    setError("");

    try {
      const { error: insertErr } = await supabase.from("user_vocab_items").insert({
        student_id: profile.id,
        sense_id: null,
        custom_lemma: lemma.trim().toLowerCase(),
        custom_translation_pl: translation?.trim() || null,
        source: "custom",
        verified: false,
      });

      if (insertErr) {
        if (String(insertErr.message).toLowerCase().includes("duplicate")) {
          setError("To słowo już jest w Twojej puli");
          setAddingWord(false);
          return;
        }
        throw insertErr;
      }

      await refreshPersonal();
      setNewWord("");
      setShowSenseModal(false);
      setModalCustomOnly(false);
    } catch (e: any) {
      setError(e?.message ?? "Nie udało się dodać słówka.");
    } finally {
      setAddingWord(false);
    }
  };

  if (loading) return <main>Ładuję…</main>;

  const canPackNavigate =
    USE_PACK_SEARCH &&
    !selectedSense &&
    normPackQ(newWord).length >= 2 &&
    packSearchResults.length > 0;
  const showPackDropdown =
    USE_PACK_SEARCH &&
    !selectedSense &&
    packDropdownOpen &&
    normPackQ(newWord).length >= 2 &&
    packSearchResults.length > 0;

  return (
    <main className="mx-auto max-w-6xl space-y-3 px-2 pb-6 sm:space-y-4 sm:px-4 lg:px-6">
      <header className="flex flex-wrap items-center gap-2 gap-y-1.5 sm:gap-3">
        <h1 className="shrink-0 text-base font-semibold tracking-tight text-slate-900 sm:text-lg">Moja pula</h1>
        <nav
          className="inline-flex shrink-0 rounded-full bg-slate-100/90 p-0.5 ring-1 ring-slate-200/60"
          aria-label="Zakładki puli"
        >
          <button type="button" className={segmentedTab(tab === "train")} onClick={() => navigateTab("train")}>
            Trenuj
          </button>
          <button type="button" className={segmentedTab(tab === "words")} onClick={() => navigateTab("words")}>
            Słowa
          </button>
          <button type="button" className={segmentedTab(tab === "add")} onClick={() => navigateTab("add")}>
            Dodaj ({personalCount})
          </button>
        </nav>
        <div className="ml-auto flex shrink-0 gap-1 text-xs sm:text-sm">
          <a
            className="rounded-full px-2 py-1 font-medium text-slate-600 transition hover:bg-black/[0.04] hover:text-slate-900"
            href="/app/vocab"
          >
            Słownictwo
          </a>
          <a
            className="rounded-full px-2 py-1 font-medium text-slate-600 transition hover:bg-black/[0.04] hover:text-slate-900"
            href="/app"
          >
            Panel
          </a>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-red-800">
          <span className="font-medium">Błąd: </span>
          {error}
        </div>
      ) : null}

      {tab === "train" ? (
        <PoolTrainTab
          onNavigateAddWords={() => navigateTab("add")}
          onNavigateWords={() => navigateTab("words")}
        />
      ) : null}

      {tab === "words" ? <PoolTab /> : null}

      {tab === "add" ? (
        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Dodaj słówko</h2>
            <p className="text-sm text-slate-600">
              {USE_PACK_SEARCH
                ? "Wpisz fragment po angielsku lub po polsku — podpowiemy słówka z Twoich pakietów. Możesz też użyć Szukaj / Dodaj (AI)."
                : "Wpisz słówko po angielsku. System znajdzie wszystkie znaczenia i pozwoli wybrać właściwe."}
            </p>
          </div>

          {packInlineSuccess ? (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
              {packInlineSuccess}
            </div>
          ) : null}

          <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  ref={packSearchInputRef}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                  placeholder="Wpisz słówko po angielsku (np. ball)"
                  value={newWord}
                  onChange={(e) => {
                    if (isAdded) setIsAdded(false);
                    if (selectedSense) setSelectedSense(null);
                    setNewWord(e.target.value);
                  }}
                  onFocus={() => {
                    if (packBlurTimerRef.current) {
                      clearTimeout(packBlurTimerRef.current);
                      packBlurTimerRef.current = null;
                    }
                    setPackDropdownOpen(true);
                  }}
                  onBlur={() => {
                    packBlurTimerRef.current = setTimeout(() => {
                      setPackDropdownOpen(false);
                      setPackActiveIndex(-1);
                      packBlurTimerRef.current = null;
                    }, 180);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown" && canPackNavigate) {
                      e.preventDefault();
                      setPackDropdownOpen(true);
                      setPackActiveIndex((i) => {
                        if (i < 0) return 0;
                        return Math.min(i + 1, packSearchResults.length - 1);
                      });
                      return;
                    }
                    if (e.key === "ArrowUp" && canPackNavigate) {
                      e.preventDefault();
                      setPackDropdownOpen(true);
                      setPackActiveIndex((i) => (i <= 0 ? 0 : i - 1));
                      return;
                    }
                    if (e.key === "Escape" && packDropdownOpen && showPackDropdown) {
                      e.preventDefault();
                      setPackDropdownOpen(false);
                      setPackActiveIndex(-1);
                      return;
                    }
                    if (e.key === "Enter") {
                      if (canPackNavigate && packDropdownOpen) {
                        e.preventDefault();
                        const idx = packActiveIndex >= 0 ? packActiveIndex : 0;
                        const row = packSearchResults[idx];
                        if (row) selectPackRow(row);
                        return;
                      }
                      handleLookupWord();
                      return;
                    }
                  }}
                  autoComplete="off"
                />
                {showPackDropdown ? (
                  <ul
                    ref={packListRef}
                    className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200/90 bg-slate-50/95 py-1 shadow-lg shadow-slate-900/8 backdrop-blur-md"
                  >
                    {packSearchResults.map((row, i) => (
                      <li key={row.sense_id} className="px-1">
                        <button
                          type="button"
                          data-pack-idx={i}
                          className={`w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors duration-150 ${
                            packActiveIndex === i
                              ? "bg-sky-100/95 text-slate-900"
                              : "text-slate-800 hover:bg-sky-50/90"
                          }`}
                          onMouseEnter={() => setPackActiveIndex(i)}
                          onMouseDown={(ev) => ev.preventDefault()}
                          onClick={() => selectPackRow(row)}
                        >
                          <HighlightLemmaMatch lemma={row.lemma} query={newWord} />
                          <span className="text-slate-600 font-normal">
                            {" "}
                            ({row.translation_pl ?? "—"}){" "}
                            <span className="text-slate-500">[{row.pack_title}]</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {USE_PACK_SEARCH && packSearchLoading ? (
                  <p className="mt-1 text-xs text-slate-500">Szukam w pakietach…</p>
                ) : null}
              </div>
              <button
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                onClick={handleLookupWord}
                disabled={addingWord || !newWord.trim()}
              >
                {addingWord ? "Dodaję…" : "Szukaj / Dodaj"}
              </button>
            </div>

            {selectedSense ? (
              <div
                className={`rounded-2xl border p-4 space-y-3 transition-colors ${
                  isAdded
                    ? "border-emerald-200/80 bg-emerald-50/50"
                    : "border-slate-200/80 bg-white"
                }`}
              >
                <div className="flex gap-3">
                  {isAdded ? (
                    <span
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-base font-bold text-white shadow-md shadow-emerald-900/15"
                      aria-hidden
                    >
                      ✓
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-xl font-bold tracking-tight text-slate-900">{selectedSense.lemma}</span>
                      <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-900">
                        {selectedSense.pos}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500">{selectedSense.pack_title}</p>
                    <p className="text-2xl font-semibold leading-snug text-sky-900">
                      {selectedSense.translation ?? "—"}
                    </p>
                    <p className="text-sm leading-relaxed text-slate-600">{selectedSense.definition}</p>
                    {selectedSense.example ? (
                      <p className="text-sm italic text-slate-500">&ldquo;{selectedSense.example}&rdquo;</p>
                    ) : null}
                  </div>
                </div>

                {isAdded ? (
                  <div className="space-y-3 border-t border-emerald-200/70 pt-3">
                    <p className="text-sm font-semibold text-emerald-900">✓ Dodano do Twojej puli</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-xl border-2 border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                        onClick={() => router.push("/app/vocab/pool?tab=train")}
                      >
                        Przećwicz teraz
                      </button>
                      <button
                        type="button"
                        className="rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                        onClick={handlePackAddAnother}
                      >
                        Dodaj kolejne
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      className="rounded-xl border-2 border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                      onClick={handleInlinePackAdd}
                      disabled={inlinePackAddLoading}
                    >
                      {inlinePackAddLoading ? "Dodaję…" : "➕ Dodaj do mojej puli"}
                    </button>
                    <button
                      type="button"
                      className="text-sm font-medium text-sky-800 underline-offset-2 hover:underline"
                      onClick={clearPackSelection}
                    >
                      Zmień wybór
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {USE_PACK_SEARCH &&
            !selectedSense &&
            normPackQ(newWord).length >= 2 &&
            !packSearchLoading &&
            packSearchResults.length === 0 &&
            lastCompletedPackQuery === normPackQ(newWord) ? (
              <div className="rounded-2xl border-2 border-amber-400/40 bg-amber-50 px-4 py-3 space-y-3">
                <p className="text-sm font-medium text-slate-900">Nie mamy jeszcze tego słowa</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                    onClick={() => {
                      if (!newWord.trim()) {
                        setError("Wpisz słówko.");
                        return;
                      }
                      setError("");
                      setSelectedSense(null);
                      setIsAdded(false);
                      setModalCustomOnly(true);
                      setShowSenseModal(true);
                    }}
                  >
                    Dodaj własne słowo
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border-2 border-sky-400/40 bg-sky-400/15 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-sky-400/25"
                    onClick={handleLookupWord}
                  >
                    Spróbuj przez AI
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <SenseSelectionModal
            lemma={newWord}
            isOpen={showSenseModal}
            onClose={() => {
              setShowSenseModal(false);
              setModalCustomOnly(false);
              setError("");
            }}
            onSelect={handleSenseSelected}
            onSelectCustom={handleCustomWord}
            onSearchForm={(formTerm) => setNewWord(formTerm)}
            initialCustomOnly={modalCustomOnly}
          />

          {personal.length === 0 ? (
            <p className="text-sm text-slate-600">Nie masz jeszcze własnych słówek.</p>
          ) : (
            <ul className="space-y-2">
              {personal.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition hover:bg-black/[0.02]"
                  title={w.translation_pl ?? ""}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-slate-900">{w.term_en}</span>
                    <span className="ml-2 text-sm text-slate-500">
                      {w.translation_pl ? "hover → PL" : "brak tłumaczenia"}
                    </span>
                  </div>
                  <button
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-700"
                    onClick={async () => {
                      if (!confirm(`Czy na pewno chcesz usunąć słówko "${w.term_en}"?`)) return;

                      try {
                        const session = await supabase.auth.getSession();
                        const token = session?.data?.session?.access_token;
                        if (!token) {
                          setError("Musisz być zalogowany");
                          return;
                        }

                        const userVocabItemId = (w as any).user_vocab_item_id;

                        if (userVocabItemId) {
                          const res = await fetch("/api/vocab/delete-word", {
                            method: "DELETE",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ user_vocab_item_id: userVocabItemId }),
                          });

                          if (!res.ok) {
                            const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
                            throw new Error(errorData.error || `HTTP ${res.status}`);
                          }
                        } else {
                          const res = await fetch("/api/vocab/delete-word", {
                            method: "DELETE",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ word_id: w.id }),
                          });

                          if (!res.ok) {
                            const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
                            throw new Error(errorData.error || `HTTP ${res.status}`);
                          }
                        }

                        await refreshPersonal();
                      } catch (e: any) {
                        setError(e?.message ?? "Nie udało się usunąć słówka.");
                      }
                    }}
                    title="Usuń słówko"
                  >
                    Usuń
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </main>
  );
}

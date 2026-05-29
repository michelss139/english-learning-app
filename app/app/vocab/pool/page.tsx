"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile, Profile } from "@/lib/auth/profile";
import type { LexiconSearchRow } from "@/lib/vocab/packSearchTypes";
import PoolTab from "../PoolTab";
import PoolTrainTab from "./PoolTrainTab";
import PoolQuizRunner from "./PoolQuizRunner";
import SenseSelectionModal, { type LexiconEntry } from "../SenseSelectionModal";

type PackSelectedSense = {
  sense_id: string;
  lemma: string;
  pos: string;
  translation: string | null;
  definition: string;
  example: string | null;
};

type ResolvedLemmaInfo = {
  originalQuery: string;
  resolvedLemma: string;
};

/** Set to false to hide pack autocomplete and rely on Szukaj / Dodaj (AI) only. */
const USE_PACK_SEARCH = true;

function normPackQ(s: string): string {
  return s.trim().toLowerCase();
}

function isLookupEligibleQuery(s: string): boolean {
  const q = normPackQ(s);
  if (q.length < 3) return false;
  return /[a-zA-Ząćęłńóśźż]/.test(q);
}

function HighlightLemmaMatch({ lemma, query }: { lemma: string; query: string }) {
  const q = normPackQ(query);
  if (!q) {
    return <span className="font-bold tracking-tight text-slate-900">{lemma}</span>;
  }
  const lower = lemma.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) {
    return <span className="font-bold tracking-tight text-slate-900">{lemma}</span>;
  }
  return (
    <span className="font-bold tracking-tight text-slate-900">
      {lemma.slice(0, idx)}
      <strong className="font-bold text-sky-800">{lemma.slice(idx, idx + q.length)}</strong>
      {lemma.slice(idx + q.length)}
    </span>
  );
}

/** Sense-first dropdown: EN gloss snippet when PL translation missing. */
const DROPDOWN_DEF_PRIMARY_MAX = 72;
const DROPDOWN_DEF_SECONDARY_MAX = 76;

function truncateDefinitionBlurb(s: string, maxLen: number): string {
  const t = s.trim();
  if (!t) return "";
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen - 1).trimEnd();
  const lastSpace = cut.lastIndexOf(" ");
  const wordSafe = lastSpace > maxLen * 0.45 ? cut.slice(0, lastSpace) : cut;
  return `${wordSafe}…`;
}

/** Skip 2nd line when EN definition mostly repeats the PL gloss (avoid duplicate reading). */
function isDefinitionRedundantWithTranslation(definitionEn: string, translationPl: string | null): boolean {
  const trans = translationPl?.trim().toLowerCase();
  if (!trans) return false;
  const def = definitionEn.trim().toLowerCase();
  if (!def) return false;
  if (def.startsWith(trans)) return true;
  const shortDef = def.length <= trans.length + 40;
  if (shortDef && def.includes(trans)) return true;
  return false;
}

type VocabItem = {
  id: string;
  term_en: string;
  translation_pl: string | null;
  is_personal: boolean;
};

type Tab = "train" | "quiz" | "words" | "add";

type PoolCounts = {
  review: number;
  learning: number;
  new: number;
  mastered: number;
};

function parsePoolTab(v: string | null): Tab {
  if (v === "train" || v === "quiz" || v === "words" || v === "add") return v;
  if (v === "pool") return "words";
  if (v === "personal") return "add";
  return "train";
}

function segmentedTab(active: boolean) {
  return `rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 sm:px-3.5 sm:py-1.5 sm:text-sm ${
    active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
  }`;
}

/** Sense-first detail block: aligns with lexicon search dropdown (lemma + pos, then PL / definition, example last). */
function LexiconPoolSenseDetailBody({ sense }: { sense: PackSelectedSense }) {
  const hasPl = Boolean(sense.translation?.trim());
  const def = sense.definition?.trim() ?? "";
  const ex = sense.example?.trim() ?? "";

  return (
    <div className="min-w-0 flex-1 space-y-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <h3 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{sense.lemma}</h3>
        <span className="shrink-0 rounded-md border border-slate-200/90 bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          {sense.pos}
        </span>
      </div>

      {hasPl ? (
        <p className="text-2xl font-semibold leading-snug text-sky-900 sm:text-[1.65rem]">{sense.translation}</p>
      ) : def ? (
        <p className="text-2xl font-semibold leading-snug text-slate-700 sm:text-[1.65rem]">{sense.definition}</p>
      ) : (
        <p className="text-lg font-normal text-slate-400">—</p>
      )}

      {hasPl && def ? (
        <p className="text-base font-normal leading-relaxed text-slate-600">{sense.definition}</p>
      ) : null}

      {ex ? (
        <p className="max-w-prose border-l-2 border-slate-200/90 pl-3 text-sm font-normal italic leading-relaxed text-slate-500">
          &ldquo;{ex}&rdquo;
        </p>
      ) : null}
    </div>
  );
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
  const [packSearchResults, setPackSearchResults] = useState<LexiconSearchRow[]>([]);
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
  const resolveAbortRef = useRef<AbortController | null>(null);
  const lookupAbortRef = useRef<AbortController | null>(null);
  const [isResolveLoading, setIsResolveLoading] = useState(false);
  const [lastResolvedQuery, setLastResolvedQuery] = useState<string | null>(null);
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lastLookupLemma, setLastLookupLemma] = useState<string | null>(null);
  const [prefilledEntry, setPrefilledEntry] = useState<LexiconEntry | null>(null);
  const [resolvedLemmaInfo, setResolvedLemmaInfo] = useState<ResolvedLemmaInfo | null>(null);
  const [poolCounts, setPoolCounts] = useState<PoolCounts | null>(null);

  const personalCount = personal.length;

  const selectPackRow = useCallback((row: LexiconSearchRow) => {
    setError("");
    setPackInlineSuccess("");
    setLookupError(null);
    setIsAdded(false);
    setResolvedLemmaInfo((current) =>
      current && normPackQ(row.lemma) !== normPackQ(current.resolvedLemma) ? null : current
    );
    setSelectedSense({
      sense_id: row.sense_id,
      lemma: row.lemma,
      pos: row.pos,
      translation: row.translation_pl,
      definition: row.definition_en,
      example: row.example_en,
    });
    setPackDropdownOpen(false);
    setPackActiveIndex(-1);
  }, []);

  const clearPackSelection = useCallback(() => {
    setSelectedSense(null);
    setIsAdded(false);
    setLookupError(null);
    setResolvedLemmaInfo(null);
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
    setIsResolveLoading(false);
    setLookupError(null);
    setLastResolvedQuery(null);
    setLastLookupLemma(null);
    setPrefilledEntry(null);
    setResolvedLemmaInfo(null);
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

        // Fetch pool knowledge counts for banner + stats
        try {
          const sessionData = await supabase.auth.getSession();
          const token = sessionData.data.session?.access_token;
          if (token) {
            const res = await fetch("/api/vocab/pool/overview", {
              headers: { Authorization: `Bearer ${token}` },
              cache: "no-store",
            });
            if (res.ok) {
              const data = (await res.json()) as { counts?: PoolCounts };
              if (data.counts) setPoolCounts(data.counts);
            }
          }
        } catch {
          // Stats are non-critical — ignore errors
        }
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

        const data = (await res.json()) as { results?: LexiconSearchRow[] };
        const results = data.results ?? [];
        setPackSearchResults(results);
        setLastCompletedPackQuery(q);
        if (results.length > 0) {
          setResolvedLemmaInfo(null);
        }
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
      resolveAbortRef.current?.abort();
      lookupAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!USE_PACK_SEARCH || packActiveIndex < 0 || !packListRef.current) return;
    const el = packListRef.current.querySelector(`[data-pack-idx="${packActiveIndex}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [packActiveIndex, packSearchResults]);

  useEffect(() => {
    if (!packInlineSuccess) return;
    const t = setTimeout(() => setPackInlineSuccess(""), 3500);
    return () => clearTimeout(t);
  }, [packInlineSuccess]);

  const fetchPackSearchResults = useCallback(async (q: string, signal: AbortSignal): Promise<LexiconSearchRow[]> => {
    const session = await supabase.auth.getSession();
    const token = session?.data?.session?.access_token;
    if (!token) {
      return [];
    }

    const res = await fetch(`/api/vocab/search?q=${encodeURIComponent(q)}`, {
      signal,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return [];
    }

    const data = (await res.json()) as { results?: LexiconSearchRow[] };
    return data.results ?? [];
  }, []);

  const runLookupFallback = useCallback(async (q: string) => {
    lookupAbortRef.current?.abort();
    const ac = new AbortController();
    lookupAbortRef.current = ac;

    setLookupError(null);
    setIsLookupLoading(true);
    setLastLookupLemma(q);
    setResolvedLemmaInfo(null);

    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      if (!token) {
        setLookupError("Nie rozpoznajemy tego słowa");
        setPrefilledEntry(null);
        return;
      }

      const res = await fetch("/api/vocab/lookup-word", {
        method: "POST",
        signal: ac.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lemma: q }),
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; entry?: LexiconEntry; reason?: string; error?: string }
        | null;

      if (ac.signal.aborted) return;

      if (!res.ok || !data?.ok || !data.entry?.senses?.length) {
        setLookupError("Nie rozpoznajemy tego słowa");
        setPrefilledEntry(null);
        return;
      }

      if (data.entry.senses.length === 1) {
        const sense = data.entry.senses[0];
        if (!sense?.id) {
          setLookupError("Nie rozpoznajemy tego słowa");
          setPrefilledEntry(null);
          return;
        }
        setPrefilledEntry(null);
        setSelectedSense({
          sense_id: sense.id,
          lemma: data.entry.lemma,
          pos: sense.pos || data.entry.pos,
          translation: sense.translation_pl,
          definition: sense.definition_en,
          example: sense.example_en,
        });
        setPackDropdownOpen(false);
        setPackActiveIndex(-1);
        return;
      }

      setLookupError(null);
      setPrefilledEntry(data.entry);
      setSelectedSense(null);
      setModalCustomOnly(false);
      setShowSenseModal(true);
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setLookupError("Nie rozpoznajemy tego słowa");
      setPrefilledEntry(null);
    } finally {
      if (!ac.signal.aborted) {
        setIsLookupLoading(false);
      }
    }
  }, []);

  const runResolveBeforeLookup = useCallback(
    async (q: string) => {
      resolveAbortRef.current?.abort();
      const ac = new AbortController();
      resolveAbortRef.current = ac;

      setIsResolveLoading(true);
      setLastResolvedQuery(q);
      setLookupError(null);

      try {
        const session = await supabase.auth.getSession();
        const token = session?.data?.session?.access_token;
        if (!token) {
          await runLookupFallback(q);
          return;
        }

        const resolveRes = await fetch("/api/vocab/resolve-query", {
          method: "POST",
          signal: ac.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ query: q }),
        });

        const resolveData = (await resolveRes.json().catch(() => null)) as
          | {
              ok?: boolean;
              candidates?: Array<{ lemma: string; confidence: number }>;
              reason?: string;
              error?: string;
            }
          | null;

        if (ac.signal.aborted) return;

        const resolvedLemma = resolveRes.ok && resolveData?.ok ? resolveData.candidates?.[0]?.lemma?.trim() : "";
        if (resolvedLemma) {
          const resolvedResults = await fetchPackSearchResults(resolvedLemma, ac.signal);
          if (ac.signal.aborted) return;

          if (resolvedResults.length > 0) {
            setPackSearchResults(resolvedResults);
            setLastCompletedPackQuery(q);
            setLookupError(null);
          setResolvedLemmaInfo({
            originalQuery: q,
            resolvedLemma,
          });
            setPackDropdownOpen(true);
            setPackActiveIndex(-1);
            return;
          }
        }

        await runLookupFallback(q);
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        await runLookupFallback(q);
      } finally {
        if (!ac.signal.aborted) {
          setIsResolveLoading(false);
        }
      }
    },
    [fetchPackSearchResults, runLookupFallback]
  );

  useEffect(() => {
    if (!USE_PACK_SEARCH) return;

    const q = normPackQ(newWord);
    if (!isLookupEligibleQuery(q)) {
      resolveAbortRef.current?.abort();
      lookupAbortRef.current?.abort();
      setIsResolveLoading(false);
      setIsLookupLoading(false);
      setLookupError(null);
      setPrefilledEntry(null);
      setResolvedLemmaInfo(null);
      if (q.length === 0) {
        setLastResolvedQuery(null);
        setLastLookupLemma(null);
      }
      return;
    }

    if (selectedSense || prefilledEntry) return;
    if (packSearchLoading) return;
    if (packSearchResults.length > 0) {
      setSelectedSense(null);
      return;
    }
    if (lastCompletedPackQuery !== q) return;
    if (isResolveLoading) return;
    if (isLookupLoading) return;
    if (lastResolvedQuery !== q) {
      void runResolveBeforeLookup(q);
      return;
    }
    if (lastLookupLemma === q) return;

    void runLookupFallback(q);
  }, [
    isResolveLoading,
    isLookupLoading,
    lastCompletedPackQuery,
    lastResolvedQuery,
    lastLookupLemma,
    newWord,
    packSearchLoading,
    packSearchResults.length,
    prefilledEntry,
    runResolveBeforeLookup,
    runLookupFallback,
    selectedSense,
  ]);

  const handleLookupWord = () => {
    if (!newWord.trim()) {
      setError("Wpisz słówko po polsku lub angielsku.");
      return;
    }
    const q = normPackQ(newWord);
    setError("");
    if (prefilledEntry) {
      setLookupError(null);
      setSelectedSense(null);
      setModalCustomOnly(false);
      setResolvedLemmaInfo(null);
      setShowSenseModal(true);
      return;
    }
    if (lookupError) {
      return;
    }
    if (isResolveLoading || isLookupLoading) {
      return;
    }
    if (isLookupEligibleQuery(q)) {
      setSelectedSense(null);
      setIsAdded(false);
      setLookupError(null);
      setPrefilledEntry(null);
      if (lastResolvedQuery !== q) {
        void runResolveBeforeLookup(q);
        return;
      }
      if (lastLookupLemma !== q) {
        void runLookupFallback(q);
      }
      return;
    }
    setSelectedSense(null);
    setIsAdded(false);
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
        setPrefilledEntry(null);
        router.push(`/app/vocab/pool?tab=words&highlight=${encodeURIComponent(highlightParam)}`);
        return;
      }
    }
    setNewWord("");
    setShowSenseModal(false);
    setPrefilledEntry(null);
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
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Moja pula</h1>
            {/* Stats pills */}
            {poolCounts && (poolCounts.review + poolCounts.learning + poolCounts.new + poolCounts.mastered) > 0 ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {poolCounts.review > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    {poolCounts.review} do powtórki
                  </span>
                )}
                {poolCounts.learning > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    {poolCounts.learning} w trakcie
                  </span>
                )}
                {poolCounts.new > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    {poolCounts.new} nowych
                  </span>
                )}
                {poolCounts.mastered > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {poolCounts.mastered} opanowanych
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-0.5 text-sm text-slate-500">Słówka dopasowane do Twojego słownictwa</p>
            )}
          </div>
          <nav
            className="inline-flex shrink-0 rounded-full bg-slate-100/90 p-0.5 ring-1 ring-slate-200/60"
            aria-label="Zakładki puli"
          >
            <button type="button" className={segmentedTab(tab === "train")} onClick={() => navigateTab("train")}>
              Trenuj
            </button>
            <button type="button" className={segmentedTab(tab === "quiz")} onClick={() => navigateTab("quiz")}>
              Quiz
            </button>
            <button type="button" className={segmentedTab(tab === "words")} onClick={() => navigateTab("words")}>
              Słowa
            </button>
            <button type="button" className={segmentedTab(tab === "add")} onClick={() => navigateTab("add")}>
              + Dodaj
            </button>
          </nav>
        </div>
        <a
          href="/app/vocab"
          className="inline-flex items-center self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 sm:self-auto"
        >
          ← Słownictwo
        </a>
      </header>

      {/* Banner — powtórka na dziś */}
      {poolCounts && poolCounts.review > 0 && tab !== "train" && tab !== "quiz" ? (
        <div className="relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 px-5 py-3.5 shadow-md shadow-rose-200/50">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
          <p className="relative text-sm font-semibold" style={{ color: "#fff" }}>
            Masz {poolCounts.review} {poolCounts.review === 1 ? "słówko" : "słówek"} do powtórki!
          </p>
          <button
            onClick={() => navigateTab("train")}
            className="relative shrink-0 rounded-xl bg-white/20 px-4 py-1.5 text-sm font-bold ring-1 ring-inset ring-white/30 transition hover:bg-white/30"
            style={{ color: "#fff" }}
          >
            Powtórz →
          </button>
        </div>
      ) : null}

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

      {tab === "quiz" ? (
        <PoolQuizRunner onExit={() => navigateTab("train")} />
      ) : null}

      {tab === "words" ? <PoolTab /> : null}

      {tab === "add" ? (
        <section className="space-y-6">
          <div className="rounded-3xl border border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-white px-5 py-5 shadow-[0_10px_30px_rgba(14,116,144,0.08)] sm:px-6 sm:py-6">
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700/80">Dodaj do puli</p>
                <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900">Dodaj słówko</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {USE_PACK_SEARCH
                    ? "Wpisz fragment po angielsku lub po polsku — podpowiemy słówka z leksykonu, a gdy ich nie mamy, sprawdzimy automatycznie."
                    : "Wpisz słówko po angielsku. System znajdzie wszystkie znaczenia i pozwoli wybrać właściwe."}
                </p>
              </div>

              {packInlineSuccess ? (
                <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
                  {packInlineSuccess}
                </div>
              ) : null}

              <div className="space-y-2 rounded-2xl border border-sky-100/90 bg-white/85 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  ref={packSearchInputRef}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                  placeholder="Wpisz słówko po polsku lub angielsku (np. ball / pilka)"
                  value={newWord}
                  onChange={(e) => {
                    resolveAbortRef.current?.abort();
                    lookupAbortRef.current?.abort();
                    setIsResolveLoading(false);
                    setIsLookupLoading(false);
                    setLookupError(null);
                    setLastResolvedQuery(null);
                    setLastLookupLemma(null);
                    setPrefilledEntry(null);
                    setResolvedLemmaInfo(null);
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
                      e.preventDefault();
                      handleLookupWord();
                      return;
                    }
                  }}
                  autoComplete="off"
                />
                {showPackDropdown ? (
                  <ul
                    ref={packListRef}
                    className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[min(20rem,55vh)] overflow-y-auto rounded-xl border border-slate-200/90 bg-slate-50/95 py-1 shadow-lg shadow-slate-900/8 backdrop-blur-md"
                  >
                    {packSearchResults.map((row, i) => {
                      const hasPl = Boolean(row.translation_pl?.trim());
                      const primaryRight = hasPl
                        ? row.translation_pl!.trim()
                        : truncateDefinitionBlurb(row.definition_en, DROPDOWN_DEF_PRIMARY_MAX) || "—";
                      const showSecondary =
                        hasPl &&
                        Boolean(row.definition_en?.trim()) &&
                        !isDefinitionRedundantWithTranslation(row.definition_en, row.translation_pl);
                      const secondaryLine = showSecondary
                        ? truncateDefinitionBlurb(row.definition_en, DROPDOWN_DEF_SECONDARY_MAX)
                        : null;

                      return (
                        <li key={row.sense_id} className="px-1">
                          <button
                            type="button"
                            data-pack-idx={i}
                            className={`flex w-full flex-col items-stretch gap-1 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 ${
                              packActiveIndex === i
                                ? "bg-sky-100/95 text-slate-900"
                                : "text-slate-800 hover:bg-sky-50/90"
                            }`}
                            onMouseEnter={() => setPackActiveIndex(i)}
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => selectPackRow(row)}
                          >
                            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 text-sm leading-snug">
                              <span className="inline min-w-0 shrink-0 text-slate-900">
                                <HighlightLemmaMatch lemma={row.lemma} query={newWord} />
                              </span>
                              <span
                                className="shrink-0 select-none px-0.5 font-normal text-slate-300"
                                aria-hidden
                              >
                                —
                              </span>
                              <span className="min-w-0 flex-1 basis-[8rem] font-normal text-slate-700">
                                {primaryRight}
                              </span>
                              <span className="shrink-0 rounded-md border border-slate-200/90 bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                {row.pos}
                              </span>
                            </div>
                            {secondaryLine ? (
                              <p className="line-clamp-2 pl-0.5 text-xs font-normal leading-relaxed text-slate-500/90">
                                {secondaryLine}
                              </p>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {USE_PACK_SEARCH && packSearchLoading ? (
                  <p className="mt-1 text-xs text-slate-500">Szukam w leksykonie…</p>
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
                className={`rounded-xl border px-3 py-2.5 transition-colors ${
                  isAdded
                    ? "border-emerald-200/80 bg-emerald-50/60"
                    : "border-slate-200/80 bg-white"
                }`}
              >
                <div className="space-y-2">
                  {resolvedLemmaInfo ? (
                    <div className="rounded-lg border border-slate-200/70 bg-slate-50/80 px-3 py-2">
                      <p className="text-xs font-medium text-slate-700">
                        Najlepsze dopasowanie: {resolvedLemmaInfo.resolvedLemma}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">dla: {resolvedLemmaInfo.originalQuery}</p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    {isAdded ? (
                      <span
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white"
                        aria-hidden
                      >
                        ✓
                      </span>
                    ) : null}
                    <span className="font-semibold text-slate-900">{selectedSense.lemma}</span>
                    <span className="text-slate-300" aria-hidden>
                      —
                    </span>
                    <span className="font-medium text-sky-900">{selectedSense.translation?.trim() || "—"}</span>
                    <span className="rounded-md border border-slate-200/90 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      {selectedSense.pos}
                    </span>
                  </div>

                  {selectedSense.definition?.trim() ? (
                    <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
                      {selectedSense.definition.trim()}
                    </p>
                  ) : null}

                  {isAdded ? (
                    <div className="flex flex-wrap items-center gap-2 border-t border-emerald-200/70 pt-2">
                      <p className="text-sm font-medium text-emerald-900">✓ Dodano do Twojej puli</p>
                      <button
                        type="button"
                        className="rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700"
                        onClick={() => router.push("/app/vocab/pool?tab=train")}
                      >
                        Przećwicz teraz
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                        onClick={handlePackAddAnother}
                      >
                        Dodaj kolejne
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                      <button
                        type="button"
                        className="rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
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
              </div>
            ) : null}

            {USE_PACK_SEARCH &&
            !selectedSense &&
            normPackQ(newWord).length >= 2 &&
            !packSearchLoading &&
            packSearchResults.length === 0 &&
            lastCompletedPackQuery === normPackQ(newWord) &&
            (isResolveLoading || isLookupLoading) ? (
              <div className="rounded-2xl border-2 border-sky-400/35 bg-sky-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-sky-300 border-t-sky-700"
                    aria-hidden
                  />
                  <p className="text-sm font-medium text-slate-900">Nie mamy tego słowa — sprawdzamy...</p>
                </div>
              </div>
            ) : null}

            {USE_PACK_SEARCH &&
            !selectedSense &&
            normPackQ(newWord).length >= 2 &&
            !packSearchLoading &&
            !isResolveLoading &&
            !isLookupLoading &&
            packSearchResults.length === 0 &&
            lastCompletedPackQuery === normPackQ(newWord) &&
            lookupError ? (
              <div className="rounded-2xl border-2 border-amber-400/40 bg-amber-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">Nie rozpoznajemy tego słowa</p>
              </div>
            ) : null}
              </div>
            </div>
          </div>

          <SenseSelectionModal
            lemma={newWord}
            isOpen={showSenseModal}
            prefilledEntry={prefilledEntry}
            onClose={() => {
              setShowSenseModal(false);
              setModalCustomOnly(false);
              setError("");
              setPrefilledEntry(null);
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
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm transition hover:border-slate-300/90 hover:shadow"
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
          {/* ── Dodaj z fiszek ── */}
          <PackBrowser onAdded={refreshPersonal} />
        </section>
      ) : null}
    </main>
  );
}

// ─── Dodaj z fiszek ──────────────────────────────────────────────────────────

type PackRow = {
  id: string;
  label: string;
  display_section: string | null;
  vocab_mode: string | null;
  word_count: number;
};

function PackBrowser({ onAdded }: { onAdded: () => Promise<void> }) {
  const [packs, setPacks] = useState<PackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { added: number; skipped: number }>>({});
  const [openSection, setOpenSection] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("vocab_packs")
          .select("id, label, display_section, vocab_mode")
          .neq("category", "phrasal_verbs")
          .order("display_section", { ascending: true })
          .order("label", { ascending: true });

        if (error) throw error;

        // Get word counts
        const packIds = (data ?? []).map((p: any) => p.id);
        if (packIds.length === 0) { setLoading(false); return; }

        const { data: counts } = await supabase
          .from("vocab_pack_items")
          .select("pack_id")
          .in("pack_id", packIds);

        const countMap: Record<string, number> = {};
        for (const c of counts ?? []) {
          countMap[(c as any).pack_id] = (countMap[(c as any).pack_id] ?? 0) + 1;
        }

        setPacks(
          (data ?? []).map((p: any) => ({
            id: p.id,
            label: p.label,
            display_section: p.display_section ?? "Inne",
            vocab_mode: p.vocab_mode,
            word_count: countMap[p.id] ?? 0,
          }))
        );
      } catch {
        // Non-critical — just hide the section
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleAdd = async (packId: string) => {
    setAdding(packId);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const res = await fetch("/api/vocab/pool/add-from-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pack_id: packId }),
      });
      const data = (await res.json()) as { added?: number; skipped?: number };
      setResults((prev) => ({
        ...prev,
        [packId]: { added: data.added ?? 0, skipped: data.skipped ?? 0 },
      }));
      await onAdded();
    } catch {
      // Silent — don't block UI
    } finally {
      setAdding(null);
    }
  };

  // Group by section
  const sections = Array.from(
    packs.reduce((map, p) => {
      const sec = p.display_section ?? "Inne";
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(p);
      return map;
    }, new Map<string, PackRow[]>())
  );

  if (loading) return null;
  if (packs.length === 0) return null;

  return (
    <div className="rounded-3xl border border-blue-100/80 bg-gradient-to-br from-blue-50/60 via-white to-white px-5 py-5 shadow-sm sm:px-6 sm:py-6">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600/80">Gotowe zestawy</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Dodaj z fiszek</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Kliknij sekcję, wybierz paczkę i dodaj wszystkie słówka do swojej puli jednym kliknięciem.
        </p>
      </div>

      <div className="space-y-2">
        {sections.map(([section, sectionPacks]) => (
          <div key={section} className="overflow-hidden rounded-2xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === section ? null : section)}
              className="flex w-full items-center justify-between gap-3 bg-slate-50/80 px-4 py-3 text-left transition hover:bg-slate-100/60"
            >
              <span className="text-sm font-semibold text-slate-800">{section}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{sectionPacks.length} paczek</span>
                <svg
                  className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${openSection === section ? "rotate-180" : ""}`}
                  viewBox="0 0 16 16" fill="none"
                >
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>

            {openSection === section && (
              <div className="divide-y divide-slate-100 bg-white">
                {sectionPacks.map((pack) => {
                  const result = results[pack.id];
                  const isAdding = adding === pack.id;

                  return (
                    <div key={pack.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-slate-800">{pack.label}</span>
                        <span className="ml-2 text-xs text-slate-400">{pack.word_count} słów</span>
                        {result && (
                          <span className="ml-2 text-xs font-medium text-emerald-600">
                            +{result.added} dodano{result.skipped > 0 ? `, ${result.skipped} już masz` : ""}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={isAdding}
                        onClick={() => void handleAdd(pack.id)}
                        className="relative shrink-0 inline-flex items-center overflow-hidden rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-3.5 py-1.5 text-xs font-bold transition hover:brightness-110 disabled:opacity-60"
                        style={{ color: "#fff" }}
                      >
                        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                        <span className="relative">{isAdding ? "Dodaję…" : "Dodaj →"}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

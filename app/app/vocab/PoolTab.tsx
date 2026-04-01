"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { resolveVerbForm, getVerbFormLabel, shouldShowVerbFormBadge, type VerbFormResult } from "@/lib/vocab/verbForms";
import { poolKnowledgeBadge, type PoolBadgeState } from "@/lib/vocab/poolKnowledgeBadge";

type PoolRow = {
  user_vocab_item_id: string;
  pool_created_at: string;
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

type SenseKnowledgeDetail = {
  state: PoolBadgeState;
  wrong_count: number;
  updated_at: string | null;
  last_wrong_at: string | null;
};

type StatusFilterKey = "all" | "review" | "improving" | "mastered";
type SortModeKey = "priority" | "alpha" | "newest";

function rowLemma(r: PoolRow): string {
  return r.lemma || r.custom_lemma || "—";
}

function rowTranslationPl(r: PoolRow): string {
  return (r.translation_pl || r.custom_translation_pl || "").trim();
}

function knowledgePriorityRank(state: PoolBadgeState): number {
  switch (state) {
    case "unstable":
      return 0;
    case "improving":
      return 1;
    case "new":
      return 2;
    case "mastered":
      return 3;
    default:
      return 2;
  }
}

function vocabListFilterPill(active: boolean) {
  return `rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 sm:px-3.5 sm:py-1.5 sm:text-sm ${
    active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
  }`;
}

function selectedCountLabel(n: number): string {
  if (n === 1) return "1 zaznaczony";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${n} zaznaczone`;
  }
  return `${n} zaznaczonych`;
}

/** Biernik po „usunąć / oznaczyć”: 1 pozycję, 2 pozycje, 5 pozycji */
function accusativePositionsPhrase(n: number): string {
  if (n === 1) return "1 pozycję";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${n} pozycje`;
  }
  return `${n} pozycji`;
}

const STATUS_FILTER_OPTIONS: { key: StatusFilterKey; label: string }[] = [
  { key: "all", label: "Wszystkie" },
  { key: "review", label: "Do nauki" },
  { key: "improving", label: "W trakcie" },
  { key: "mastered", label: "Opanowane" },
];

const WORDS_CARD_GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

const pillSelectClass =
  "rounded-full border border-neutral-200/90 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-neutral-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition hover:border-neutral-300 focus:border-neutral-300 focus:ring-2 focus:ring-neutral-900/8";

const pillInputClass =
  "min-w-[10rem] flex-1 rounded-full border border-neutral-200/90 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none placeholder:text-neutral-400 focus:border-neutral-300 focus:ring-2 focus:ring-neutral-900/8 sm:max-w-[220px]";

function senseDetail(
  senseId: string | null,
  map: Record<string, SenseKnowledgeDetail>
): SenseKnowledgeDetail {
  if (!senseId) return { state: "new", wrong_count: 0, updated_at: null, last_wrong_at: null };
  return map[senseId] ?? { state: "new", wrong_count: 0, updated_at: null, last_wrong_at: null };
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" />
    </svg>
  );
}

function PoolWordsCard(props: {
  r: PoolRow;
  selected: boolean;
  onToggleSelect: () => void;
  onAfterDelete: () => void;
  setError: (msg: string) => void;
  highlight: boolean;
  verbForm: VerbFormResult | null;
  knowBadge: ReturnType<typeof poolKnowledgeBadge>;
}) {
  const { r, selected, onToggleSelect, onAfterDelete, setError, highlight, verbForm, knowBadge } = props;

  const getDisplayLemma = useCallback((row: PoolRow) => row.lemma || row.custom_lemma || "—", []);
  const getDisplayTranslation = useCallback(
    (row: PoolRow, vf: VerbFormResult | null) => {
      if (vf && shouldShowVerbFormBadge(row.pos, vf)) {
        return `Forma od: ${vf.baseLemma}`;
      }
      return row.translation_pl || row.custom_translation_pl || "—";
    },
    []
  );

  const lemma = getDisplayLemma(r);

  const remove = async () => {
    if (!confirm(`Usunąć „${lemma}” z puli?`)) return;
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setError("Musisz być zalogowany");
        return;
      }
      const res = await fetch("/api/vocab/delete-word", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_vocab_item_id: r.user_vocab_item_id }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      await onAfterDelete();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nie udało się usunąć.");
    }
  };

  const ex = r.example_en?.trim();

  return (
    <div
      className={`group relative w-full max-w-[300px] justify-self-center rounded-xl border border-neutral-200 bg-white px-3 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-[2px] hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)] sm:px-4 sm:py-3 ${
        highlight ? "border-amber-200 bg-amber-50/90 ring-1 ring-amber-200/50" : ""
      }`}
    >
      <button
        type="button"
        aria-label="Usuń z puli"
        onClick={() => void remove()}
        className="absolute right-2 top-2 rounded-md p-1 text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
      >
        <TrashIcon />
      </button>
      <div className="flex gap-2 pr-7">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400/40"
        />
        <div className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 leading-[1.25]">
            <span className="text-sm font-semibold text-neutral-900">{lemma}</span>
            {r.pos ? <span className="text-xs font-normal text-neutral-400">{r.pos}</span> : null}
            {verbForm && shouldShowVerbFormBadge(r.pos, verbForm) && (
              <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800 sm:text-[11px]">
                Forma: {getVerbFormLabel(verbForm.formType)}
              </span>
            )}
            {(r.source === "custom" || !r.verified) && (
              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 sm:text-[11px]">własne</span>
            )}
            <span
              className={`origin-left rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition duration-200 ease-out will-change-transform group-hover:scale-[1.03] group-hover:brightness-[1.02] sm:text-[11px] ${knowBadge.className}`}
            >
              {knowBadge.label}
            </span>
          </div>
          <div className={`relative mt-0.5 overflow-hidden ${ex ? "min-h-[2.5rem]" : ""}`}>
            {ex ? (
              <>
                <div className="absolute inset-0 z-[1] transition-opacity duration-[140ms] ease-out group-hover:pointer-events-none group-hover:opacity-0">
                  <p className="line-clamp-2 text-sm font-medium leading-[1.35] text-neutral-800">
                    {getDisplayTranslation(r, verbForm)}
                  </p>
                  {shouldShowVerbFormBadge(r.pos, verbForm) && r.translation_pl ? (
                    <span className="mt-0.5 block text-xs font-medium text-neutral-500">Baza: {r.translation_pl}</span>
                  ) : null}
                </div>
                <p className="pointer-events-none absolute inset-0 z-[2] line-clamp-3 text-sm italic leading-[1.35] text-neutral-500 opacity-0 transition-opacity duration-[140ms] ease-out group-hover:opacity-100">
                  {`\u201E${ex}\u201D`}
                </p>
              </>
            ) : (
              <>
                <p className="line-clamp-2 text-sm font-medium leading-[1.35] text-neutral-800">
                  {getDisplayTranslation(r, verbForm)}
                </p>
                {shouldShowVerbFormBadge(r.pos, verbForm) && r.translation_pl ? (
                  <span className="mt-0.5 block text-xs font-medium text-neutral-500">Baza: {r.translation_pl}</span>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PoolTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightParam = searchParams.get("highlight");
  const highlightTerms = useMemo(() => {
    if (!highlightParam) return new Set<string>();
    return new Set(highlightParam.split(',').map(t => t.toLowerCase().trim()).filter(Boolean));
  }, [highlightParam]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [filterQ, setFilterQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("all");
  const [sortMode, setSortMode] = useState<SortModeKey>("priority");
  const [poolRows, setPoolRows] = useState<PoolRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkHint, setBulkHint] = useState<string>("");

  const [knowledgeDetailBySense, setKnowledgeDetailBySense] = useState<Record<string, SenseKnowledgeDetail>>({});
  
  // Cache for verb form resolutions: lemma -> VerbFormResult
  const [verbFormCache, setVerbFormCache] = useState<Map<string, VerbFormResult | null>>(new Map());

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  async function load() {
    try {
      setLoading(true);
      setError("");

      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return;

      const userId = sess.session!.user.id;

      // Fetch user vocab items with lexicon data
      const { data: userItems, error: itemsErr } = await supabase
        .from("user_vocab_items")
        .select(
          `
          id,
          created_at,
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
          pool_created_at: typeof item.created_at === "string" ? item.created_at : "",
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

      const senseIds = mapped.map((r) => r.sense_id).filter((id): id is string => Boolean(id));
      const kMap: Record<string, SenseKnowledgeDetail> = {};
      if (senseIds.length > 0) {
        const { data: knRows, error: knErr } = await supabase
          .from("user_learning_unit_knowledge")
          .select("unit_id, knowledge_state, wrong_count, updated_at, last_wrong_at")
          .eq("student_id", userId)
          .eq("unit_type", "sense")
          .in("unit_id", senseIds);
        if (!knErr && knRows) {
          for (const row of knRows as {
            unit_id: string;
            knowledge_state: PoolBadgeState | null;
            wrong_count: number | null;
            updated_at: string | null;
            last_wrong_at: string | null;
          }[]) {
            kMap[row.unit_id] = {
              state: row.knowledge_state ?? "new",
              wrong_count: row.wrong_count ?? 0,
              updated_at: row.updated_at ?? null,
              last_wrong_at: row.last_wrong_at ?? null,
            };
          }
        }
      }
      setKnowledgeDetailBySense(kMap);
      setPoolRows(mapped);
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

  const visibleRows = useMemo(() => {
    let list = poolRows;
    const fq = filterQ.trim().toLowerCase();
    if (fq) {
      list = list.filter((r) => {
        const lem = rowLemma(r).toLowerCase();
        const tr = rowTranslationPl(r).toLowerCase();
        return lem.includes(fq) || tr.includes(fq);
      });
    }
    if (statusFilter !== "all") {
      list = list.filter((r) => {
        const st = senseDetail(r.sense_id, knowledgeDetailBySense).state;
        if (statusFilter === "review") return st === "unstable";
        if (statusFilter === "improving") return st === "improving";
        if (statusFilter === "mastered") return st === "mastered";
        return true;
      });
    }
    const sorted = [...list];
    if (sortMode === "priority") {
      sorted.sort((a, b) => {
        const da = senseDetail(a.sense_id, knowledgeDetailBySense);
        const db = senseDetail(b.sense_id, knowledgeDetailBySense);
        const ra = knowledgePriorityRank(da.state);
        const rb = knowledgePriorityRank(db.state);
        if (ra !== rb) return ra - rb;
        if (db.wrong_count !== da.wrong_count) return db.wrong_count - da.wrong_count;
        const la = da.last_wrong_at ?? "";
        const lb = db.last_wrong_at ?? "";
        if (la !== lb) return lb.localeCompare(la);
        return rowLemma(a).localeCompare(rowLemma(b), "pl");
      });
    } else if (sortMode === "newest") {
      sorted.sort((a, b) => (b.pool_created_at || "").localeCompare(a.pool_created_at || ""));
    } else {
      sorted.sort((a, b) => rowLemma(a).localeCompare(rowLemma(b), "pl"));
    }
    return sorted;
  }, [poolRows, filterQ, statusFilter, sortMode, knowledgeDetailBySense]);

  // Check verb forms for all loaded lemmas
  useEffect(() => {
    if (poolRows.length === 0) return;

    const checkAllVerbForms = async () => {
      for (const row of poolRows) {
        const lemma = rowLemma(row);
        if (lemma && lemma !== "—" && !verbFormCache.has(lemma)) {
          await checkVerbForm(lemma);
        }
      }
    };

    void checkAllVerbForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolRows]);

  function getDisplayLemma(row: PoolRow): string {
    return rowLemma(row);
  }

  async function checkVerbForm(lemma: string): Promise<VerbFormResult | null> {
    if (!lemma || verbFormCache.has(lemma)) {
      const cached = verbFormCache.get(lemma);
      console.log(`[PoolTab] checkVerbForm cache hit for "${lemma}":`, cached);
      return cached ?? null;
    }

    try {
      console.log(`[PoolTab] checkVerbForm resolving "${lemma}"...`);
      const result = await resolveVerbForm(lemma, supabase);
      console.log(`[PoolTab] checkVerbForm result for "${lemma}":`, result);
      setVerbFormCache((prev) => new Map(prev).set(lemma, result));
      return result;
    } catch (e) {
      console.error("[PoolTab] Error resolving verb form:", e);
      setVerbFormCache((prev) => new Map(prev).set(lemma, null));
      return null;
    }
  }

  const toggleSelected = (userVocabItemId: string) => {
    setSelected((prev) => ({ ...prev, [userVocabItemId]: !prev[userVocabItemId] }));
  };

  const selectAll = () => {
    const next: Record<string, boolean> = {};
    for (const r of visibleRows) next[r.user_vocab_item_id] = true;
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

  const bulkSelectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([id]) => id),
    [selected]
  );

  const bulkDelete = async () => {
    if (bulkSelectedIds.length === 0) return;
    if (!confirm(`Usunąć ${accusativePositionsPhrase(bulkSelectedIds.length)} z puli?`)) return;
    setBulkHint("");
    setError("");
    setBulkBusy(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setError("Musisz być zalogowany");
        return;
      }
      const res = await fetch("/api/vocab/pool/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete", user_vocab_item_ids: bulkSelectedIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSelected({});
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nie udało się usunąć.");
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkMarkMastered = async () => {
    if (bulkSelectedIds.length === 0) return;
    if (!confirm(`Oznaczyć ${accusativePositionsPhrase(bulkSelectedIds.length)} jako opanowane?`)) return;
    setBulkHint("");
    setError("");
    setBulkBusy(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setError("Musisz być zalogowany");
        return;
      }
      const res = await fetch("/api/vocab/pool/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "mark_mastered", user_vocab_item_ids: bulkSelectedIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (typeof data.skipped_no_sense_id === "number" && data.skipped_no_sense_id > 0) {
        setBulkHint(
          `${data.skipped_no_sense_id} ${data.skipped_no_sense_id === 1 ? "pozycja bez znaczenia leksykonu została pominięta" : "pozycji bez znaczenia leksykonu pominięto"} (np. wyłącznie własne).`
        );
      }
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nie udało się zaktualizować postępu.");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900">Wszystkie słowa</h2>
          <p className="mt-0.5 text-sm text-neutral-500">
            Najedź kartę, by zobaczyć przykład zdaniowy; domyślnie widać tłumaczenie.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {visibleRows.length >= 2 ? (
            <>
              <button
                type="button"
                onClick={selectAll}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100"
              >
                Zaznacz widoczne
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100"
              >
                Wyczyść
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={startTest}
            disabled={selectedCount === 0}
            className="rounded-xl border-2 border-neutral-900 bg-white px-4 py-2 text-xs font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Test ({selectedCount})
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <nav
          className="inline-flex max-w-full flex-wrap gap-0.5 rounded-full bg-slate-100/90 p-0.5 ring-1 ring-slate-200/60"
          aria-label="Filtr statusu nauki"
        >
          {STATUS_FILTER_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={vocabListFilterPill(statusFilter === key)}
              onClick={() => setStatusFilter(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:min-w-[280px]">
          <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-600">
            <span className="shrink-0">Sortuj:</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortModeKey)}
              className={pillSelectClass}
              aria-label="Sortuj listę"
            >
              <option value="priority">Priorytet ↓</option>
              <option value="alpha">Alfabetycznie (A-Z)</option>
              <option value="newest">Ostatnio dodane</option>
            </select>
          </label>
          <input
            value={filterQ}
            onChange={(e) => {
              setFilterQ(e.target.value);
              setBulkHint("");
            }}
            type="search"
            placeholder="Szukaj słowa lub tłumaczenia…"
            className={`${pillInputClass} min-w-[12rem] flex-1 sm:max-w-[280px]`}
            aria-label="Szukaj w puli"
          />
        </div>
      </div>

      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200/90 bg-neutral-50/90 px-3 py-2.5 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <span className="min-w-0 font-medium text-neutral-800">{selectedCountLabel(selectedCount)}</span>
          <div className="ml-auto flex flex-wrap items-center gap-2 sm:ml-0">
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => void bulkDelete()}
              className="rounded-full border border-red-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Usuń
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => void bulkMarkMastered()}
              className="rounded-full border border-emerald-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-50/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Oznacz jako opanowane
            </button>
          </div>
        </div>
      ) : null}

      {bulkHint ? (
        <p className="text-xs font-medium text-neutral-600" role="status">
          {bulkHint}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[4.5rem] rounded-2xl border border-neutral-200/80 bg-neutral-100/50 animate-pulse shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
            />
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
          <span className="font-semibold">Błąd: </span>
          {error}
        </div>
      ) : null}

      <div className={WORDS_CARD_GRID}>
        {visibleRows.map((r) => {
          const lemma = getDisplayLemma(r);
          const lemmaNorm = lemma.toLowerCase();
          const verbForm = verbFormCache.get(lemma) ?? null;
          const isHighlighted = highlightTerms.has(lemmaNorm);
          const kState = senseDetail(r.sense_id, knowledgeDetailBySense).state;
          const knowBadge = poolKnowledgeBadge(kState);

          return (
            <PoolWordsCard
              key={r.user_vocab_item_id}
              r={r}
              selected={!!selected[r.user_vocab_item_id]}
              onToggleSelect={() => toggleSelected(r.user_vocab_item_id)}
              onAfterDelete={() => load()}
              setError={setError}
              highlight={isHighlighted}
              verbForm={verbForm}
              knowBadge={knowBadge}
            />
          );
        })}
      </div>

      {!loading && poolRows.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm font-medium text-neutral-800">Nie masz jeszcze słówek w puli.</p>
          <p className="mt-1 text-sm text-neutral-600">Dodaj je w zakładce „Dodaj”.</p>
        </div>
      ) : null}
      {!loading && poolRows.length > 0 && visibleRows.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm font-medium text-neutral-800">Brak słów dla wybranych filtrów.</p>
          <p className="mt-1 text-sm text-neutral-600">Zmień status, sortowanie lub wyszukiwanie.</p>
        </div>
      ) : null}
    </div>
  );
}

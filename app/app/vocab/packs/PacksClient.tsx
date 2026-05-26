"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PackCompletionBadge } from "@/lib/vocab/packCompletionBadge";
import {
  OTHER_SECTION_KEY,
  comparePacksForCatalog,
  compareSectionLabels,
  packSectionLabelPl,
} from "@/lib/vocab/packCatalogOrder";

export type PackDto = {
  id: string;
  slug: string;
  /** Raw DB title (fallback). */
  title: string;
  /** User-facing title: display_title if set, else title. */
  presentation_title: string;
  order_index: number;
  item_count: number;
  vocab_mode: "daily" | "precise";
  category: string;
  display_section: string | null;
  display_subsection: string | null;
  featured_rank: number | null;
  is_archived: boolean;
  completion_badge: PackCompletionBadge;
};

type VocabMode = "daily" | "precise";
const STORAGE_KEY = "vocabMode";

type PosFilter = "all" | "nouns" | "verbs" | "phrasal_verbs";

const POS_FILTER_LABELS: Record<PosFilter, string> = {
  all: "Wszystkie",
  nouns: "Rzeczowniki",
  verbs: "Czasowniki",
  phrasal_verbs: "Phrasal Verbs",
};

const isValidMode = (value: string | null): value is VocabMode =>
  value === "daily" || value === "precise";

function packHref(slug: string, mode: VocabMode) {
  return `/app/vocab/pack/${slug}?mode=${mode}`;
}

const cardBase =
  "rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)]";

function polishFiszkiForm(n: number): string {
  if (n === 1) return "fiszka";
  const last = n % 10;
  const lastTwo = n % 100;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "fiszki";
  return "fiszek";
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PackCompletionGlyph({ badge }: { badge: PackCompletionBadge }) {
  const label =
    badge === "none"
      ? "Ta fiszka nie została jeszcze rozpoczęta"
      : badge === "partial"
        ? "W toku lub bez pełnej poprawności"
        : "Cała fiszka ukończona poprawnie";
  const colorClass =
    badge === "none" ? "text-slate-300" : badge === "partial" ? "text-amber-500" : "text-emerald-600";
  return (
    <span
      className={`shrink-0 ${colorClass}`}
      title={label}
      aria-label={label}
    >
      <svg
        className="h-[19px] w-[19px]"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M5.4 8.1l1.7 1.7 3.5-3.7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function ChevronDown({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      className={`${className ?? ""} transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function groupPacksBySection(packs: PackDto[], mode: VocabMode) {
  const map = new Map<string, PackDto[]>();
  for (const p of packs) {
    const raw = (p.display_section ?? "").trim();
    const key = raw || OTHER_SECTION_KEY;
    const list = map.get(key) ?? [];
    list.push(p);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) =>
      comparePacksForCatalog(
        {
          featured_rank: a.featured_rank,
          order_index: a.order_index,
          presentation_title: a.presentation_title,
        },
        {
          featured_rank: b.featured_rank,
          order_index: b.order_index,
          presentation_title: b.presentation_title,
        },
      ),
    );
  }
  const keys = [...map.keys()].sort((a, b) => compareSectionLabels(a, b, mode));
  return keys.map((key) => ({
    key,
    label: packSectionLabelPl(key, mode),
    packs: map.get(key)!,
  }));
}

function applySectionSearch(
  groups: { key: string; label: string; packs: PackDto[] }[],
  q: string,
): { key: string; label: string; packs: PackDto[] }[] {
  const ql = q.trim().toLowerCase();
  if (!ql) return groups;
  return groups
    .map((g) => ({
      ...g,
      packs: g.packs.filter(
        (p) =>
          g.label.toLowerCase().includes(ql) ||
          p.presentation_title.toLowerCase().includes(ql) ||
          p.title.toLowerCase().includes(ql) ||
          (p.display_section ?? "").toLowerCase().includes(ql),
      ),
    }))
    .filter((g) => g.packs.length > 0);
}

function PackSection({
  label,
  packs,
  mode,
  sectionSurfaceClassName,
}: {
  label: string;
  packs: PackDto[];
  mode: VocabMode;
  sectionSurfaceClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  if (packs.length === 0) return null;

  const preview = packs.slice(0, 3);
  const showToggle = packs.length > 3;
  const visible = open ? packs : preview;

  const surface = sectionSurfaceClassName ?? cardBase;

  return (
    <section className={surface}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mb-4 flex w-full items-center gap-2.5 text-left"
      >
        <ChevronDown open={open} className="mt-1 h-5 w-5 shrink-0 text-neutral-700" />
        <h2 className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-xl font-black leading-tight tracking-tight text-neutral-900 sm:text-2xl">
            {label}
          </span>
          <span className="text-sm font-semibold tabular-nums text-slate-500 sm:text-base">{packs.length}</span>
        </h2>
      </button>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((pack) => (
          <li key={pack.id}>
            <Link
              href={packHref(pack.slug, mode)}
              className="group/row flex h-full flex-col justify-between rounded-xl border border-slate-100 px-4 py-3.5 transition-all duration-150 hover:border-slate-200 hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">{pack.presentation_title}</span>
                <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
                  <PackCompletionGlyph badge={pack.completion_badge} />
                  <ChevronRight className="shrink-0 text-slate-300 transition-colors group-hover/row:text-slate-500" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xs font-medium tabular-nums text-slate-600">
                  {pack.item_count} {polishFiszkiForm(pack.item_count)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {showToggle && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
        >
          Pokaż wszystkie ({packs.length})
        </button>
      ) : null}
      {showToggle && open ? (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-3 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
        >
          Zwiń
        </button>
      ) : null}
    </section>
  );
}

export default function PacksClient({
  initialPacks,
  isAdmin,
}: {
  initialPacks: PackDto[];
  isAdmin: boolean;
}) {
  const searchParams = useSearchParams();
  const [vocabMode, setVocabMode] = useState<VocabMode>("daily");
  const [posFilter, setPosFilter] = useState<PosFilter>("all");
  const [categoryQuery, setCategoryQuery] = useState("");

  const modeFromUrl = useMemo<VocabMode | null>(() => {
    const raw = (searchParams.get("mode") ?? "").toLowerCase();
    if (raw === "mixed") return "daily";
    return isValidMode(raw) ? raw : null;
  }, [searchParams]);

  useEffect(() => {
    if (modeFromUrl) {
      setVocabMode(modeFromUrl);
      localStorage.setItem(STORAGE_KEY, modeFromUrl);
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (isValidMode(stored)) {
      setVocabMode(stored);
      return;
    }

    setVocabMode("daily");
  }, [modeFromUrl]);

  const normalizedQuery = categoryQuery.trim().toLowerCase();

  const filteredPacks = useMemo(() => {
    return initialPacks.filter((pack) => {
      if (pack.vocab_mode !== vocabMode) return false;
      if (posFilter === "all") return true;
      if (posFilter === "verbs") return pack.category === "verbs";
      if (posFilter === "phrasal_verbs") return pack.category === "phrasal_verbs";
      // "nouns" = everything that is not a verb or phrasal verb pack
      if (posFilter === "nouns") return pack.category !== "verbs" && pack.category !== "phrasal_verbs";
      return true;
    });
  }, [initialPacks, vocabMode, posFilter]);

  const activePacks = useMemo(() => filteredPacks.filter((p) => !p.is_archived), [filteredPacks]);
  const archivedForMode = useMemo(
    () => (isAdmin ? filteredPacks.filter((p) => p.is_archived) : []),
    [filteredPacks, isAdmin],
  );

  const sectionGroups = useMemo(() => {
    const grouped = groupPacksBySection(activePacks, vocabMode);
    return applySectionSearch(grouped, normalizedQuery);
  }, [activePacks, vocabMode, normalizedQuery]);

  const visibleArchived = useMemo(() => {
    if (!isAdmin || archivedForMode.length === 0) return [];
    const ql = normalizedQuery;
    if (!ql) return archivedForMode;
    return archivedForMode.filter(
      (p) =>
        p.presentation_title.toLowerCase().includes(ql) ||
        p.title.toLowerCase().includes(ql) ||
        (p.display_section ?? "").toLowerCase().includes(ql),
    );
  }, [archivedForMode, isAdmin, normalizedQuery]);

  const hasVisibleSections = sectionGroups.length > 0 || visibleArchived.length > 0;

  return (
    <div>
      <header className="mb-5">
        <Link
          href="/app/vocab"
          className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"
        >
          ← Słownictwo
        </Link>
        <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">Fiszki</h1>
        <p className="mt-0.5 text-xs font-medium text-slate-400">Szybkie powtórki na podstawie fiszek</p>
      </header>

      <div className="mb-5 flex flex-col gap-3">
        {/* Row 1: mode + search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {(["daily", "precise"] as VocabMode[]).map((m) => {
              const active = vocabMode === m;
              const label = m === "daily" ? "Daily" : "Precise";
              return (
                <button
                  key={m}
                  type="button"
                  className={`rounded-xl px-5 py-3 text-base font-semibold transition-all duration-150 ${
                    active
                      ? "border border-slate-300 bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                      : "border border-slate-200/60 bg-transparent text-slate-400 hover:border-slate-300 hover:text-slate-600"
                  }`}
                  onClick={() => {
                    setVocabMode(m);
                    localStorage.setItem(STORAGE_KEY, m);
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              value={categoryQuery}
              onChange={(event) => setCategoryQuery(event.target.value)}
              placeholder="Szukaj sekcji lub fiszki…"
              className="w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
            />
            {categoryQuery ? (
              <button
                type="button"
                onClick={() => setCategoryQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 transition-colors hover:text-slate-600"
                aria-label="Wyczyść wyszukiwanie"
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>

        {/* Row 2: POS filter */}
        <div className="flex gap-2">
          {(["all", "nouns", "verbs", "phrasal_verbs"] as PosFilter[]).map((f) => {
            const active = posFilter === f;
            return (
              <button
                key={f}
                type="button"
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "border border-slate-300 bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                    : "border border-slate-200 bg-transparent text-slate-400 hover:border-slate-300 hover:text-slate-600"
                }`}
                onClick={() => setPosFilter(f)}
              >
                {POS_FILTER_LABELS[f]}
              </button>
            );
          })}
        </div>
      </div>

      {filteredPacks.length === 0 ? (
        <div className={cardBase}>
          <p className="text-sm text-slate-400">Brak dostępnych fiszek w tym trybie.</p>
        </div>
      ) : normalizedQuery && !hasVisibleSections ? (
        <div className={cardBase}>
          <p className="text-sm text-slate-400">Brak wyników pasujących do wyszukiwania.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {sectionGroups.map(({ key, label, packs }) => (
            <PackSection key={key} label={label} packs={packs} mode={vocabMode} />
          ))}
          {isAdmin && visibleArchived.length > 0 ? (
            <PackSection
              label="Zarchiwizowane"
              packs={visibleArchived}
              mode={vocabMode}
              sectionSurfaceClassName={`${cardBase} border-dashed border-slate-200/90 bg-slate-50/70`}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

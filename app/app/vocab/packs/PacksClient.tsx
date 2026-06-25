"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PackCompletionBadge } from "@/lib/vocab/packCompletionBadge";
import {
  OTHER_SECTION_KEY,
  comparePacksForCatalog,
  compareSectionLabels,
  packSectionLabelPl,
} from "@/lib/vocab/packCatalogOrder";
import CategoryIcon from "@/app/_components/CategoryIcon";

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

type PosFilter = "all" | "nouns" | "verbs" | "phrasal_verbs" | "adjectives";

const POS_FILTER_LABELS: Record<PosFilter, string> = {
  all: "Wszystkie",
  nouns: "Rzeczowniki",
  verbs: "Czasowniki",
  adjectives: "Przymiotniki",
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

type SectionGroup = { key: string; label: string; packs: PackDto[] };

/** Pozycja listy kategorii po prawej — aktywna ma niebieski gradient. */
function CategoryListItem({
  group,
  isActive,
  onSelect,
}: {
  group: SectionGroup;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group/cat flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all duration-150 ${
        isActive
          ? "bg-gradient-to-br from-sky-400 to-blue-600 ring-1 ring-inset ring-white/20"
          : "hover:bg-slate-50"
      }`}
    >
      <span className={isActive ? "rounded-lg bg-white/15 p-0.5" : ""}>
        <CategoryIcon section={group.key} size={26} />
      </span>
      <span
        className="min-w-0 flex-1 truncate text-sm font-bold tracking-tight"
        style={isActive ? { color: "#fff" } : { color: "#0f172a" }}
      >
        {group.label}
      </span>
      <span
        className="shrink-0 text-xs font-semibold tabular-nums"
        style={isActive ? { color: "rgba(255,255,255,0.8)" } : { color: "#94a3b8" }}
      >
        {group.packs.length}
      </span>
    </button>
  );
}

/** Pojedynczy kafelek podkategorii (paczki) w panelu głównym. */
function SubcategoryTile({ pack, mode }: { pack: PackDto; mode: VocabMode }) {
  return (
    <Link
      href={packHref(pack.slug, mode)}
      className="group/row flex flex-col gap-1.5 rounded-xl border border-slate-100 bg-white px-3.5 py-3 transition-all duration-150 hover:-translate-y-px hover:border-slate-200 hover:bg-slate-50 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
    >
      <div className="flex items-center gap-1.5">
        <PackCompletionGlyph badge={pack.completion_badge} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
          {pack.presentation_title}
        </span>
        <ChevronRight className="shrink-0 text-slate-300 transition-colors group-hover/row:text-slate-500" />
      </div>
      <span className="pl-[26px] text-xs font-medium tabular-nums text-slate-500">
        {pack.item_count} {polishFiszkiForm(pack.item_count)}
      </span>
    </Link>
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
      if (posFilter === "adjectives") return pack.category === "adjectives";
      // "nouns" = everything that is not a verb, phrasal verb, or adjective pack
      if (posFilter === "nouns") return pack.category !== "verbs" && pack.category !== "phrasal_verbs" && pack.category !== "adjectives";
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

  // Master-detail: aktywna kategoria + płynne przejście panelu
  const [activeSection, setActiveSection] = useState<string>("");
  const [panelVisible, setPanelVisible] = useState(true);
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Utrzymaj aktywną kategorię w obrębie dostępnych grup
  useEffect(() => {
    if (sectionGroups.length === 0) {
      setActiveSection("");
      return;
    }
    if (!sectionGroups.some((g) => g.key === activeSection)) {
      setActiveSection(sectionGroups[0].key);
    }
  }, [sectionGroups, activeSection]);

  useEffect(() => () => {
    if (transitionRef.current) clearTimeout(transitionRef.current);
  }, []);

  const selectSection = (key: string) => {
    if (key === activeSection) return;
    if (transitionRef.current) clearTimeout(transitionRef.current);
    setPanelVisible(false);
    transitionRef.current = setTimeout(() => {
      setActiveSection(key);
      requestAnimationFrame(() => setPanelVisible(true));
    }, 160);
  };

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

  const archivedGroup: SectionGroup | null =
    isAdmin && visibleArchived.length > 0
      ? { key: "__other__", label: "Zarchiwizowane", packs: visibleArchived }
      : null;
  const activeGroup =
    (activeSection === "__other__" ? archivedGroup : null) ??
    sectionGroups.find((g) => g.key === activeSection) ??
    sectionGroups[0];

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">Fiszki</h1>
      </header>

      <div className="mb-5 flex flex-col gap-3">
        {/* Row 1: mode + search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {(["daily", "precise"] as VocabMode[]).map((m) => {
              const active = vocabMode === m;
              const label = m === "daily" ? "Codzienne" : "Szczegółowe";
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setVocabMode(m);
                    localStorage.setItem(STORAGE_KEY, m);
                  }}
                  className="transition-all duration-150"
                >
                  {active ? (
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-sky-400 to-blue-700 px-5 py-2.5 ring-1 ring-inset ring-white/20">
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                      <span className="relative text-base font-black tracking-tight" style={{ color: "#fff" }}>{label}</span>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-base font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800">
                      {label}
                    </div>
                  )}
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
        <div className="flex flex-wrap gap-2">
          {(["all", "nouns", "verbs", "adjectives", "phrasal_verbs"] as PosFilter[]).map((f) => {
            const active = posFilter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setPosFilter(f)}
                className="transition-all duration-150"
              >
                {active ? (
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 px-3.5 py-1.5 ring-1 ring-inset ring-white/20">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                    <span className="relative text-sm font-semibold" style={{ color: "#fff" }}>{POS_FILTER_LABELS[f]}</span>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-800">
                    {POS_FILTER_LABELS[f]}
                  </div>
                )}
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2.4fr_1fr] lg:items-start">
          {/* ── Panel główny: podkategorie wybranej kategorii (stała wysokość) ── */}
          <section className={`${cardBase} flex flex-col lg:h-[540px]`}>
            {activeGroup ? (
              <div
                className={`flex min-h-0 flex-1 flex-col transition-all duration-200 ${
                  panelVisible ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"
                }`}
              >
                {/* Nagłówek panelu */}
                <div className="mb-4 flex shrink-0 items-center gap-2.5">
                  <CategoryIcon section={activeGroup.key} size={34} />
                  <h2 className="flex min-w-0 flex-1 items-baseline gap-2">
                    <span className="text-xl font-black tracking-tight text-neutral-900 sm:text-2xl">
                      {activeGroup.label}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-slate-500">
                      {activeGroup.packs.length}
                    </span>
                  </h2>
                </div>

                {/* Kafelki podkategorii — scroll wewnątrz panelu */}
                <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 content-start gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {activeGroup.packs.map((pack) => (
                    <SubcategoryTile key={pack.id} pack={pack} mode={vocabMode} />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Wybierz kategorię z listy.</p>
            )}
          </section>

          {/* ── Lista kategorii głównych (ta sama wysokość, scroll wewnętrzny) ── */}
          <aside className="flex flex-col rounded-2xl border border-slate-200/50 bg-white/90 p-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-sm lg:h-[540px] lg:sticky lg:top-28">
            <div className="mb-1.5 shrink-0 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Kategorie
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
              {sectionGroups.map((group) => (
                <CategoryListItem
                  key={group.key}
                  group={group}
                  isActive={group.key === activeSection}
                  onSelect={() => selectSection(group.key)}
                />
              ))}
              {isAdmin && visibleArchived.length > 0 ? (
                <CategoryListItem
                  group={{ key: "__other__", label: "Zarchiwizowane", packs: visibleArchived }}
                  isActive={activeSection === "__other__"}
                  onSelect={() => selectSection("__other__")}
                />
              ) : null}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

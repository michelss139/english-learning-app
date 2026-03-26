"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export type PackDto = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  order_index: number;
  item_count: number;
  vocab_mode: "daily" | "mixed" | "precise";
  category: string;
};

type VocabMode = "daily" | "precise";
const STORAGE_KEY = "vocabMode";

const isValidMode = (value: string | null): value is VocabMode =>
  value === "daily" || value === "precise";

function packHref(slug: string, mode: VocabMode) {
  return `/app/vocab/pack/${slug}?mode=${mode}`;
}

const cardBase =
  "rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)]";

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

function PackSection({ label, packs, mode }: { label: string; packs: PackDto[]; mode: VocabMode }) {
  const [open, setOpen] = useState(false);

  if (packs.length === 0) return null;

  const preview = packs.slice(0, 3);
  const showToggle = packs.length > 3;
  const visible = open ? packs : preview;

  return (
    <section className={cardBase}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mb-4 flex w-full items-center gap-2 text-left"
      >
        <ChevronDown open={open} className="text-slate-400" />
        <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
          {label}
          <span className="ml-1.5 font-medium normal-case tracking-normal text-slate-300">
            {packs.length}
          </span>
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
                <span className="text-sm font-medium text-slate-800">{pack.title}</span>
                <ChevronRight className="mt-0.5 shrink-0 text-slate-300 transition-colors group-hover/row:text-slate-500" />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">{pack.item_count} fiszek</span>
                {pack.description ? (
                  <span className="truncate text-[10px] text-slate-400">{pack.description}</span>
                ) : null}
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

export default function PacksClient({ initialPacks }: { initialPacks: PackDto[] }) {
  const searchParams = useSearchParams();
  const [vocabMode, setVocabMode] = useState<VocabMode>("daily");
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
  const labelMatches = (label: string) => !normalizedQuery || label.toLowerCase().includes(normalizedQuery);

  const filteredPacks = useMemo(() => {
    return initialPacks.filter(
      (pack) => pack.vocab_mode === vocabMode || (vocabMode === "daily" && pack.vocab_mode === "mixed"),
    );
  }, [initialPacks, vocabMode]);

  const shopPack = filteredPacks.find((pack) => pack.slug === "shop");
  const transportPacks = filteredPacks.filter((pack) => pack.slug.startsWith("transport-"));
  const contractsPacks = filteredPacks.filter((pack) => pack.slug.startsWith("contracts-"));
  const bodyPacks = filteredPacks.filter((pack) => pack.category === "body");
  const homePacks = filteredPacks.filter(
    (pack) =>
      pack.category !== "body" &&
      pack.slug !== "shop" &&
      !pack.slug.startsWith("transport-") &&
      !pack.slug.startsWith("contracts-"),
  );

  const filterSectionPacks = (label: string, sectionPacks: PackDto[]) => {
    if (!normalizedQuery) return sectionPacks;
    if (labelMatches(label)) return sectionPacks;
    return sectionPacks.filter((pack) => pack.title.toLowerCase().includes(normalizedQuery));
  };

  const visibleShopPack = shopPack && labelMatches("W sklepie") ? shopPack : null;
  const visibleBodyPacks = filterSectionPacks("Ciało", bodyPacks);
  const visibleTransportPacks = filterSectionPacks("Transport", transportPacks);
  const visibleContractsPacks = filterSectionPacks("Umowy", contractsPacks);
  const visibleHomePacks = filterSectionPacks("W domu", homePacks);
  const hasVisibleSections =
    !!visibleShopPack ||
    visibleBodyPacks.length > 0 ||
    visibleTransportPacks.length > 0 ||
    visibleContractsPacks.length > 0 ||
    visibleHomePacks.length > 0;

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

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {(["daily", "precise"] as VocabMode[]).map((m) => {
            const active = vocabMode === m;
            const label = m === "daily" ? "Codzienne" : "Precyzyjne";
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
            placeholder="Szukaj kategorii…"
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

      {filteredPacks.length === 0 ? (
        <div className={cardBase}>
          <p className="text-sm text-slate-400">Brak dostępnych fiszek.</p>
        </div>
      ) : normalizedQuery && !hasVisibleSections ? (
        <div className={cardBase}>
          <p className="text-sm text-slate-400">Brak kategorii pasujących do wyszukiwania.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {visibleShopPack ? (
            <PackSection label="W sklepie" packs={[visibleShopPack]} mode={vocabMode} />
          ) : null}
          <PackSection label="Ciało" packs={visibleBodyPacks} mode={vocabMode} />
          <PackSection label="Transport" packs={visibleTransportPacks} mode={vocabMode} />
          <PackSection label="Umowy" packs={visibleContractsPacks} mode={vocabMode} />
          <PackSection label="W domu" packs={visibleHomePacks} mode={vocabMode} />
        </div>
      )}
    </div>
  );
}

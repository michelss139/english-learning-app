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

type VocabMode = "daily" | "mixed" | "precise";
const STORAGE_KEY = "vocabMode";

const isValidMode = (value: string | null): value is VocabMode =>
  value === "daily" || value === "mixed" || value === "precise";

function packHref(slug: string, mode: VocabMode) {
  return `/app/vocab/pack/${slug}?mode=${mode}`;
}

export default function PacksClient({ initialPacks }: { initialPacks: PackDto[] }) {
  const searchParams = useSearchParams();
  const [vocabMode, setVocabMode] = useState<VocabMode>("daily");
  const [categoryQuery, setCategoryQuery] = useState("");

  const modeFromUrl = useMemo<VocabMode | null>(() => {
    const raw = (searchParams.get("mode") ?? "").toLowerCase();
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
    // In-memory filtering only (no fetch, no navigation)
    return initialPacks.filter((pack) => pack.vocab_mode === vocabMode);
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
    <div data-vocab-theme={vocabMode} className="vocab-theme-wrapper">
      <section className="vocab-pack-section rounded-3xl border-2 border-slate-900 bg-white p-5 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Fiszki</h2>
            <p className="text-sm text-slate-600">Szybkie powtórki na podstawie fiszek.</p>
          </div>
          <Link
            href="/app/vocab"
            className="rounded-xl border-2 border-slate-900 bg-white px-4 py-2 font-medium text-slate-900 hover:bg-slate-50 transition shrink-0"
          >
            ← Powrót
          </Link>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="vocab-mode-switch flex flex-wrap gap-2">
            <button
              type="button"
              className="vocab-mode-option"
              data-active={vocabMode === "daily"}
              onClick={() => {
                setVocabMode("daily");
                localStorage.setItem(STORAGE_KEY, "daily");
              }}
            >
              Codzienne
            </button>
            <button
              type="button"
              className="vocab-mode-option"
              data-active={vocabMode === "mixed"}
              onClick={() => {
                setVocabMode("mixed");
                localStorage.setItem(STORAGE_KEY, "mixed");
              }}
            >
              Mieszane
            </button>
            <button
              type="button"
              className="vocab-mode-option"
              data-active={vocabMode === "precise"}
              onClick={() => {
                setVocabMode("precise");
                localStorage.setItem(STORAGE_KEY, "precise");
              }}
            >
              Precyzyjne
            </button>
          </div>

          <div className="relative w-full lg:max-w-xs">
            <input
              type="text"
              value={categoryQuery}
              onChange={(event) => setCategoryQuery(event.target.value)}
              placeholder="Szukaj kategorii…"
              className="w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-2 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/50"
            />
            {categoryQuery ? (
              <button
                type="button"
                onClick={() => setCategoryQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border-2 border-slate-900 bg-white px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50"
                aria-label="Wyczyść wyszukiwanie"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>

        {filteredPacks.length === 0 ? (
          <div className="text-sm text-slate-600">Brak dostępnych packów.</div>
        ) : normalizedQuery && !hasVisibleSections ? (
          <div className="text-sm text-slate-600">Brak kategorii pasujących do wyszukiwania.</div>
        ) : (
          <>
            {visibleShopPack ? (
              <details className="vocab-pack-group rounded-2xl border-2 border-slate-300 bg-slate-50 p-4" open>
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">W sklepie (1)</summary>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Link
                    key={visibleShopPack.id}
                    href={packHref(visibleShopPack.slug, vocabMode)}
                    className="vocab-pack-card rounded-2xl border-2 p-4 transition"
                  >
                    <div className="flex h-full min-h-[80px] flex-col items-center justify-center gap-1 text-center">
                      <h3 className="font-semibold text-slate-900">{visibleShopPack.title}</h3>
                      <p className="text-xs text-slate-600">
                        {visibleShopPack.description || "Szybka powtórka słówek."}
                      </p>
                      <span className="text-xs text-slate-500">{visibleShopPack.item_count} fiszek</span>
                    </div>
                  </Link>
                </div>
              </details>
            ) : null}

            {visibleBodyPacks.length > 0 ? (
              <details className="vocab-pack-group rounded-2xl border-2 border-slate-300 bg-slate-50 p-4" open>
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  Ciało ({visibleBodyPacks.length})
                </summary>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleBodyPacks.map((pack) => (
                    <Link
                      key={pack.id}
                      href={packHref(pack.slug, vocabMode)}
                      className="vocab-pack-card rounded-2xl border-2 p-4 transition"
                    >
                      <div className="flex h-full min-h-[80px] flex-col items-center justify-center gap-1 text-center">
                        <h3 className="font-semibold text-slate-900">{pack.title}</h3>
                        <p className="text-xs text-slate-600">{pack.description || "Szybka powtórka słówek."}</p>
                        <span className="text-xs text-slate-500">{pack.item_count} fiszek</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </details>
            ) : null}

            {visibleTransportPacks.length > 0 ? (
              <details className="vocab-pack-group rounded-2xl border-2 border-slate-300 bg-slate-50 p-4" open>
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  Transport ({visibleTransportPacks.length})
                </summary>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleTransportPacks.map((pack) => (
                    <Link
                      key={pack.id}
                      href={packHref(pack.slug, vocabMode)}
                      className="vocab-pack-card rounded-2xl border-2 p-4 transition"
                    >
                      <div className="flex h-full min-h-[80px] flex-col items-center justify-center gap-1 text-center">
                        <h3 className="font-semibold text-slate-900">{pack.title}</h3>
                        <p className="text-xs text-slate-600">{pack.description || "Szybka powtórka słówek."}</p>
                        <span className="text-xs text-slate-500">{pack.item_count} fiszek</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </details>
            ) : null}

            {visibleContractsPacks.length > 0 ? (
              <details className="vocab-pack-group rounded-2xl border-2 border-slate-300 bg-slate-50 p-4" open>
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  Umowy ({visibleContractsPacks.length})
                </summary>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleContractsPacks.map((pack) => (
                    <Link
                      key={pack.id}
                      href={packHref(pack.slug, vocabMode)}
                      className="vocab-pack-card rounded-2xl border-2 p-4 transition"
                    >
                      <div className="flex h-full min-h-[80px] flex-col items-center justify-center gap-1 text-center">
                        <h3 className="font-semibold text-slate-900">{pack.title}</h3>
                        <p className="text-xs text-slate-600">{pack.description || "Szybka powtórka słówek."}</p>
                        <span className="text-xs text-slate-500">{pack.item_count} fiszek</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </details>
            ) : null}

            {visibleHomePacks.length > 0 ? (
              <details className="vocab-pack-group rounded-2xl border-2 border-slate-300 bg-slate-50 p-4" open>
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  W domu ({visibleHomePacks.length})
                </summary>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleHomePacks.map((pack) => (
                    <Link
                      key={pack.id}
                      href={packHref(pack.slug, vocabMode)}
                      className="vocab-pack-card rounded-2xl border-2 p-4 transition"
                    >
                      <div className="flex h-full min-h-[80px] flex-col items-center justify-center gap-1 text-center">
                        <h3 className="font-semibold text-slate-900">{pack.title}</h3>
                        <p className="text-xs text-slate-600">{pack.description || "Szybka powtórka słówek."}</p>
                        <span className="text-xs text-slate-500">{pack.item_count} fiszek</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </details>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}


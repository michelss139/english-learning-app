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
      <section className="vocab-pack-section rounded-3xl border-2 border-emerald-100/10 bg-emerald-950/40 p-5 space-y-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">Fiszki</h2>
          <p className="text-sm text-white/75">Szybkie powtórki na podstawie fiszek.</p>
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
              className="w-full rounded-2xl border-2 border-white/10 bg-white/5 px-4 py-2 pr-10 text-sm text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
            />
            {categoryQuery ? (
              <button
                type="button"
                onClick={() => setCategoryQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs text-white/70 hover:bg-white/20"
                aria-label="Wyczyść wyszukiwanie"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>

        {filteredPacks.length === 0 ? (
          <div className="text-sm text-white/75">Brak dostępnych packów.</div>
        ) : normalizedQuery && !hasVisibleSections ? (
          <div className="text-sm text-white/70">Brak kategorii pasujących do wyszukiwania.</div>
        ) : (
          <>
            {visibleShopPack ? (
              <details className="vocab-pack-group rounded-2xl border-2 border-white/10 bg-white/5 p-4" open>
                <summary className="cursor-pointer text-sm font-semibold text-white/80">W sklepie (1)</summary>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Link
                    key={visibleShopPack.id}
                    href={packHref(visibleShopPack.slug, vocabMode)}
                    className="vocab-pack-card rounded-2xl border-2 border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-white">{visibleShopPack.title}</h3>
                      <span className="text-xs text-white/60">{visibleShopPack.item_count} fiszek</span>
                    </div>
                    <p className="text-xs text-white/60">
                      {visibleShopPack.description || "Szybka powtórka słówek."}
                    </p>
                  </Link>
                </div>
              </details>
            ) : null}

            {visibleBodyPacks.length > 0 ? (
              <details className="vocab-pack-group rounded-2xl border-2 border-white/10 bg-white/5 p-4" open>
                <summary className="cursor-pointer text-sm font-semibold text-white/80">
                  Ciało ({visibleBodyPacks.length})
                </summary>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleBodyPacks.map((pack) => (
                    <Link
                      key={pack.id}
                      href={packHref(pack.slug, vocabMode)}
                      className="vocab-pack-card rounded-2xl border-2 border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-white">{pack.title}</h3>
                        <span className="text-xs text-white/60">{pack.item_count} fiszek</span>
                      </div>
                      <p className="text-xs text-white/60">{pack.description || "Szybka powtórka słówek."}</p>
                    </Link>
                  ))}
                </div>
              </details>
            ) : null}

            {visibleTransportPacks.length > 0 ? (
              <details className="vocab-pack-group rounded-2xl border-2 border-white/10 bg-white/5 p-4" open>
                <summary className="cursor-pointer text-sm font-semibold text-white/80">
                  Transport ({visibleTransportPacks.length})
                </summary>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleTransportPacks.map((pack) => (
                    <Link
                      key={pack.id}
                      href={packHref(pack.slug, vocabMode)}
                      className="vocab-pack-card rounded-2xl border-2 border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-white">{pack.title}</h3>
                        <span className="text-xs text-white/60">{pack.item_count} fiszek</span>
                      </div>
                      <p className="text-xs text-white/60">{pack.description || "Szybka powtórka słówek."}</p>
                    </Link>
                  ))}
                </div>
              </details>
            ) : null}

            {visibleContractsPacks.length > 0 ? (
              <details className="vocab-pack-group rounded-2xl border-2 border-white/10 bg-white/5 p-4" open>
                <summary className="cursor-pointer text-sm font-semibold text-white/80">
                  Umowy ({visibleContractsPacks.length})
                </summary>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleContractsPacks.map((pack) => (
                    <Link
                      key={pack.id}
                      href={packHref(pack.slug, vocabMode)}
                      className="vocab-pack-card rounded-2xl border-2 border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-white">{pack.title}</h3>
                        <span className="text-xs text-white/60">{pack.item_count} fiszek</span>
                      </div>
                      <p className="text-xs text-white/60">{pack.description || "Szybka powtórka słówek."}</p>
                    </Link>
                  ))}
                </div>
              </details>
            ) : null}

            {visibleHomePacks.length > 0 ? (
              <details className="vocab-pack-group rounded-2xl border-2 border-white/10 bg-white/5 p-4" open>
                <summary className="cursor-pointer text-sm font-semibold text-white/80">
                  W domu ({visibleHomePacks.length})
                </summary>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleHomePacks.map((pack) => (
                    <Link
                      key={pack.id}
                      href={packHref(pack.slug, vocabMode)}
                      className="vocab-pack-card rounded-2xl border-2 border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-white">{pack.title}</h3>
                        <span className="text-xs text-white/60">{pack.item_count} fiszek</span>
                      </div>
                      <p className="text-xs text-white/60">{pack.description || "Szybka powtórka słówek."}</p>
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


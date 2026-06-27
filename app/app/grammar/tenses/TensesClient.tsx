"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BackButton } from "@/app/_components/BackButton";
import Link from "next/link";
import type { GrammarTense, GrammarTenseSlug } from "@/lib/grammar/types";
import { StructureCard } from "@/app/app/grammar/_components/StructureCard";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ["PRESENT", "PAST", "FUTURE"] as const;
const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  PRESENT: "Present",
  PAST: "Past",
  FUTURE: "Future",
};

function getCategory(slug: string): (typeof CATEGORIES)[number] {
  if (slug === "present-perfect" || slug === "present-perfect-continuous") return "PAST";
  if (slug.startsWith("present-")) return "PRESENT";
  if (slug.startsWith("past-")) return "PAST";
  if (slug.startsWith("future-")) return "FUTURE";
  return "PRESENT";
}

type TensesClientProps = {
  tenses: GrammarTense[];
};

// ─── Parsers ──────────────────────────────────────────────────────────────────

function splitItems(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Parse a structure field (affirmative / negative / question) into:
 *   formula  — the first "rule line" (e.g. "will have been + verb-ing")
 *   example  — the first concrete example sentence
 *
 * Handles two authoring formats:
 *   1. "Przykłady:" separator  → formula = text before it, example = first item after it
 *   2. Inline (no separator)   → formula = first line, example = first capitalised non-"/" line
 *
 * Falls back to `fallbackExample` when neither format yields a clean sentence.
 */
function parseFormulaAndExample(
  text: string,
  fallbackExample?: string,
): { formula: string; example: string } {
  if (!text?.trim()) return { formula: "", example: "" };

  const trimmed = text.trim();
  const splitIdx = trimmed.search(/\n\s*Przykłady\s*:\s*\n/i);

  if (splitIdx >= 0) {
    const formulaPart = trimmed.slice(0, splitIdx).trim();
    const formula = splitItems(formulaPart)[0] ?? "";
    const rest = trimmed.slice(splitIdx).replace(/^\s*Przykłady\s*:\s*/i, "").trim();
    const example =
      rest
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean)[0] ?? "";
    return { formula, example };
  }

  // No "Przykłady:" separator — heuristic extraction
  const lines = trimmed.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const formula = lines[0] ?? "";

  // First line that starts with a capital and has no "/" (skips pattern variants like "I/he/she/it…")
  let example = "";
  for (const line of lines.slice(1)) {
    if (line.includes("/")) continue;
    if (line.match(/^[A-Z]/)) {
      example = line;
      break;
    }
  }

  if (!example && fallbackExample) {
    example = fallbackExample;
  }

  return { formula, example };
}

// ─── Tense content panel ──────────────────────────────────────────────────────

function TenseContent({ tense }: { tense: GrammarTense }) {
  const s = tense.content.structure;

  // Derive per-type fallback sentences from the examples field
  const exList = splitItems(tense.content.examples);
  const fallbackAff = exList.find((e) => !/\b(n't|not)\b/.test(e) && !e.endsWith("?"));
  const fallbackNeg = exList.find((e) => /\b(n't|not)\b/.test(e));
  const fallbackQ = exList.find((e) => e.trimEnd().endsWith("?"));

  const affData = parseFormulaAndExample(s.affirmative, fallbackAff);
  const negData = s.negative?.trim()
    ? parseFormulaAndExample(s.negative, fallbackNeg)
    : null;
  const qData = s.question?.trim()
    ? parseFormulaAndExample(s.question, fallbackQ)
    : null;

  const hasNeg = negData && negData.formula;
  const hasQ = qData && qData.formula;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          {tense.title}
        </h2>
        <Link
          href={`/app/grammar/${tense.slug}`}
          prefetch={false}
          className="inline-flex w-fit items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
        >
          Czytaj całą teorię →
        </Link>
      </div>

      {/* Structure — soft cards */}
      {s && (
        <div className="flex flex-col gap-2.5">
          <StructureCard label="Affirmative" pattern={affData.formula} examples={affData.example ? [affData.example] : []} slug={tense.slug} />
          {hasNeg && <StructureCard label="Negative" pattern={negData!.formula} examples={negData!.example ? [negData!.example] : []} slug={tense.slug} />}
          {hasQ && <StructureCard label="Question" pattern={qData!.formula} examples={qData!.example ? [qData!.example] : []} slug={tense.slug} />}
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function TensesClient({ tenses }: TensesClientProps) {
  const grouped = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        category: cat,
        tenses: tenses.filter((t) => getCategory(t.slug) === cat),
      })).filter((g) => g.tenses.length > 0),
    [tenses],
  );

  const firstTense = tenses[0];
  const initialSlug = (firstTense?.slug ?? "") as GrammarTenseSlug | "";
  const [activeSlug, setActiveSlug] = useState<GrammarTenseSlug | "">(initialSlug);
  const [renderedSlug, setRenderedSlug] = useState<GrammarTenseSlug | "">(initialSlug);
  const [isVisible, setIsVisible] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(grouped.map((g) => g.category)),
  );
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (transitionRef.current) clearTimeout(transitionRef.current);
    };
  }, []);

  const renderedTense = tenses.find((t) => t.slug === renderedSlug) ?? firstTense;

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const selectTense = (slug: string) => {
    if (slug === activeSlug) return;
    if (transitionRef.current) clearTimeout(transitionRef.current);

    const safeSlug = slug as GrammarTenseSlug;
    setActiveSlug(safeSlug);
    setIsVisible(false);
    transitionRef.current = setTimeout(() => {
      setRenderedSlug(safeSlug);
      requestAnimationFrame(() => setIsVisible(true));
    }, 180);
  };

  return (
    <main className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Czasy</h1>
        <BackButton href="/app/grammar" />
      </header>

      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[2.4fr_1fr] lg:gap-5">
        {/* Main content panel — stała wysokość, scroll wewnętrzny */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-6 lg:h-[560px]">
          <div
            className={`min-h-0 flex-1 overflow-y-auto pr-1 transition-all duration-200 ${
              isVisible ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"
            }`}
          >
            {renderedTense && <TenseContent tense={renderedTense} />}
          </div>
        </div>

        {/* Category sidebar — ta sama wysokość, scroll wewnętrzny */}
        <aside className="flex flex-col rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:h-[560px] lg:sticky lg:top-28">
          <div className="mb-2 shrink-0 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Kategorie
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
            {grouped.map(({ category, tenses: catTenses }) => {
              const isExpanded = expandedCategories.has(category);
              return (
                <div key={category}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 transition hover:bg-white hover:text-slate-800"
                  >
                    {CATEGORY_LABELS[category]}
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      className={`text-slate-400 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    >
                      <path
                        d="m2 4 3 3 3-3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="mt-1 flex flex-col gap-1 pl-2">
                      {catTenses.map((t) => {
                        const isActive = activeSlug === t.slug;
                        return (
                          <button
                            key={t.slug}
                            type="button"
                            onClick={() => selectTense(t.slug)}
                            data-active={isActive ? "true" : "false"}
                            className={`relative overflow-hidden rounded-lg px-3 py-1.5 text-left text-[13px] transition-all duration-150 ${
                              isActive
                                ? "bg-gradient-to-br from-emerald-400 to-teal-600 ring-1 ring-inset ring-white/20"
                                : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            {isActive ? (
                              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
                            ) : null}
                            <span className="relative font-semibold" style={isActive ? { color: "#fff" } : undefined}>
                              {t.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </section>
    </main>
  );
}

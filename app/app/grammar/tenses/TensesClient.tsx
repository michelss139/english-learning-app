"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BackButton } from "@/app/_components/BackButton";
import Link from "next/link";
import type { GrammarTense, GrammarTenseSlug } from "@/lib/grammar/types";

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

// ─── Auxiliary-verb highlighting ──────────────────────────────────────────────

/**
 * Returns a regex with ONE capturing group so that `text.split(pattern)`
 * gives alternating [plain, match, plain, …] — odd indices are the highlights.
 *
 * Multi-word phrases (e.g. "won't have been") come BEFORE their sub-phrases
 * so the longer match wins in alternation.
 */
function getAuxiliaryPattern(slug: string): RegExp | null {
  switch (slug) {
    case "present-simple":
      return /\b(don't|doesn't|do|does)\b/gi;
    case "present-continuous":
      return /\b(am not|isn't|aren't|am|is|are)\b/gi;
    case "past-simple":
      return /\b(didn't|did)\b/gi;
    case "past-continuous":
      return /\b(wasn't|weren't|was|were)\b/gi;
    case "past-perfect":
      return /\b(hadn't|had)\b/gi;
    case "past-perfect-continuous":
      return /\b(hadn't been|had been|hadn't|had)\b/gi;
    case "present-perfect":
      return /\b(haven't|hasn't|have|has)\b/gi;
    case "present-perfect-continuous":
      return /\b(haven't been|hasn't been|have been|has been)\b/gi;
    case "future-simple":
      return /\b(won't|will)\b/gi;
    case "future-continuous":
      return /\b(won't be|will be)\b/gi;
    case "future-perfect-simple":
      return /\b(won't have|will have)\b/gi;
    case "future-perfect-continuous":
      return /\b(won't have been|will have been)\b/gi;
    case "zero-conditional":
      return /\b(if|when)\b/gi;
    case "first-conditional":
      return /\b(won't|will|if)\b/gi;
    case "second-conditional":
      return /\b(wouldn't|would|if)\b/gi;
    case "third-conditional":
      return /\b(wouldn't have|would have|if)\b/gi;
    default:
      return null;
  }
}

// ─── Highlighted text atoms ───────────────────────────────────────────────────

/** Formula line — medium weight; highlights are bold */
function HighlightedFormula({ text, slug }: { text: string; slug: string }) {
  const pattern = getAuxiliaryPattern(slug);
  if (!text) return null;
  if (!pattern) {
    return (
      <span className="text-sm font-medium text-slate-800 leading-snug">{text}</span>
    );
  }
  const parts = text.split(pattern);
  return (
    <span className="text-sm font-medium text-slate-800 leading-snug">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-bold text-slate-900">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

/** Example sentence — italic; highlights are un-italicised semibold */
function HighlightedExample({ text, slug }: { text: string; slug: string }) {
  const pattern = getAuxiliaryPattern(slug);
  if (!text) return null;
  if (!pattern) {
    return (
      <span className="text-sm italic text-slate-400">{text}</span>
    );
  }
  const parts = text.split(pattern);
  return (
    <span className="text-sm italic text-slate-400">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="not-italic font-semibold text-slate-600">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────

function StructureRow({
  type,
  data,
  slug,
  isLast,
}: {
  type: string;
  data: { formula: string; example: string };
  slug: string;
  isLast?: boolean;
}) {
  if (!data.formula) return null;
  return (
    <tr className={isLast ? "" : "border-b border-slate-200/60"}>
      <td className="px-4 py-3.5 text-[12px] font-bold uppercase tracking-[0.1em] text-slate-400 align-top whitespace-nowrap w-[26%]">
        {type}
      </td>
      <td className="px-4 py-3.5 align-top">
        <div className="space-y-1">
          <HighlightedFormula text={data.formula} slug={slug} />
          <HighlightedExample text={data.example} slug={slug} />
        </div>
      </td>
    </tr>
  );
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

      {/* Structure table */}
      {s && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <table className="w-full min-w-[320px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="w-[26%] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Typ
                </th>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Wzór &amp; Przykład
                </th>
              </tr>
            </thead>
            <tbody>
              <StructureRow
                type="Affirmative"
                data={affData}
                slug={tense.slug}
                isLast={!hasNeg && !hasQ}
              />
              {hasNeg && (
                <StructureRow
                  type="Negative"
                  data={negData!}
                  slug={tense.slug}
                  isLast={!hasQ}
                />
              )}
              {hasQ && (
                <StructureRow
                  type="Question"
                  data={qData!}
                  slug={tense.slug}
                  isLast
                />
              )}
            </tbody>
          </table>
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
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Czasy</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Wybierz czas z listy — zobacz schemat zdania twierdzącego, przeczenia i pytania, a
            następnie otwórz pełną teorię.
          </p>
        </div>
        <BackButton href="/app/grammar" />
      </header>

      {/* Story Generator callout */}
      <Link
        href="/app/story-generator"
        className="group flex items-center justify-between gap-4 rounded-2xl border border-violet-200/80 bg-violet-50/60 px-5 py-3.5 transition-all hover:border-violet-300 hover:bg-violet-50 hover:shadow-sm"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-violet-900">
            AI Story Generator
          </p>
          <p className="mt-0.5 text-xs text-violet-600">
            Ćwicz rozróżnianie czasów w kontekście — uzupełniaj luki w historii generowanej przez AI.
          </p>
        </div>
        <span className="shrink-0 rounded-xl border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm transition group-hover:border-violet-400 group-hover:text-violet-900">
          Wypróbuj →
        </span>
      </Link>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_1fr] lg:gap-5">
        {/* Main content panel */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-6">
          <div
            className={`transition-opacity duration-200 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {renderedTense && <TenseContent tense={renderedTense} />}
          </div>
        </div>

        {/* Category sidebar */}
        <aside className="h-fit rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Kategorie
          </div>
          <div className="flex flex-col gap-1.5">
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
                            className={`grammar-aside-item px-3 py-1.5 text-left text-[13px] ${
                              isActive
                                ? "font-semibold text-slate-900"
                                : "font-medium text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {t.title}
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

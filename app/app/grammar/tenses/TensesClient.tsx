"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { GrammarTense, GrammarTenseSlug } from "@/lib/grammar/types";

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

function stripExamples(text: string): string {
  const idx = text.search(/\n\s*(Przykłady|Examples)\s*:/i);
  if (idx >= 0) return text.slice(0, idx).trim();
  return text.trim();
}

function formatStructure(text: string, slug?: string): string {
  let out = stripExamples(text).replace(/base form/gi, "bezokolicznik");
  if (slug === "present-simple") {
    out = out.replace(/do not \(don't\)/gi, "don't").replace(/does not \(doesn't\)/gi, "doesn't");
  }
  return out;
}

function getHighlightPattern(slug: string): RegExp | null {
  if (slug === "present-simple") return /\b(Do|Does|don't|doesn't)\b/g;
  if (slug === "present-perfect" || slug === "present-perfect-continuous")
    return /\b(Have|Has|have|has|haven't|hasn't)\b/g;
  return null;
}

function StructureCell({ text, slug }: { text: string; slug: string }) {
  const formatted = formatStructure(text, slug);
  const pattern = getHighlightPattern(slug);
  if (!pattern) {
    return (
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
        {formatted}
      </pre>
    );
  }
  const parts = formatted.split(pattern);
  const matches = formatted.match(pattern) ?? [];
  const elements: React.ReactNode[] = [];
  let mi = 0;
  parts.forEach((part, i) => {
    elements.push(part);
    if (i < parts.length - 1 && matches[mi]) {
      elements.push(
        <span key={`h-${i}`} className="font-semibold text-slate-900">
          {matches[mi]}
        </span>,
      );
      mi++;
    }
  });
  return (
    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
      {elements}
    </pre>
  );
}

function TenseContent({ tense }: { tense: GrammarTense }) {
  const s = tense.content.structure;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{tense.title}</h2>
        <Link
          href={`/app/grammar/${tense.slug}`}
          prefetch={false}
          className="inline-flex w-fit items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
        >
          Czytaj całą teorię →
        </Link>
      </div>

      {s && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70">
          <table className="w-full min-w-[320px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="w-[28%] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Typ
                </th>
                <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Struktura
                </th>
              </tr>
            </thead>
            <tbody className="text-slate-800">
              <tr className="border-b border-slate-200/70">
                <td className="px-3 py-2.5 text-sm font-medium text-slate-700">Affirmative</td>
                <td className="px-3 py-2.5">
                  <StructureCell text={s.affirmative} slug={tense.slug} />
                </td>
              </tr>
              {s.negative && (
                <tr className="border-b border-slate-200/70">
                  <td className="px-3 py-2.5 text-sm font-medium text-slate-700">Negative</td>
                  <td className="px-3 py-2.5">
                    <StructureCell text={s.negative} slug={tense.slug} />
                  </td>
                </tr>
              )}
              {s.question && (
                <tr>
                  <td className="px-3 py-2.5 text-sm font-medium text-slate-700">Question</td>
                  <td className="px-3 py-2.5">
                    <StructureCell text={s.question} slug={tense.slug} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

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
            Wybierz czas z listy — zobacz schemat zdania twierdzącego, przeczenia i pytania, a następnie
            otwórz pełną teorię.
          </p>
        </div>
        <Link
          href="/app/grammar"
          className="inline-flex items-center self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
        >
          ← Gramatyka
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_1fr] lg:gap-5">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-6">
          <div
            className={`transition-opacity duration-200 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {renderedTense && <TenseContent tense={renderedTense} />}
          </div>
        </div>

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

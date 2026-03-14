"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { GrammarTense } from "@/lib/grammar/types";

const CATEGORIES = ["PRESENT", "PAST", "FUTURE"] as const;

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
  if (slug === "present-perfect" || slug === "present-perfect-continuous") return /\b(Have|Has|have|has|haven't|hasn't)\b/g;
  return null;
}

function StructureCell({ text, slug }: { text: string; slug: string }) {
  const formatted = formatStructure(text, slug);
  const pattern = getHighlightPattern(slug);
  if (!pattern) {
    return <pre className="whitespace-pre-wrap font-sans text-base text-slate-700">{formatted}</pre>;
  }
  const parts = formatted.split(pattern);
  const matches = formatted.match(pattern) ?? [];
  const elements: React.ReactNode[] = [];
  let mi = 0;
  parts.forEach((part, i) => {
    elements.push(part);
    if (i < parts.length - 1 && matches[mi]) {
      elements.push(
        <span key={`h-${i}`} className="font-bold text-slate-900">
          {matches[mi]}
        </span>
      );
      mi++;
    }
  });
  return <pre className="whitespace-pre-wrap font-sans text-base text-slate-700">{elements}</pre>;
}

function TenseContent({ tense }: { tense: GrammarTense }) {
  const s = tense.content.structure;
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-center text-2xl font-semibold text-slate-900">{tense.title}</h2>

      {s && (
        <div className="overflow-x-auto rounded-lg border border-slate-300">
          <table className="w-full min-w-[320px] border-collapse text-left text-base">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50">
                <th className="p-2 font-medium text-slate-900">Type</th>
                <th className="p-2 font-medium text-slate-900">Structure</th>
              </tr>
            </thead>
            <tbody className="text-slate-800">
              <tr className="border-b border-slate-200">
                <td className="p-2 font-medium">Affirmative</td>
                <td className="p-2 leading-snug">
                  <StructureCell text={s.affirmative} slug={tense.slug} />
                </td>
              </tr>
              {s.negative && (
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-medium">Negative</td>
                  <td className="p-2 leading-snug">
                    <StructureCell text={s.negative} slug={tense.slug} />
                  </td>
                </tr>
              )}
              {s.question && (
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-medium">Question</td>
                  <td className="p-2 leading-snug">
                    <StructureCell text={s.question} slug={tense.slug} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-0.5">
        <Link
          href={`/app/grammar/${tense.slug}`}
          className="rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          Czytaj pełną teorię
        </Link>
        {tense.practiceLink && (
          <Link
            href={tense.practiceLink}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Ćwiczenia
          </Link>
        )}
      </div>
    </div>
  );
}

export function TensesClient({ tenses }: TensesClientProps) {
  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    tenses: tenses.filter((t) => getCategory(t.slug) === cat),
  })).filter((g) => g.tenses.length > 0);

  const firstTense = tenses[0];
  const [activeSlug, setActiveSlug] = useState(firstTense?.slug ?? "");
  const [renderedSlug, setRenderedSlug] = useState(firstTense?.slug ?? "");
  const [isVisible, setIsVisible] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set([grouped[0]?.category ?? "PRESENT"]));
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (transitionRef.current) clearTimeout(transitionRef.current);
    };
  }, []);

  const activeTense = tenses.find((t) => t.slug === activeSlug) ?? firstTense;
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

    setActiveSlug(slug);
    setIsVisible(false);
    transitionRef.current = setTimeout(() => {
      setRenderedSlug(slug);
      requestAnimationFrame(() => setIsVisible(true));
    }, 180);
  };

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Czasy</h1>
          <p className="max-w-2xl text-sm text-slate-700">Wybierz czas z listy.</p>
        </div>
        <Link
          href="/app/grammar"
          className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          ← Gramatyka
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_1fr]">
        <div className="rounded-2xl border border-slate-900 bg-white p-4">
          <div className={`transition-opacity duration-200 ${isVisible ? "opacity-100" : "opacity-0"}`}>
            {renderedTense && <TenseContent tense={renderedTense} />}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-900 bg-white p-3">
          <div className="mb-2 text-xs uppercase tracking-[0.14em] text-slate-500">Kategorie</div>
          <div className="mb-2 h-px w-full bg-slate-200" />
          <div className="flex flex-col gap-1">
            {grouped.map(({ category, tenses: catTenses }) => {
              const isExpanded = expandedCategories.has(category);
              return (
                <div key={category}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="flex w-full items-center justify-between rounded-lg border border-black/15 px-3 py-2 text-left text-sm font-semibold text-slate-900 transition hover:bg-black/5"
                  >
                    {category}
                    <span className={`inline-block text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                  </button>
                  {isExpanded && (
                    <div className="ml-2 mt-1 flex flex-col gap-1 border-l-2 border-slate-200 pl-2">
                      {catTenses.map((t) => (
                        <button
                          key={t.slug}
                          type="button"
                          onClick={() => selectTense(t.slug)}
                          className={`w-full rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-black/5 ${
                            activeSlug === t.slug ? "font-semibold text-slate-900" : "font-medium text-slate-700"
                          }`}
                        >
                          {t.title}
                        </button>
                      ))}
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

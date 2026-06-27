"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  getComparison,
  getComparisonCacheKey,
  getGroupedComparisons,
  comparisonKey,
  type ComparisonListItem,
} from "@/lib/grammar/compare";
import { HighlightedFormula, HighlightedExample } from "@/app/app/grammar/_components/StructureCard";
import { BackButton } from "@/app/_components/BackButton";
import type { GrammarTense, GrammarTenseSlug } from "@/lib/grammar/types";

// ─── Cell helpers ─────────────────────────────────────────────────────────────

function usageShort(t: GrammarTense): string {
  return t.content.usage
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
}

function structurePattern(t: GrammarTense): string {
  return t.content.structure.affirmative
    .split(/\n\s*Przykłady/i)[0]
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join("  ·  ");
}

function firstExample(t: GrammarTense): string {
  return t.content.examples.split(/\n+/).map((s) => s.trim()).filter(Boolean)[0] ?? "";
}

function warningShort(t: GrammarTense): string {
  return t.content.confusionWarnings.split(/\n+/).map((s) => s.trim()).filter(Boolean)[0] ?? "";
}

// ─── Aspect row ───────────────────────────────────────────────────────────────

function AspectRow({
  label,
  cell1,
  cell2,
}: {
  label: string;
  cell1: React.ReactNode;
  cell2: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[96px_1fr_1fr] gap-x-3 border-b border-slate-100 py-3 last:border-b-0">
      <div className="pt-0.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-400">{label}</div>
      <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">{cell1}</div>
      <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">{cell2}</div>
    </div>
  );
}

function ChipsCell({ tense }: { tense: GrammarTense }) {
  const chips = (tense.content.chips ?? []).slice(0, 4);
  if (chips.length === 0) return <span className="text-sm text-slate-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span
          key={c.text}
          title={c.description}
          className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700"
        >
          {c.text}
        </span>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function GrammarCompareClient() {
  const searchParams = useSearchParams();
  const grouped = useMemo(() => getGroupedComparisons(), []);
  const allItems = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  const urlT1 = searchParams.get("tense1");
  const urlT2 = searchParams.get("tense2");
  const initialKey =
    urlT1 && urlT2 && allItems.some((i) => comparisonKey(i.tense1, i.tense2) === comparisonKey(urlT1, urlT2))
      ? comparisonKey(urlT1, urlT2)
      : allItems[0]
        ? comparisonKey(allItems[0].tense1, allItems[0].tense2)
        : "";

  const [activeKey, setActiveKey] = useState(initialKey);
  const [renderedKey, setRenderedKey] = useState(initialKey);
  const [isVisible, setIsVisible] = useState(true);
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [aiDialog, setAiDialog] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => () => {
    if (transitionRef.current) clearTimeout(transitionRef.current);
  }, []);

  const keyOf = (i: ComparisonListItem) => comparisonKey(i.tense1, i.tense2);
  const renderedItem = allItems.find((i) => keyOf(i) === renderedKey) ?? allItems[0];

  const select = (i: ComparisonListItem) => {
    const next = keyOf(i);
    if (next === activeKey) return;
    if (transitionRef.current) clearTimeout(transitionRef.current);
    setActiveKey(next);
    setIsVisible(false);
    setAiDialog(null);
    setAiError(null);
    transitionRef.current = setTimeout(() => {
      setRenderedKey(next);
      requestAnimationFrame(() => setIsVisible(true));
    }, 180);
  };

  const generateAIDialog = async (t1: GrammarTenseSlug, t2: GrammarTenseSlug) => {
    setAiLoading(true);
    setAiError(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      if (!token) {
        setAiError("Musisz być zalogowany");
        return;
      }
      const cacheKey = getComparisonCacheKey(t1, t2);
      const cacheRes = await fetch(`/api/grammar/ai-dialog?key=${encodeURIComponent(cacheKey)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cacheRes.ok) {
        const cacheData = await cacheRes.json();
        if (cacheData.ok && cacheData.cached && cacheData.dialog) {
          setAiDialog(cacheData.dialog);
          return;
        }
      }
      const genRes = await fetch("/api/grammar/ai-dialog", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tense1: t1, tense2: t2 }),
      });
      if (!genRes.ok) {
        const errData = await genRes.json().catch(() => null);
        throw new Error(errData?.error || "Błąd generowania dialogu");
      }
      const genData = await genRes.json();
      if (genData.ok && genData.dialog) setAiDialog(genData.dialog);
      else throw new Error("Nie udało się wygenerować dialogu");
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : "Błąd generowania dialogu AI");
    } finally {
      setAiLoading(false);
    }
  };

  const comparison = renderedItem ? getComparison(renderedItem.tense1, renderedItem.tense2) : null;

  return (
    <main className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Porównywarka czasów</h1>
        <BackButton href="/app/grammar" />
      </header>

      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[2.4fr_1fr] lg:gap-5">
        {/* Main tile */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-6 lg:h-[600px]">
          {comparison ? (
            <div
              className={`min-h-0 flex-1 overflow-y-auto pr-1 transition-all duration-200 ${
                isVisible ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"
              }`}
            >
              {/* AI premium feature — top */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => renderedItem && generateAIDialog(renderedItem.tense1, renderedItem.tense2)}
                  disabled={aiLoading}
                  className="group relative inline-flex overflow-hidden rounded-xl bg-gradient-to-br from-indigo-400 to-violet-700 px-4 py-2.5 ring-1 ring-inset ring-white/20 shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md disabled:opacity-60"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
                  <span className="relative text-[15px] font-black tracking-tight drop-shadow-sm" style={{ color: "#fff" }}>
                    {aiLoading ? "Generuję…" : "Dialog kontrastowy AI"}
                  </span>
                </button>
                {aiError && (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{aiError}</div>
                )}
                {aiDialog && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="space-y-1 font-mono text-sm text-slate-800">
                      {aiDialog.split("\n").map((line, i) => (
                        <div
                          key={i}
                          dangerouslySetInnerHTML={{
                            __html:
                              line.replace(/\*\*(.+?)\*\*/g, '<span class="font-semibold text-slate-900">$1</span>') ||
                              "&nbsp;",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Title */}
              <h2 className="mb-3 text-2xl font-semibold tracking-tight text-slate-900">{comparison.title}</h2>

              {/* Header row: tense names */}
              <div className="grid grid-cols-[96px_1fr_1fr] gap-x-3 border-b-2 border-slate-200 pb-2">
                <div />
                {[comparison.tense1, comparison.tense2].map((t) => (
                  <div key={t.slug} className="flex items-baseline justify-between gap-2">
                    <span className="text-base font-bold text-slate-900">{t.title}</span>
                    <Link
                      href={`/app/grammar/${t.slug}`}
                      className="shrink-0 text-xs font-medium text-[#178CF2] hover:underline"
                    >
                      teoria →
                    </Link>
                  </div>
                ))}
              </div>

              {/* Aspect rows */}
              <AspectRow
                label="Użycie"
                cell1={<p className="text-[15px] leading-relaxed text-slate-600">{usageShort(comparison.tense1)}</p>}
                cell2={<p className="text-[15px] leading-relaxed text-slate-600">{usageShort(comparison.tense2)}</p>}
              />
              <AspectRow
                label="Struktura"
                cell1={<HighlightedFormula text={structurePattern(comparison.tense1)} slug={comparison.tense1.slug} />}
                cell2={<HighlightedFormula text={structurePattern(comparison.tense2)} slug={comparison.tense2.slug} />}
              />
              <AspectRow
                label="Słowa"
                cell1={<ChipsCell tense={comparison.tense1} />}
                cell2={<ChipsCell tense={comparison.tense2} />}
              />
              <AspectRow
                label="Przykład"
                cell1={<HighlightedExample text={firstExample(comparison.tense1)} slug={comparison.tense1.slug} />}
                cell2={<HighlightedExample text={firstExample(comparison.tense2)} slug={comparison.tense2.slug} />}
              />
              <AspectRow
                label="Uwaga"
                cell1={
                  <p className="flex items-start gap-1.5 text-[15px] text-slate-600">
                    <i className="ti-alert-triangle mt-0.5 shrink-0" style={{ fontSize: 16, color: "#f59e0b" }} />
                    <span>{warningShort(comparison.tense1)}</span>
                  </p>
                }
                cell2={
                  <p className="flex items-start gap-1.5 text-[15px] text-slate-600">
                    <i className="ti-alert-triangle mt-0.5 shrink-0" style={{ fontSize: 16, color: "#f59e0b" }} />
                    <span>{warningShort(comparison.tense2)}</span>
                  </p>
                }
              />
            </div>
          ) : (
            <p className="text-sm text-slate-400">Wybierz porównanie z listy.</p>
          )}
        </div>

        {/* Grouped comparison list */}
        <aside className="flex flex-col rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:h-[600px] lg:sticky lg:top-28">
          <div className="mb-2 shrink-0 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Porównania
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {grouped.map((g) => (
              <div key={g.group}>
                <div className="mb-1 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300">
                  {g.group}
                </div>
                <div className="flex flex-col gap-1">
                  {g.items.map((item) => {
                    const isActive = keyOf(item) === activeKey;
                    return (
                      <button
                        key={keyOf(item)}
                        type="button"
                        onClick={() => select(item)}
                        className={`relative overflow-hidden rounded-lg px-3 py-2 text-left text-sm leading-snug transition-all duration-150 ${
                          isActive
                            ? "bg-gradient-to-br from-emerald-400 to-teal-600 ring-1 ring-inset ring-white/20"
                            : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {isActive ? (
                          <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
                        ) : null}
                        <span className="relative font-semibold" style={isActive ? { color: "#fff" } : undefined}>
                          {item.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

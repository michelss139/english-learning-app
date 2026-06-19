"use client";

import { useState } from "react";
import Link from "next/link";

export type ArticleDetailDto = {
  slug: string;
  title: string;
  category: string;
  cover_image_url: string | null;
  published_at: string | null;
  levels: { level: string; body_text: string }[];
  glossary: { level: string; term: string; definition: string; sort_order: number }[];
  questions: { level: string; question: string; sort_order: number }[];
};

type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const LEVEL_TAB_ACTIVE: Record<Level, string> = {
  A1: "bg-emerald-600 text-white border-emerald-600",
  A2: "bg-teal-600 text-white border-teal-600",
  B1: "bg-sky-600 text-white border-sky-600",
  B2: "bg-blue-700 text-white border-blue-700",
  C1: "bg-violet-600 text-white border-violet-600",
  C2: "bg-purple-700 text-white border-purple-700",
};

const LEVEL_BADGE: Record<Level, string> = {
  A1: "bg-emerald-50 text-emerald-700 border-emerald-200",
  A2: "bg-teal-50 text-teal-700 border-teal-200",
  B1: "bg-sky-50 text-sky-700 border-sky-200",
  B2: "bg-blue-50 text-blue-700 border-blue-200",
  C1: "bg-violet-50 text-violet-700 border-violet-200",
  C2: "bg-purple-50 text-purple-700 border-purple-200",
};

function MessageCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function renderBody(text: string) {
  return text
    .split(/\n\n+/)
    .filter(Boolean)
    .map((para, i) => (
      <p key={i} className="leading-[1.8] text-slate-700">
        {para.trim()}
      </p>
    ));
}

export default function ArticleClient({ article }: { article: ArticleDetailDto }) {
  const availableLevels = LEVELS.filter((l) => article.levels.some((al) => al.level === l));
  const defaultLevel: Level = availableLevels.includes("B2") ? "B2" : availableLevels.includes("B1") ? "B1" : (availableLevels[0] ?? "B1");
  const [activeLevel, setActiveLevel] = useState<Level>(defaultLevel);

  const currentLevel = article.levels.find((l) => l.level === activeLevel);
  const currentGlossary = article.glossary.filter((g) => g.level === activeLevel);
  const currentQuestions = article.questions.filter((q) => q.level === activeLevel);

  return (
    <main className="mx-auto max-w-[760px] space-y-8 pb-16">
      {/* Back */}
      <div>
        <Link
          href="/app/vocab/articles"
          className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"
        >
          ← Artykuły
        </Link>
      </div>

      {/* Header */}
      <header className="space-y-4">
        <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {article.category}
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {article.title}
        </h1>

        {/* Level tabs */}
        <div className="flex items-center gap-2 pt-1">
          {LEVELS.filter((l) => availableLevels.includes(l)).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setActiveLevel(lvl)}
              className={`rounded-lg border px-4 py-1.5 text-sm font-bold tracking-wide transition-all duration-150 ${
                activeLevel === lvl
                  ? LEVEL_TAB_ACTIVE[lvl]
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </header>

      {/* Infographic / Cover image */}
      <section>
        {article.cover_image_url ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm">
            <img
              src={article.cover_image_url}
              alt={`Infografika: ${article.title}`}
              className="w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-[16/7] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/80">
            <p className="text-sm font-medium text-slate-400">Infografika wkrótce</p>
          </div>
        )}
      </section>

      {/* Article body */}
      <section className="space-y-5">
        {currentLevel ? (
          renderBody(currentLevel.body_text)
        ) : (
          <p className="text-sm text-slate-400">Brak treści dla poziomu {activeLevel}.</p>
        )}
      </section>

      {/* Glossary */}
      {currentGlossary.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Słowniczek
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            {currentGlossary.map((entry, i) => (
              <div
                key={i}
                className={`flex items-start gap-4 px-5 py-3.5 ${
                  i < currentGlossary.length - 1 ? "border-b border-slate-100" : ""
                }`}
              >
                <div className="w-[38%] shrink-0">
                  <span className="font-semibold text-slate-900">{entry.term}</span>
                  <span
                    className={`ml-2 inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold ${LEVEL_BADGE[activeLevel]}`}
                  >
                    {entry.level}
                  </span>
                </div>
                <div className="text-sm leading-relaxed text-slate-600">{entry.definition}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Conversation questions */}
      {currentQuestions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Pytania do dyskusji
          </h2>
          <div className="space-y-2.5">
            {currentQuestions.map((q, i) => (
              <div
                key={i}
                className="flex items-start gap-4 rounded-xl border border-slate-200/80 bg-white/90 px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
                  {i + 1}
                </div>
                <div className="flex flex-1 items-start gap-3">
                  <p className="flex-1 pt-0.5 text-sm leading-relaxed text-slate-700">{q.question}</p>
                  <MessageCircleIcon className="mt-0.5 shrink-0 text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

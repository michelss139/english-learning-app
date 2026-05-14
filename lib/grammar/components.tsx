"use client";

import Link from "next/link";
import { GrammarTenseSlug } from "./types";

/**
 * Tooltip Glossary Component — shows a small inline tooltip with a Polish
 * definition for a grammar term. Light-theme friendly.
 */
export function GlossaryTooltip({ term, children }: { term: string; children: React.ReactNode }) {
  const definitions: Record<string, string> = {
    auxiliary: "Słówko pomocnicze (np. do, does, have, will) używane do tworzenia pytań i przeczeń",
    "base form": "Podstawowa forma czasownika bez końcówek (np. work, go, study)",
    "past participle": "Trzecia forma czasownika (np. worked, gone, studied), używana w Perfect tenses",
    "stative verb": "Czasownik stanu (np. know, like, believe), zwykle nie używany w Continuous",
    "action verb": "Czasownik akcji (np. run, work, study), może być używany w Continuous",
    opinion: "Opinia, pogląd (np. I think, I believe)",
    process: "Proces, akcja w trakcie (np. I am thinking, I am working)",
    state: "Stan, sytuacja trwała (np. I know, I have)",
    deadline: "Termin, do którego coś ma być zrobione (np. by tomorrow, by Friday)",
    duration: "Czas trwania, jak długo coś trwa (np. for two hours, for three years)",
  };

  const definition = definitions[term.toLowerCase()];
  if (!definition) return <>{children}</>;

  return (
    <span className="group relative inline-block">
      <span className="cursor-help underline decoration-dotted decoration-slate-400 underline-offset-2">
        {children}
      </span>
      <span className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-2 w-64 -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 opacity-0 shadow-[0_10px_24px_rgba(15,23,42,0.12)] transition-opacity duration-150 group-hover:opacity-100">
        <strong className="text-slate-900">{term}:</strong> {definition}
      </span>
    </span>
  );
}

/** Highlights an inline verb form. */
export function HighlightVerb({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-slate-900">{children}</span>;
}

/** Example sentence — single line with optional verb highlighting. */
export function ExampleSentence({
  sentence,
  highlightVerbs,
}: {
  sentence: string;
  highlightVerbs?: string[];
}) {
  if (!highlightVerbs || highlightVerbs.length === 0) {
    return <div className="text-sm text-slate-700">{sentence}</div>;
  }

  let result = sentence;
  highlightVerbs.forEach((verb) => {
    const regex = new RegExp(`\\b(${verb})\\b`, "gi");
    result = result.replace(regex, '<span class="font-semibold text-slate-900">$1</span>');
  });

  return <div className="text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: result }} />;
}

/** Related links: chips pointing to related grammar topics. */
export function RelatedTenses({
  relatedLinks,
}: {
  relatedLinks?: Array<{
    slug: GrammarTenseSlug | "stative-verbs";
    title: string;
    description?: string;
  }>;
}) {
  if (!relatedLinks || relatedLinks.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {relatedLinks.map((link) => (
          <Link
            key={link.slug}
            href={`/app/grammar/${link.slug}`}
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm transition hover:-translate-y-px hover:border-slate-400 hover:text-slate-900"
          >
            <span className="font-medium">{link.title}</span>
            {link.description && (
              <span className="text-xs text-slate-500 group-hover:text-slate-700">
                {link.description}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Side-by-side comparison: stative meaning vs action meaning of the same verb. */
export function StativeVsAction({
  comparisons,
}: {
  comparisons: Array<{ stative: string; action: string; explanation?: string }>;
}) {
  if (!comparisons || comparisons.length === 0) return null;

  return (
    <div className="space-y-3">
      {comparisons.map((comp, index) => (
        <div
          key={index}
          className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                Stative (stan)
              </div>
              <div className="font-mono text-sm text-slate-800">{comp.stative}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-700">
                Action (akcja)
              </div>
              <div className="font-mono text-sm text-slate-800">{comp.action}</div>
            </div>
          </div>
          {comp.explanation && (
            <div className="mt-2.5 text-xs italic text-slate-500">{comp.explanation}</div>
          )}
        </div>
      ))}
    </div>
  );
}

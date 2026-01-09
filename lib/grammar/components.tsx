"use client";

import Link from "next/link";
import { GrammarTenseSlug } from "./types";

/**
 * Tooltip Glossary Component
 * Shows tooltip with definition for grammar terms
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
      <span className="underline decoration-dotted decoration-sky-400/50 cursor-help">{children}</span>
      <span className="pointer-events-none absolute left-1/2 bottom-full mb-2 w-64 -translate-x-1/2 rounded-xl border border-white/15 bg-black/90 px-3 py-2 text-xs text-white/90 opacity-0 backdrop-blur-md transition group-hover:opacity-100 z-50">
        <strong className="text-sky-300">{term}:</strong> {definition}
      </span>
    </span>
  );
}

/**
 * Verb Highlighting Component
 * Highlights verb forms in examples
 * Usage: Wrap example sentences to highlight verb forms
 */
export function HighlightVerb({ children }: { children: React.ReactNode }) {
  // For now, simple wrapper - can be enhanced to auto-detect and highlight verbs
  return <span className="text-emerald-300 font-semibold">{children}</span>;
}

/**
 * Example Sentence Component
 * Renders example with highlighted verb forms
 */
export function ExampleSentence({ sentence, highlightVerbs }: { sentence: string; highlightVerbs?: string[] }) {
  if (!highlightVerbs || highlightVerbs.length === 0) {
    return <div className="text-white/90">{sentence}</div>;
  }

  // Simple highlighting - find verbs and highlight
  let result = sentence;
  highlightVerbs.forEach((verb) => {
    const regex = new RegExp(`\\b(${verb})\\b`, "gi");
    result = result.replace(regex, '<span class="font-semibold text-emerald-300">$1</span>');
  });

  return <div className="text-white/90" dangerouslySetInnerHTML={{ __html: result }} />;
}

/**
 * Zobacz też Component
 * Related links to other tenses
 */
export function RelatedTenses({ relatedLinks }: { relatedLinks?: Array<{ slug: GrammarTenseSlug | "stative-verbs"; title: string; description?: string }> }) {
  if (!relatedLinks || relatedLinks.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white">Zobacz też</h3>
      <div className="flex flex-wrap gap-2">
        {relatedLinks.map((link) => (
          <Link
            key={link.slug}
            href={`/app/grammar/${link.slug}`}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
          >
            {link.title}
            {link.description && <span className="ml-1 text-white/60 text-xs">({link.description})</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * Stative vs Action Comparison Component
 */
export function StativeVsAction({ comparisons }: { comparisons: Array<{ stative: string; action: string; explanation?: string }> }) {
  if (!comparisons || comparisons.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Porównanie: Stative vs Action</h3>
      <div className="space-y-3">
        {comparisons.map((comp, index) => (
          <div key={index} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-emerald-300 mb-1">Stative (stan)</div>
                <div className="text-white/90 font-mono text-sm">{comp.stative}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-sky-300 mb-1">Action (akcja)</div>
                <div className="text-white/90 font-mono text-sm">{comp.action}</div>
              </div>
            </div>
            {comp.explanation && (
              <div className="mt-2 text-xs text-white/70 italic">{comp.explanation}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { GrammarTense } from "./types";
import { GlossaryTooltip, RelatedTenses, ExampleSentence } from "./components";
import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

function getTermDefinition(term: string): string {
  const definitions: Record<string, string> = {
    "base form": "Podstawowa forma czasownika bez końcówek (np. work, go, study)",
    "past participle": "Trzecia forma czasownika (np. worked, gone, studied), używana w Perfect tenses",
    "stative verb": "Czasownik stanu (np. know, like, believe), zwykle nie używany w Continuous",
    deadline: "Termin, do którego coś ma być zrobione (np. by tomorrow, by Friday)",
    duration: "Czas trwania, jak długo coś trwa (np. for two hours, for three years)",
  };
  return definitions[term.toLowerCase()] || term;
}

type TensePageContentProps = {
  tense: GrammarTense;
};

export function TensePageContent({ tense }: TensePageContentProps) {
  const [aiDialogLoading, setAiDialogLoading] = useState(false);
  const [aiDialog, setAiDialog] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Navigation anchors for quick links
  const sections = [
    { id: "usage", title: "Po co używamy" },
    { id: "characteristic-words", title: "Charakterystyczne słowa" },
    { id: "structure", title: "Struktura" },
    { id: "auxiliary", title: "Słówko pomocnicze" },
    { id: "confusion-warnings", title: "Uwaga! To myli" },
    { id: "common-mistakes", title: "Typowe błędy" },
    { id: "examples", title: "Przykłady zdań" },
    { id: "dialog", title: "Dialog" },
    { id: "related", title: "Zobacz też" },
    { id: "comparisons", title: "Porównaj" },
    { id: "practice-course", title: "Ćwiczenia i kurs" },
  ];

  const handleGenerateAIDialog = async () => {
    setAiDialogLoading(true);
    setError(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      if (!token) {
        setError("Musisz być zalogowany");
        setAiDialogLoading(false);
        return;
      }

      // For single tense, we'll generate a dialog using the tense itself
      // This is a simple dialog for the tense, not a comparison
      const cacheKey = `${tense.slug}__single__v1`;

      // First, try to get from cache
      const cacheRes = await fetch(`/api/grammar/ai-dialog?key=${encodeURIComponent(cacheKey)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (cacheRes.ok) {
        const cacheData = await cacheRes.json();
        if (cacheData.ok && cacheData.cached && cacheData.dialog) {
          setAiDialog(cacheData.dialog);
          setAiDialogLoading(false);
          return;
        }
      }

      // If not cached, generate new
      const genRes = await fetch("/api/grammar/ai-dialog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tense1: tense.slug,
          tense2: tense.slug, // Same tense for single tense dialog
        }),
      });

      if (!genRes.ok) {
        const errorData = await genRes.json();
        throw new Error(errorData.error || "Błąd generowania dialogu");
      }

      const genData = await genRes.json();
      if (genData.ok && genData.dialog) {
        setAiDialog(genData.dialog);
      } else {
        throw new Error("Nie udało się wygenerować dialogu");
      }
    } catch (e: any) {
      setError(e?.message || "Błąd generowania dialogu AI");
    } finally {
      setAiDialogLoading(false);
    }
  };

  return (
    <>
      {/* Quick navigation */}
      <div className="sticky top-4 z-10 mb-6 rounded-xl border border-white/10 bg-black/50 backdrop-blur-md p-3">
        <div className="flex flex-wrap gap-2 text-xs">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white/70 hover:bg-white/10 hover:text-white transition"
            >
              {section.title}
            </a>
          ))}
        </div>
      </div>

      {/* Po co używamy */}
      <section id="usage" className="space-y-3 scroll-mt-4">
        <h2 className="text-xl font-semibold text-white">Po co używamy {tense.title}</h2>
        <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line">
          {tense.content.usage}
        </div>
      </section>

      {/* Charakterystyczne słowa i zwroty */}
      <section id="characteristic-words" className="space-y-3 scroll-mt-4">
        <h2 className="text-xl font-semibold text-white">Charakterystyczne słowa i zwroty</h2>
        <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line">
          {tense.content.characteristicWords}
        </div>
        {tense.content.chips && tense.content.chips.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {tense.content.chips.map((chip, index) => {
              const chipContent = (
                <span
                  className={`rounded-xl border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/80 ${
                    chip.link ? "hover:bg-white/10 hover:text-white cursor-pointer transition" : ""
                  }`}
                  title={chip.description}
                >
                  {chip.text}
                </span>
              );

              if (chip.link) {
                return (
                  <Link key={index} href={chip.link} className="inline-block">
                    {chipContent}
                  </Link>
                );
              }

              return <span key={index}>{chipContent}</span>;
            })}
          </div>
        )}
      </section>

      {/* Struktura */}
      <section id="structure" className="space-y-3 scroll-mt-4">
        <h2 className="text-xl font-semibold text-white">Struktura</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white/90 mb-2">Twierdzenie (affirmative)</h3>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line font-mono text-sm">
                {tense.content.structure.affirmative}
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-white/90 mb-2">Przeczenie (negative)</h3>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line font-mono text-sm">
                {tense.content.structure.negative}
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-white/90 mb-2">Pytanie (question)</h3>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line font-mono text-sm">
                {tense.content.structure.question}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Słówko pomocnicze */}
      <section id="auxiliary" className="space-y-3 scroll-mt-4">
        <h2 className="text-xl font-semibold text-white">
          Słówko pomocnicze (<GlossaryTooltip term="auxiliary">auxiliary</GlossaryTooltip>)
        </h2>
        <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line">
          {tense.content.auxiliary.split("\n").map((line, index) => {
            // Add tooltips for grammar terms
            let processed = line;
            
            // Highlight terms with tooltips
            const terms = ["base form", "past participle", "stative verb", "deadline", "duration"];
            terms.forEach((term) => {
              const regex = new RegExp(`\\b(${term})\\b`, "gi");
              processed = processed.replace(regex, (match) => {
                return `<span class="underline decoration-dotted decoration-sky-400/50 cursor-help" title="${getTermDefinition(term)}">${match}</span>`;
              });
            });

            return (
              <div key={index} dangerouslySetInnerHTML={{ __html: processed || "&nbsp;" }} />
            );
          })}
        </div>
      </section>

      {/* Uwaga! To myli */}
      <section id="confusion-warnings" className="space-y-3 scroll-mt-4">
        <h2 className="text-xl font-semibold text-white">Uwaga! To myli</h2>
        <div className="rounded-xl border-2 border-amber-400/30 bg-amber-400/10 p-4">
          <div className="prose prose-invert max-w-none text-amber-100 whitespace-pre-line">
            {tense.content.confusionWarnings}
          </div>
        </div>
      </section>

      {/* Typowe błędy */}
      <section id="common-mistakes" className="space-y-3 scroll-mt-4">
        <h2 className="text-xl font-semibold text-white">Typowe błędy (szczególnie pod Polaków)</h2>
        <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line">
          {tense.content.commonMistakes}
        </div>
      </section>

      {/* Przykłady zdań */}
      <section id="examples" className="space-y-3 scroll-mt-4">
        <h2 className="text-xl font-semibold text-white">Przykłady zdań</h2>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
          {tense.content.examples.split("\n").filter((line) => line.trim()).map((line, index) => (
            <ExampleSentence key={index} sentence={line.trim()} />
          ))}
        </div>
      </section>

      {/* Dialog */}
      <section id="dialog" className="space-y-3 scroll-mt-4">
        <h2 className="text-xl font-semibold text-white">Dialog w praktyce</h2>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line font-mono text-sm">
            {tense.content.dialog.split("\n").map((line, index) => {
              // Highlight verb forms in dialog (simple detection)
              const verbPatterns = [
                /\b(am|is|are|was|were|have|has|had|will|do|does|did|can|could|should|would|may|might)\b/gi,
                /\b\w+ing\b/gi, // -ing forms
                /\b\w+ed\b/gi, // -ed forms
              ];
              
              let highlighted = line;
              verbPatterns.forEach((pattern) => {
                highlighted = highlighted.replace(pattern, (match) => {
                  return `<span class="font-semibold text-emerald-300">${match}</span>`;
                });
              });

              return (
                <div key={index} dangerouslySetInnerHTML={{ __html: highlighted || "&nbsp;" }} />
              );
            })}
          </div>
        </div>

        {/* AI Dialog Button */}
        <div className="pt-2">
          <button
            className="rounded-xl border-2 border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-100 hover:bg-sky-400/20 transition disabled:opacity-60"
            onClick={handleGenerateAIDialog}
            disabled={aiDialogLoading}
          >
            {aiDialogLoading ? "Generuję…" : "Wygeneruj dodatkowy dialog (AI)"}
          </button>
          {error && (
            <div className="mt-3 rounded-xl border-2 border-rose-400/30 bg-rose-400/10 p-3 text-rose-100 text-sm">
              {error}
            </div>
          )}
          {aiDialog && (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-line font-mono text-sm">
                {aiDialog.split("\n").map((line, index) => {
                  // Highlight bold text (verb forms)
                  const highlighted = line.replace(/\*\*(.+?)\*\*/g, '<span class="font-semibold text-emerald-300">$1</span>');
                  return (
                    <div key={index} dangerouslySetInnerHTML={{ __html: highlighted || "&nbsp;" }} />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Zobacz też */}
      {tense.content.relatedLinks && tense.content.relatedLinks.length > 0 && (
        <section id="related" className="space-y-3 scroll-mt-4">
          <RelatedTenses relatedLinks={tense.content.relatedLinks} />
        </section>
      )}

      {/* Porównania */}
      {tense.content.comparisons && tense.content.comparisons.length > 0 && (
        <section id="comparisons" className="space-y-3 scroll-mt-4">
          <h2 className="text-xl font-semibold text-white">Porównaj</h2>
          <div className="flex flex-wrap gap-2">
            {tense.content.comparisons.map((comparison, index) => (
              <Link
                key={index}
                href={`/app/grammar/compare?tense1=${comparison.tense1}&tense2=${comparison.tense2}`}
                className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-400/20 transition"
              >
                {comparison.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Ćwiczenia i kurs */}
      <section id="practice-course" className="space-y-3 scroll-mt-4 pt-4 border-t border-white/10">
        <div className="flex flex-wrap gap-3">
          {tense.practiceLink && (
            <Link
              href={tense.practiceLink}
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
            >
              Ćwiczenia →
            </Link>
          )}
          {tense.courseLink && (
            <Link
              href={tense.courseLink}
              className="rounded-xl border-2 border-white/15 bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition"
            >
              Kurs wideo →
            </Link>
          )}
        </div>
      </section>
    </>
  );
}

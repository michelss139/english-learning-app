"use client";

import Link from "next/link";
import { useMemo } from "react";
import { GrammarPracticeClient } from "@/components/grammar/GrammarPracticeClient";
import { getGrammarPracticeExercise } from "@/lib/grammar/practice";

export function InputPracticeClient({
  exerciseSlug,
  title,
  mapHref,
  mapLabel,
}: {
  exerciseSlug: string;
  title: string;
  mapHref: string;
  mapLabel: string;
}) {
  const exercise = useMemo(() => getGrammarPracticeExercise(exerciseSlug), [exerciseSlug]);
  const question = exercise?.questions?.[0] ?? null;

  return (
    <main className="space-y-6">
      <header className="px-1 py-1">
        <div className="flex items-center justify-between">
          <Link className="tile-frame" href={mapHref}>
            <span className="tile-core inline-flex items-center rounded-[11px] px-3 py-2 text-sm font-medium text-slate-700">
              ← {mapLabel}
            </span>
          </Link>
          <Link href="/app/grammar" className="text-sm text-slate-600 underline hover:text-slate-900">
            Spis treści
          </Link>
        </div>
      </header>

      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Ćwiczenie: {title}</h1>

      {question ? (
        <GrammarPracticeClient
          sentence={question.prompt}
          base={question.base ?? ""}
          correctAnswer={question.correct_option}
          mapHref={mapHref}
          exerciseSlug={exerciseSlug}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
          Brak pytań dla tego ćwiczenia.
        </div>
      )}
    </main>
  );
}

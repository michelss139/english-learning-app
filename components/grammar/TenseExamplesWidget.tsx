"use client";

import { useEffect, useState } from "react";
import { fetchChallengeExamples, type DbSentenceExample } from "@/lib/grammar/sentence-builder/dbExamples";

type Props = {
  tense: string;
  modal?: string;
  /** How many examples to show (default 6) */
  limit?: number;
  title?: string;
};

const SUBJECT_ORDER = ["I", "he", "they"];

export default function TenseExamplesWidget({ tense, modal, limit = 6, title = "Przykłady zdań" }: Props) {
  const [examples, setExamples] = useState<DbSentenceExample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const data = await fetchChallengeExamples({ tense: tense || null, modal: modal || null, limit: 60 });
      // Pick affirmative examples, prefer variety across subjects and verbs
      const affirmative = data.filter((e) => e.type === "affirmative");
      const picked: DbSentenceExample[] = [];
      const usedVerbs = new Set<string>();
      // First pass: one per subject in order
      for (const subject of SUBJECT_ORDER) {
        for (const ex of affirmative) {
          if (ex.subject === subject && !usedVerbs.has(ex.verb) && picked.length < limit) {
            picked.push(ex);
            usedVerbs.add(ex.verb);
            break;
          }
        }
      }
      // Second pass: fill remaining with unused verbs
      for (const ex of affirmative) {
        if (!usedVerbs.has(ex.verb) && picked.length < limit) {
          picked.push(ex);
          usedVerbs.add(ex.verb);
        }
      }
      setExamples(picked.slice(0, limit));
      setLoading(false);
    })();
  }, [tense, modal, limit]);

  if (loading) return null;
  if (examples.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-400">{title}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {examples.map((ex) => (
          <div
            key={ex.id}
            className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-900">{ex.sentence_en}</p>
            <p className="mt-0.5 text-xs text-slate-400">{ex.sentence_pl}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

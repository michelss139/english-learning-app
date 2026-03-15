"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type SectionKey =
  | "definition"
  | "must"
  | "mightMayCould"
  | "cant"
  | "negativeForms"
  | "mistakes"
  | "compare";

function DefinitionContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Definition</h2>
      <div className="space-y-4 text-slate-700">
        <p>
          Modal verbs związane z probability służą do oceniania, jak bardzo coś jest prawdopodobne.
        </p>
        <p>
          Używamy ich, gdy nie mamy pewności, ale próbujemy logicznie ocenić sytuację.
        </p>
        <p>Najczęściej używane modal verbs w tym znaczeniu to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>must</li>
          <li>might</li>
          <li>may</li>
          <li>could</li>
          <li>can&apos;t</li>
        </ul>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="text-slate-800">Example:</p>
          <p className="text-slate-800">She must be tired.</p>
          <p className="text-sm text-slate-600">Ona musi być zmęczona.</p>
          <p className="text-sm text-slate-700">Znaczenie: jestem prawie pewien.</p>
        </div>
      </div>
    </section>
  );
}

function MustContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Must</h2>
      <div className="space-y-4 text-slate-700">
        <p>
          W znaczeniu probability <strong>must</strong> oznacza bardzo silne przypuszczenie.
        </p>
        <p>
          Używamy go, gdy coś wydaje się niemal pewne na podstawie dostępnych informacji.
        </p>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="text-slate-800">Examples:</p>
          <p className="text-slate-800">She must be tired.</p>
          <p className="text-slate-800">He must be at home.</p>
          <p className="text-slate-800">They must be joking.</p>
        </div>
        <p>To znaczenie nie oznacza obowiązku.</p>
        <p>Tutaj must oznacza: <strong>jestem prawie pewien.</strong></p>
      </div>
    </section>
  );
}

function MightMayCouldContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Might / May / Could</h2>
      <div className="space-y-4 text-slate-700">
        <p>Te trzy modal verbs mogą wyrażać możliwość.</p>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="text-slate-800">Examples:</p>
          <p className="text-slate-800">She might be at home.</p>
          <p className="text-slate-800">He may be working.</p>
          <p className="text-slate-800">They could be late.</p>
        </div>
        <p>W praktyce wszystkie trzy zdania oznaczają:</p>
        <p><strong>To jest możliwe, ale nie jesteśmy pewni.</strong></p>
        <p>
          Różnice między nimi są zwykle bardzo niewielkie i w codziennym języku często używa się ich
          zamiennie.
        </p>
      </div>
    </section>
  );
}

function CantContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Can&apos;t</h2>
      <div className="space-y-4 text-slate-700">
        <p>
          W znaczeniu probability <strong>can&apos;t</strong> oznacza, że coś jest praktycznie
          niemożliwe.
        </p>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="text-slate-800">Examples:</p>
          <p className="text-slate-800">That can&apos;t be true.</p>
          <p className="text-slate-800">He can&apos;t be serious.</p>
          <p className="text-slate-800">She can&apos;t be at work today.</p>
        </div>
        <p>Znaczenie: <strong>To jest niemożliwe.</strong></p>
      </div>
    </section>
  );
}

function NegativeFormsContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Negative forms</h2>
      <div className="space-y-4 text-slate-700">
        <pre className="text-sm font-mono text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-300">
          might not
may not
could not
        </pre>
        <p>Examples:</p>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="text-slate-800">She might not be at home.</p>
          <p className="text-slate-800">He may not know about the meeting.</p>
          <p className="text-slate-800">They could not be ready yet.</p>
        </div>
      </div>
    </section>
  );
}

function MistakesContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Mistakes</h2>
      <div className="space-y-4 text-sm text-slate-800">
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p>❌ She must to be tired.</p>
          <p>✔ She must be tired.</p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p>❌ He can&apos;t to have done it.</p>
          <p>✔ He can&apos;t have done it.</p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p>❌ They might can come later.</p>
          <p>✔ They might come later.</p>
          <p className="text-slate-600">
            Modal verbs nie łączą się bezpośrednio z innymi modal verbs.
          </p>
        </div>
      </div>
    </section>
  );
}

function CompareContent() {
  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900">Compare</h2>
      <div className="space-y-4">
        <Link
          href="/app/grammar/compare?tense1=modal-must&tense2=modal-might"
          className="block rounded-xl border border-slate-300 bg-slate-50 p-4 hover:bg-slate-100 transition"
        >
          <h3 className="font-medium text-slate-900">Must vs Might</h3>
        </Link>
        <Link
          href="/app/grammar/compare?tense1=modal-must&tense2=modal-cant"
          className="block rounded-xl border border-slate-300 bg-slate-50 p-4 hover:bg-slate-100 transition"
        >
          <h3 className="font-medium text-slate-900">Must vs Can&apos;t</h3>
        </Link>
        <Link
          href="/app/grammar/compare?tense1=modal-possibility&tense2=modal-probability"
          className="block rounded-xl border border-slate-300 bg-slate-50 p-4 hover:bg-slate-100 transition"
        >
          <h3 className="font-medium text-slate-900">Possibility vs Probability</h3>
        </Link>
      </div>
    </section>
  );
}

export function ProbabilityClient() {
  const [activeSection, setActiveSection] = useState<SectionKey>("definition");
  const [renderedSection, setRenderedSection] = useState<SectionKey>("definition");
  const [isVisible, setIsVisible] = useState(true);
  const transitionRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (transitionRef.current) {
        window.clearTimeout(transitionRef.current);
      }
    };
  }, []);

  const changeSection = (nextSection: SectionKey) => {
    if (nextSection === activeSection) return;
    if (transitionRef.current) {
      window.clearTimeout(transitionRef.current);
    }

    setActiveSection(nextSection);
    setIsVisible(false);
    transitionRef.current = window.setTimeout(() => {
      setRenderedSection(nextSection);
      requestAnimationFrame(() => setIsVisible(true));
    }, 180);
  };

  const sectionButtons: { id: SectionKey; label: string }[] = [
    { id: "definition", label: "Definition" },
    { id: "must", label: "Must" },
    { id: "mightMayCould", label: "Might / May / Could" },
    { id: "cant", label: "Can't" },
    { id: "negativeForms", label: "Negative forms" },
    { id: "mistakes", label: "Mistakes" },
    { id: "compare", label: "Compare" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Probability</h1>
          <p className="max-w-2xl text-sm text-slate-700">
            Modal verbs związane z probability służą do wyrażania przypuszczeń i oceniania, jak bardzo
            coś jest prawdopodobne.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/grammar/sentence-builder?type=modal&modal=might"
              className="inline-flex w-fit rounded-xl border-2 border-slate-900 bg-white px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Try building sentences →
            </Link>
            <Link
              href="/app/courses/modal-probability"
              className="text-sm text-slate-600 underline hover:text-slate-800"
            >
              Zobacz pełny kurs
            </Link>
          </div>
        </div>
        <Link
          href="/app/grammar/modal-verbs"
          className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          ← Wróć do Modal Verbs
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_1fr]">
        <div className="rounded-2xl border border-slate-900 bg-white p-6 md:p-8 lg:min-h-[620px]">
          <div className={`transition-opacity duration-250 ${isVisible ? "opacity-100" : "opacity-0"}`}>
            {renderedSection === "definition" && <DefinitionContent />}
            {renderedSection === "must" && <MustContent />}
            {renderedSection === "mightMayCould" && <MightMayCouldContent />}
            {renderedSection === "cant" && <CantContent />}
            {renderedSection === "negativeForms" && <NegativeFormsContent />}
            {renderedSection === "mistakes" && <MistakesContent />}
            {renderedSection === "compare" && <CompareContent />}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-900 bg-white p-4">
          <div className="mb-3 text-xs uppercase tracking-[0.14em] text-slate-500">Sekcje</div>
          <div className="mb-3 h-px w-full bg-slate-200" />
          <div className="flex flex-col gap-2.5">
            {sectionButtons.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => changeSection(item.id)}
                className={`w-full rounded-2xl border border-black/15 px-4 py-2.5 text-left text-sm text-slate-700 transition-all duration-200 hover:bg-black/5 ${
                  activeSection === item.id
                    ? "border-l-4 border-l-black bg-black/5 font-semibold text-slate-900 scale-[1.01]"
                    : "font-medium"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

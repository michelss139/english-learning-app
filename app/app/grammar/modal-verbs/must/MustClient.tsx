"use client";

import { useEffect, useRef, useState } from "react";
import { BackButton } from "@/app/_components/BackButton";
import Link from "next/link";
import { CorrectIcon, WrongIcon } from "@/app/_components/FeedbackIcons";

type SectionKey =
  | "definition"
  | "obligation"
  | "probability"
  | "negativeForms"
  | "otherForms"
  | "commonPatterns"
  | "mistakes"
  | "compare";

function DefinitionContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Definition</h2>
      <div className="space-y-4 text-slate-700">
        <p>
          Must to modal verb, który ma dwa główne znaczenia:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>obligation (obowiązek)</li>
          <li>logical deduction (silne przypuszczenie)</li>
        </ul>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="text-slate-800">Examples:</p>
          <p className="text-slate-800">You must wear a helmet.</p>
          <p className="text-slate-800">She must be tired.</p>
        </div>
        <p>Znaczenie zależy od kontekstu zdania.</p>
      </div>
    </section>
  );
}

function ObligationContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Obligation</h2>
      <div className="space-y-4 text-slate-700">
        <p>Must może oznaczać obowiązek lub nakaz.</p>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="text-slate-800">Examples:</p>
          <p className="text-slate-800">You must wear a helmet.</p>
          <p className="text-slate-800">Passengers must fasten their seatbelts.</p>
          <p className="text-slate-800">Employees must wear a uniform.</p>
        </div>
        <p>To użycie często pojawia się w:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>przepisach</li>
          <li>regulaminach</li>
          <li>instrukcjach</li>
        </ul>
        <Link
          href="/app/grammar/modals/obligation"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-900 underline hover:text-slate-700"
        >
          See full explanation →
        </Link>
      </div>
    </section>
  );
}

function ProbabilityContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Probability</h2>
      <div className="space-y-4 text-slate-700">
        <p>Must może oznaczać bardzo silne przypuszczenie.</p>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="text-slate-800">Examples:</p>
          <p className="text-slate-800">She must be tired.</p>
          <p className="text-slate-800">He must be at home.</p>
          <p className="text-slate-800">They must be joking.</p>
        </div>
        <p>Znaczenie: <strong>Jestem prawie pewien.</strong></p>
        <Link
          href="/app/grammar/modal-verbs/probability"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-900 underline hover:text-slate-700"
        >
          See full explanation →
        </Link>
      </div>
    </section>
  );
}

function NegativeFormsContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Negative forms</h2>
      <div className="space-y-4 text-slate-700">
        <p className="font-mono text-slate-800">must not / mustn&apos;t</p>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="text-slate-800">Example:</p>
          <p className="text-slate-800">You mustn&apos;t park here.</p>
          <p className="text-sm text-slate-600">Znaczenie: zakaz</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Important difference</p>
          <p className="text-slate-800">mustn&apos;t ≠ don&apos;t have to</p>
          <p className="text-slate-800 mt-2">You mustn&apos;t press this button.</p>
          <p className="text-slate-800">You don&apos;t have to press this button.</p>
        </div>
      </div>
    </section>
  );
}

function OtherFormsContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Other forms</h2>
      <div className="space-y-4 text-slate-700">
        <p>
          Must nie ma naturalnej formy w przeszłości ani przyszłości. Dlatego używamy{" "}
          <strong>have to</strong>.
        </p>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="text-slate-800">Examples:</p>
          <p className="text-slate-800">I had to leave early.</p>
          <p className="text-slate-800">I will have to work tomorrow.</p>
        </div>
      </div>
    </section>
  );
}

function CommonPatternsContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Common patterns</h2>
      <div className="space-y-4 text-slate-700">
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="font-mono text-slate-800">must + base verb</p>
          <p className="text-slate-800">You must finish this today.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="font-mono text-slate-800">must be</p>
          <p className="text-slate-800">She must be tired.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="font-mono text-slate-800">must have + past participle</p>
          <p className="text-slate-800">He must have forgotten.</p>
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
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="flex items-center gap-1.5"><WrongIcon size={16} /> He musts go now.</p>
          <p>✔ He must go now.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="flex items-center gap-1.5"><WrongIcon size={16} /> She must to leave.</p>
          <p>✔ She must leave.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="flex items-center gap-1.5"><WrongIcon size={16} /> He must to be tired.</p>
          <p>✔ He must be tired.</p>
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
          href="/app/grammar/compare?tense1=modal-must&tense2=modal-have-to"
          className="block rounded-xl border border-slate-200 bg-slate-50/80 p-4 hover:bg-slate-100 transition"
        >
          <h3 className="font-medium text-slate-900">Must vs Have to</h3>
        </Link>
        <Link
          href="/app/grammar/compare?tense1=modal-must&tense2=modal-should"
          className="block rounded-xl border border-slate-200 bg-slate-50/80 p-4 hover:bg-slate-100 transition"
        >
          <h3 className="font-medium text-slate-900">Must vs Should</h3>
        </Link>
        <Link
          href="/app/grammar/compare?tense1=modal-must&tense2=modal-might"
          className="block rounded-xl border border-slate-200 bg-slate-50/80 p-4 hover:bg-slate-100 transition"
        >
          <h3 className="font-medium text-slate-900">Must vs Might</h3>
        </Link>
      </div>
    </section>
  );
}

export function MustClient() {
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
    { id: "obligation", label: "Obligation" },
    { id: "probability", label: "Probability" },
    { id: "negativeForms", label: "Negative forms" },
    { id: "otherForms", label: "Other forms" },
    { id: "commonPatterns", label: "Common patterns" },
    { id: "mistakes", label: "Mistakes" },
    { id: "compare", label: "Compare" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Must</h1>
          <p className="max-w-2xl text-sm text-slate-700">
            Must to jeden z najważniejszych modal verbs w języku angielskim. Może oznaczać zarówno{" "}
            <strong>obowiązek</strong>, jak i <strong>silne przypuszczenie</strong>.
          </p>
          <div className="mt-3">
            <Link
              href="/app/grammar/sentence-builder?type=modal&modal=must"
              className="inline-flex w-fit rounded-xl border-2 border-slate-900 bg-white px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Try building sentences →
            </Link>
          </div>
        </div>
        <BackButton href="/app/grammar/modal-verbs" />
      </header>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_1fr]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-6">
          <div className={`transition-opacity duration-250 ${isVisible ? "opacity-100" : "opacity-0"}`}>
            {renderedSection === "definition" && <DefinitionContent />}
            {renderedSection === "obligation" && <ObligationContent />}
            {renderedSection === "probability" && <ProbabilityContent />}
            {renderedSection === "negativeForms" && <NegativeFormsContent />}
            {renderedSection === "otherForms" && <OtherFormsContent />}
            {renderedSection === "commonPatterns" && <CommonPatternsContent />}
            {renderedSection === "mistakes" && <MistakesContent />}
            {renderedSection === "compare" && <CompareContent />}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Sekcje</div>
                    <div className="flex flex-col gap-1.5">
            {sectionButtons.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => changeSection(item.id)}
                data-active={activeSection === item.id ? "true" : "false"}
              className={`grammar-aside-item w-full px-3.5 py-2 text-left text-sm ${
                  activeSection === item.id
                    ? "font-semibold text-slate-900"
                    : "font-medium text-slate-600 hover:text-slate-900"
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

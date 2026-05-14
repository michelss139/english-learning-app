"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type SectionKey =
  | "definition"
  | "should"
  | "oughtTo"
  | "hadBetter"
  | "negativeForms"
  | "mistakes"
  | "compare";

function DefinitionContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Definition</h2>
      <div className="space-y-4 text-slate-700">
        <p>
          Modal verbs związane z advice służą do dawania rad, sugestii i zaleceń.
        </p>
        <p>Najczęściej używamy:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>should</li>
          <li>ought to</li>
          <li>had better</li>
        </ul>
        <p>
          Każda z tych konstrukcji może służyć do powiedzenia komuś, co warto zrobić, ale nie
          brzmią one identycznie.
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>should</strong> — najczęstsza i najbardziej neutralna forma rady
          </li>
          <li>
            <strong>ought to</strong> — bardzo podobne do should, ale trochę bardziej formalne lub
            książkowe
          </li>
          <li>
            <strong>had better</strong> — rada z wyraźnym ostrzeżeniem o konsekwencjach
          </li>
        </ul>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="text-slate-800">Example:</p>
          <p className="text-slate-800">You should talk to your manager.</p>
          <p className="text-sm text-slate-600">Powinieneś porozmawiać ze swoim przełożonym.</p>
        </div>
      </div>
    </section>
  );
}

function ShouldContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Should</h2>
      <div className="space-y-4 text-slate-700">
        <p>
          Should to najczęstszy sposób udzielania rady w języku angielskim.
        </p>
        <p>
          Używamy go, gdy chcemy powiedzieć, że coś jest dobrym pomysłem, rozsądne albo zalecane.
        </p>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="text-slate-800">Examples:</p>
          <p className="text-slate-800">You should talk to your manager.</p>
          <p className="text-slate-800">You should get some rest.</p>
          <p className="text-slate-800">He should apologise.</p>
        </div>
        <p>Should brzmi neutralnie i naturalnie w codziennej komunikacji.</p>
      </div>
    </section>
  );
}

function OughtToContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Ought to</h2>
      <div className="space-y-4 text-slate-700">
        <p>
          Ought to ma bardzo podobne znaczenie do should.
        </p>
        <p>W praktyce oba słowa często można stosować zamiennie.</p>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="text-slate-800">Examples:</p>
          <p className="text-slate-800">You ought to apologise.</p>
          <p className="text-slate-800">She ought to see a doctor.</p>
        </div>
        <p>
          Ought to brzmi zwykle trochę bardziej formalnie, bardziej książkowo albo bardziej
          „moralnie”.
        </p>
        <p>W codziennym języku should jest używane częściej.</p>
      </div>
    </section>
  );
}

function HadBetterContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Had better</h2>
      <div className="space-y-4 text-slate-700">
        <p>
          Had better również służy do dawania rady, ale zwykle zawiera ostrzeżenie: jeśli tego nie
          zrobisz, mogą pojawić się negatywne konsekwencje.
        </p>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="text-slate-800">Examples:</p>
          <p className="text-slate-800">You had better leave now.</p>
          <p className="text-slate-800">You had better not be late.</p>
          <p className="text-slate-800">We had better take a taxi.</p>
        </div>
        <p>Ta konstrukcja nie oznacza przeszłości, mimo że zawiera słowo had.</p>
        <p>Had better brzmi mocniej niż should.</p>
      </div>
    </section>
  );
}

function NegativeFormsContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Negative forms</h2>
      <div className="space-y-4 text-slate-700">
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="font-medium text-slate-900">should not / shouldn&apos;t</p>
          <p className="text-slate-800">You shouldn&apos;t ignore this problem.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="font-medium text-slate-900">ought not to</p>
          <p className="text-slate-800">You ought not to speak to her like that.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="font-medium text-slate-900">had better not</p>
          <p className="text-slate-800">You had better not be late.</p>
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
          <p>❌ He should to go.</p>
          <p>✔ He should go.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p>❌ You had better to leave now.</p>
          <p>✔ You had better leave now.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p>❌ She ought go now.</p>
          <p>✔ She ought to go now.</p>
        </div>
        <p className="text-slate-600">
          Po modal verbs nie używamy &quot;to&quot;, z wyjątkiem konstrukcji ought to.
        </p>
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
          href="/app/grammar/compare?tense1=modal-should&tense2=modal-ought-to"
          className="block rounded-xl border border-slate-200 bg-slate-50/80 p-4 hover:bg-slate-100 transition"
        >
          <h3 className="font-medium text-slate-900">Should vs Ought to</h3>
        </Link>
        <Link
          href="/app/grammar/compare?tense1=modal-should&tense2=modal-had-better"
          className="block rounded-xl border border-slate-200 bg-slate-50/80 p-4 hover:bg-slate-100 transition"
        >
          <h3 className="font-medium text-slate-900">Should vs Had better</h3>
        </Link>
      </div>
    </section>
  );
}

export function AdviceClient() {
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
    { id: "should", label: "Should" },
    { id: "oughtTo", label: "Ought to" },
    { id: "hadBetter", label: "Had better" },
    { id: "negativeForms", label: "Negative forms" },
    { id: "mistakes", label: "Mistakes" },
    { id: "compare", label: "Compare" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Advice</h1>
          <p className="max-w-2xl text-sm text-slate-700">
            Modal verbs związane z advice służą do dawania rad, sugestii i zaleceń. Najczęściej
            używamy do tego should, ought to oraz had better.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/grammar/sentence-builder?type=modal&modal=should"
              className="inline-flex w-fit rounded-xl border-2 border-slate-900 bg-white px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Try building sentences →
            </Link>
            <Link
              href="/app/courses/modal-advice"
              className="text-sm text-slate-600 underline hover:text-slate-800"
            >
              Zobacz pełny kurs
            </Link>
          </div>
        </div>
        <Link
          href="/app/grammar/modal-verbs"
          className="inline-flex items-center self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
        >
          ← Wróć do Modal Verbs
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_1fr]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-6">
          <div className={`transition-opacity duration-250 ${isVisible ? "opacity-100" : "opacity-0"}`}>
            {renderedSection === "definition" && <DefinitionContent />}
            {renderedSection === "should" && <ShouldContent />}
            {renderedSection === "oughtTo" && <OughtToContent />}
            {renderedSection === "hadBetter" && <HadBetterContent />}
            {renderedSection === "negativeForms" && <NegativeFormsContent />}
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

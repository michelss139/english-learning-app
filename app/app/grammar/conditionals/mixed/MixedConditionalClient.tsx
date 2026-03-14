"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type SectionKey =
  | "definition"
  | "construction"
  | "examples"
  | "mistakes"
  | "compare";

function DefinitionContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Definicja</h2>
      <div className="space-y-2 text-slate-700">
        <p>
          Mixed Conditional opisuje sytuacje, w których{" "}
          <strong>warunek i rezultat dotyczą różnych momentów w czasie</strong>.
        </p>
        <p>
          Najczęściej oznacza to, że warunek odnosi się do <strong>przeszłości</strong>, a rezultat
          dotyczy <strong>teraźniejszości</strong> – albo odwrotnie.
        </p>
        <p>
          Używamy Mixed Conditional, gdy chcemy pokazać, że{" "}
          <strong>zdarzenie z przeszłości wpływa na sytuację teraz</strong>, albo że{" "}
          <strong>obecna sytuacja mogła wpłynąć na przeszłość</strong>.
        </p>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="text-sm font-medium text-slate-900">Przykład</p>
          <p className="text-slate-800">
            <strong>If I had studied medicine, I would be a doctor now.</strong>
          </p>
          <p className="text-sm text-slate-600">
            Gdybym studiował medycynę, byłbym teraz lekarzem. Warunek dotyczy{" "}
            <strong>przeszłości</strong>, a rezultat <strong>teraźniejszości</strong>.
          </p>
        </div>
      </div>
    </section>
  );
}

function ConstructionContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Konstrukcja</h2>
      <div className="space-y-4 text-slate-700">
        <p>
          Mixed Conditional powstaje przez <strong>połączenie różnych typów zdań warunkowych</strong>.
          Najczęściej spotykamy dwa warianty.
        </p>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-3">
          <p className="font-medium text-slate-900">Typ 1 — przeszłość → teraźniejszość</p>
          <p className="text-sm">
            Warunek odnosi się do <strong>przeszłości</strong>, a rezultat opisuje{" "}
            <strong>obecną sytuację</strong>.
          </p>
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
            <p className="font-medium">If + past perfect, would + infinitive</p>
            <p className="mt-1">If I had studied medicine, I would be a doctor now.</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-3">
          <p className="font-medium text-slate-900">Typ 2 — teraźniejszość → przeszłość</p>
          <p className="text-sm">
            Warunek odnosi się do <strong>teraźniejszości</strong>, a rezultat opisuje{" "}
            <strong>przeszłość</strong>.
          </p>
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
            <p className="font-medium">If + past simple, would have + past participle</p>
            <p className="mt-1">If I were more careful, I would not have made that mistake.</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 overflow-x-auto">
          <table className="w-full text-sm text-slate-800">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 pr-4 font-medium">typ</th>
                <th className="text-left py-2 pr-4 font-medium">warunek</th>
                <th className="text-left py-2 font-medium">rezultat</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">past → present</td>
                <td className="py-2 pr-4">past perfect</td>
                <td className="py-2">would + infinitive</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">present → past</td>
                <td className="py-2 pr-4">past simple</td>
                <td className="py-2">would have + past participle</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ExamplesContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Przykłady</h2>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-800 space-y-2">
        <p>If I had taken that job, I would live in London now.</p>
        <p>If she had studied harder, she would have a better job today.</p>
        <p>If we had bought that house, we would live near the sea now.</p>
        <p>If I were better at maths, I would have passed the exam.</p>
        <p>If he had saved more money, he would be less stressed now.</p>
        <p>If they had left earlier, they would be here now.</p>
        <p>If I were more organised, I would not have missed the meeting yesterday.</p>
      </div>
      <p className="text-sm text-slate-700">
        Mixed Conditional pokazuje, że wydarzenia z przeszłości mogą wpływać na naszą obecną sytuację
        lub odwrotnie.
      </p>
    </section>
  );
}

function MistakesContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Błędy</h2>
      <p className="text-slate-700">
        Najczęstsze błędy wynikają z używania jednego typu conditionala zamiast konstrukcji mieszanej.
      </p>
      <div className="space-y-4 text-sm text-slate-800">
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p>❌ If I had studied medicine, I would have been a doctor now.</p>
          <p>✔ If I had studied medicine, I would be a doctor now.</p>
          <p className="text-slate-600">Third Conditional zamiast Mixed – rezultat dotyczy teraźniejszości.</p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p>❌ If I studied medicine, I would be a doctor now.</p>
          <p>✔ If I had studied medicine, I would be a doctor now.</p>
          <p className="text-slate-600">Second Conditional zamiast Mixed – warunek dotyczy przeszłości.</p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p>❌ If I were more careful, I would not made that mistake.</p>
          <p>✔ If I were more careful, I would not have made that mistake.</p>
          <p className="text-slate-600">Błąd w konstrukcji rezultatu – trzeba mieć would have + past participle.</p>
        </div>
      </div>
    </section>
  );
}

function CompareContent() {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-slate-900">Porównaj</h2>
      <p className="mb-3 text-slate-700">
        Mixed Conditional łączy elementy <strong>Second Conditional</strong> i{" "}
        <strong>Third Conditional</strong>. Second Conditional opisuje sytuacje{" "}
        <strong>hipotetyczne w teraźniejszości lub przyszłości</strong>.
      </p>
      <div className="mb-3 rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-800">
        <p>If I had more time, I would travel more.</p>
      </div>
      <p className="mb-3 text-slate-700">
        Third Conditional opisuje sytuacje <strong>hipotetyczne w przeszłości</strong>.
      </p>
      <div className="mb-3 rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-800">
        <p>If I had studied harder, I would have passed the exam.</p>
      </div>
      <p className="mb-4 text-slate-700">
        Mixed Conditional łączy oba te typy, pokazując zależność między różnymi momentami w czasie.
      </p>
      <div className="mb-4 rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-800">
        <p>If I had studied medicine, I would be a doctor now.</p>
      </div>
      <Link
        href="/app/grammar/compare?tense1=second-conditional&tense2=third-conditional"
        className="text-slate-700 underline hover:text-slate-900 font-medium"
      >
        Second Conditional vs Third Conditional →
      </Link>
    </section>
  );
}

export function MixedConditionalClient() {
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
    { id: "definition", label: "Definicja" },
    { id: "construction", label: "Konstrukcja" },
    { id: "examples", label: "Przykłady" },
    { id: "mistakes", label: "Błędy" },
    { id: "compare", label: "Porównaj" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Mixed Conditional</h1>
          <p className="max-w-2xl text-sm text-slate-700">
            Ten typ zdania warunkowego łączy różne momenty w czasie. Pokazuje, jak wydarzenia z
            przeszłości mogą wpływać na teraźniejszość lub jak obecna sytuacja mogła wpłynąć na
            przeszłość.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/grammar/conditionals/mixed/practice"
              className="inline-flex w-fit rounded-xl border border-slate-900 bg-white px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Ćwicz Mixed Conditional
            </Link>
            <Link
              href="/app/courses/mixed-conditional"
              className="text-sm text-slate-600 underline hover:text-slate-800"
            >
              Zobacz pełny kurs
            </Link>
          </div>
        </div>
        <Link
          href="/app/grammar/conditionals"
          className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          ← Wróć do Conditionals
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_1fr]">
        <div className="rounded-2xl border border-slate-900 bg-white p-6 md:p-8 lg:min-h-[620px]">
          <div className={`transition-opacity duration-250 ${isVisible ? "opacity-100" : "opacity-0"}`}>
            {renderedSection === "definition" && <DefinitionContent />}
            {renderedSection === "construction" && <ConstructionContent />}
            {renderedSection === "examples" && <ExamplesContent />}
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

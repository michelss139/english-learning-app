"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type SectionKey =
  | "definition"
  | "construction"
  | "usage"
  | "difference"
  | "signals"
  | "mistakes"
  | "compare";

function DefinitionContent() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Definicja</h2>
      <p className="text-slate-700">
        Past Perfect Continuous opisuje czynność,
        która trwała przez pewien czas przed innym momentem w przeszłości.
      </p>
      <p className="text-slate-700">To „proces w przeszłości przed przeszłością”.</p>
      <p className="text-slate-700">
        Podkreślamy:
        <br />– długość trwania
        <br />– ciągłość
        <br />– proces przed innym wydarzeniem
      </p>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
        <p>She was tired because she had been working all day.</p>
        <p>Najpierw: pracowała przez dłuższy czas.</p>
        <p>Potem: była zmęczona.</p>
      </div>
      <p className="text-slate-700">
        Ten czas skupia się na trwaniu, nie na samym fakcie zakończenia.
      </p>
    </section>
  );
}

function ConstructionContent() {
  return (
    <div className="space-y-4">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Konstrukcja</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-300">
          <table className="w-full min-w-[400px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50">
                <th className="p-3 font-medium text-slate-900">Typ zdania</th>
                <th className="p-3 font-medium text-slate-900">Schemat</th>
                <th className="p-3 font-medium text-slate-900">Przykład</th>
              </tr>
            </thead>
            <tbody className="text-slate-800">
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Twierdzenie</td>
                <td className="p-3">
                  <span className="auxiliary">had</span> <span className="verb-main">been</span> <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>
                </td>
                <td className="p-3 example-muted">They had been playing football before it started to rain.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Przeczenie</td>
                <td className="p-3">
                  <span className="auxiliary">had not</span> <span className="verb-main">been</span> <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>
                </td>
                <td className="p-3 example-muted">He had not been working when I called.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Pytanie</td>
                <td className="p-3">
                  <span className="auxiliary">Had</span> + podmiot + <span className="verb-main">been</span> <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>?
                </td>
                <td className="p-3 example-muted">Had she been waiting? Had they been sleeping?</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-base font-semibold text-slate-900">KONSTRUKCJA: HAD + BEEN + -ING</h3>
        <p className="text-slate-700">
          Konstrukcja zawsze zawiera had + been + -ing. Element „been" jest obowiązkowy — nie można go pominąć.
        </p>
      </section>
    </div>
  );
}

function UsageContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Kiedy używamy</h2>
      <div>
        <p className="font-medium text-slate-900">
          1) Czynność trwała przed innym wydarzeniem w przeszłości
        </p>
        <p className="example-muted">They had been playing football before it started to rain.</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">2) Wyjaśnienie stanu w przeszłości</p>
        <p className="example-muted">He was exhausted because he had been running.</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">
          3) Podkreślenie długości trwania przed momentem w przeszłości
        </p>
        <p className="example-muted">We had been talking for hours before the meeting ended.</p>
      </div>
      <p className="text-slate-700">
        Ten czas podkreśla proces i jego długość przed innym wydarzeniem.
      </p>
    </section>
  );
}

function DifferenceContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Różnica vs Past Perfect</h2>
      <div>
        <p className="font-medium text-slate-900">Past Perfect:</p>
        <p className="text-slate-700">skupia się na fakcie zakończenia</p>
        <p className="example-muted">She had written the report. (Raport był gotowy.)</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">Past Perfect Continuous:</p>
        <p className="text-slate-700">skupia się na procesie trwania</p>
        <p className="example-muted">She had been writing the report. (Była w trakcie pisania.)</p>
      </div>
      <p className="text-slate-700">
        Perfect = efekt
        <br />
        Perfect Continuous = trwanie
      </p>
    </section>
  );
}

function SignalsContent() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Sygnały</h2>
      <ul className="list-inside list-disc space-y-1 text-slate-700">
        <li>for</li>
        <li>since</li>
        <li>before</li>
        <li>by the time</li>
      </ul>
      <p className="text-slate-700">
        Często pojawia się relacja czasowa między dwoma wydarzeniami.
      </p>
    </section>
  );
}

function MistakesContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Błędy</h2>
      <div className="space-y-2 text-slate-800">
        <p>
          ❌ She had been work all day.
          <br />
          ✔ She had been work<span className="verb-ending">ing</span> all day.
        </p>
        <p>
          ❌ She had working before I arrived.
          <br />
          ✔ She had been work<span className="verb-ending">ing</span> before I arrived.
        </p>
        <p>
          ❌ She was tired because she worked all day.
          <br />
          ✔ She was tired because she had been work<span className="verb-ending">ing</span> all day.
        </p>
      </div>
      <p className="text-slate-700">Po „had” musi być „been” i forma -ing.</p>
    </section>
  );
}

function CompareContent() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Porównaj</h2>
      <p className="text-slate-700">
        Past Perfect Continuous:
        <br />
        proces trwający przed innym momentem w przeszłości
      </p>
      <p className="text-slate-700">
        Past Perfect:
        <br />
        zakończone wydarzenie przed innym wydarzeniem
      </p>
      <p className="example-muted">
        She had been studying before the exam.
        <br />
        She had studied before the exam.
      </p>
      <Link
        href="/app/grammar/compare?tense1=past-perfect-continuous&tense2=past-perfect"
        className="inline-block text-slate-700 underline hover:text-slate-900"
      >
        Past Perfect Continuous vs Past Perfect
      </Link>
    </section>
  );
}

export function PastPerfectContinuousClient() {
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
    { id: "usage", label: "Kiedy używamy" },
    { id: "difference", label: "Różnica vs Past Perfect" },
    { id: "signals", label: "Sygnały" },
    { id: "mistakes", label: "Błędy" },
    { id: "compare", label: "Porównaj" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Past Perfect Continuous</h1>
          <p className="max-w-3xl text-sm text-slate-700">
            Past Perfect Continuous pokazuje proces trwający przed innym momentem w przeszłości.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/courses/past-perfect-continuous"
              className="text-sm text-slate-600 underline hover:text-slate-800"
            >
              Zobacz pełny kurs
            </Link>
          </div>
        </div>
        <Link
          href="/app/grammar/tenses"
          className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          ← Wróć do czasów
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_1fr]">
        <div className="rounded-2xl border border-slate-900 bg-white p-6 md:p-8 lg:min-h-[620px]">
          <div className={`transition-opacity duration-250 ${isVisible ? "opacity-100" : "opacity-0"}`}>
            {renderedSection === "definition" && <DefinitionContent />}
            {renderedSection === "construction" && <ConstructionContent />}
            {renderedSection === "usage" && <UsageContent />}
            {renderedSection === "difference" && <DifferenceContent />}
            {renderedSection === "signals" && <SignalsContent />}
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


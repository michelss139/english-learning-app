"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type SectionKey =
  | "definition"
  | "construction"
  | "usage"
  | "timeline"
  | "vsFuturePerfect"
  | "mistakes"
  | "compare";

function DefinitionContent() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Definicja</h2>
      <p className="text-slate-700">
        Future Perfect Continuous opisuje czynność, która będzie trwała przez określony czas do
        konkretnego momentu w przyszłości.
      </p>
      <p className="text-slate-700">
        Skupiamy się na długości trwania przed punktem w przyszłości.
      </p>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="example-muted">By next month, I will have been working here for five years.</p>
      </div>
      <p className="text-slate-700 font-medium">
        Nie chodzi tylko o to, że coś będzie zakończone. Chodzi o to, jak długo będzie trwało do tego
        momentu.
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
                  <span className="auxiliary">will</span> <span className="verb-main">have</span>{" "}
                  <span className="verb-main">been</span> + <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>
                </td>
                <td className="p-3 example-muted">I will have been working. She will have been studying.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Przeczenie</td>
                <td className="p-3">
                  <span className="auxiliary">will not</span> <span className="verb-main">have</span>{" "}
                  <span className="verb-main">been</span> + <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>
                </td>
                <td className="p-3 example-muted">I won&apos;t have been working here for five years by 2026.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Pytanie</td>
                <td className="p-3">
                  <span className="auxiliary">Will</span> + podmiot + <span className="verb-main">have</span>{" "}
                  <span className="verb-main">been</span> + <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>?
                </td>
                <td className="p-3 example-muted">Will you have been working here for five years by 2026? Will she have been studying long by then?</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-base font-semibold text-slate-900">KONSTRUKCJA: WILL + HAVE + BEEN + -ING</h3>
        <p className="text-slate-700">
          Konstrukcja zawsze: will + have + been + forma -ing czasownika głównego. Dla wszystkich osób schemat jest taki sam.
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
        <p className="font-medium text-slate-900">1) Podkreślenie długości trwania do momentu w przyszłości</p>
        <p className="example-muted">By 8 pm, I will have been studying for three hours.</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">2) Mówienie o ciągłym procesie w przyszłości</p>
        <p className="example-muted">Next year, they will have been living here for a decade.</p>
      </div>
    </section>
  );
}

function TimelineContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Oś czasu</h2>
      <p className="text-slate-700">
        Teraz → przyszłość (punkt odniesienia) → czynność trwająca już od jakiegoś czasu
      </p>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-700">
        <p className="example-muted">By the time you arrive, I will have been waiting for an hour.</p>
      </div>
      <p className="text-slate-700">
        Najpierw: będę czekał przez godzinę.
        <br />
        Potem: przyjedziesz.
      </p>
      <p className="text-slate-700 font-medium">
        To „trwanie przed przyszłością”.
      </p>
    </section>
  );
}

function VsFuturePerfectContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Różnica vs Future Perfect</h2>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-slate-800">
        <p>
          <strong>Future Perfect:</strong> skupia się na efekcie
        </p>
        <p className="example-muted">I will have finished the report.</p>
      </div>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-slate-800">
        <p>
          <strong>Future Perfect Continuous:</strong> skupia się na długości trwania
        </p>
        <p className="example-muted">I will have been writing the report for two hours.</p>
      </div>
      <p className="text-slate-700 font-medium">
        Perfect = efekt, Perfect Continuous = trwanie.
      </p>
    </section>
  );
}

function MistakesContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Błędy</h2>
      <div className="space-y-3 text-slate-800">
        <p>
          ❌ I will have been work for two hours.
          <br />
          ✔ I will have been <span className="verb-main">work</span>
          <span className="verb-ending">ing</span> for two hours.
        </p>
        <p>
          ❌ She will have working here for five years.
          <br />
          ✔ She will have <span className="verb-main">been</span> <span className="verb-main">work</span>
          <span className="verb-ending">ing</span> here for five years.
        </p>
        <p>
          ❌ I will been working.
          <br />
          ✔ I will <span className="verb-main">have</span> <span className="verb-main">been</span>{" "}
          <span className="verb-main">work</span>
          <span className="verb-ending">ing</span>.
        </p>
      </div>
      <p className="text-slate-700">
        Nie można pominąć „been”.
      </p>
    </section>
  );
}

function CompareContent() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Porównaj</h2>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-slate-800">
        <p>
          <strong>Future Perfect Continuous:</strong> długość trwania do momentu w przyszłości
        </p>
        <p>
          <strong>Future Perfect:</strong> zakończenie przed momentem w przyszłości
        </p>
      </div>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-700">
        <p className="example-muted">By 6 pm, I will have written the email.</p>
        <p className="example-muted">By 6 pm, I will have been writing for two hours.</p>
      </div>
      <Link
        href="/app/grammar/compare?tense1=future-perfect-continuous&tense2=future-perfect-simple"
        className="inline-block text-slate-700 underline hover:text-slate-900"
      >
        Future Perfect Continuous vs Future Perfect
      </Link>
    </section>
  );
}

export function FuturePerfectContinuousClient() {
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
    { id: "timeline", label: "Oś czasu" },
    { id: "vsFuturePerfect", label: "Różnica vs Future Perfect" },
    { id: "mistakes", label: "Błędy" },
    { id: "compare", label: "Porównaj" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Future Perfect Continuous
          </h1>
          <p className="max-w-3xl text-sm text-slate-700">
            Długość trwania do momentu w przyszłości — proces, nie tylko efekt.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/courses/future-perfect-continuous"
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
            {renderedSection === "timeline" && <TimelineContent />}
            {renderedSection === "vsFuturePerfect" && <VsFuturePerfectContent />}
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

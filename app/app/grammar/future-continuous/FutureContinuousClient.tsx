"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type SectionKey =
  | "definition"
  | "construction"
  | "usage"
  | "momentInFuture"
  | "vsFutureSimple"
  | "mistakes"
  | "compare";

function DefinitionContent() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Definicja</h2>
      <p className="text-slate-700">
        Future Continuous opisuje czynność, która będzie w trakcie w określonym momencie w przyszłości.
      </p>
      <p className="text-slate-700">
        Interesuje nas coś, co będzie się działo, nie coś, co dopiero się wydarzy.
      </p>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="example-muted">This time tomorrow, I will be flying to Paris.</p>
      </div>
      <p className="text-slate-700 font-medium">
        To „w trakcie w przyszłości”.
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
                  <span className="auxiliary">will</span> <span className="verb-main">be</span> + <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>
                </td>
                <td className="p-3 example-muted">I will be working. She will be studying.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Przeczenie</td>
                <td className="p-3">
                  <span className="auxiliary">will not</span> <span className="verb-main">be</span> + <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>
                </td>
                <td className="p-3 example-muted">I won&apos;t be working tomorrow.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Pytanie</td>
                <td className="p-3">
                  <span className="auxiliary">Will</span> + podmiot + <span className="verb-main">be</span> + <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>?
                </td>
                <td className="p-3 example-muted">Will you be working tomorrow? Will she be sleeping at 10 pm?</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-base font-semibold text-slate-900">KONSTRUKCJA: WILL + BE + -ING</h3>
        <p className="text-slate-700">
          Po „will be” zawsze używamy formy -ing czasownika głównego. Dla wszystkich osób schemat jest taki sam.
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
        <p className="font-medium text-slate-900">1) Czynność w trakcie w określonym momencie w przyszłości</p>
        <p className="example-muted">At 8 pm tomorrow, I will be watching a movie.</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">2) Uprzejme pytanie o plany</p>
        <p className="example-muted">Will you be using the car tonight?</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">3) Przewidywanie oparte na obecnym kontekście</p>
        <p className="example-muted">Don&apos;t call at 9. She will be sleeping.</p>
      </div>
    </section>
  );
}

function MomentInFutureContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Moment w przyszłości</h2>
      <p className="text-slate-700">
        Future Continuous często odpowiada na pytanie:
      </p>
      <p className="text-slate-700 font-medium">
        „Co będzie się działo o konkretnej godzinie?”
      </p>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-700">
        <p className="example-muted">This time next week, we will be lying on the beach.</p>
        <p className="example-muted">At midnight, they will be celebrating.</p>
      </div>
      <p className="text-slate-700">
        To odpowiednik Past Continuous, ale w przyszłości.
      </p>
    </section>
  );
}

function VsFutureSimpleContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Różnica vs Future Simple</h2>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-slate-800">
        <p>
          <strong>Future Simple:</strong> pojedyncze wydarzenie / decyzja
        </p>
        <p className="example-muted">I will call you.</p>
      </div>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-slate-800">
        <p>
          <strong>Future Continuous:</strong> czynność w trakcie w określonym momencie
        </p>
        <p className="example-muted">I will be calling you at 8 pm.</p>
      </div>
      <p className="text-slate-700 font-medium">
        Simple = fakt, Continuous = proces.
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
          ❌ I will be work tomorrow.
          <br />
          ✔ I will be <span className="verb-main">work</span>
          <span className="verb-ending">ing</span> tomorrow.
        </p>
        <p>
          ❌ She will be works.
          <br />
          ✔ She will be <span className="verb-main">work</span>
          <span className="verb-ending">ing</span>.
        </p>
        <p>
          ❌ I will working at 8 pm.
          <br />
          ✔ I will <span className="verb-main">be</span> <span className="verb-main">work</span>
          <span className="verb-ending">ing</span> at 8 pm.
        </p>
      </div>
      <p className="text-slate-700">
        Konstrukcja zawsze zawiera „will be + -ing”.
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
          <strong>Future Continuous:</strong> czynność w trakcie w przyszłości
        </p>
        <p>
          <strong>Future Simple:</strong> pojedyncze wydarzenie / decyzja
        </p>
      </div>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-700">
        <p className="example-muted">At 10 pm, I will watch TV.</p>
        <p className="example-muted">At 10 pm, I will be watching TV.</p>
      </div>
      <Link
        href="/app/grammar/compare?tense1=future-continuous&tense2=future-simple"
        className="inline-block text-slate-700 underline hover:text-slate-900"
      >
        Future Continuous vs Future Simple
      </Link>
    </section>
  );
}

export function FutureContinuousClient() {
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
    { id: "momentInFuture", label: "Moment w przyszłości" },
    { id: "vsFutureSimple", label: "Różnica vs Future Simple" },
    { id: "mistakes", label: "Błędy" },
    { id: "compare", label: "Porównaj" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Future Continuous</h1>
          <p className="max-w-3xl text-sm text-slate-700">
            Czynność w trakcie w określonym momencie w przyszłości — proces, nie decyzja.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/courses/future-continuous"
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
            {renderedSection === "momentInFuture" && <MomentInFutureContent />}
            {renderedSection === "vsFutureSimple" && <VsFutureSimpleContent />}
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

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
          Second Conditional opisuje sytuacje, które są <strong>hipotetyczne lub mało prawdopodobne</strong>.
        </p>
        <p>
          Mówimy o tym, co <strong>by się wydarzyło</strong>, gdyby spełniony został określony warunek, ale z
          perspektywy chwili mówienia ten warunek <strong>nie jest realny albo jest bardzo mało prawdopodobny</strong>.
        </p>
        <p>Często używamy Second Conditional, gdy mówimy o:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>wyobrażonych sytuacjach</li>
          <li>nierealnych scenariuszach</li>
          <li>marzeniach lub spekulacjach</li>
        </ul>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="text-sm font-medium text-slate-900">Przykład</p>
          <p className="text-slate-800">
            <strong>If I had a million dollars, I would travel around the world.</strong>
          </p>
          <p className="text-sm text-slate-600">
            Jeżeli miałbym milion dolarów, podróżowałbym po świecie. W momencie wypowiadania zdania{" "}
            <strong>nie mam miliona dolarów</strong>, dlatego używamy Second Conditional.
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
        <p>Second Conditional składa się z dwóch części:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>if clause</strong> – część z warunkiem
          </li>
          <li>
            <strong>main clause</strong> – część z rezultatem
          </li>
        </ul>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-slate-800 space-y-2">
          <p className="font-medium">If + past simple, would + infinitive</p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-800">
          <p>If I knew the answer, I would tell you.</p>
        </div>

        <p>Tak jak w innych zdaniach warunkowych, kolejność może być odwrócona:</p>
        <div className="rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-800">
          <p>I would tell you if I knew the answer.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-slate-800">
          <p className="font-medium">Można to zapamiętać jako:</p>
          <p className="font-medium">A + B</p>
          <p className="font-medium">B + A</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-medium text-slate-900">Ważna uwaga — were zamiast was</p>
          <p className="text-sm text-slate-800">
            W Second Conditional często używamy <strong>were</strong> zamiast <strong>was</strong>,
            szczególnie w bardziej formalnym angielskim.
          </p>
          <div className="rounded-lg border border-amber-200 bg-white p-3 text-sm text-slate-800">
            <p>If I were you, I would take that job.</p>
          </div>
          <p className="text-sm text-slate-600">
            To bardzo popularna konstrukcja używana przy dawaniu rad. Natomiast obecnie używanie{" "}
            <strong>was</strong> w tym zdaniu nie jest uznawane za błąd gramatyczny w nowoczesnym
            angielskim.
          </p>
        </div>
      </div>
    </section>
  );
}

function ExamplesContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Przykłady</h2>
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-slate-800 space-y-2">
        <p>If I had more time, I would learn another language.</p>
        <p>If she lived closer, we would see her more often.</p>
        <p>If we owned a car, we would travel more.</p>
        <p>If I knew his number, I would call him.</p>
        <p>If they offered me the job, I would accept it.</p>
        <p>If I were you, I would talk to the manager.</p>
        <p>If it snowed tomorrow, we would build a snowman.</p>
      </div>
      <p className="text-sm text-slate-700">
        Te zdania opisują sytuacje wyobrażone lub mało prawdopodobne.
      </p>
    </section>
  );
}

function MistakesContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Błędy</h2>
      <p className="text-slate-700">
        Najczęstsze błędy w Second Conditional wynikają z mieszania różnych typów conditionals.
      </p>
      <div className="space-y-4 text-sm text-slate-800">
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p>❌ If I had more time, I will travel more.</p>
          <p>✔ If I had more time, I would travel more.</p>
          <p className="text-slate-600">W Second Conditional używamy would, nie will.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p>❌ If I have more time, I would travel more.</p>
          <p>✔ If I had more time, I would travel more.</p>
          <p className="text-slate-600">Po if używamy Past Simple, nie Present Simple.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p>❌ If I would have time, I would help you.</p>
          <p>✔ If I had time, I would help you.</p>
          <p className="text-slate-600">Nie używamy would w części z if.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p>❌ If I was you, I would talk to him.</p>
          <p>✔ If I were you, I would talk to him.</p>
          <p className="text-slate-600">W formalnej konstrukcji używamy were zamiast was.</p>
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
        Second Conditional często porównuje się z <strong>First Conditional</strong>. First Conditional
        opisuje sytuacje <strong>realnie możliwe w przyszłości</strong>.
      </p>
      <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-800">
        <p>If I have time tomorrow, I will help you.</p>
      </div>
      <p className="mb-3 text-slate-700">
        Second Conditional opisuje sytuacje <strong>hipotetyczne lub mało prawdopodobne</strong>.
      </p>
      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-800">
        <p>If I had more time, I would help you.</p>
      </div>
      <Link
        href="/app/grammar/compare?tense1=first-conditional&tense2=second-conditional"
        className="text-slate-700 underline hover:text-slate-900 font-medium"
      >
        First Conditional vs Second Conditional →
      </Link>
    </section>
  );
}

export function SecondConditionalClient() {
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
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Second Conditional</h1>
          <p className="max-w-2xl text-sm text-slate-700">
            Ten typ zdania warunkowego opisuje sytuacje hipotetyczne lub mało prawdopodobne. Używamy go, gdy
            mówimy o tym, co by się stało, gdyby spełniony został określony warunek.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/grammar/conditionals/second/practice"
              className="inline-flex w-fit items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
            >
              Ćwicz Second Conditional
            </Link>
            <Link
              href="/app/courses/second-conditional"
              className="text-sm text-slate-600 underline hover:text-slate-800"
            >
              Zobacz pełny kurs
            </Link>
          </div>
        </div>
        <Link
          href="/app/grammar/conditionals"
          className="inline-flex items-center self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
        >
          ← Wróć do Conditionals
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_1fr]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-6">
          <div className={`transition-opacity duration-250 ${isVisible ? "opacity-100" : "opacity-0"}`}>
            {renderedSection === "definition" && <DefinitionContent />}
            {renderedSection === "construction" && <ConstructionContent />}
            {renderedSection === "examples" && <ExamplesContent />}
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

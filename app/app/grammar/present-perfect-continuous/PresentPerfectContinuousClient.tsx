"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type SectionKey =
  | "definition"
  | "construction"
  | "usage"
  | "forSince"
  | "difference"
  | "mistakes"
  | "compare";

function DefinitionContent() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Definicja</h2>
      <p className="text-slate-700">
        Present Perfect Continuous opisuje czynność,
        która zaczęła się w przeszłości i nadal trwa
        lub właśnie się zakończyła, ale jej efekt jest widoczny teraz.
      </p>
      <p className="text-slate-700">
        Skupiamy się na TRWANIU czynności,
        a nie na samym rezultacie.
      </p>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
        <p>I have been working all day.</p>
        <p>She has been studying for three hours.</p>
        <p>It has been raining.</p>
      </div>
      <p className="text-slate-700">
        Ważny jest proces i czas trwania.
      </p>
    </section>
  );
}

function ConstructionContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Konstrukcja</h2>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-slate-800">
        <p>
          I / You / We / They → <span className="auxiliary">have</span> <span className="verb-main">been</span>{" "}
          <span className="verb-main">work</span>
          <span className="verb-ending">ing</span>
        </p>
        <p>
          He / She / It → <span className="auxiliary">has</span> <span className="verb-main">been</span>{" "}
          <span className="verb-main">work</span>
          <span className="verb-ending">ing</span>
        </p>
      </div>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-slate-800">
        <p>
          Przeczenie:
          <br />
          have not been working
          <br />
          has not been studying
        </p>
      </div>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-slate-800">
        <p>
          Pytanie:
          <br />
          Have you been waiting?
          <br />
          Has she been crying?
        </p>
      </div>
      <p className="text-slate-700">
        To konstrukcja: have/has + been + -ing.
      </p>
    </section>
  );
}

function UsageContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Kiedy używamy</h2>
      <div>
        <p className="font-medium text-slate-900">1) Czynność trwa od jakiegoś czasu</p>
        <p className="example-muted">I have been learning English for two years.</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">
          2) Czynność właśnie się zakończyła, ale efekt widać teraz
        </p>
        <p className="example-muted">She is tired because she has been running.</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">3) Podkreślenie długości trwania</p>
        <p className="example-muted">We have been talking for hours.</p>
      </div>
      <p className="text-slate-700">
        Ten czas podkreśla proces, nie efekt końcowy.
      </p>
    </section>
  );
}

function ForSinceContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">For / Since</h2>
      <div>
        <p className="font-medium text-slate-900">for → okres czasu</p>
        <p className="example-muted">for two hours</p>
        <p className="example-muted">for a long time</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">since → punkt w czasie</p>
        <p className="example-muted">since Monday</p>
        <p className="example-muted">since 2021</p>
      </div>
      <p className="text-slate-700">
        for = jak długo
        <br />
        since = od kiedy
      </p>
    </section>
  );
}

function DifferenceContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Różnica vs Present Perfect</h2>
      <div>
        <p className="font-medium text-slate-900">Present Perfect:</p>
        <p className="text-slate-700">skupia się na rezultacie</p>
        <p className="example-muted">I have painted the room. (Pokój jest pomalowany.)</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">Present Perfect Continuous:</p>
        <p className="text-slate-700">skupia się na procesie</p>
        <p className="example-muted">I have been painting the room. (Byłem w trakcie malowania.)</p>
      </div>
      <p className="text-slate-700">
        Perfect Simple = efekt
        <br />
        Perfect Continuous = trwanie
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
          ❌ I have been work here.
          <br />
          ✔ I have been work<span className="verb-ending">ing</span> here.
        </p>
        <p>
          ❌ She has working all day.
          <br />
          ✔ She has been work<span className="verb-ending">ing</span> all day.
        </p>
        <p>
          ❌ I am learning English since 2020.
          <br />
          ✔ I have been learn<span className="verb-ending">ing</span> English since 2020.
        </p>
      </div>
      <p className="text-slate-700">
        Po have/has musi być „been” i forma -ing.
      </p>
    </section>
  );
}

function CompareContent() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Porównaj</h2>
      <p className="text-slate-700">
        Present Perfect Continuous:
        <br />
        proces i długość trwania
      </p>
      <p className="text-slate-700">
        Present Perfect:
        <br />
        rezultat
      </p>
      <p className="example-muted">
        I have been reading for two hours.
        <br />
        I have read the book.
      </p>
      <Link
        href="/app/grammar/compare?tense1=present-perfect-continuous&tense2=present-perfect"
        className="inline-block text-slate-700 underline hover:text-slate-900"
      >
        Present Perfect Continuous vs Present Perfect
      </Link>
    </section>
  );
}

export function PresentPerfectContinuousClient() {
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
    { id: "forSince", label: "For / Since" },
    { id: "difference", label: "Różnica vs Present Perfect" },
    { id: "mistakes", label: "Błędy" },
    { id: "compare", label: "Porównaj" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Present Perfect Continuous</h1>
          <p className="max-w-3xl text-sm text-slate-700">
            Present Perfect Continuous podkreśla proces i czas trwania czynności.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/courses/present-perfect-continuous"
              className="text-sm text-slate-600 underline hover:text-slate-800"
            >
              Zobacz pełny kurs
            </Link>
          </div>
        </div>
        <Link
          href="/app/grammar"
          className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          ← Spis treści
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_1fr]">
        <div className="rounded-2xl border border-slate-900 bg-white p-6 md:p-8 lg:min-h-[620px]">
          <div className={`transition-opacity duration-250 ${isVisible ? "opacity-100" : "opacity-0"}`}>
            {renderedSection === "definition" && <DefinitionContent />}
            {renderedSection === "construction" && <ConstructionContent />}
            {renderedSection === "usage" && <UsageContent />}
            {renderedSection === "forSince" && <ForSinceContent />}
            {renderedSection === "difference" && <DifferenceContent />}
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


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
          Third Conditional opisuje sytuacje, które{" "}
          <strong>mogły wydarzyć się w przeszłości, ale się nie wydarzyły</strong>.
        </p>
        <p>
          Mówimy o tym, <strong>co by się stało</strong>, gdyby w przeszłości spełniony został określony
          warunek. W rzeczywistości jednak ten warunek <strong>nie został spełniony</strong>, dlatego
          rezultat również się nie wydarzył.
        </p>
        <p>Używamy Third Conditional najczęściej, gdy:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>mówimy o przeszłości, której nie można już zmienić</li>
          <li>analizujemy inne możliwe scenariusze</li>
          <li>wyrażamy żal lub krytykę</li>
          <li>zastanawiamy się, co mogło potoczyć się inaczej</li>
        </ul>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="text-sm font-medium text-slate-900">Przykład</p>
          <p className="text-slate-800">
            <strong>If I had studied harder, I would have passed the exam.</strong>
          </p>
          <p className="text-sm text-slate-600">
            Gdybym uczył się więcej, zdałbym egzamin. W rzeczywistości{" "}
            <strong>nie uczyłem się wystarczająco</strong>, dlatego egzamin nie został zdany.
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
        <p>Third Conditional składa się z dwóch części:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>if clause</strong> – część z warunkiem
          </li>
          <li>
            <strong>main clause</strong> – część z rezultatem
          </li>
        </ul>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-800 space-y-2">
          <p className="font-medium">If + past perfect, would have + past participle</p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-800">
          <p>If she had left earlier, she would have caught the train.</p>
        </div>

        <p>Tak jak w innych zdaniach warunkowych, kolejność może być odwrócona:</p>
        <div className="rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-800">
          <p>She would have caught the train if she had left earlier.</p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-800">
          <p className="font-medium">Można to zapamiętać jako:</p>
          <p className="font-medium">A + B</p>
          <p className="font-medium">B + A</p>
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
        <p>If I had known about the meeting, I would have come.</p>
        <p>If we had left earlier, we would have avoided the traffic.</p>
        <p>If she had studied more, she would have passed the exam.</p>
        <p>If they had invited us, we would have gone to the party.</p>
        <p>If he had taken the job, he would have moved to London.</p>
        <p>If I had seen your message, I would have replied.</p>
        <p>If we had booked the tickets earlier, they would have been cheaper.</p>
      </div>
      <p className="text-sm text-slate-700">
        Te zdania opisują przeszłość, której nie można już zmienić.
      </p>
    </section>
  );
}

function MistakesContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Błędy</h2>
      <p className="text-slate-700">
        Najczęstsze błędy w Third Conditional wynikają z mieszania różnych czasów.
      </p>
      <div className="space-y-4 text-sm text-slate-800">
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p>❌ If I knew about the meeting, I would have come.</p>
          <p>✔ If I had known about the meeting, I would have come.</p>
          <p className="text-slate-600">Po if używamy Past Perfect, nie Past Simple.</p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p>❌ If I would have known, I would have come.</p>
          <p>✔ If I had known, I would have come.</p>
          <p className="text-slate-600">Nie używamy would w części z if.</p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p>❌ If she had studied more, she would passed the exam.</p>
          <p>✔ If she had studied more, she would have passed the exam.</p>
          <p className="text-slate-600">W rezultacie używamy would have + past participle.</p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p>❌ If I had more time yesterday, I would help you.</p>
          <p>✔ If I had had more time yesterday, I would have helped you.</p>
          <p className="text-slate-600">To błąd wynikający z mieszania Second i Third Conditional.</p>
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
        Third Conditional najczęściej porównuje się z <strong>Second Conditional</strong>. Second
        Conditional opisuje sytuacje <strong>hipotetyczne w teraźniejszości lub przyszłości</strong>.
      </p>
      <div className="mb-3 rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-800">
        <p>If I had more time, I would travel more.</p>
      </div>
      <p className="mb-3 text-slate-700">
        Third Conditional opisuje sytuacje <strong>hipotetyczne w przeszłości</strong>.
      </p>
      <div className="mb-4 rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-800">
        <p>If I had had more time, I would have travelled more.</p>
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

export function ThirdConditionalClient() {
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
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Third Conditional</h1>
          <p className="max-w-2xl text-sm text-slate-700">
            Ten typ zdania warunkowego opisuje sytuacje, które mogły wydarzyć się w przeszłości, ale
            się nie wydarzyły. Używamy go, gdy mówimy o tym, co by się stało, gdyby w przeszłości
            spełniony został określony warunek.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/grammar/conditionals/third/practice"
              className="inline-flex w-fit rounded-xl border border-slate-900 bg-white px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Ćwicz Third Conditional
            </Link>
            <Link
              href="/app/courses/third-conditional"
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

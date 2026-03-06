"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type SectionKey =
  | "definition"
  | "structure"
  | "examples"
  | "mistakes"
  | "compare";

function DefinitionContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Definicja</h2>
      <div className="space-y-2 text-slate-700">
        <p>
          Zero Conditional opisuje sytuacje, które są <strong>zawsze prawdziwe</strong>.
        </p>
        <p>
          Są to zarówno stwierdzenia ogólne, powszechnie znane fakty dotyczące funkcjonowania świata,
          jak i informacje dotyczące pojedynczych osób.
        </p>
        <p>Jeśli coś się wydarzy, zawsze następuje ten sam rezultat.</p>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="text-sm font-medium text-slate-900">Przykład</p>
          <p className="text-slate-800">
            <strong>If you heat water to 100°C, it boils.</strong>
          </p>
          <p className="text-sm text-slate-600">
            To zdanie jest zawsze prawdziwe – woda zawsze wrze w 100 stopniach, jeżeli ją zagotujemy.
            Warunek zostaje spełniony i mamy rezultat: woda wrze.
          </p>
        </div>

        <p className="text-sm font-medium text-slate-900">
          Ten typ zdania opisuje stałe zależności i fakty, nie przewidywania o przyszłości.
        </p>
      </div>
    </section>
  );
}

function StructureContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Konstrukcja</h2>
      <div className="space-y-4 text-slate-700">
        <p>Zero Conditional składa się z dwóch części:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>if clause</strong> – część z warunkiem
          </li>
          <li>
            <strong>main clause</strong> – część z rezultatem
          </li>
        </ul>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-800 space-y-2">
          <p className="font-medium">If + present simple, present simple</p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-800">
          <p>If you heat ice, it melts.</p>
        </div>

        <p>Możliwa jest też odwrotna kolejność:</p>
        <div className="rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-800">
          <p>Ice melts if you heat it.</p>
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
        <p>If you heat water to 100°C, it boils.</p>
        <p>If people eat too much sugar, they gain weight.</p>
        <p>If you press this button, the machine starts.</p>
        <p>If people don&apos;t drink enough water, they get thirsty.</p>
        <p>If she watches a sad movie, she cries.</p>
        <p>If you press this button, the computer restarts.</p>
        <p>If you don&apos;t pay your taxes, you get a penalty.</p>
        <p>If people feel tired, they go to sleep or drink coffee.</p>
      </div>
      <p className="text-sm text-slate-700">
        Wszystkie te zdania opisują stałe zależności i fakty – jeśli warunek jest spełniony, rezultat
        zawsze jest taki sam.
      </p>
    </section>
  );
}

function MistakesContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Błędy</h2>
      <p className="text-slate-700">
        Najczęstsze błędy w Zero Conditional dotyczą używania niewłaściwych czasów i form.
      </p>
      <div className="space-y-4 text-sm text-slate-800">
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p>❌ If you heat ice, it will melt.</p>
          <p>✔ If you heat ice, it melts.</p>
          <p className="text-slate-600">W Zero Conditional używamy Present Simple w obu częściach, nie will.</p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p>❌ If she eat too much sugar, she gain weight.</p>
          <p>✔ If she eats too much sugar, she gains weight.</p>
          <p className="text-slate-600">Trzecia osoba liczby pojedynczej wymaga końcówki -s.</p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p>❌ If it will rain, the ground gets wet.</p>
          <p>✔ If it rains, the ground gets wet.</p>
          <p className="text-slate-600">Po if nie używamy will – tylko Present Simple.</p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p>❌ If he drink coffee at night, he sleep badly.</p>
          <p>✔ If he drinks coffee at night, he sleeps badly.</p>
          <p className="text-slate-600">Nie pomijamy końcówki -s w trzeciej osobie.</p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p>❌ If you heated water to 100°C, it boils.</p>
          <p>✔ If you heat water to 100°C, it boils.</p>
          <p className="text-slate-600">Zero Conditional opisuje stałe fakty – obie części w Present Simple.</p>
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
        Zero Conditional często mylony jest z First Conditional. Aby zobaczyć dokładne różnice między
        tymi konstrukcjami, przejdź do porównania:
      </p>
      <Link
        href="/app/grammar/compare?tense1=zero-conditional&tense2=first-conditional"
        className="text-slate-700 underline hover:text-slate-900 font-medium"
      >
        Zero Conditional vs First Conditional →
      </Link>
    </section>
  );
}

export function ZeroConditionalClient() {
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
    { id: "structure", label: "Konstrukcja" },
    { id: "examples", label: "Przykłady" },
    { id: "mistakes", label: "Błędy" },
    { id: "compare", label: "Porównaj" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Zero Conditional</h1>
          <p className="max-w-2xl text-sm text-slate-700">
            Zero Conditional pokazuje stałe zależności: jeśli pojawia się warunek, rezultat jest zawsze taki sam.
            To struktura do faktów i zasad, nie do przewidywań o przyszłości.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/grammar/conditionals/zero/practice"
              className="inline-flex w-fit rounded-xl border border-slate-900 bg-white px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Ćwicz Zero Conditional
            </Link>
            <Link
              href="/app/courses/zero-conditional"
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
            {renderedSection === "structure" && <StructureContent />}
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

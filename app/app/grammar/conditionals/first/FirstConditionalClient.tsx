"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CorrectIcon, WrongIcon } from "@/app/_components/FeedbackIcons";

type SectionKey =
  | "definition"
  | "construction"
  | "otherResults"
  | "examples"
  | "mistakes"
  | "compare";

function DefinitionContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Definicja</h2>
      <div className="space-y-2 text-slate-700">
        <p>
          First Conditional opisuje sytuacje, które są <strong>realnie możliwe w przyszłości</strong>.
        </p>
        <p>
          <strong>Co to znaczy „realnie możliwe”?</strong>
          <br />
          Kluczowy jest moment wypowiadania zdania. Jeżeli z perspektywy chwili, w której mówimy
          dane zdanie, spełnienie warunku jest możliwe, używamy First Conditional.
        </p>
        <p>
          Opisujemy sytuację, która może się wydarzyć, a jeśli warunek zostanie spełniony, pojawi się
          określony rezultat.
        </p>
        <p>Nie jest to ogólna zasada jak w Zero Conditional, ale konkretna możliwość dotycząca przyszłości.</p>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="text-sm font-medium text-slate-900">Przykład</p>
          <p className="text-slate-800">
            <strong>If it rains tomorrow, we will stay at home.</strong>
          </p>
          <p className="text-sm text-slate-600">
            Jeżeli jutro będzie padać, zostaniemy w domu. Deszcz jest możliwy, więc rezultat
            również jest możliwy.
          </p>
        </div>

        <p className="text-sm font-medium text-slate-900">
          Ten typ zdania zawsze odnosi się do przyszłości.
        </p>
      </div>
    </section>
  );
}

function ConstructionContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Konstrukcja</h2>
      <div className="space-y-4 text-slate-700">
        <p>First Conditional składa się z dwóch części:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>if clause</strong> – część z warunkiem
          </li>
          <li>
            <strong>main clause</strong> – część z rezultatem
          </li>
        </ul>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-slate-800 space-y-2">
          <p className="font-medium">If + present simple, will + infinitive</p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-800">
          <p>If you study, you will pass the exam.</p>
        </div>

        <p>Tak jak w Zero Conditional, możliwa jest też odwrotna kolejność:</p>
        <div className="rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-800">
          <p>You will pass the exam if you study.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-slate-800">
          <p className="font-medium">Można to zapamiętać jako:</p>
          <p className="font-medium">A + B</p>
          <p className="font-medium">B + A</p>
        </div>
      </div>
    </section>
  );
}

function OtherResultsContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Inne możliwe rezultaty</h2>
      <p className="text-slate-700">
        W First Conditional rezultat nie zawsze zawiera will. Możliwe są również inne formy.
      </p>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="font-medium text-slate-900">A) Imperative (polecenie)</p>
          <p className="text-slate-800">If you see Tom, tell him to call me.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="font-medium text-slate-900">B) Modal verbs</p>
          <p className="text-slate-800">If you feel tired, you should go to bed.</p>
          <p className="text-slate-800">If you need help, you can call me.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="font-medium text-slate-900">C) Future (najczęstsza forma)</p>
          <p className="text-slate-800">If we leave now, we will catch the train.</p>
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
        <p>If it rains tomorrow, we will stay at home.</p>
        <p>If you hurry, you will catch the bus.</p>
        <p>If she studies harder, she will pass the exam.</p>
        <p>If you don&apos;t leave now, you will miss the train.</p>
        <p>If they invite us, we will go to the party.</p>
        <p>If the weather is good tomorrow, we will go hiking.</p>
        <p>If you see Mark, tell him I called.</p>
      </div>
      <p className="text-sm text-slate-700">
        Wszystkie te zdania opisują realne sytuacje, które mogą wydarzyć się w przyszłości.
      </p>
    </section>
  );
}

function MistakesContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Błędy</h2>
      <p className="text-slate-700">
        Najczęstsze błędy w First Conditional dotyczą używania niewłaściwych czasów.
      </p>
      <div className="space-y-4 text-sm text-slate-800">
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="flex items-center gap-1.5"><WrongIcon size={16} /> If it will rain, we will stay at home.</p>
          <p>✔ If it rains, we will stay at home.</p>
          <p className="text-slate-600">Po if używamy Present Simple, a nie future.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="flex items-center gap-1.5"><WrongIcon size={16} /> If you study, you pass the exam.</p>
          <p>✔ If you study, you will pass the exam.</p>
          <p className="text-slate-600">Jeżeli mówimy o przyszłości, rezultat zwykle zawiera will.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="flex items-center gap-1.5"><WrongIcon size={16} /> If you will study, you will pass the exam.</p>
          <p>✔ If you study, you will pass the exam.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
          <p className="flex items-center gap-1.5"><WrongIcon size={16} /> If I will have time, I would help you.</p>
          <p>✔ If I have time, I will help you.</p>
          <p className="text-slate-600">To błąd wynikający z mieszania First i Second Conditional.</p>
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
        First Conditional często mylony jest z Zero Conditional i Second Conditional. Aby zobaczyć
        dokładne różnice między tymi konstrukcjami, przejdź do porównania:
      </p>
      <div className="flex flex-col gap-2">
        <Link
          href="/app/grammar/compare?tense1=zero-conditional&tense2=first-conditional"
          className="text-slate-700 underline hover:text-slate-900 font-medium"
        >
          Zero Conditional vs First Conditional →
        </Link>
        <Link
          href="/app/grammar/compare?tense1=first-conditional&tense2=second-conditional"
          className="text-slate-700 underline hover:text-slate-900 font-medium"
        >
          First Conditional vs Second Conditional →
        </Link>
      </div>
    </section>
  );
}

export function FirstConditionalClient() {
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
    { id: "otherResults", label: "Inne rezultaty" },
    { id: "examples", label: "Przykłady" },
    { id: "mistakes", label: "Błędy" },
    { id: "compare", label: "Porównaj" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">First Conditional</h1>
          <p className="max-w-2xl text-sm text-slate-700">
            Ten typ zdania warunkowego opisuje sytuacje, które są realnie możliwe w przyszłości.
            Poniżej znajdziesz definicję, konstrukcję, przykłady i najczęstsze błędy.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/grammar/conditionals/first/practice"
              className="inline-flex w-fit items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
            >
              Ćwicz First Conditional
            </Link>
            <Link
              href="/app/courses/first-conditional"
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
            {renderedSection === "otherResults" && <OtherResultsContent />}
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

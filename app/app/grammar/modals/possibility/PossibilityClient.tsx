"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type SectionKey =
  | "definition"
  | "mayAndMight"
  | "could"
  | "negativeForms"
  | "mistakes"
  | "compare";

function DefinitionContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Definition</h2>
      <div className="space-y-4 text-slate-700">
        <p>
          Modal verbs związane z <strong>possibility</strong> służą do mówienia o tym, że coś jest
          możliwe, ale nie jesteśmy tego pewni.
        </p>
        <p>Najczęściej używamy:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>may</li>
          <li>might</li>
          <li>could</li>
        </ul>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="text-slate-800">Example:</p>
          <p className="text-slate-800">It may rain later.</p>
          <p className="text-sm text-slate-600">Może później padać.</p>
        </div>
      </div>
    </section>
  );
}

function MayAndMightContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">May and Might</h2>
      <div className="space-y-4 text-slate-700">
        <p>
          W znaczeniu <strong>possibility</strong> słowa <strong>may</strong> i <strong>might</strong>{" "}
          działają prawie zawsze w identyczny sposób.
        </p>
        <p>
          Możemy używać ich, gdy coś jest możliwe, ale nie jesteśmy pewni, czy się wydarzy.
        </p>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="text-slate-800">Examples:</p>
          <p className="text-slate-800">It may rain later.</p>
          <p className="text-slate-800">It might rain later.</p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="text-slate-800">She may come to the meeting.</p>
          <p className="text-slate-800">She might come to the meeting.</p>
        </div>
        <p>
          W praktyce oba zdania znaczą: <strong>Może się wydarzyć.</strong>
        </p>
        <p>Różnica między nimi jest zwykle bardzo mała albo żadna.</p>
        <p>
          W codziennym języku native speakerzy bardzo często używają <strong>may</strong> i{" "}
          <strong>might</strong> zamiennie.
        </p>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Important difference</p>
          <p className="text-sm text-slate-700">
            Słowo <strong>may</strong> może mieć jeszcze jedno znaczenie: <strong>pozwolenie</strong>.
          </p>
          <p className="text-slate-800">Example:</p>
          <p className="text-slate-800">You may leave the room.</p>
          <p className="text-sm text-slate-600">To zdanie oznacza: Masz pozwolenie wyjść z pokoju.</p>
          <p className="text-sm text-slate-700 mt-2">
            W tym znaczeniu <strong>might</strong> nie działa naturalnie.
          </p>
          <p className="text-slate-800">❌ You might leave the room.</p>
          <p className="text-sm text-slate-600">To zdanie nie brzmi jak udzielenie pozwolenia.</p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Practical tip</p>
          <p className="text-sm text-slate-700">
            Jeśli nie jesteś pewien, którego słowa użyć w znaczeniu possibility:
          </p>
          <p className="font-mono text-slate-800">may ≈ might</p>
          <p className="text-sm text-slate-700">Obie formy są poprawne.</p>
        </div>
      </div>
    </section>
  );
}

function CouldContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Could</h2>
      <div className="space-y-4 text-slate-700">
        <p>
          <strong>Could</strong> może również oznaczać możliwość.
        </p>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="text-slate-800">Example:</p>
          <p className="text-slate-800">It could rain later.</p>
          <p className="text-sm text-slate-600">Może później padać.</p>
        </div>
        <p>W tym znaczeniu <strong>could</strong> oznacza jedną z możliwych opcji.</p>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Ważne</p>
          <p className="text-sm text-slate-700">
            Słowo <strong>could</strong> ma także inne znaczenie – może oznaczać{" "}
            <strong>ability</strong> (umiejętność w przeszłości).
          </p>
          <p className="text-slate-800">Example:</p>
          <p className="text-slate-800">I could swim when I was five.</p>
          <p className="text-sm text-slate-700">
            Dlatego znaczenie <strong>could</strong> zawsze zależy od kontekstu.
          </p>
        </div>
      </div>
    </section>
  );
}

function NegativeFormsContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Negative forms</h2>
      <div className="space-y-4 text-slate-700">
        <pre className="text-sm font-mono text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-300">
          may not
might not
could not
        </pre>
        <p>Example:</p>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="text-slate-800">It might not rain today.</p>
          <p className="text-sm text-slate-600">Może dzisiaj nie padać.</p>
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
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p>❌ It maybe rain later.</p>
          <p>✔ It may rain later.</p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p>❌ He might can come later.</p>
          <p>✔ He might come later.</p>
          <p className="text-slate-600">
            Modal verbs nie łączą się bezpośrednio z innymi modal verbs.
          </p>
        </div>
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
          href="/app/grammar/compare?tense1=modal-may&tense2=modal-might"
          className="block rounded-xl border border-slate-300 bg-slate-50 p-4 hover:bg-slate-100 transition"
        >
          <h3 className="font-medium text-slate-900">May vs Might</h3>
        </Link>
        <Link
          href="/app/grammar/compare?tense1=modal-ability&tense2=modal-possibility"
          className="block rounded-xl border border-slate-300 bg-slate-50 p-4 hover:bg-slate-100 transition"
        >
          <h3 className="font-medium text-slate-900">Could (ability) vs Could (possibility)</h3>
        </Link>
        <Link
          href="/app/grammar/compare?tense1=modal-possibility&tense2=modal-obligation"
          className="block rounded-xl border border-slate-300 bg-slate-50 p-4 hover:bg-slate-100 transition"
        >
          <h3 className="font-medium text-slate-900">Possibility vs Probability (must)</h3>
        </Link>
      </div>
    </section>
  );
}

export function PossibilityClient() {
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
    { id: "mayAndMight", label: "May and Might" },
    { id: "could", label: "Could" },
    { id: "negativeForms", label: "Negative forms" },
    { id: "mistakes", label: "Mistakes" },
    { id: "compare", label: "Compare" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Possibility</h1>
          <p className="max-w-2xl text-sm text-slate-700">
            Modal verbs używane do mówienia o możliwości: may, might, could.
          </p>
        </div>
        <Link
          href="/app/grammar/modals"
          className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          ← Wróć do Modal Verbs
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_1fr]">
        <div className="rounded-2xl border border-slate-900 bg-white p-6 md:p-8 lg:min-h-[620px]">
          <div className={`transition-opacity duration-250 ${isVisible ? "opacity-100" : "opacity-0"}`}>
            {renderedSection === "definition" && <DefinitionContent />}
            {renderedSection === "mayAndMight" && <MayAndMightContent />}
            {renderedSection === "could" && <CouldContent />}
            {renderedSection === "negativeForms" && <NegativeFormsContent />}
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

      <div className="flex justify-center pt-4">
        <Link
          href="/app/grammar/sentence-builder?type=modal&modal=might"
          className="inline-flex w-fit rounded-xl border-2 border-slate-900 bg-white px-6 py-3 font-medium text-slate-900 transition hover:bg-slate-50"
        >
          Try building sentences →
        </Link>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CorrectIcon, WrongIcon } from "@/app/_components/FeedbackIcons";

type SectionKey = "definition" | "construction" | "doDoes" | "words" | "mistakes" | "compare";

function DefinitionContent() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Definicja</h2>
        <p className="text-slate-700">
          Present Simple służy do mówienia o rzeczach, które są stałe, powtarzalne albo ogólnie prawdziwe:
          fakty (np. Ziemia krąży wokół Słońca), rutyny (co robisz zwykle), ogólne prawdy oraz stany i preferencje,
          które traktujesz jako „na stałe”. Jeśli możesz powiedzieć „zawsze / zwykle / ogólnie”, a nie „właśnie teraz”,
          to ten czas jest na miejscu.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-sm text-slate-700">
          Present Simple używamy też przy stałych planach (np. rozkład jazdy). <em>The train leaves at 6am.</em>
        </p>
      </section>
    </div>
  );
}

function ConstructionContent() {
  return (
    <div className="space-y-3">
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
                  I / You / We / They → <span className="verb-main">work</span>
                  <br />
                  He / She / It → <span className="verb-main">work</span>
                  <span className="verb-ending">s</span>
                </td>
                <td className="p-3 example-muted">She works in a bank.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Przeczenie</td>
                <td className="p-3">
                  <span className="auxiliary">do</span> not (don&apos;t) + <span className="verb-main">work</span>
                  <br />
                  <span className="auxiliary">does</span> not (doesn&apos;t) + <span className="verb-main">work</span>
                </td>
                <td className="p-3 example-muted">She doesn&apos;t work on Sundays.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Pytanie</td>
                <td className="p-3">
                  <span className="auxiliary">Do</span> + I/you/we/they + <span className="verb-main">work</span>?
                  <br />
                  <span className="auxiliary">Does</span> + he/she/it + <span className="verb-main">work</span>?
                </td>
                <td className="p-3 example-muted">Does she work here?</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm example-muted">
          WH-questions: Where do you work? Why does she work so much?
        </p>
      </section>
    </div>
  );
}

function DoDoesContent() {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-slate-900">Do / Does</h2>
      <p className="text-slate-700">
        DO i DOES używamy w pytaniach oraz w przeczeniach; w twierdzeniach ich nie używamy.
        Główny czasownik po DO/DOES zawsze w formie podstawowej (bez -s). Typowy błąd: <span className="verb-main">DO</span> + works ❌ —
        nigdy nie łączymy pomocniczego DO z czasownikiem z końcówką -s.
      </p>
      <Link
        href="/app/courses/present-simple"
        className="mt-2 inline-block text-sm text-slate-600 underline hover:text-slate-800"
      >
        Pełne omówienie w kursie →
      </Link>
    </section>
  );
}

function WordsContent() {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Słowa</h2>
      <ul className="list-inside list-disc space-y-1 text-slate-700">
        <li><strong className="text-slate-900">always</strong> — She always has coffee at nine.</li>
        <li><strong className="text-slate-900">usually</strong> — I usually finish work at five.</li>
        <li><strong className="text-slate-900">often</strong> — They often go to the cinema.</li>
        <li><strong className="text-slate-900">every day</strong> — He runs every day.</li>
        <li><strong className="text-slate-900">on Mondays</strong> — We meet on Mondays.</li>
      </ul>
    </section>
  );
}

function MistakesContent() {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Błędy</h2>
      <ul className="space-y-2 text-sm text-slate-800">
        <li className="flex items-center gap-1.5"><WrongIcon size={16} /> Does she works? → ✔ Does she work?</li>
        <li className="flex items-center gap-1.5"><WrongIcon size={16} /> She don&apos;t like coffee. → ✔ She doesn&apos;t like coffee.</li>
        <li className="flex items-center gap-1.5"><WrongIcon size={16} /> He work here. → ✔ He works here.</li>
        <li className="flex items-center gap-1.5"><WrongIcon size={16} /> Do he like it? → ✔ Does he like it?</li>
      </ul>
      <Link
        href="/app/vocab/cluster/tenses"
        className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
      >
        Potrenuj typowe błędy
      </Link>
    </section>
  );
}

function CompareContent() {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-slate-900">Porównaj</h2>
      <Link
        href="/app/grammar/compare?tense1=present-simple&tense2=present-continuous"
        className="text-slate-700 underline hover:text-slate-900"
      >
        Present Simple vs Present Continuous
      </Link>
    </section>
  );
}

export function PresentSimpleClient() {
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
    { id: "doDoes", label: "Do / Does" },
    { id: "words", label: "Słowa" },
    { id: "mistakes", label: "Błędy" },
    { id: "compare", label: "Porównaj" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Present Simple</h1>
          <p className="max-w-2xl text-sm text-slate-700">
            To podstawowy czas teraźniejszy: używasz go, gdy mówisz o faktach, rutynach i ogólnych prawdach.
            Poniżej masz zwięzłą mapę: intuicja, mechanika i najczęstsze pułapki.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/grammar/present-simple/practice"
              className="inline-flex w-fit items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
            >
              Ćwicz Present Simple
            </Link>
            <Link
              href="/app/courses/present-simple"
              className="text-sm text-slate-600 underline hover:text-slate-800"
            >
              Zobacz pełny kurs
            </Link>
          </div>
        </div>
        <Link
          href="/app/grammar/tenses"
          className="inline-flex items-center self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
        >
          ← Wróć do czasów
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_1fr]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-6">
          <div className={`transition-opacity duration-250 ${isVisible ? "opacity-100" : "opacity-0"}`}>
            {renderedSection === "definition" && <DefinitionContent />}
            {renderedSection === "construction" && <ConstructionContent />}
            {renderedSection === "doDoes" && <DoDoesContent />}
            {renderedSection === "words" && <WordsContent />}
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

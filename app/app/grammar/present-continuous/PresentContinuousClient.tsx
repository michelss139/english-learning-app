"use client";

import { useEffect, useRef, useState } from "react";
import { BackButton } from "@/app/_components/BackButton";
import Link from "next/link";
import { CorrectIcon, WrongIcon } from "@/app/_components/FeedbackIcons";

type SectionKey = "definition" | "construction" | "usage" | "futurePlans" | "mistakes" | "compare";

function DefinitionContent() {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-slate-900">Definicja</h2>
      <p className="text-slate-700">
        Present Continuous opisuje czynność, która trwa w tej chwili albo w aktualnym okresie czasu.
        Interesuje nas coś, co dzieje się teraz, zmienia się albo ma charakter tymczasowy.
        To czas ruchu, procesu i sytuacji „w trakcie”.
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
                  I <span className="auxiliary">am</span> <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>
                  <br />
                  You <span className="auxiliary">are</span> <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>
                  <br />
                  He <span className="auxiliary">is</span> <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>
                </td>
                <td className="p-3 example-muted">She is working in the office right now.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Przeczenie</td>
                <td className="p-3">
                  I <span className="auxiliary">am not</span> <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>
                </td>
                <td className="p-3 example-muted">I am not working tonight.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Pytanie</td>
                <td className="p-3">
                  <span className="auxiliary">Are</span> you <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>?
                  <br />
                  <span className="auxiliary">Is</span> she <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>?
                </td>
                <td className="p-3 example-muted">Are you working on this task now?</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-base font-semibold text-slate-900">KONSTRUKCJA: BE + -ING</h3>
        <p className="text-slate-700">
          W tym czasie zawsze potrzebujemy odmienionego czasownika „be” oraz formy z końcówką -ing. Oba elementy
          są obowiązkowe.
        </p>
        <div className="mt-3 space-y-2 text-sm text-slate-800">
          <p className="flex items-center gap-1.5"><WrongIcon size={16} /> She working.</p>
          <p>✔ She is working.</p>
        </div>
      </section>
    </div>
  );
}

function UsageContent() {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Kiedy używamy</h2>
      <ul className="space-y-3 text-slate-800">
        <li>
          <p className="font-medium text-slate-900">• Czynność dzieje się teraz</p>
          <p className="example-muted">She is talking on the phone.</p>
        </li>
        <li>
          <p className="font-medium text-slate-900">• Tymczasowa sytuacja</p>
          <p className="example-muted">I am living in Warsaw this year.</p>
          <p className="example-muted">(Situation that is not permanent.)</p>
        </li>
        <li>
          <p className="font-medium text-slate-900">• Coś się zmienia</p>
          <p className="example-muted">The weather is getting colder.</p>
        </li>
        <li>
          <p className="font-medium text-slate-900">• Zaplanowana przyszłość (indywidualny plan)</p>
          <p className="example-muted">I am meeting her tomorrow.</p>
        </li>
      </ul>
    </section>
  );
}

function FuturePlansContent() {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-slate-900">Przyszłość (plany)</h2>
      <p className="whitespace-pre-line text-slate-700">
        {"Present Continuous jest naturalny przy konkretnych, indywidualnych planach, które już zostały ustalone.\n\nI am meeting her tomorrow.\nWe are flying to Paris next week.\n\nPresent Simple stosujemy przy terminach ogólnie ustalonych (np. rozkład jazdy, harmonogramy).\nPresent Continuous używamy, gdy mówimy o czyimś osobistym planie.\n\nTo nie jest kwestia czasu przyszłego — to kwestia rodzaju planu."}
      </p>
    </section>
  );
}

function MistakesContent() {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Błędy</h2>
      <ul className="space-y-2 text-sm text-slate-800">
        <li className="flex items-center gap-1.5"><WrongIcon size={16} /> I am knowing him.</li>
        <li>✔ I know him.</li>
        <li className="flex items-center gap-1.5"><WrongIcon size={16} /> I am loving this song.</li>
        <li>✔ I love this song.</li>
      </ul>
      <p className="mt-3 text-sm example-muted">Nie wszystkie czasowniki naturalnie występują w formie -ing.</p>
      <Link href="/app/grammar/stative-verbs" className="mt-2 inline-block text-sm text-slate-600 underline hover:text-slate-800">
        Zobacz czasowniki statyczne
      </Link>
    </section>
  );
}

function CompareContent() {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-slate-900">Porównaj</h2>
      <p className="text-sm text-slate-700">
        Present Simple mówi o tym, co stałe.
        <br />
        Present Continuous mówi o tym, co trwa lub jest tymczasowe.
      </p>
      <Link
        href="/app/grammar/compare?tense1=present-continuous&tense2=present-simple"
        className="mt-2 inline-block text-slate-700 underline hover:text-slate-900"
      >
        Present Continuous vs Present Simple
      </Link>
    </section>
  );
}

export function PresentContinuousClient() {
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
    { id: "futurePlans", label: "Przyszłość (plany)" },
    { id: "mistakes", label: "Błędy" },
    { id: "compare", label: "Porównaj" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Present Continuous</h1>
          <p className="max-w-3xl text-sm text-slate-700">
            Present Continuous opisuje czynność, która trwa w tej chwili albo w aktualnym okresie czasu.
            Interesuje nas coś, co dzieje się teraz, zmienia się albo ma charakter tymczasowy.
            To czas ruchu, procesu i sytuacji „w trakcie”.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/grammar/present-continuous/practice"
              className="inline-flex w-fit items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
            >
              Ćwicz Present Continuous
            </Link>
            <Link
              href="/app/courses/present-continuous"
              className="text-sm text-slate-600 underline hover:text-slate-800"
            >
              Zobacz pełny kurs
            </Link>
          </div>
        </div>
        <BackButton href="/app/grammar/tenses" />
      </header>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_1fr]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-6">
          <div className={`transition-opacity duration-250 ${isVisible ? "opacity-100" : "opacity-0"}`}>
            {renderedSection === "definition" && <DefinitionContent />}
            {renderedSection === "construction" && <ConstructionContent />}
            {renderedSection === "usage" && <UsageContent />}
            {renderedSection === "futurePlans" && <FuturePlansContent />}
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


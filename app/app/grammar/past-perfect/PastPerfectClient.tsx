"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type SectionKey =
  | "definition"
  | "construction"
  | "usage"
  | "sequence"
  | "signals"
  | "mistakes"
  | "compare";

function DefinitionContent() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Definicja</h2>
      <p className="text-slate-700">
        Past Perfect opisuje czynność,
        która wydarzyła się wcześniej niż inne wydarzenie w przeszłości.
      </p>
      <p className="text-slate-700">
        Mówimy o „przeszłości w przeszłości”.
      </p>
      <p className="text-slate-700">Ten czas porządkuje chronologię zdarzeń.</p>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
        <p>When I arrived, she had left.</p>
        <p>Najpierw: she left.</p>
        <p>Potem: I arrived.</p>
      </div>
      <p className="text-slate-700">Past Perfect pokazuje, co stało się wcześniej.</p>
      <p className="text-slate-700">
        Nie chodzi o to, że coś było dawno.
        Chodzi o to, że coś było wcześniej niż coś innego.
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
          Schemat:
          <br />
          <span className="auxiliary">had</span> + <span className="verb-main">work</span>
          <span className="verb-ending">ed</span>
        </p>
      </div>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-slate-800">
        <p>
          Dla wszystkich osób:
          <br />
          I had worked
          <br />
          She had finished
          <br />
          They had gone
        </p>
      </div>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-slate-800">
        <p>
          Przeczenie:
          <br />
          had not finished
        </p>
      </div>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-slate-800">
        <p>
          Pytanie:
          <br />
          Had she left?
          <br />
          Had they arrived?
        </p>
      </div>
      <p className="text-slate-700">
        Po „had” zawsze używamy trzeciej formy czasownika (Past Participle).
      </p>
    </section>
  );
}

function UsageContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Kiedy używamy</h2>
      <div>
        <p className="font-medium text-slate-900">
          1) Dwa wydarzenia w przeszłości — jedno było wcześniejsze
        </p>
        <p className="example-muted">She had finished before he arrived.</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">2) Wyjaśnienie przyczyny w przeszłości</p>
        <p className="example-muted">He was tired because he had worked all day.</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">3) Opowiadanie historii z zachowaniem kolejności</p>
      </div>
      <p className="text-slate-700">Past Perfect pomaga ustawić kolejność zdarzeń.</p>
    </section>
  );
}

function SequenceContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Zależność czasów</h2>
      <p className="text-slate-700">Past Perfect zwykle występuje razem z Past Simple.</p>
      <p className="text-slate-700">
        Past Perfect → wcześniejsze wydarzenie
        <br />
        Past Simple → późniejsze wydarzenie
      </p>
      <p className="example-muted">I had eaten before I went out.</p>
      <p className="example-muted">She had never seen snow before she moved to Canada.</p>
    </section>
  );
}

function SignalsContent() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Sygnały</h2>
      <ul className="list-inside list-disc space-y-1 text-slate-700">
        <li>before</li>
        <li>after</li>
        <li>by the time</li>
        <li>already (w przeszłości)</li>
      </ul>
      <p className="text-slate-700">
        Te słowa często wskazują na relację czasową między wydarzeniami.
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
          ❌ When I arrived, she left.
          <br />
          ✔ When I arrived, she had left.
        </p>
        <p>
          ❌ She had went home.
          <br />
          ✔ She had gone home.
        </p>
        <p>
          ❌ I had finished yesterday.
          <br />
          ✔ I finished yesterday.
        </p>
      </div>
      <p className="text-slate-700">
        Past Perfect nie służy do podawania konkretnej daty bez drugiego wydarzenia.
      </p>
    </section>
  );
}

function CompareContent() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Porównaj</h2>
      <p className="text-slate-700">
        Past Perfect:
        <br />
        wcześniejsze wydarzenie w przeszłości
      </p>
      <p className="text-slate-700">
        Past Simple:
        <br />
        pojedyncze wydarzenie w przeszłości
      </p>
      <p className="example-muted">
        She had left before I arrived.
        <br />
        She left at 8 pm.
      </p>
      <Link
        href="/app/grammar/compare?tense1=past-perfect&tense2=past-simple"
        className="inline-block text-slate-700 underline hover:text-slate-900"
      >
        Past Perfect vs Past Simple
      </Link>
    </section>
  );
}

export function PastPerfectClient() {
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
    { id: "sequence", label: "Zależność czasów" },
    { id: "signals", label: "Sygnały" },
    { id: "mistakes", label: "Błędy" },
    { id: "compare", label: "Porównaj" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Past Perfect</h1>
          <p className="max-w-3xl text-sm text-slate-700">
            Past Perfect porządkuje kolejność zdarzeń w przeszłości.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/courses/past-perfect"
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
            {renderedSection === "sequence" && <SequenceContent />}
            {renderedSection === "signals" && <SignalsContent />}
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


"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type SectionKey =
  | "definition"
  | "construction"
  | "usage"
  | "decisionVsPlan"
  | "signals"
  | "mistakes"
  | "compare";

function DefinitionContent() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Definicja</h2>
      <p className="text-slate-700">
        Future Simple (will) opisuje decyzję podjętą w momencie mówienia, przewidywanie lub obietnicę
        dotyczącą przyszłości.
      </p>
      <p className="text-slate-700">
        To nie jest zaplanowana czynność.
        <br />
        To często spontaniczna reakcja.
      </p>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="example-muted">I will help you.</p>
        <p className="example-muted">She will call you later.</p>
        <p className="example-muted">I think it will rain.</p>
      </div>
      <p className="text-slate-700 font-medium">
        To przyszłość „w tej chwili” — decyzja, opinia, obietnica.
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
                  <span className="auxiliary">will</span> + <span className="verb-main">work</span>
                </td>
                <td className="p-3 example-muted">I will work. She will call.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Przeczenie</td>
                <td className="p-3">
                  <span className="auxiliary">will not</span> (won&apos;t) + <span className="verb-main">work</span>
                </td>
                <td className="p-3 example-muted">I won&apos;t go. She will not come.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Pytanie</td>
                <td className="p-3">
                  <span className="auxiliary">Will</span> + podmiot + <span className="verb-main">work</span>?
                </td>
                <td className="p-3 example-muted">Will you help me? Will she arrive on time?</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-base font-semibold text-slate-900">KONSTRUKCJA: WILL + I FORMA</h3>
        <p className="text-slate-700">
          Po „will” zawsze używamy formy podstawowej czasownika (bez -s, bez -ed, bez -ing). Dla wszystkich osób forma „will” jest taka sama.
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
        <p className="font-medium text-slate-900">1) Spontaniczna decyzja</p>
        <p className="example-muted">The phone is ringing. I will answer it.</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">2) Obietnica</p>
        <p className="example-muted">I will never forget this.</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">3) Propozycja</p>
        <p className="example-muted">I will carry that for you.</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">4) Przewidywanie / opinia</p>
        <p className="example-muted">I think she will win.</p>
        <p className="example-muted">It will be difficult.</p>
      </div>
    </section>
  );
}

function DecisionVsPlanContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Decyzja vs Plan</h2>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-slate-800">
        <p>
          <strong>Future Simple (will):</strong> decyzja w momencie mówienia
        </p>
        <p>
          <strong>Going to:</strong> wcześniejszy plan
        </p>
      </div>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-700">
        <p className="example-muted">I will call her. (Decyzja teraz.)</p>
        <p className="example-muted">I am going to call her. (Plan już wcześniej podjęty.)</p>
      </div>
    </section>
  );
}

function SignalsContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Sygnały</h2>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-slate-800">
        <p className="example-muted">I think</p>
        <p className="example-muted">probably</p>
        <p className="example-muted">maybe</p>
        <p className="example-muted">I promise</p>
        <p className="example-muted">I believe</p>
      </div>
      <p className="text-slate-700">
        Często używamy przy opiniach i przewidywaniach.
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
          ❌ I will to call you.
          <br />
          ✔ I will <span className="verb-main">call</span> you.
        </p>
        <p>
          ❌ She will calls you.
          <br />
          ✔ She will <span className="verb-main">call</span> you.
        </p>
        <p>
          ❌ I am sure she will wins.
          <br />
          ✔ I am sure she will <span className="verb-main">win</span>.
        </p>
      </div>
      <p className="text-slate-700">
        Po „will” zawsze forma podstawowa.
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
          <strong>Future Simple:</strong> decyzja w chwili mówienia
        </p>
        <p>
          <strong>Going to:</strong> wcześniejszy plan
        </p>
        <p>
          <strong>Present Continuous:</strong> ustalony plan (I am meeting her tomorrow)
        </p>
      </div>
      <Link
        href="/app/grammar/compare?tense1=future-simple&tense2=going-to"
        className="inline-block text-slate-700 underline hover:text-slate-900"
      >
        Future Simple vs Going to
      </Link>
    </section>
  );
}

export function FutureSimpleClient() {
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
    { id: "decisionVsPlan", label: "Decyzja vs Plan" },
    { id: "signals", label: "Sygnały" },
    { id: "mistakes", label: "Błędy" },
    { id: "compare", label: "Porównaj" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Future Simple (WILL)</h1>
          <p className="max-w-3xl text-sm text-slate-700">
            Decyzja w momencie mówienia, obietnica, przewidywanie — nie zaplanowana czynność.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/courses/future-simple"
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
            {renderedSection === "decisionVsPlan" && <DecisionVsPlanContent />}
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

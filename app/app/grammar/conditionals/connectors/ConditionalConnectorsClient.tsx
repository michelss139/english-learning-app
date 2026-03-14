"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type SectionKey =
  | "definition"
  | "connectors"
  | "examples"
  | "mistakes"
  | "compare";

function DefinitionContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Definicja</h2>
      <div className="space-y-2 text-slate-700">
        <p>
          Conditional connectors to wyrażenia, które pozwalają budować{" "}
          <strong>zdania warunkowe bez użycia słowa „if”</strong>.
        </p>
        <p>
          Pełnią one podobną funkcję jak <strong>if</strong>, ale często dodają{" "}
          <strong>konkretny sens logiczny</strong> – na przykład wyjątek, warunek konieczny albo sytuację
          hipotetyczną.
        </p>
        <p>Dzięki nim zdania są <strong>bardziej naturalne i precyzyjne</strong>.</p>
      </div>
    </section>
  );
}

function ConnectorsContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Najczęstsze konstrukcje</h2>
      <div className="space-y-4 text-slate-700">
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Unless</p>
          <p className="text-sm">
            <strong>Unless</strong> oznacza <strong>„chyba że”</strong> i używamy go, gdy mówimy, że
            coś się wydarzy, jeżeli pewien warunek <strong>nie zostanie spełniony</strong>. Innymi
            słowy: rezultat nastąpi <strong>chyba że wydarzy się coś innego</strong>.
          </p>
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
            <p className="font-medium">I will fail unless you help me.</p>
            <p className="mt-1 text-slate-600">To zdanie można zapisać jako: If you don&apos;t help me, I will fail.</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">As long as</p>
          <p className="text-sm">
            <strong>As long as</strong> oznacza <strong>„pod warunkiem że”</strong>. Używamy go, gdy
            rezultat jest możliwy tylko wtedy, gdy spełniony zostanie określony warunek.
          </p>
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
            <p>You can stay here as long as you are quiet.</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Provided that / providing that</p>
          <p className="text-sm">
            Formalniejsza wersja <strong>„pod warunkiem że”</strong>. Często pojawia się w języku
            formalnym lub w regulaminach.
          </p>
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
            <p>You can borrow my car provided that you drive carefully.</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">In case</p>
          <p className="text-sm">
            <strong>In case</strong> oznacza <strong>„na wypadek gdyby”</strong>. Używamy go, gdy
            robimy coś z wyprzedzeniem, aby przygotować się na możliwą sytuację.
          </p>
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
            <p>Take an umbrella in case it rains.</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Even if</p>
          <p className="text-sm">
            <strong>Even if</strong> oznacza <strong>„nawet jeśli”</strong>. Używamy go, gdy rezultat
            nie zmieni się nawet wtedy, gdy warunek zostanie spełniony.
          </p>
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
            <p>I will go running even if it rains.</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Suppose / supposing</p>
          <p className="text-sm">
            Używane, gdy wyobrażamy sobie hipotetyczną sytuację.
          </p>
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
            <p>Suppose you won the lottery. What would you do?</p>
          </div>
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
        <p>Unless you study, you will fail the exam.</p>
        <p>You can stay here as long as you follow the rules.</p>
        <p>Take a jacket in case it gets cold.</p>
        <p>Even if it rains, we will continue the game.</p>
        <p>You can use my laptop provided that you return it today.</p>
        <p>Suppose you met your favourite actor. What would you say?</p>
      </div>
    </section>
  );
}

function MistakesContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Błędy</h2>
      <div className="space-y-4 text-sm text-slate-800">
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Podwójne przeczenie z unless</p>
          <p>❌ Unless you don&apos;t hurry, you will miss the bus.</p>
          <p>✔ Unless you hurry, you will miss the bus.</p>
          <p className="text-slate-600">Unless już zawiera przeczenie – nie dodajemy don&apos;t.</p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Mylenie in case z if</p>
          <p>❌ Take an umbrella if it rains.</p>
          <p>✔ Take an umbrella in case it rains.</p>
          <p className="text-slate-600">In case = na wypadek gdyby (przygotowanie); if = gdy (warunek).</p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Future po connectorze</p>
          <p>❌ As long as you will finish your work, you can go.</p>
          <p>✔ As long as you finish your work, you can go.</p>
          <p className="text-slate-600">Po connectorach warunkowych używamy Present Simple, nie will.</p>
        </div>
      </div>
    </section>
  );
}

function CompareContent() {
  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900">Porównaj</h2>
      <p className="text-slate-700">
        Conditional connectors pozwalają budować zdania warunkowe{" "}
        <strong>bez użycia słowa „if”</strong>, ale logika zdań warunkowych pozostaje taka sama.
      </p>

      {/* Unless vs If */}
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-3">
        <h3 className="font-medium text-slate-900">Unless vs If</h3>
        <p className="text-sm text-slate-700">
          Słowo <strong>unless</strong> oznacza w praktyce <strong>if not</strong>. Dlatego zdania z{" "}
          <em>unless</em> można często zapisać w taki sam sposób przy użyciu <em>if</em> i przeczenia.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
          <p>Unless you hurry, you will miss the bus.</p>
          <p className="mt-2 text-slate-600">to samo znaczenie:</p>
          <p>If you don&apos;t hurry, you will miss the bus.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm space-y-1">
          <p className="text-slate-600">Najczęstszy błąd:</p>
          <p>❌ Unless you don&apos;t hurry, you will miss the bus.</p>
          <p>✔ Unless you hurry, you will miss the bus.</p>
        </div>
      </div>

      {/* In case vs If */}
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-3">
        <h3 className="font-medium text-slate-900">In case vs If</h3>
        <p className="text-sm text-slate-700">
          <strong>If</strong> opisuje sytuację, w której reagujemy na zdarzenie.{" "}
          <strong>In case</strong> oznacza przygotowanie się{" "}
          <strong>na wypadek gdyby coś się wydarzyło</strong>.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 space-y-2">
          <p>Take an umbrella if it rains.</p>
          <p className="text-slate-600">Czyli: jeżeli zacznie padać, wtedy weź parasol.</p>
          <p className="pt-2">Take an umbrella in case it rains.</p>
          <p className="text-slate-600">Czyli: weź parasol teraz, na wypadek deszczu.</p>
        </div>
      </div>

      {/* Even if vs If */}
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-3">
        <h3 className="font-medium text-slate-900">Even if vs If</h3>
        <p className="text-sm text-slate-700">
          <strong>If</strong> oznacza, że rezultat zależy od warunku. <strong>Even if</strong> oznacza,
          że rezultat <strong>nie zmieni się</strong>, nawet jeśli warunek zostanie spełniony.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 space-y-2">
          <p>If it rains, we will stay at home.</p>
          <p className="text-slate-600">Deszcz zmienia decyzję.</p>
          <p className="pt-2">Even if it rains, we will go out.</p>
          <p className="text-slate-600">Deszcz nie zmienia decyzji.</p>
        </div>
      </div>

      {/* As long as vs Provided that */}
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-3">
        <h3 className="font-medium text-slate-900">As long as vs Provided that</h3>
        <p className="text-sm text-slate-700">
          Oba wyrażenia oznaczają <strong>„pod warunkiem że”</strong>. Różnica polega głównie na stylu.{" "}
          <em>as long as</em> jest bardziej neutralne i używane w codziennym języku.{" "}
          <em>provided that / providing that</em> jest bardziej formalne i często pojawia się w
          regulaminach lub umowach.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 space-y-2">
          <p>You can stay here as long as you are quiet.</p>
          <p>You may enter provided that you show your ID.</p>
        </div>
      </div>
    </section>
  );
}

export function ConditionalConnectorsClient() {
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
    { id: "connectors", label: "Najczęstsze konstrukcje" },
    { id: "examples", label: "Przykłady" },
    { id: "mistakes", label: "Błędy" },
    { id: "compare", label: "Porównaj" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Conditional Connectors</h1>
          <p className="max-w-2xl text-sm text-slate-700">
            Te wyrażenia pozwalają budować zdania warunkowe bez użycia słowa &quot;if&quot;. Dodają one
            dodatkowe znaczenie do warunku i sprawiają, że zdania są bardziej naturalne.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/grammar/conditionals/connectors/practice"
              className="inline-flex w-fit rounded-xl border border-slate-900 bg-white px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Ćwicz Conditional Connectors
            </Link>
            <Link
              href="/app/courses/conditional-connectors"
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
            {renderedSection === "connectors" && <ConnectorsContent />}
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

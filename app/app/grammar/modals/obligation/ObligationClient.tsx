"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type SectionKey =
  | "definition"
  | "structure"
  | "mustVsHaveTo"
  | "should"
  | "negativeForms"
  | "mistakes"
  | "compare";

function DefinitionContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Definition</h2>
      <div className="space-y-4 text-slate-700">
        <p>
          Modal verbs związane z obowiązkiem służą do mówienia o tym, że coś jest konieczne, wymagane
          albo zalecane.
        </p>
        <p>Najczęściej używamy:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>must</li>
          <li>have to</li>
          <li>should</li>
        </ul>
        <p>
          Każda z tych konstrukcji wyraża pewien poziom obowiązku, ale ich znaczenie nie jest
          identyczne.
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>must</strong> — silny obowiązek lub nakaz
          </li>
          <li>
            <strong>have to</strong> — obowiązek wynikający z sytuacji
          </li>
          <li>
            <strong>should</strong> — rada lub sugestia
          </li>
        </ul>
      </div>
    </section>
  );
}

function StructureContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Structure</h2>
      <div className="space-y-4 text-slate-700">
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">must</p>
          <pre className="text-sm font-mono text-slate-800">subject + must + base verb</pre>
          <p className="text-slate-800">Example:</p>
          <p className="text-slate-800">I must finish this report today.</p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">have to</p>
          <pre className="text-sm font-mono text-slate-800">subject + have/has to + base verb</pre>
          <p className="text-slate-800">Example:</p>
          <p className="text-slate-800">She has to work tomorrow.</p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">should</p>
          <pre className="text-sm font-mono text-slate-800">subject + should + base verb</pre>
          <p className="text-slate-800">Example:</p>
          <p className="text-slate-800">You should see a doctor.</p>
        </div>
      </div>
    </section>
  );
}

function MustVsHaveToContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Must vs Have to</h2>
      <div className="space-y-4 text-slate-700">
        <p>
          W wielu sytuacjach <strong>must</strong> i <strong>have to</strong> oznaczają obowiązek i
          mogą być używane zamiennie.
        </p>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="text-slate-800">Example:</p>
          <p className="text-slate-800">I must finish this report today.</p>
          <p className="text-slate-800">I have to finish this report today.</p>
        </div>
        <p>Jednak w praktyce istnieją pewne różnice.</p>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Must</p>
          <p className="text-sm text-slate-700">
            Must często brzmi bardziej stanowczo lub formalnie. Często pojawia się w: przepisach,
            regulaminach, instrukcjach.
          </p>
          <p className="text-slate-800">Example:</p>
          <p className="text-slate-800">Passengers must fasten their seatbelts.</p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Have to</p>
          <p className="text-sm text-slate-700">
            Have to jest bardziej neutralne i częściej używane w codziennej rozmowie.
          </p>
          <p className="text-slate-800">Example:</p>
          <p className="text-slate-800">I have to wake up early tomorrow.</p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Perspektywa</p>
          <p className="text-slate-800">Employees must wear a uniform.</p>
          <p className="text-sm text-slate-600">To brzmi jak zasada lub regulamin.</p>
          <p className="text-slate-800 mt-2">I have to wear a uniform.</p>
          <p className="text-sm text-slate-600">To brzmi jak codzienna sytuacja pracownika.</p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Must w dedukcji</p>
          <p className="text-sm text-slate-700">
            Must może oznaczać silne przypuszczenie. Meaning: jestem prawie pewien.
          </p>
          <p className="text-slate-800">She must be tired.</p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Różnice gramatyczne</p>
          <p className="text-sm text-slate-700">
            Must nie ma naturalnej formy w innych czasach. Dlatego używamy have to:
          </p>
          <p className="text-slate-800">I had to leave early.</p>
          <p className="text-slate-800">I will have to work tomorrow.</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Mustn&apos;t vs Don&apos;t have to</p>
          <p className="text-slate-800">You mustn&apos;t press this button.</p>
          <p className="text-sm text-slate-600">
            If you do, the whole system will restart and we will lose progress.
          </p>
          <p className="text-sm font-medium text-amber-800 mt-2">Zakaz.</p>
          <p className="text-slate-800 mt-2">You don&apos;t have to press this button,</p>
          <p className="text-sm text-slate-600">but you can if you want to restart the system.</p>
          <p className="text-sm font-medium text-amber-800 mt-2">Brak konieczności.</p>
        </div>
      </div>
    </section>
  );
}

function ShouldContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Should</h2>
      <div className="space-y-4 text-slate-700">
        <p>
          Should używamy, gdy chcemy dać komuś radę lub sugestię.
        </p>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
          <p className="text-slate-800">Example:</p>
          <p className="text-slate-800">You should talk to your manager.</p>
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
          must not / mustn&apos;t
don&apos;t have to / doesn&apos;t have to
shouldn&apos;t
        </pre>
        <p>Example:</p>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="text-slate-800">You mustn&apos;t smoke here.</p>
          <p className="text-slate-800">You don&apos;t have to come tomorrow.</p>
          <p className="text-slate-800">You shouldn&apos;t ignore this problem.</p>
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
          <p>❌ He musts work tomorrow.</p>
          <p>✔ He must work tomorrow.</p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p>❌ You don&apos;t must do it.</p>
          <p>✔ You don&apos;t have to do it.</p>
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
          href="/app/grammar/compare?tense1=modal-must&tense2=modal-should"
          className="block rounded-xl border border-slate-300 bg-slate-50 p-4 hover:bg-slate-100 transition"
        >
          <h3 className="font-medium text-slate-900">Must vs Should</h3>
        </Link>
        <Link
          href="/app/grammar/compare?tense1=modal-have-to&tense2=modal-should"
          className="block rounded-xl border border-slate-300 bg-slate-50 p-4 hover:bg-slate-100 transition"
        >
          <h3 className="font-medium text-slate-900">Have to vs Should</h3>
        </Link>
      </div>
    </section>
  );
}

export function ObligationClient() {
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
    { id: "structure", label: "Structure" },
    { id: "mustVsHaveTo", label: "Must vs Have to" },
    { id: "should", label: "Should" },
    { id: "negativeForms", label: "Negative forms" },
    { id: "mistakes", label: "Mistakes" },
    { id: "compare", label: "Compare" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Obligation</h1>
          <p className="max-w-2xl text-sm text-slate-700">
            Modal verbs używane do mówienia o obowiązku, konieczności i zaleceniach: must, have to,
            should.
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
            {renderedSection === "structure" && <StructureContent />}
            {renderedSection === "mustVsHaveTo" && <MustVsHaveToContent />}
            {renderedSection === "should" && <ShouldContent />}
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
          href="/app/grammar/sentence-builder?type=modal&modal=must"
          className="inline-flex w-fit rounded-xl border-2 border-slate-900 bg-white px-6 py-3 font-medium text-slate-900 transition hover:bg-slate-50"
        >
          Try building sentences →
        </Link>
      </div>
    </main>
  );
}

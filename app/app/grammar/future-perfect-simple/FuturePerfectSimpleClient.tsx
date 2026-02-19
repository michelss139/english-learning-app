"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type SectionKey =
  | "definition"
  | "construction"
  | "usage"
  | "timeline"
  | "signals"
  | "mistakes"
  | "compare";

function DefinitionContent() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Definicja</h2>
      <p className="text-slate-700">
        Future Perfect opisuje czynność, która zakończy się przed określonym momentem w przyszłości.
      </p>
      <p className="text-slate-700">
        Patrzymy w przyszłość i mówimy, że coś będzie już zrobione przed innym momentem.
      </p>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="example-muted">By 8 pm, I will have finished the report.</p>
      </div>
      <p className="text-slate-700">
        Najpierw: raport będzie gotowy.
        <br />
        Potem: wybije 8 pm.
      </p>
      <p className="text-slate-700 font-medium">
        To „przyszłość przed przyszłością”.
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
                  <span className="auxiliary">will</span> <span className="verb-main">have</span> + <span className="verb-main">work</span>
                  <span className="verb-ending">ed</span>
                </td>
                <td className="p-3 example-muted">I will have finished. She will have arrived.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Przeczenie</td>
                <td className="p-3">
                  <span className="auxiliary">will not</span> <span className="verb-main">have</span> + <span className="verb-main">work</span>
                  <span className="verb-ending">ed</span>
                </td>
                <td className="p-3 example-muted">I won&apos;t have finished by then.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Pytanie</td>
                <td className="p-3">
                  <span className="auxiliary">Will</span> + podmiot + <span className="verb-main">have</span> + <span className="verb-main">work</span>
                  <span className="verb-ending">ed</span>?
                </td>
                <td className="p-3 example-muted">Will you have finished by tomorrow? Will she have arrived by then?</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-base font-semibold text-slate-900">KONSTRUKCJA: WILL + HAVE + III FORMA</h3>
        <p className="text-slate-700">
          Po „will have” zawsze używamy trzeciej formy czasownika (Past Participle). Dla wszystkich osób schemat jest taki sam.
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
        <p className="font-medium text-slate-900">1) Coś zakończy się przed konkretnym momentem w przyszłości</p>
        <p className="example-muted">By next week, I will have completed the course.</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">2) Przewidywanie oparte na logice</p>
        <p className="example-muted">Don&apos;t worry, she will have arrived by now.</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">3) Mówienie o postępie</p>
        <p className="example-muted">In five years, they will have built a new bridge.</p>
      </div>
    </section>
  );
}

function TimelineContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Oś czasu</h2>
      <p className="text-slate-700">
        Teraz → przyszłość (punkt odniesienia) → czynność zakończona wcześniej
      </p>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-700">
        <p className="example-muted">By the time you wake up, I will have left.</p>
      </div>
      <p className="text-slate-700">
        Najpierw: wyjdę.
        <br />
        Potem: się obudzisz.
      </p>
      <p className="text-slate-700">
        Future Perfect ustawia kolejność zdarzeń w przyszłości.
      </p>
    </section>
  );
}

function SignalsContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Sygnały</h2>
      <div className="rounded-xl border border-slate-300 bg-white p-4 text-slate-800">
        <p className="example-muted">by</p>
        <p className="example-muted">by the time</p>
        <p className="example-muted">by tomorrow</p>
        <p className="example-muted">by next year</p>
        <p className="example-muted">before (w kontekście przyszłości)</p>
      </div>
      <p className="text-slate-700">
        Te wyrażenia wskazują punkt graniczny w przyszłości.
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
          ❌ I will have finish.
          <br />
          ✔ I will have <span className="verb-main">finish</span>
          <span className="verb-ending">ed</span>.
        </p>
        <p>
          ❌ She will has finished.
          <br />
          ✔ She will <span className="verb-main">have</span> <span className="verb-main">finish</span>
          <span className="verb-ending">ed</span>.
        </p>
        <p>
          ❌ I will finished by tomorrow.
          <br />
          ✔ I will <span className="verb-main">have</span> <span className="verb-main">finish</span>
          <span className="verb-ending">ed</span> by tomorrow.
        </p>
      </div>
      <p className="text-slate-700">
        Po „will have” zawsze trzecia forma czasownika.
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
          <strong>Future Perfect:</strong> czynność zakończona przed momentem w przyszłości
        </p>
        <p>
          <strong>Future Simple:</strong> pojedyncze wydarzenie w przyszłości
        </p>
      </div>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-700">
        <p className="example-muted">I will finish the report.</p>
        <p className="example-muted">I will have finished the report by 8 pm.</p>
      </div>
      <Link
        href="/app/grammar/compare?tense1=future-perfect-simple&tense2=future-simple"
        className="inline-block text-slate-700 underline hover:text-slate-900"
      >
        Future Perfect vs Future Simple
      </Link>
    </section>
  );
}

export function FuturePerfectSimpleClient() {
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
    { id: "timeline", label: "Oś czasu" },
    { id: "signals", label: "Sygnały" },
    { id: "mistakes", label: "Błędy" },
    { id: "compare", label: "Porównaj" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Future Perfect Simple</h1>
          <p className="max-w-3xl text-sm text-slate-700">
            Czynność zakończona przed określonym momentem w przyszłości.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/courses/future-perfect-simple"
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
            {renderedSection === "timeline" && <TimelineContent />}
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

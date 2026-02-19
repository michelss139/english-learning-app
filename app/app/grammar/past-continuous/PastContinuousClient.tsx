"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type SectionKey =
  | "definition"
  | "construction"
  | "usage"
  | "scene"
  | "signals"
  | "mistakes"
  | "compare";

function DefinitionContent() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Definicja</h2>
      <p className="text-slate-700">
        Past Continuous opisuje tło sytuacji w przeszłości.
        Interesuje nas coś, co trwało w danym momencie w przeszłości — było w trakcie.
      </p>
      <p className="text-slate-700">
        To nie jest pojedyncze zdarzenie.
        To coś, co się działo, kiedy wydarzyło się coś innego.
      </p>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <p className="text-sm text-slate-700">
          Przykład:
          <br />
          At 8 pm yesterday, I was studying.
          <br />
          W tym konkretnym momencie byłem w trakcie nauki.
        </p>
      </div>
      <p className="text-slate-700">
        To czas „w trakcie w przeszłości”.
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
                  I / He / She / It → <span className="auxiliary">was</span> + <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>
                  <br />
                  You / We / They → <span className="auxiliary">were</span> + <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>
                </td>
                <td className="p-3 example-muted">She was working when I called.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Przeczenie</td>
                <td className="p-3">
                  <span className="auxiliary">was not</span> / <span className="auxiliary">were not</span> +{" "}
                  <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>
                </td>
                <td className="p-3 example-muted">I was not working at 10 pm.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Pytanie</td>
                <td className="p-3">
                  <span className="auxiliary">Was</span> / <span className="auxiliary">Were</span> + podmiot +{" "}
                  <span className="verb-main">work</span>
                  <span className="verb-ending">ing</span>?
                </td>
                <td className="p-3 example-muted">Was she working? Were they watching TV?</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-base font-semibold text-slate-900">KONSTRUKCJA: WAS/WERE + -ING</h3>
        <p className="text-slate-700">
          Ten czas zawsze potrzebuje odmienionego „be" w przeszłości (was/were) oraz formy -ing.
          Oba elementy są obowiązkowe.
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
        <p className="font-medium text-slate-900">1) Coś trwało w konkretnym momencie w przeszłości</p>
        <p className="example-muted">At 10 pm, I was driving home.</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">2) Tło dla innego wydarzenia</p>
        <p className="example-muted">I was reading when she called.</p>
      </div>
      <p className="text-slate-700">
        To, co trwało → Past Continuous
        <br />
        To, co przerwało → Past Simple
      </p>
    </section>
  );
}

function SceneContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Opis sceny</h2>
      <div>
        <p className="font-medium text-slate-900">Pytanie:</p>
        <p className="example-muted">What was happening when you opened the door?</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">Odpowiedź:</p>
        <p className="example-muted">My friend was reading a book.</p>
        <p className="example-muted">My brother was watching TV.</p>
        <p className="example-muted">My sister was talking on the phone.</p>
      </div>
      <p className="text-slate-700">
        Past Continuous pozwala opisać, co działo się w danym momencie — jakbyśmy zatrzymali kadr w przeszłości i
        opisali, co było „w trakcie”.
      </p>
      <p className="text-slate-700">To funkcja narracyjna.</p>
    </section>
  );
}

function SignalsContent() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Sygnały</h2>
      <ul className="list-inside list-disc space-y-1 text-slate-700">
        <li>when</li>
        <li>while</li>
        <li>at that moment</li>
        <li>at 7 pm yesterday</li>
      </ul>
    </section>
  );
}

function MistakesContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Błędy</h2>
      <div className="space-y-2 text-slate-800">
        <p>
          ❌ I was read a book.
          <br />
          ✔ I was reading a book.
        </p>
        <p>
          ❌ I read when she called. (jeśli chodzi o tło)
          <br />
          ✔ I was reading when she called.
        </p>
      </div>
      <p className="text-slate-700">
        Po „was/were” zawsze musi być forma -ing.
      </p>
    </section>
  );
}

function CompareContent() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Porównaj</h2>
      <p className="text-slate-700">
        Past Continuous = tło / czynność w trakcie
        <br />
        Past Simple = konkretne, zakończone wydarzenie
      </p>
      <p className="example-muted">I was sleeping when the phone rang.</p>
      <Link
        href="/app/grammar/compare?tense1=past-continuous&tense2=past-simple"
        className="inline-block text-slate-700 underline hover:text-slate-900"
      >
        Past Continuous vs Past Simple
      </Link>
    </section>
  );
}

export function PastContinuousClient() {
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
    { id: "scene", label: "Opis sceny" },
    { id: "signals", label: "Sygnały" },
    { id: "mistakes", label: "Błędy" },
    { id: "compare", label: "Porównaj" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Past Continuous</h1>
          <p className="max-w-3xl text-sm text-slate-700">
            Past Continuous opisuje tło sytuacji w przeszłości i pokazuje, co było w trakcie.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/grammar/past-continuous/practice"
              className="inline-flex w-fit rounded-xl border border-slate-900 bg-white px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Ćwicz Past Continuous
            </Link>
            <Link
              href="/app/courses/past-continuous"
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
            {renderedSection === "scene" && <SceneContent />}
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


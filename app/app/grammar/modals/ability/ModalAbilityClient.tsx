"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type SectionKey =
  | "definition"
  | "construction"
  | "generalVsSpecific"
  | "examples"
  | "mistakes"
  | "compare";

function DefinitionContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Definicja</h2>
      <div className="space-y-4 text-slate-700">
        <p>
          Modal verbs związane z ability służą do mówienia o <strong>umiejętnościach</strong> oraz{" "}
          <strong>możliwościach wykonania danej czynności</strong>.
        </p>
        <p>
          Najczęściej używamy w tym celu trzech konstrukcji: <strong>can</strong>, <strong>could</strong>,{" "}
          <strong>be able to</strong>. Każda z nich pozwala mówić o zdolnościach, ale używamy ich w
          różnych sytuacjach oraz w różnych czasach.
        </p>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Can</p>
          <p className="text-slate-800">I can swim.</p>
          <p className="text-sm text-slate-600">Potrafię pływać. To zdanie mówi o ogólnej umiejętności w teraźniejszości.</p>
          <p className="text-sm text-slate-700">
            Używamy <strong>can</strong>, gdy chcemy powiedzieć, że ktoś posiada daną zdolność teraz.
          </p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Could</p>
          <p className="text-slate-800">I could play tennis very well when I was a teenager.</p>
          <p className="text-sm text-slate-600">Potrafiłem grać bardzo dobrze w tenisa, kiedy byłem nastolatkiem.</p>
          <p className="text-sm text-slate-700">
            To zdanie mówi o ogólnej umiejętności w przeszłości. Nie sugeruje związku z teraźniejszością
            – opisuje tylko zdolność w określonym okresie w przeszłości.
          </p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Be able to — teraźniejszość</p>
          <p className="text-slate-800">I have to be able to perform every day, because I am a professional singer.</p>
          <p className="text-sm text-slate-700">
            Konstrukcja <strong>be able to</strong> pozwala wyrazić zdolność w sytuacji, w której
            gramatyczna konstrukcja zdania nie pozwala użyć modalnego <strong>can</strong>. Dlatego
            często pojawia się po innych czasownikach, takich jak: have to, want to, need to, will.
          </p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Be able to — przeszłość</p>
          <p className="text-slate-800">I was able to win a game yesterday against a very good player.</p>
          <p className="text-sm text-slate-700">
            W tym przypadku <strong>be able to</strong> opisuje pojedynczy sukces w przeszłości.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-medium text-slate-900">Ważna uwaga</p>
          <p className="text-sm text-slate-700">
            Gdy mówimy o nieudanej próbie w przeszłości, często używamy <strong>couldn&apos;t</strong>.
          </p>
          <p className="text-slate-800">I couldn&apos;t open the door.</p>
          <p className="text-sm text-slate-600">Nie udało mi się otworzyć drzwi.</p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 overflow-x-auto">
          <table className="w-full text-sm text-slate-800">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 pr-4 font-medium">konstrukcja</th>
                <th className="text-left py-2 font-medium">kiedy używamy</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">can</td>
                <td className="py-2">obecna umiejętność</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-4">could</td>
                <td className="py-2">ogólna umiejętność w przeszłości</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">be able to</td>
                <td className="py-2">gdy konstrukcja gramatyczna tego wymaga lub gdy mówimy o konkretnym sukcesie</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ConstructionContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Konstrukcja</h2>
      <div className="space-y-4 text-slate-700">
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Can</p>
          <p className="text-sm font-mono text-slate-800">Subject + can + infinitive</p>
          <p className="text-slate-800">She can speak three languages.</p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Could</p>
          <p className="text-sm font-mono text-slate-800">Subject + could + infinitive</p>
          <p className="text-slate-800">I could swim when I was five.</p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="font-medium text-slate-900">Be able to</p>
          <p className="text-sm font-mono text-slate-800">Subject + be able to + infinitive</p>
          <p className="text-slate-800">She will be able to help us tomorrow.</p>
        </div>
      </div>
    </section>
  );
}

function GeneralVsSpecificContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">General ability vs specific success</h2>
      <p className="text-slate-700">
        Jedna z najważniejszych różnic w języku angielskim dotyczy użycia <strong>could</strong> oraz{" "}
        <strong>was able to</strong> w przeszłości.
      </p>

      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
        <p className="font-medium text-slate-900">Could — ogólna umiejętność</p>
        <p className="text-sm text-slate-700">
          Could opisuje zdolność, którą ktoś posiadał w przeszłości.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
          <p>When I was younger, I could run very fast.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
        <p className="font-medium text-slate-900">Was able to — konkretny sukces</p>
        <p className="text-sm text-slate-700">
          Was able to opisuje sytuację, w której coś udało się zrobić w konkretnej sytuacji.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
          <p>The door was locked, but we were able to open it.</p>
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
        <p>I can play the piano.</p>
        <p>She can speak Spanish and Italian.</p>
        <p>When I was a child, I could climb trees easily.</p>
        <p>He was able to finish the race despite the injury.</p>
        <p>We will be able to start the project next week.</p>
        <p>She couldn&apos;t understand the instructions.</p>
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
          <p>❌ I can to swim.</p>
          <p>✔ I can swim.</p>
          <p className="text-slate-600">Po can używamy bezokolicznika bez &quot;to&quot;.</p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p>❌ Yesterday I could finish the report.</p>
          <p>✔ Yesterday I was able to finish the report.</p>
          <p className="text-slate-600">Dla konkretnego sukcesu w przeszłości używamy was/were able to.</p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p>❌ She can able to help you.</p>
          <p>✔ She can help you.</p>
          <p>✔ She is able to help you.</p>
          <p className="text-slate-600">Nie łączymy can z able to. Używamy jednej z tych konstrukcji.</p>
        </div>
      </div>
    </section>
  );
}

function CompareContent() {
  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900">Porównaj</h2>

      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-3">
        <h3 className="font-medium text-slate-900">Can vs Could</h3>
        <p className="text-sm text-slate-700">
          Can – obecna umiejętność. Could – ogólna umiejętność w przeszłości.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 space-y-1">
          <p>I can swim now.</p>
          <p>I could swim when I was five.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-3">
        <h3 className="font-medium text-slate-900">Can vs Be able to</h3>
        <p className="text-sm text-slate-700">
          Can – standardowa forma w teraźniejszości. Be able to – gdy potrzebujemy formy gramatycznej
          (np. po have to, will) lub gdy mówimy o przyszłości.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 space-y-1">
          <p>I can help you.</p>
          <p>I will be able to help you tomorrow.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-3">
        <h3 className="font-medium text-slate-900">Could vs Was able to</h3>
        <p className="text-sm text-slate-700">
          Could – ogólna zdolność w przeszłości. Was able to – konkretny sukces w pojedynczej sytuacji.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 space-y-1">
          <p>When I was young, I could run fast.</p>
          <p>Yesterday I was able to finish the report.</p>
        </div>
      </div>
    </section>
  );
}

export function ModalAbilityClient() {
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
    { id: "generalVsSpecific", label: "General ability vs specific success" },
    { id: "examples", label: "Przykłady" },
    { id: "mistakes", label: "Błędy" },
    { id: "compare", label: "Porównaj" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Ability</h1>
          <p className="max-w-2xl text-sm text-slate-700">
            Modal verbs używane do mówienia o umiejętnościach i możliwościach wykonania danej czynności.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/grammar/modals/ability/practice"
              className="inline-flex w-fit rounded-xl border border-slate-900 bg-white px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Ćwicz Ability
            </Link>
            <Link
              href="/app/courses/modal-ability"
              className="text-sm text-slate-600 underline hover:text-slate-800"
            >
              Zobacz pełny kurs
            </Link>
          </div>
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
            {renderedSection === "construction" && <ConstructionContent />}
            {renderedSection === "generalVsSpecific" && <GeneralVsSpecificContent />}
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

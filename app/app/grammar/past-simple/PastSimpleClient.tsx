"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CorrectIcon, WrongIcon } from "@/app/_components/FeedbackIcons";

type SectionKey = "definition" | "construction" | "did" | "usage" | "timeSignals" | "mistakes" | "compare";

function DefinitionContent() {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-slate-900">Definicja</h2>
      <p className="text-slate-700">
        Past Simple to czas, którego używamy, gdy opowiadamy o konkretnych wydarzeniach z przeszłości.
        Mówimy o czymś, co się wydarzyło i zostało zakończone. To czas historii, faktów z przeszłości
        i pojedynczych zdarzeń, które miały swój moment.
      </p>
    </section>
  );
}

function ConstructionContent() {
  return (
    <div className="space-y-4">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Konstrukcja (regular / irregular)</h2>
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
                  I <span className="verb-main">work</span>
                  <span className="verb-ending">ed</span>
                  <br />
                  She <span className="verb-main">work</span>
                  <span className="verb-ending">ed</span>
                  <br />
                  They went
                </td>
                <td className="p-3 example-muted">She worked in London last year.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Przeczenie</td>
                <td className="p-3">
                  <span className="auxiliary">did not</span> + base form
                </td>
                <td className="p-3 example-muted">She did not work yesterday.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Pytanie</td>
                <td className="p-3">
                  <span className="auxiliary">Did</span> + podmiot + base form?
                </td>
                <td className="p-3 example-muted">Did she work yesterday?</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <p className="text-slate-700">
          W Past Simple czasownik przyjmuje formę przeszłą.
        </p>
        <p className="mt-2 text-slate-700">Regular verbs:</p>
        <ul className="mt-1 space-y-1 text-slate-800">
          <li>work → <span className="verb-main">work</span><span className="verb-ending">ed</span></li>
          <li>play → <span className="verb-main">play</span><span className="verb-ending">ed</span></li>
          <li>finish → <span className="verb-main">finish</span><span className="verb-ending">ed</span></li>
        </ul>
        <p className="mt-3 text-slate-700">
          Końcówka -ed jest wyraźnym sygnałem przeszłości.
        </p>
        <p className="mt-3 text-slate-700">
          Nie wszystkie czasowniki tworzą przeszłość przez -ed. Część z nich ma własne, nieregularne formy,
          których trzeba nauczyć się na pamięć.
        </p>
        <ul className="mt-1 space-y-1 text-slate-800">
          <li>go → went</li>
          <li>see → saw</li>
          <li>take → took</li>
        </ul>
        <Link
          href="/app/irregular-verbs"
          className="mt-2 inline-block text-sm text-slate-600 underline hover:text-slate-800"
        >
          Zobacz czasowniki nieregularne
        </Link>
      </section>
    </div>
  );
}

function DidContent() {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-slate-900">Did</h2>
      <p className="text-slate-700">
        W pytaniach i przeczeniach używamy słowa pomocniczego did.
      </p>
      <p className="mt-2 example-muted">
        Did she <span className="verb-main">go</span> there?
        <br />
        She did not <span className="verb-main">go</span> home.
      </p>
      <p className="mt-3 text-slate-700">
        Po słowie did czasownik zawsze wraca do formy podstawowej. Jeśli pojawia się did,
        forma przeszła znika z czasownika głównego.
      </p>
    </section>
  );
}

function UsageContent() {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Kiedy używamy</h2>
      <ul className="space-y-3 text-slate-800">
        <li>
          <p className="font-medium text-slate-900">• Konkretne wydarzenie w przeszłości</p>
          <p className="example-muted">I met her yesterday.</p>
        </li>
        <li>
          <p className="font-medium text-slate-900">• Określony moment w przeszłości</p>
          <p className="example-muted">We moved here in 2019.</p>
        </li>
        <li>
          <p className="font-medium text-slate-900">• Opowiadanie historii krok po kroku</p>
          <p className="example-muted">I opened the door, walked inside and sat down.</p>
        </li>
      </ul>
    </section>
  );
}

function TimeSignalsContent() {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-slate-900">Sygnały czasu</h2>
      <p className="text-sm text-slate-700">
        Past Simple często występuje z określeniami wskazującymi konkretny moment w przeszłości.
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-800">
        <li><strong className="text-slate-900">yesterday</strong> — I saw him yesterday.</li>
        <li><strong className="text-slate-900">last week / last year</strong> — She left last year.</li>
        <li><strong className="text-slate-900">two days ago</strong> — They called two days ago.</li>
        <li><strong className="text-slate-900">in 2018</strong> — We met in 2018.</li>
      </ul>
    </section>
  );
}

function MistakesContent() {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Błędy</h2>
      <ul className="space-y-2 text-sm text-slate-800">
        <li className="flex items-center gap-1.5"><WrongIcon size={16} /> Did she went there?</li>
        <li>✔ Did she go there.</li>
        <li className="flex items-center gap-1.5"><WrongIcon size={16} /> She didn&apos;t went home.</li>
        <li>✔ She didn&apos;t go home.</li>
        <li className="flex items-center gap-1.5"><WrongIcon size={16} /> I have seen him yesterday.</li>
        <li>✔ I saw him yesterday.</li>
      </ul>
    </section>
  );
}

function CompareContent() {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-slate-900">Porównaj</h2>
      <p className="text-sm text-slate-700">
        Past Simple mówi o konkretnym wydarzeniu w przeszłości.
        <br />
        Present Perfect mówi o doświadczeniu lub efekcie, bez podawania momentu.
      </p>
      <Link
        href="/app/grammar/compare?tense1=past-simple&tense2=present-perfect"
        className="mt-2 inline-block text-slate-700 underline hover:text-slate-900"
      >
        Past Simple vs Present Perfect
      </Link>
    </section>
  );
}

export function PastSimpleClient() {
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
    { id: "construction", label: "Konstrukcja (regular / irregular)" },
    { id: "did", label: "Did" },
    { id: "usage", label: "Kiedy używamy" },
    { id: "timeSignals", label: "Sygnały czasu" },
    { id: "mistakes", label: "Błędy" },
    { id: "compare", label: "Porównaj" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Past Simple</h1>
          <p className="max-w-3xl text-sm text-slate-700">
            Past Simple to czas, którego używamy, gdy opowiadamy o konkretnych wydarzeniach z przeszłości.
            Mówimy o czymś, co się wydarzyło i zostało zakończone. To czas historii, faktów z przeszłości
            i pojedynczych zdarzeń, które miały swój moment.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/grammar/past-simple/practice"
              className="inline-flex w-fit items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
            >
              Ćwicz Past Simple
            </Link>
            <Link
              href="/app/courses/past-simple"
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
            {renderedSection === "did" && <DidContent />}
            {renderedSection === "usage" && <UsageContent />}
            {renderedSection === "timeSignals" && <TimeSignalsContent />}
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

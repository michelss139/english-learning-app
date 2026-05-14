"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type SectionKey =
  | "definition"
  | "construction"
  | "usage"
  | "forSince"
  | "alreadyYetJust"
  | "mistakes"
  | "compare";

function DefinitionContent() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Definicja</h2>
      <p className="text-slate-700">Present Perfect łączy przeszłość z teraźniejszością.</p>
      <p className="text-slate-700">
        Mówimy o:
        <br />- doświadczeniach,
        <br />- zmianach,
        <br />- rezultacie widocznym teraz,
        <br />- sytuacjach, które zaczęły się w przeszłości i trwają do teraz.
      </p>
      <p className="text-slate-700">
        Nie interesuje nas dokładny moment w przeszłości.
        Interesuje nas efekt teraz.
      </p>
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
        <p>I have visited London.</p>
        <p>She has lost her keys. (Teraz nie ma kluczy.)</p>
        <p>I have lived here for five years.</p>
      </div>
      <p className="text-slate-700">Przeszłość → skutek teraz.</p>
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
                  I / You / We / They → <span className="auxiliary">have</span> + <span className="verb-main">work</span>
                  <span className="verb-ending">ed</span>
                  <br />
                  He / She / It → <span className="auxiliary">has</span> + <span className="verb-main">work</span>
                  <span className="verb-ending">ed</span>
                </td>
                <td className="p-3 example-muted">I have visited London. She has lost her keys.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Przeczenie</td>
                <td className="p-3">
                  <span className="auxiliary">have not</span> / <span className="auxiliary">has not</span> +{" "}
                  <span className="verb-main">work</span>
                  <span className="verb-ending">ed</span>
                </td>
                <td className="p-3 example-muted">She hasn&apos;t finished yet.</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="p-3 font-medium">Pytanie</td>
                <td className="p-3">
                  <span className="auxiliary">Have</span> / <span className="auxiliary">Has</span> + podmiot +{" "}
                  <span className="verb-main">work</span>
                  <span className="verb-ending">ed</span>?
                </td>
                <td className="p-3 example-muted">Have you finished? Has she called?</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-base font-semibold text-slate-900">KONSTRUKCJA: HAVE/HAS + III FORMA</h3>
        <p className="text-slate-700">
          Po have/has używamy trzeciej formy czasownika (Past Participle). Czasowniki nieregularne mają własną formę (np. go → gone, see → seen).
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
        <p className="font-medium text-slate-900">1) Doświadczenie (bez podania kiedy)</p>
        <p className="example-muted">I have been to Spain.</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">2) Rezultat widoczny teraz</p>
        <p className="example-muted">She has broken her leg.</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">3) Coś zaczęło się w przeszłości i trwa</p>
        <p className="example-muted">I have worked here since 2020.</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">4) Zmiana w czasie</p>
        <p className="example-muted">The city has grown a lot.</p>
      </div>
      <p className="text-slate-700">Nie podajemy konkretnej daty.</p>
    </section>
  );
}

function ForSinceContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">For / Since</h2>
      <div>
        <p className="font-medium text-slate-900">for → okres czasu</p>
        <p className="example-muted">for five years</p>
        <p className="example-muted">for a long time</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">since → punkt w czasie</p>
        <p className="example-muted">since 2020</p>
        <p className="example-muted">since Monday</p>
        <p className="example-muted">since I was a child</p>
      </div>
      <p className="text-slate-700">
        for = jak długo
        <br />
        since = od kiedy
      </p>
    </section>
  );
}

function AlreadyYetJustContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Already / Yet / Just</h2>
      <div>
        <p className="font-medium text-slate-900">already → już (twierdzenia)</p>
        <p className="example-muted">I have already finished.</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">yet → jeszcze (pytania / przeczenia)</p>
        <p className="example-muted">Have you finished yet?</p>
        <p className="example-muted">I haven&apos;t finished yet.</p>
      </div>
      <div>
        <p className="font-medium text-slate-900">just → właśnie</p>
        <p className="example-muted">She has just left.</p>
      </div>
    </section>
  );
}

function MistakesContent() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Błędy</h2>
      <div className="space-y-2 text-slate-800">
        <p>
          ❌ I have seen her yesterday.
          <br />
          ✔ I saw her yesterday.
        </p>
        <p>
          ❌ I am here since 2020.
          <br />
          ✔ I have been here since 2020.
        </p>
        <p>
          ❌ She have finished.
          <br />
          ✔ She has finished.
        </p>
      </div>
      <p className="text-slate-700">
        Jeśli podajesz konkretną datę (yesterday, in 2019) → użyj Past Simple.
      </p>
    </section>
  );
}

function CompareContent() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Porównaj</h2>
      <p className="text-slate-700">
        Present Perfect:
        <br />
        przeszłość + efekt teraz
        <br />
        brak konkretnej daty
      </p>
      <p className="text-slate-700">
        Past Simple:
        <br />
        konkretne wydarzenie w określonym czasie
      </p>
      <p className="example-muted">
        I have lost my keys. (Nie mam ich teraz.)
        <br />
        I lost my keys yesterday. (Wiadomo kiedy.)
      </p>
      <Link
        href="/app/grammar/compare?tense1=present-perfect&tense2=past-simple"
        className="inline-block text-slate-700 underline hover:text-slate-900"
      >
        Present Perfect vs Past Simple
      </Link>
    </section>
  );
}

export function PresentPerfectClient() {
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
    { id: "forSince", label: "For / Since" },
    { id: "alreadyYetJust", label: "Already / Yet / Just" },
    { id: "mistakes", label: "Błędy" },
    { id: "compare", label: "Porównaj" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Present Perfect</h1>
          <p className="max-w-3xl text-sm text-slate-700">
            Present Perfect łączy przeszłość z teraźniejszością i skupia się na efekcie teraz.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/app/courses/present-perfect"
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
            {renderedSection === "usage" && <UsageContent />}
            {renderedSection === "forSince" && <ForSinceContent />}
            {renderedSection === "alreadyYetJust" && <AlreadyYetJustContent />}
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


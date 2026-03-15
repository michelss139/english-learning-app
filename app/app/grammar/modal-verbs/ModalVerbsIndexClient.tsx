"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type ViewMode = "function" | "word";
type ModalIndexItem = {
  id: string;
  title: string;
  description: string;
  href?: string;
  available?: boolean;
  definitionContent?: React.ReactNode;
};

const byFunction: ModalIndexItem[] = [
  {
    id: "ability",
    title: "Ability",
    description: "Can, could i be able to – umiejętności i możliwości.",
    href: "/app/grammar/modals/ability",
    available: true,
  },
  {
    id: "obligation",
    title: "Obligation",
    description: "Must, have to, should – obowiązek, konieczność i zalecenia.",
    href: "/app/grammar/modals/obligation",
    available: true,
  },
  {
    id: "possibility",
    title: "Possibility",
    description: "May, might, could – możliwość.",
    href: "/app/grammar/modals/possibility",
    available: true,
  },
  {
    id: "advice",
    title: "Advice",
    description: "Should, ought to, had better – rady i sugestie.",
    href: "/app/grammar/modal-verbs/advice",
    available: true,
  },
  {
    id: "probability",
    title: "Probability",
    description: "Must, might, may, could, can't – przypuszczenia i prawdopodobieństwo.",
    href: "/app/grammar/modal-verbs/probability",
    available: true,
  },
];

const byWord: ModalIndexItem[] = [
  {
    id: "can",
    title: "can",
    description: "Umiejętności, pozwolenie i podstawowe możliwości.",
    href: "/app/grammar/modal-verbs/can",
  },
  {
    id: "could",
    title: "could",
    description: "Umiejętność w przeszłości, grzeczne prośby i możliwość.",
    href: "/app/grammar/modal-verbs/could",
  },
  {
    id: "may",
    title: "may",
    description: "Pozwolenie oraz możliwość.",
    href: "/app/grammar/modal-verbs/may",
  },
  {
    id: "might",
    title: "might",
    description: "Możliwość i bardziej niepewne przypuszczenia.",
    href: "/app/grammar/modal-verbs/might",
  },
  {
    id: "must",
    title: "must",
    description: "Obowiązek oraz silne przypuszczenie w jednym modalu.",
    href: "/app/grammar/modal-verbs/must",
    available: true,
    definitionContent: (
      <div className="space-y-4 text-slate-700">
        <p>Must to modal verb, który ma dwa główne znaczenia:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>obligation (obowiązek)</li>
          <li>logical deduction (silne przypuszczenie)</li>
        </ul>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2">
          <p className="text-slate-800">Examples:</p>
          <p className="text-slate-800">You must wear a helmet.</p>
          <p className="text-slate-800">She must be tired.</p>
        </div>
        <p>Znaczenie zależy od kontekstu zdania.</p>
      </div>
    ),
  },
  {
    id: "should",
    title: "should",
    description: "Rady, sugestie i oczekiwania.",
    href: "/app/grammar/modal-verbs/should",
  },
  {
    id: "have-to",
    title: "have to",
    description: "Zewnętrzny obowiązek wynikający z sytuacji.",
    href: "/app/grammar/modal-verbs/have-to",
  },
  {
    id: "be-able-to",
    title: "be able to",
    description: "Umiejętności w innych czasach i konstrukcjach.",
    href: "/app/grammar/modal-verbs/be-able-to",
  },
];

const FADE_DURATION = 180;

export function ModalVerbsIndexClient() {
  const [mode, setMode] = useState<ViewMode>("word");
  const items = useMemo(() => (mode === "function" ? byFunction : byWord), [mode]);
  const defaultId = mode === "word" ? "must" : (items[0]?.id ?? "");
  const [activeId, setActiveId] = useState("must");
  const [renderedId, setRenderedId] = useState("must");
  const [isVisible, setIsVisible] = useState(true);
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (transitionRef.current) clearTimeout(transitionRef.current);
    };
  }, []);

  useEffect(() => {
    const nextId = mode === "word" ? "must" : (items[0]?.id ?? "");
    setActiveId(nextId);
    setRenderedId(nextId);
    setIsVisible(true);
    if (transitionRef.current) clearTimeout(transitionRef.current);
  }, [items, mode]);

  const changeItem = (nextId: string) => {
    if (nextId === activeId) return;
    if (transitionRef.current) clearTimeout(transitionRef.current);

    setActiveId(nextId);
    setIsVisible(false);
    transitionRef.current = setTimeout(() => {
      setRenderedId(nextId);
      requestAnimationFrame(() => setIsVisible(true));
    }, FADE_DURATION);
  };

  const renderedItem = items.find((item) => item.id === renderedId) ?? items[0];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Modal Verbs</h1>
          <p className="max-w-2xl text-sm text-slate-700">
            Modal verbs to krótkie czasowniki pomocnicze, które zmieniają znaczenie zdania.
            Używamy ich do mówienia o możliwościach, obowiązkach, radach oraz przypuszczeniach.
          </p>
          <p className="max-w-2xl text-sm text-slate-700">
            Możesz uczyć się ich na dwa sposoby: według funkcji albo według konkretnego słowa.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setMode("function")}
              className={`rounded-xl bg-white px-4 py-2 text-sm transition hover:bg-slate-50 ${
                mode === "function"
                  ? "border-2 border-slate-900 font-semibold text-slate-900"
                  : "border border-slate-300 font-medium text-slate-700"
              }`}
            >
              Funkcje
            </button>
            <button
              type="button"
              onClick={() => setMode("word")}
              className={`rounded-xl bg-white px-4 py-2 text-sm transition hover:bg-slate-50 ${
                mode === "word"
                  ? "border-2 border-slate-900 font-semibold text-slate-900"
                  : "border border-slate-300 font-medium text-slate-700"
              }`}
            >
              Słowa
            </button>
          </div>
        </div>
        <Link
          href="/app/grammar"
          className="rounded-xl border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          ← Wróć do gramatyki
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_1fr]">
        <div className="rounded-2xl border border-slate-900 bg-white p-4">
          <div className={`transition-opacity duration-200 ${isVisible ? "opacity-100" : "opacity-0"}`}>
            {renderedItem ? (
              <div className="flex flex-col gap-4">
                <h2 className="text-center text-5xl font-semibold text-slate-900">{renderedItem.title}</h2>
                <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-slate-700">
                  {renderedItem.definitionContent ?? <p>{renderedItem.description}</p>}
                </div>
                {renderedItem.available && renderedItem.href ? (
                  <Link
                    href={renderedItem.href}
                    className="inline-flex w-fit rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                  >
                    Otwórz pełną teorię
                  </Link>
                ) : renderedItem.href ? (
                  <div className="inline-flex w-fit rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-500">
                    Strona w przygotowaniu
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-900 bg-white p-4">
          <div className="mb-3 text-xs uppercase tracking-[0.14em] text-slate-500">
            {mode === "function" ? "Tematy" : "Słówka"}
          </div>
          <div className="mb-3 h-px w-full bg-slate-200" />
          <div className="flex flex-col gap-2.5">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => changeItem(item.id)}
                className={`w-full rounded-2xl border border-black/15 px-4 py-2.5 text-left text-sm text-slate-700 transition-all duration-200 hover:bg-black/5 ${
                  activeId === item.id
                    ? "scale-[1.01] border-l-4 border-l-black bg-black/5 font-semibold text-slate-900"
                    : "font-medium"
                }`}
              >
                {item.title}
              </button>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

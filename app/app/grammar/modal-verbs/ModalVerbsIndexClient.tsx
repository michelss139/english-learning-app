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
    description: "Can, could i be able to — umiejętności i możliwości.",
    href: "/app/grammar/modals/ability",
    available: true,
  },
  {
    id: "obligation",
    title: "Obligation",
    description: "Must, have to, should — obowiązek, konieczność i zalecenia.",
    href: "/app/grammar/modals/obligation",
    available: true,
  },
  {
    id: "possibility",
    title: "Possibility",
    description: "May, might, could — możliwość.",
    href: "/app/grammar/modals/possibility",
    available: true,
  },
  {
    id: "advice",
    title: "Advice",
    description: "Should, ought to, had better — rady i sugestie.",
    href: "/app/grammar/modal-verbs/advice",
    available: true,
  },
  {
    id: "probability",
    title: "Probability",
    description: "Must, might, may, could, can't — przypuszczenia i prawdopodobieństwo.",
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
      <div className="space-y-3 text-slate-700">
        <p>
          <em>Must</em> to modal verb, który ma dwa główne znaczenia:
        </p>
        <ul className="ml-5 list-disc space-y-1 text-sm">
          <li>obligation (obowiązek)</li>
          <li>logical deduction (silne przypuszczenie)</li>
        </ul>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Examples
          </p>
          <p className="text-sm text-slate-800">You must wear a helmet.</p>
          <p className="text-sm text-slate-800">She must be tired.</p>
        </div>
        <p className="text-sm">Znaczenie zależy od kontekstu zdania.</p>
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
    const nextId = mode === "word" ? "must" : items[0]?.id ?? "";
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
    <main className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Modal Verbs</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Czasowniki modalne to krótkie czasowniki pomocnicze, które zmieniają znaczenie zdania.
            Używamy ich do mówienia o możliwościach, obowiązkach, radach oraz przypuszczeniach.
          </p>
          <div
            role="radiogroup"
            aria-label="Tryb przeglądania"
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1"
          >
            {(
              [
                { id: "word", label: "Słowa" },
                { id: "function", label: "Funkcje" },
              ] as { id: ViewMode; label: string }[]
            ).map((opt) => {
              const active = mode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMode(opt.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        <Link
          href="/app/grammar"
          className="inline-flex items-center self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
        >
          ← Gramatyka
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_1fr] lg:gap-5">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-6">
          <div
            className={`transition-opacity duration-200 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {renderedItem ? (
              <div className="flex flex-col gap-4">
                <h2 className="text-center text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                  {renderedItem.title}
                </h2>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-slate-700">
                  {renderedItem.definitionContent ?? (
                    <p className="text-sm">{renderedItem.description}</p>
                  )}
                </div>
                {renderedItem.available && renderedItem.href ? (
                  <Link
                    href={renderedItem.href}
                    className="inline-flex w-fit items-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                  >
                    Otwórz pełną teorię →
                  </Link>
                ) : renderedItem.href ? (
                  <div className="inline-flex w-fit items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-3.5 py-2 text-sm font-medium text-slate-500">
                    Strona w przygotowaniu
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {mode === "function" ? "Tematy" : "Słówka"}
          </div>
          <div className="flex flex-col gap-1.5">
            {items.map((item) => {
              const isActive = activeId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeItem(item.id)}
                  data-active={isActive ? "true" : "false"}
                  className={`grammar-aside-item px-3.5 py-2 text-left text-sm ${
                    isActive
                      ? "font-semibold text-slate-900"
                      : "font-medium text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {item.title}
                </button>
              );
            })}
          </div>
        </aside>
      </section>
    </main>
  );
}

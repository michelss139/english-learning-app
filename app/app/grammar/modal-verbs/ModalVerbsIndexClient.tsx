"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BackButton } from "@/app/_components/BackButton";
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

// ─── Shared card atoms ────────────────────────────────────────────────────────

function ExCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
        Przykłady
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Ex({ children }: { children: React.ReactNode }) {
  return <p className="text-sm italic text-slate-800">{children}</p>;
}

function WarnCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
      <p className="text-sm text-amber-900">{children}</p>
    </div>
  );
}

function Words({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((w) => (
        <span
          key={w}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm"
        >
          {w}
        </span>
      ))}
    </div>
  );
}

// ─── byFunction items ─────────────────────────────────────────────────────────

const byFunction: ModalIndexItem[] = [
  {
    id: "ability",
    title: "Ability",
    description: "Can, could i be able to — umiejętności i możliwości.",
    href: "/app/grammar/modals/ability",
    available: true,
    definitionContent: (
      <div className="space-y-3 text-slate-700">
        <p>
          <em>Ability</em> to zdolność do robienia czegoś. Do wyrażania umiejętności używamy trzech
          konstrukcji:
        </p>
        <Words items={["can", "could", "be able to"]} />
        <ul className="ml-5 list-disc space-y-1 text-sm">
          <li>
            <strong>can</strong> — obecna umiejętność
          </li>
          <li>
            <strong>could</strong> — ogólna umiejętność w przeszłości
          </li>
          <li>
            <strong>be able to</strong> — gdy can nie pasuje gramatycznie lub mówimy o konkretnym
            sukcesie
          </li>
        </ul>
        <ExCard>
          <Ex>I can swim.</Ex>
          <Ex>I could ride a bike when I was four.</Ex>
          <Ex>She was able to finish the race despite the injury.</Ex>
        </ExCard>
      </div>
    ),
  },
  {
    id: "obligation",
    title: "Obligation",
    description: "Must, have to, should — obowiązek, konieczność i zalecenia.",
    href: "/app/grammar/modals/obligation",
    available: true,
    definitionContent: (
      <div className="space-y-3 text-slate-700">
        <p>
          <em>Obligation</em> to obowiązek lub konieczność wykonania czegoś. Trzy główne konstrukcje:
        </p>
        <Words items={["must", "have to", "should"]} />
        <ul className="ml-5 list-disc space-y-1 text-sm">
          <li>
            <strong>must</strong> — silny nakaz, często z przepisów lub wewnętrzny
          </li>
          <li>
            <strong>have to</strong> — obowiązek wynikający z sytuacji lub zewnętrznych reguł
          </li>
          <li>
            <strong>should</strong> — łagodniejszy obowiązek, rada lub sugestia
          </li>
        </ul>
        <ExCard>
          <Ex>You must wear a seatbelt.</Ex>
          <Ex>I have to wake up at 6 every day.</Ex>
          <Ex>You should see a doctor.</Ex>
        </ExCard>
        <WarnCard>
          mustn&apos;t = zakaz. don&apos;t have to = brak konieczności (ale możesz). To ważna
          różnica!
        </WarnCard>
      </div>
    ),
  },
  {
    id: "possibility",
    title: "Possibility",
    description: "May, might, could — możliwość.",
    href: "/app/grammar/modals/possibility",
    available: true,
    definitionContent: (
      <div className="space-y-3 text-slate-700">
        <p>
          <em>Possibility</em> — coś jest możliwe, ale nie mamy pewności. Używamy:
        </p>
        <Words items={["may", "might", "could"]} />
        <ul className="ml-5 list-disc space-y-1 text-sm">
          <li>
            <strong>may</strong> — możliwość (i formalne pozwolenie)
          </li>
          <li>
            <strong>might</strong> — możliwość, trochę mniej pewna niż may
          </li>
          <li>
            <strong>could</strong> — jedna z możliwych opcji
          </li>
        </ul>
        <ExCard>
          <Ex>It may rain later.</Ex>
          <Ex>She might be at home.</Ex>
          <Ex>That could be the answer.</Ex>
        </ExCard>
        <p className="text-sm">
          W codziennym języku may i might są często wymienne.
        </p>
      </div>
    ),
  },
  {
    id: "advice",
    title: "Advice",
    description: "Should, ought to, had better — rady i sugestie.",
    href: "/app/grammar/modal-verbs/advice",
    available: true,
    definitionContent: (
      <div className="space-y-3 text-slate-700">
        <p>
          <em>Advice</em> to rady i sugestie. Trzy główne konstrukcje:
        </p>
        <Words items={["should", "ought to", "had better"]} />
        <ul className="ml-5 list-disc space-y-1 text-sm">
          <li>
            <strong>should</strong> — najczęstsza, neutralna rada
          </li>
          <li>
            <strong>ought to</strong> — podobne do should, trochę bardziej formalne lub moralne
          </li>
          <li>
            <strong>had better</strong> — rada z ostrzeżeniem o konsekwencjach
          </li>
        </ul>
        <ExCard>
          <Ex>You should get some rest.</Ex>
          <Ex>You ought to apologise.</Ex>
          <Ex>You had better leave now or you&apos;ll miss the train.</Ex>
        </ExCard>
      </div>
    ),
  },
  {
    id: "probability",
    title: "Probability",
    description: "Must, might, may, could, can't — przypuszczenia i prawdopodobieństwo.",
    href: "/app/grammar/modal-verbs/probability",
    available: true,
    definitionContent: (
      <div className="space-y-3 text-slate-700">
        <p>
          <em>Probability</em> to ocena, jak bardzo coś jest prawdopodobne — od pewności do
          niemożliwości:
        </p>
        <Words items={["must", "may / might / could", "can't"]} />
        <ul className="ml-5 list-disc space-y-1 text-sm">
          <li>
            <strong>must</strong> — jestem prawie pewien (silna dedukcja)
          </li>
          <li>
            <strong>may / might / could</strong> — to możliwe, ale nie wiem
          </li>
          <li>
            <strong>can&apos;t</strong> — to jest niemożliwe
          </li>
        </ul>
        <ExCard>
          <Ex>She must be tired — she worked all day.</Ex>
          <Ex>He might be at home.</Ex>
          <Ex>That can&apos;t be right!</Ex>
        </ExCard>
      </div>
    ),
  },
];

// ─── byWord items ─────────────────────────────────────────────────────────────

const byWord: ModalIndexItem[] = [
  {
    id: "can",
    title: "can",
    description: "Umiejętności, pozwolenie i podstawowe możliwości.",
    href: "/app/grammar/modal-verbs/can",
    available: true,
    definitionContent: (
      <div className="space-y-3 text-slate-700">
        <p>
          <em>Can</em> to jeden z najczęstszych modal verbs. Ma trzy główne znaczenia:
        </p>
        <ul className="ml-5 list-disc space-y-1 text-sm">
          <li>ability (umiejętność)</li>
          <li>permission (pozwolenie)</li>
          <li>possibility (możliwość — przede wszystkim w przeczeniach)</li>
        </ul>
        <ExCard>
          <Ex>I can swim.</Ex>
          <Ex>Can I sit here?</Ex>
          <Ex>That can&apos;t be true!</Ex>
        </ExCard>
        <p className="text-sm">
          Can nie zmienia formy dla żadnej osoby i nigdy nie łączy się z &quot;to&quot;.
        </p>
      </div>
    ),
  },
  {
    id: "could",
    title: "could",
    description: "Umiejętność w przeszłości, grzeczne prośby i możliwość.",
    href: "/app/grammar/modal-verbs/could",
    available: true,
    definitionContent: (
      <div className="space-y-3 text-slate-700">
        <p>
          <em>Could</em> to przeszła forma can z kilkoma zastosowaniami:
        </p>
        <ul className="ml-5 list-disc space-y-1 text-sm">
          <li>ogólna umiejętność w przeszłości</li>
          <li>grzeczna prośba</li>
          <li>możliwość</li>
        </ul>
        <ExCard>
          <Ex>I could swim when I was five.</Ex>
          <Ex>Could you help me, please?</Ex>
          <Ex>It could rain later.</Ex>
        </ExCard>
        <WarnCard>
          Konkretny sukces w przeszłości to was able to, nie could. I was able to finish the
          report. — NIE: I could finish the report.
        </WarnCard>
      </div>
    ),
  },
  {
    id: "may",
    title: "may",
    description: "Możliwość i formalne pozwolenie.",
    href: "/app/grammar/modal-verbs/may",
    available: true,
    definitionContent: (
      <div className="space-y-3 text-slate-700">
        <p>
          <em>May</em> ma dwa główne znaczenia:
        </p>
        <ul className="ml-5 list-disc space-y-1 text-sm">
          <li>possibility (możliwość)</li>
          <li>permission (formalne pozwolenie)</li>
        </ul>
        <ExCard>
          <Ex>It may rain tomorrow.</Ex>
          <Ex>You may leave the room.</Ex>
          <Ex>She may not be at home.</Ex>
        </ExCard>
        <p className="text-sm">
          <strong>maybe</strong> ≠ <strong>may be</strong>. Maybe to przysłówek. May to modal verb.
        </p>
      </div>
    ),
  },
  {
    id: "might",
    title: "might",
    description: "Możliwość i bardziej niepewne przypuszczenia.",
    href: "/app/grammar/modal-verbs/might",
    available: true,
    definitionContent: (
      <div className="space-y-3 text-slate-700">
        <p>
          <em>Might</em> wyraża możliwość — coś, co może, ale nie musi się wydarzyć. Bywa trochę
          mniej pewne niż may:
        </p>
        <ul className="ml-5 list-disc space-y-1 text-sm">
          <li>possibility (możliwość)</li>
          <li>grzeczna sugestia</li>
          <li>might have + participle (przeszłość)</li>
        </ul>
        <ExCard>
          <Ex>I might go to the party.</Ex>
          <Ex>You might want to check this again.</Ex>
          <Ex>She might have forgotten about the meeting.</Ex>
        </ExCard>
      </div>
    ),
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
        <ExCard>
          <Ex>You must wear a helmet.</Ex>
          <Ex>She must be tired.</Ex>
        </ExCard>
        <WarnCard>
          mustn&apos;t = zakaz. don&apos;t have to = brak konieczności. To dwa różne znaczenia!
        </WarnCard>
      </div>
    ),
  },
  {
    id: "should",
    title: "should",
    description: "Rady, sugestie i oczekiwania.",
    href: "/app/grammar/modal-verbs/should",
    available: true,
    definitionContent: (
      <div className="space-y-3 text-slate-700">
        <p>
          <em>Should</em> to najczęstszy sposób dawania rad i sugestii:
        </p>
        <ul className="ml-5 list-disc space-y-1 text-sm">
          <li>advice (rada i sugestia)</li>
          <li>expectation (oczekiwanie — coś, co powinno być)</li>
          <li>should have (krytyka lub żal dotyczący przeszłości)</li>
        </ul>
        <ExCard>
          <Ex>You should get some rest.</Ex>
          <Ex>She should be here by now.</Ex>
          <Ex>I should have called her earlier.</Ex>
        </ExCard>
      </div>
    ),
  },
  {
    id: "have-to",
    title: "have to",
    description: "Zewnętrzny obowiązek wynikający z sytuacji.",
    href: "/app/grammar/modal-verbs/have-to",
    available: true,
    definitionContent: (
      <div className="space-y-3 text-slate-700">
        <p>
          <em>Have to</em> wyraża obowiązek wynikający z zewnętrznych okoliczności — reguł lub
          sytuacji. Ma formy dla wszystkich czasów.
        </p>
        <ul className="ml-5 list-disc space-y-1 text-sm">
          <li>obligation (obowiązek zewnętrzny)</li>
          <li>don&apos;t have to = brak konieczności</li>
          <li>had to = obowiązek w przeszłości</li>
        </ul>
        <ExCard>
          <Ex>I have to work on Saturday.</Ex>
          <Ex>You don&apos;t have to come.</Ex>
          <Ex>She had to leave early yesterday.</Ex>
        </ExCard>
      </div>
    ),
  },
  {
    id: "be-able-to",
    title: "be able to",
    description: "Umiejętności w innych czasach i konstrukcjach.",
    href: "/app/grammar/modal-verbs/be-able-to",
    available: true,
    definitionContent: (
      <div className="space-y-3 text-slate-700">
        <p>
          <em>Be able to</em> wyraża zdolność, gdy can gramatycznie nie pasuje — po will, po innych
          modalach, lub gdy mówimy o konkretnym sukcesie w przeszłości.
        </p>
        <ul className="ml-5 list-disc space-y-1 text-sm">
          <li>will be able to (przyszłość)</li>
          <li>po have to, want to, need to</li>
          <li>was/were able to (konkretny sukces w przeszłości)</li>
        </ul>
        <ExCard>
          <Ex>I will be able to help you tomorrow.</Ex>
          <Ex>I want to be able to drive.</Ex>
          <Ex>She was able to finish despite the injury.</Ex>
        </ExCard>
      </div>
    ),
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
        <BackButton href="/app/grammar" />
      </header>

      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[2.4fr_1fr] lg:gap-5">
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-6 lg:h-[560px]">
          <div
            className={`min-h-0 flex-1 overflow-y-auto pr-1 transition-all duration-200 ${
              isVisible ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"
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

        <aside className="flex flex-col rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:h-[560px] lg:sticky lg:top-28">
          <div className="mb-2 shrink-0 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {mode === "function" ? "Tematy" : "Słówka"}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
            {items.map((item) => {
              const isActive = activeId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeItem(item.id)}
                  data-active={isActive ? "true" : "false"}
                  className={`relative w-full overflow-hidden rounded-lg px-3.5 py-2 text-left text-sm transition-all duration-150 ${
                    isActive
                      ? "bg-gradient-to-br from-emerald-400 to-teal-600 ring-1 ring-inset ring-white/20"
                      : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {isActive ? (
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
                  ) : null}
                  <span className="relative font-semibold" style={isActive ? { color: "#fff" } : undefined}>
                    {item.title}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      </section>
    </main>
  );
}

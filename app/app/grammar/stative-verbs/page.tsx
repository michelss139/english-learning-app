"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { CorrectIcon, WrongIcon } from "@/app/_components/FeedbackIcons";
import {
  ExampleSentence,
  GlossaryTooltip,
  RelatedTenses,
} from "@/lib/grammar/components";
import { TileWithSidebar, type SidebarItem } from "../_components/TileWithSidebar";

type SectionId =
  | "definition"
  | "importance"
  | "categories"
  | "dual"
  | "pitfalls"
  | "structure"
  | "quiz"
  | "dialog"
  | "cheatsheet"
  | "related";

const SECTIONS: SidebarItem<SectionId>[] = [
  { id: "definition", title: "Definicja" },
  { id: "importance", title: "Dlaczego to ważne" },
  { id: "categories", title: "Kategorie" },
  { id: "dual", title: "Podwójna natura" },
  { id: "pitfalls", title: "Pułapki i błędy" },
  { id: "structure", title: "Struktura" },
  { id: "quiz", title: "Sprawdź się" },
  { id: "dialog", title: "Dialog w praktyce" },
  { id: "cheatsheet", title: "Ściąga" },
  { id: "related", title: "Zobacz też" },
];

type CategoryIconKey = "heart" | "bulb" | "eye" | "box" | "sparkles";

const CATEGORIES: { title: string; icon: CategoryIconKey; accent: string; verbs: string[] }[] = [
  {
    title: "Uczucia i emocje",
    icon: "heart",
    accent: "text-rose-500",
    verbs: ["love", "like", "hate", "prefer", "need", "want", "care", "mind"],
  },
  {
    title: "Myślenie, opinie, wiedza",
    icon: "bulb",
    accent: "text-amber-500",
    verbs: ["know", "think", "believe", "understand", "remember", "forget", "agree", "doubt", "mean"],
  },
  {
    title: "Zmysły",
    icon: "eye",
    accent: "text-sky-500",
    verbs: ["see", "hear", "smell", "taste", "sound"],
  },
  {
    title: "Posiadanie i relacje",
    icon: "box",
    accent: "text-violet-500",
    verbs: ["have", "own", "belong", "contain", "include", "consist"],
  },
  {
    title: "Stany i cechy",
    icon: "sparkles",
    accent: "text-emerald-500",
    verbs: ["be", "seem", "appear", "look", "feel"],
  },
];

const DUAL_VERBS: {
  verb: string;
  stative: string;
  stativeTag: string;
  action: string;
  actionTag: string;
}[] = [
  { verb: "THINK", stative: "I think you are right.", stativeTag: "opinia", action: "I am thinking about my future.", actionTag: "proces myślenia" },
  { verb: "HAVE", stative: "I have a car.", stativeTag: "posiadanie", action: "I am having lunch.", actionTag: "czynność" },
  { verb: "SEE", stative: "I see what you mean.", stativeTag: "rozumiem", action: "I am seeing my doctor tomorrow.", actionTag: "spotkanie" },
  { verb: "FEEL", stative: "I feel tired.", stativeTag: "stan", action: "I am feeling better today.", actionTag: "zmiana / proces" },
  { verb: "BE", stative: "He is rude.", stativeTag: "cecha stała", action: "He is being rude.", actionTag: "zachowanie teraz" },
  { verb: "LOOK", stative: "You look tired.", stativeTag: "wrażenie", action: "She is looking at me.", actionTag: "patrzy" },
  { verb: "TASTE", stative: "The soup tastes good.", stativeTag: "smak (stan)", action: "The chef is tasting the soup.", actionTag: "próbuje" },
  { verb: "SMELL", stative: "The flowers smell nice.", stativeTag: "zapach (stan)", action: "She is smelling the flowers.", actionTag: "wącha" },
];

const QUIZ: { sentence: string; answer: "stative" | "action"; hint: string }[] = [
  { sentence: "I have a beautiful old house.", answer: "stative", hint: "posiadanie" },
  { sentence: "She is having dinner with friends.", answer: "action", hint: "czynność" },
  { sentence: "I think this plan is risky.", answer: "stative", hint: "opinia" },
  { sentence: "He is thinking about changing jobs.", answer: "action", hint: "proces" },
  { sentence: "This coffee tastes bitter.", answer: "stative", hint: "smak (stan)" },
  { sentence: "The cook is tasting the sauce.", answer: "action", hint: "próbuje" },
  { sentence: "Now I see what you mean.", answer: "stative", hint: "rozumiem" },
  { sentence: "We are seeing the lawyer on Monday.", answer: "action", hint: "spotkanie" },
];

const CATEGORY_PATHS: Record<CategoryIconKey, string> = {
  heart:
    "M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.566z",
  bulb:
    "M3 12h1M12 2v1M21 12h1M5.6 5.6l.7 .7M18.4 5.6l-.7 .7M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3M9.7 17h4.6",
  eye:
    "M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6",
  box:
    "M12 3l8 4.5v9l-8 4.5l-8 -4.5v-9l8 -4.5M12 12l8 -4.5M12 12v9M12 12l-8 -4.5",
  sparkles:
    "M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zM4 7a2.5 2.5 0 0 1 2.5 2.5a2.5 2.5 0 0 1 2.5 -2.5a2.5 2.5 0 0 1 -2.5 -2.5a2.5 2.5 0 0 1 -2.5 2.5zM14 4l1.4 3.6l3.6 1.4l-3.6 1.4l-1.4 3.6l-1.4 -3.6l-3.6 -1.4l3.6 -1.4z",
};

function CategoryIcon({ icon, className }: { icon: CategoryIconKey; className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={CATEGORY_PATHS[icon]} />
    </svg>
  );
}

function ColorLegend() {
  const items: { dot: string; label: string }[] = [
    { dot: "bg-emerald-500", label: "Stative — stan" },
    { dot: "bg-sky-500", label: "Action — akcja" },
    { dot: "bg-rose-500", label: "Błąd" },
    { dot: "bg-amber-400", label: "Uwaga" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-medium text-slate-500">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${it.dot}`} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{children}</h2>;
}

function Card({ children, tone = "soft" }: { children: React.ReactNode; tone?: "soft" | "warn" }) {
  const cls =
    tone === "warn"
      ? "rounded-xl border border-amber-200 bg-amber-50/80 p-4"
      : "rounded-xl border border-slate-200 bg-slate-50/70 p-4";
  return <div className={cls}>{children}</div>;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm">
      {children}
    </span>
  );
}

function GoodBad({ bad, good }: { bad: string; good: string }) {
  return (
    <div className="space-y-0.5">
      <p className="flex items-center gap-1.5 text-sm text-rose-700">
        <WrongIcon size={16} /> {bad}
      </p>
      <p className="flex items-center gap-1.5 text-sm text-emerald-700">
        <CorrectIcon size={16} /> {good}
      </p>
    </div>
  );
}

function DefinitionSection() {
  return (
    <div className="space-y-3">
      <SectionHeader>
        Czym są <GlossaryTooltip term="stative verb">czasowniki statyczne</GlossaryTooltip>
      </SectionHeader>
      <p className="text-sm text-slate-700">
        Czasowniki statyczne opisują <strong>stan</strong>, a nie akcję — coś, co{" "}
        <em>jest</em>, a nie coś, co <em>się dzieje</em>. Obejmują uczucia, myśli, opinie,
        posiadanie, relacje i stany umysłu.
      </p>
      <Card>
        <p className="text-sm text-slate-700">
          Dlatego zwykle <strong>NIE</strong> używamy ich w formie <code>-ing</code>:
        </p>
        <div className="mt-2">
          <GoodBad bad="I am knowing him." good="I know him." />
        </div>
        <p className="mt-2 text-xs text-slate-500 italic">Bo „know" to stan, a nie akcja.</p>
      </Card>
    </div>
  );
}

function ImportanceSection() {
  return (
    <div className="space-y-3">
      <SectionHeader>Dlaczego to ważne</SectionHeader>
      <p className="text-sm text-slate-700">
        To jeden z najczęstszych powodów, dla których zdanie po angielsku brzmi „nienaturalnie":
      </p>
      <ul className="ml-5 list-disc space-y-1 text-sm text-slate-700">
        <li>nauczyciel mówi: „rozumiem, ale tak się nie mówi",</li>
        <li>native speaker czuje, że coś jest „off",</li>
        <li>Polacy często wrzucają wszystko do Continuous, bo w polskim „teraz" = „robię".</li>
      </ul>
      <Card>
        <p className="text-sm text-slate-700">Angielski działa inaczej: stan ≠ akcja.</p>
      </Card>
    </div>
  );
}

function CategoriesSection() {
  return (
    <div className="space-y-3">
      <SectionHeader>Główne kategorie</SectionHeader>
      <p className="text-sm text-slate-700">
        Pięć rodzin czasowników statycznych — to one najczęściej kuszą, by wrzucić je w Continuous.
      </p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {CATEGORIES.map((cat) => (
          <div key={cat.title} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="mb-2.5 flex items-center gap-2">
              <CategoryIcon icon={cat.icon} className={cat.accent} />
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
                {cat.title}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {cat.verbs.map((verb) => (
                <Chip key={verb}>{verb}</Chip>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlipCard({
  data,
  flipped,
  onToggle,
}: {
  data: (typeof DUAL_VERBS)[number];
  flipped: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={flipped}
      className="group block w-full text-left focus:outline-none"
      style={{ perspective: "1000px" }}
    >
      <div
        className="relative"
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          minHeight: "138px",
        }}
      >
        {/* Front — Stative */}
        <div
          className="absolute inset-0 flex flex-col rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 shadow-sm transition group-hover:border-emerald-300"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              {data.verb}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-600">
              Stative
            </span>
          </div>
          <p className="mt-2 flex-1 font-mono text-sm text-slate-800">{data.stative}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-700">
              {data.stativeTag}
            </span>
            <span className="text-[10px] text-slate-400 transition group-hover:text-slate-600">
              Kliknij →
            </span>
          </div>
        </div>

        {/* Back — Action */}
        <div
          className="absolute inset-0 flex flex-col rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 shadow-sm transition group-hover:border-sky-300"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sky-700">
              {data.verb}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-sky-600">
              Action
            </span>
          </div>
          <p className="mt-2 flex-1 font-mono text-sm text-slate-800">{data.action}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wide text-sky-700">
              {data.actionTag}
            </span>
            <span className="text-[10px] text-slate-400 transition group-hover:text-slate-600">
              ← Kliknij
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function DualSection() {
  const [flipped, setFlipped] = useState<Set<string>>(new Set());

  const toggle = (verb: string): void => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(verb)) next.delete(verb);
      else next.add(verb);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <SectionHeader>Czasowniki o podwójnej naturze</SectionHeader>
      <p className="text-sm text-slate-700">
        To <strong>serce tematu</strong>: te same czasowniki bywają statyczne <em>albo</em> akcyjne —
        i wtedy <strong>zmienia się ich znaczenie</strong>. Kliknij kartę, by obrócić ją na stronę
        akcji.
      </p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {DUAL_VERBS.map((d) => (
          <FlipCard key={d.verb} data={d} flipped={flipped.has(d.verb)} onToggle={() => toggle(d.verb)} />
        ))}
      </div>
      <p className="text-xs italic text-slate-500">
        Zwróć uwagę na <strong>BE</strong>: „He is rude" (taki jest) vs „He is being rude" (zachowuje
        się tak teraz) — najlepszy dowód, że nawet „nieruszalne" czasowniki mają drugą twarz.
      </p>
    </div>
  );
}

function PitfallsSection() {
  return (
    <div className="space-y-3">
      <SectionHeader>Pułapki i typowe błędy</SectionHeader>

      <Card tone="warn">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-700">
          Słowa-wabiki — wyglądają jak „teraz", ale nie zmieniają stative
        </p>
        <div className="space-y-2.5 text-sm text-amber-900">
          <div>
            <p className="font-semibold">„now" + stative ≠ Continuous</p>
            <GoodBad bad="I am knowing the answer now." good="I know the answer now." />
          </div>
          <div>
            <p className="font-semibold">„at the moment" nie zmienia stative w action</p>
            <GoodBad bad="I am liking this song at the moment." good="I like this song." />
          </div>
          <div>
            <p className="font-semibold">„today" nie oznacza automatycznie Continuous</p>
            <GoodBad bad="I am understanding the lesson today." good="I understand the lesson." />
          </div>
        </div>
      </Card>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Najczęstsze błędy do wykorzenienia
        </p>
        <div className="space-y-2">
          {[
            { bad: "I am knowing him.", good: "I know him." },
            { bad: "She is liking this movie.", good: "She likes this movie." },
            { bad: "We are having two brothers.", good: "We have two brothers." },
            { bad: "He is believing you.", good: "He believes you." },
          ].map((m) => (
            <div
              key={m.bad}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
            >
              <GoodBad bad={m.bad} good={m.good} />
            </div>
          ))}
        </div>
      </div>

      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-sky-700">
          Zmysły: percepcja idzie z CAN, nie z Continuous
        </p>
        <p className="text-sm text-slate-700">
          Gdy <code>see / hear / smell / feel</code> znaczą „odbierać zmysłami teraz", mówimy{" "}
          <strong>can</strong>, a nie formę -ing.
        </p>
        <div className="mt-2 space-y-2">
          <GoodBad bad="I am hearing music." good="I can hear music." />
          <GoodBad bad="I am seeing a bird over there." good="I can see a bird over there." />
        </div>
      </Card>

      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-rose-700">
          „want" i „need" — nigdy w Continuous
        </p>
        <p className="text-sm text-slate-700">
          To czyste stany. Nawet potocznie zostają w Present Simple.
        </p>
        <div className="mt-2">
          <GoodBad bad="I am wanting a coffee." good="I want a coffee." />
        </div>
      </Card>

      <div className="rounded-xl border border-[#178CF2]/25 bg-[#178CF2]/[0.04] p-4">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#178CF2]">
          Ciekawostka — „I'm lovin' it"
        </p>
        <p className="text-sm text-slate-700">
          Hasło McDonald's <strong>łamie regułę celowo</strong>. „Love" to stan, więc poprawnie
          byłoby „I love it". Forma <em>lovin'</em> ożywia uczucie, zamienia je w chwilowe,
          intensywne przeżycie — to świadomy, potoczny i marketingowy zabieg. Reguły można łamać,
          gdy wie się <em>dlaczego</em>.
        </p>
      </div>
    </div>
  );
}

function StructureSection() {
  return (
    <div className="space-y-3">
      <SectionHeader>Struktura</SectionHeader>
      <p className="text-sm text-slate-700">Czasowników statycznych używamy głównie w:</p>
      <Card>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Present Simple
        </p>
        <ul className="mt-1.5 space-y-0.5 text-sm text-slate-700">
          <li>I know</li>
          <li>She likes</li>
          <li>They believe</li>
        </ul>
      </Card>
      <Card>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Present Perfect
        </p>
        <ul className="mt-1.5 space-y-0.5 text-sm text-slate-700">
          <li>I have known him for years.</li>
          <li>She has always liked coffee.</li>
        </ul>
      </Card>
      <p className="text-xs italic text-slate-500">
        Nie budujemy ich w Continuous — chyba że zmienia się znaczenie (sekcja „Podwójna natura").
      </p>
    </div>
  );
}

function QuizSection() {
  const [answers, setAnswers] = useState<Record<number, "stative" | "action">>({});

  const answer = (index: number, choice: "stative" | "action"): void => {
    setAnswers((prev) => (prev[index] ? prev : { ...prev, [index]: choice }));
  };

  const answeredCount = Object.keys(answers).length;
  const score = QUIZ.reduce(
    (acc, q, i) => (answers[i] && answers[i] === q.answer ? acc + 1 : acc),
    0,
  );

  return (
    <div className="space-y-3">
      <SectionHeader>Sprawdź się: Stative czy Action?</SectionHeader>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-700">
          Przy każdym zdaniu zdecyduj, czy czasownik opisuje <strong>stan</strong>, czy{" "}
          <strong>akcję</strong>.
        </p>
        <span className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
          {score} / {QUIZ.length}
        </span>
      </div>

      <div className="space-y-2">
        {QUIZ.map((q, i) => {
          const chosen = answers[i];
          const isCorrect = chosen === q.answer;
          return (
            <div
              key={q.sentence}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-mono text-sm text-slate-800">{q.sentence}</p>
                <div className="flex shrink-0 items-center gap-1.5">
                  {(["stative", "action"] as const).map((opt) => {
                    const selected = chosen === opt;
                    const base =
                      "rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-default";
                    let cls =
                      "border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900";
                    if (chosen) {
                      if (opt === q.answer) {
                        cls = "border-emerald-300 bg-emerald-50 text-emerald-700";
                      } else if (selected) {
                        cls = "border-rose-300 bg-rose-50 text-rose-700";
                      } else {
                        cls = "border-slate-200 bg-white text-slate-400";
                      }
                    }
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={Boolean(chosen)}
                        onClick={() => answer(i, opt)}
                        className={`${base} ${cls}`}
                      >
                        {opt === "stative" ? "Stan" : "Akcja"}
                      </button>
                    );
                  })}
                </div>
              </div>
              {chosen && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  {isCorrect ? <CorrectIcon size={16} /> : <WrongIcon size={16} />}
                  <span>
                    {isCorrect ? "Dobrze!" : "Niepoprawnie."}{" "}
                    {q.answer === "stative" ? "Stan" : "Akcja"} — {q.hint}.
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {answeredCount === QUIZ.length && (
        <Card>
          <p className="text-sm font-medium text-slate-800">
            Wynik końcowy: {score} / {QUIZ.length}.{" "}
            {score === QUIZ.length
              ? "Komplet — czujesz różnicę stan/akcja."
              : "Wróć do sekcji „Podwójna natura” i powtórz pary, które sprawiły kłopot."}
          </p>
        </Card>
      )}
    </div>
  );
}

function DialogSection({
  aiDialog,
  aiDialogLoading,
  aiError,
  onGenerate,
}: {
  aiDialog: string | null;
  aiDialogLoading: boolean;
  aiError: string | null;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-3">
      <SectionHeader>Dialog w praktyce</SectionHeader>
      <Card>
        <div className="whitespace-pre-line font-mono text-sm text-slate-700">
          {`A: Are you okay?
B: Yes, I feel fine, just a bit tired.
A: What are you doing?
B: I am thinking about my exam.
A: Do you know the answers?
B: I know most of them, but I am still thinking about two questions.
A: You'll be fine.`}
        </div>
        <p className="mt-2 text-[11px] italic text-slate-500">
          Stative + action obok siebie — idealny kontrast.
        </p>
      </Card>

      <div className="pt-1">
        <button
          type="button"
          onClick={onGenerate}
          disabled={aiDialogLoading}
          className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-60"
        >
          {aiDialogLoading ? "Generuję…" : "Wygeneruj dodatkowy dialog (AI)"}
        </button>
        {aiError && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {aiError}
          </div>
        )}
        {aiDialog && (
          <Card>
            <div className="whitespace-pre-line font-mono text-sm text-slate-700">
              {aiDialog.split("\n").map((line, index) => {
                const highlighted = line.replace(
                  /\*\*(.+?)\*\*/g,
                  '<span class="font-semibold text-slate-900">$1</span>',
                );
                return <div key={index} dangerouslySetInnerHTML={{ __html: highlighted || "&nbsp;" }} />;
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function CheatsheetSection() {
  return (
    <div className="space-y-3">
      <SectionHeader>Ściąga — wszystko na jednej karcie</SectionHeader>

      <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="border-l-4 border-[#178CF2] bg-[#178CF2]/[0.04] px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#178CF2]">
            Złota zasada
          </p>
          <p className="mt-0.5 text-base font-semibold text-slate-900">
            Stative = stan. Nie używaj formy -ing.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px bg-slate-200 sm:grid-cols-2">
          {CATEGORIES.map((cat) => (
            <div key={cat.title} className="bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <CategoryIcon icon={cat.icon} className={cat.accent} />
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
                  {cat.title}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-700">{cat.verbs.slice(0, 5).join(", ")}</p>
            </div>
          ))}
          <div className="bg-white px-4 py-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
              Wyjątek
            </span>
            <p className="mt-1 text-sm text-slate-700">
              Czasowniki o podwójnej naturze (think, have, see, be…) w Continuous{" "}
              <strong>zmieniają znaczenie</strong>.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Trzy największe pułapki
          </p>
          <ul className="space-y-1 text-sm text-slate-700">
            <li>„now / at the moment / today" nie zmienia stative w action.</li>
            <li>Percepcja zmysłów idzie z CAN: „I can see / I can hear".</li>
            <li>„want" i „need" — nigdy w Continuous.</li>
          </ul>
        </div>
      </div>

      <Card>
        <div className="space-y-1.5">
          <ExampleSentence sentence="I know the answer." />
          <ExampleSentence sentence="I am thinking about the answer." />
          <ExampleSentence sentence="She has a dog." />
          <ExampleSentence sentence="She is having a shower." />
          <ExampleSentence sentence="I feel nervous." />
          <ExampleSentence sentence="I am feeling better now." />
        </div>
      </Card>
    </div>
  );
}

function RelatedSection() {
  return (
    <div className="space-y-3">
      <SectionHeader>Zobacz też</SectionHeader>
      <RelatedTenses
        relatedLinks={[
          { slug: "present-simple", title: "Present Simple", description: "Podstawowy czas dla stative" },
          { slug: "present-continuous", title: "Present Continuous", description: "Kontrast z action" },
          { slug: "present-perfect", title: "Present Perfect", description: "Stative w Perfect" },
          {
            slug: "present-perfect-continuous",
            title: "Present Perfect Continuous",
            description: "Kiedy stative może być continuous",
          },
        ]}
      />
    </div>
  );
}

export default function StativeVerbsPage() {
  const [aiDialogLoading, setAiDialogLoading] = useState(false);
  const [aiDialog, setAiDialog] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleGenerateAIDialog = async () => {
    setAiDialogLoading(true);
    setAiError(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      if (!token) {
        setAiError("Musisz być zalogowany");
        setAiDialogLoading(false);
        return;
      }

      const cacheKey = `stative-verbs__single__v1`;

      const cacheRes = await fetch(
        `/api/grammar/ai-dialog?key=${encodeURIComponent(cacheKey)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (cacheRes.ok) {
        const cacheData = await cacheRes.json();
        if (cacheData.ok && cacheData.cached && cacheData.dialog) {
          setAiDialog(cacheData.dialog);
          setAiDialogLoading(false);
          return;
        }
      }

      const genRes = await fetch("/api/grammar/ai-dialog", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tense1: "stative-verbs", tense2: "stative-verbs" }),
      });

      if (!genRes.ok) {
        const errorData = await genRes.json();
        throw new Error(errorData.error || "Błąd generowania dialogu");
      }

      const genData = await genRes.json();
      if (genData.ok && genData.dialog) {
        setAiDialog(genData.dialog);
      } else {
        throw new Error("Nie udało się wygenerować dialogu");
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Błąd generowania dialogu AI");
    } finally {
      setAiDialogLoading(false);
    }
  };

  const renderSection = useMemo(
    () => (item: SidebarItem<SectionId>) => {
      switch (item.id) {
        case "definition":
          return <DefinitionSection />;
        case "importance":
          return <ImportanceSection />;
        case "categories":
          return <CategoriesSection />;
        case "dual":
          return <DualSection />;
        case "pitfalls":
          return <PitfallsSection />;
        case "structure":
          return <StructureSection />;
        case "quiz":
          return <QuizSection />;
        case "dialog":
          return (
            <DialogSection
              aiDialog={aiDialog}
              aiDialogLoading={aiDialogLoading}
              aiError={aiError}
              onGenerate={handleGenerateAIDialog}
            />
          );
        case "cheatsheet":
          return <CheatsheetSection />;
        case "related":
          return <RelatedSection />;
        default:
          return null;
      }
    },
    [aiDialog, aiDialogLoading, aiError],
  );

  return (
    <TileWithSidebar<SectionId>
      title="Czasowniki statyczne"
      description="Stative verbs — kiedy NIE używamy formy -ing. Wybierz sekcję z listy."
      backHref="/app/grammar"
      backLabel="← Gramatyka"
      headerAccessory={<ColorLegend />}
      items={SECTIONS}
      defaultItemId="definition"
      asideLabel="Sekcje"
      renderContent={renderSection}
    />
  );
}

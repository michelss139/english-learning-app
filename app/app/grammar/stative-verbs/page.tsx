"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  ExampleSentence,
  GlossaryTooltip,
  RelatedTenses,
  StativeVsAction,
} from "@/lib/grammar/components";
import { TileWithSidebar, type SidebarItem } from "../_components/TileWithSidebar";

type SectionId =
  | "definition"
  | "importance"
  | "categories"
  | "list"
  | "warnings"
  | "exceptions"
  | "structure"
  | "mistakes"
  | "examples"
  | "dialog"
  | "comparisons"
  | "related";

const SECTIONS: SidebarItem<SectionId>[] = [
  { id: "definition", title: "Definicja" },
  { id: "importance", title: "Dlaczego to ważne" },
  { id: "categories", title: "Kategorie" },
  { id: "list", title: "Lista do nauki" },
  { id: "warnings", title: "Pułapki" },
  { id: "exceptions", title: "Kiedy MOŻE być continuous" },
  { id: "structure", title: "Struktura" },
  { id: "mistakes", title: "Typowe błędy" },
  { id: "examples", title: "Przykłady (kontrast)" },
  { id: "dialog", title: "Dialog w praktyce" },
  { id: "comparisons", title: "Porównania" },
  { id: "related", title: "Zobacz też" },
];

const CATEGORIES: { title: string; verbs: string[] }[] = [
  { title: "A) Uczucia i emocje", verbs: ["love", "like", "hate", "prefer", "need", "want", "care", "mind"] },
  {
    title: "B) Myślenie, opinie, wiedza",
    verbs: ["know", "think", "believe", "understand", "remember", "forget", "agree", "mean"],
  },
  { title: "C) Zmysły", verbs: ["see", "hear", "smell", "taste", "sound"] },
  { title: "D) Posiadanie i relacje", verbs: ["have", "own", "belong", "contain", "include", "consist"] },
  {
    title: "E) Stany i cechy",
    verbs: ["be", "seem", "appear", "look (wydawać się)", "feel (stan)"],
  },
];

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
        <p className="mt-2 text-sm text-rose-700">❌ I am knowing him.</p>
        <p className="text-sm text-emerald-700">✅ I know him.</p>
        <p className="mt-2 text-xs text-slate-500 italic">
          Bo „know" to stan, a nie akcja.
        </p>
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
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {CATEGORIES.map((cat) => (
          <div key={cat.title} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {cat.title}
            </p>
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

function ListSection() {
  const groups: { label: string; verbs: string }[] = [
    { label: "Emotion / feeling", verbs: "love, like, hate, prefer, need, want" },
    { label: "Mind / opinion", verbs: "know, think, believe, understand, remember, forget, agree, doubt" },
    { label: "Possession", verbs: "have, own, belong, contain, include" },
    { label: "Senses", verbs: "see, hear, smell, taste, sound" },
    { label: "State", verbs: "be, seem, appear, feel" },
  ];

  return (
    <div className="space-y-3">
      <SectionHeader>Najważniejsze do nauki</SectionHeader>
      <div className="space-y-2">
        {groups.map((g) => (
          <div
            key={g.label}
            className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:flex-row sm:items-baseline sm:gap-3"
          >
            <span className="min-w-[150px] text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {g.label}
            </span>
            <span className="text-sm text-slate-700">{g.verbs}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WarningsSection() {
  return (
    <div className="space-y-3">
      <SectionHeader>Pułapki — kiedy wydaje się, że trzeba Continuous</SectionHeader>
      <Card tone="warn">
        <div className="space-y-2.5 text-sm text-amber-900">
          <div>
            <p className="font-semibold">„now" + stative ≠ Continuous</p>
            <p className="text-rose-700">❌ I am knowing the answer now.</p>
            <p className="text-emerald-700">✅ I know the answer now.</p>
          </div>
          <div>
            <p className="font-semibold">„at the moment" nie zmienia stative w action</p>
            <p className="text-rose-700">❌ I am liking this song at the moment.</p>
            <p className="text-emerald-700">✅ I like this song.</p>
          </div>
          <div>
            <p className="font-semibold">„today" nie oznacza automatycznie Continuous</p>
            <p className="text-rose-700">❌ I am understanding the lesson today.</p>
            <p className="text-emerald-700">✅ I understand the lesson.</p>
          </div>
          <div>
            <p className="font-semibold">„very much" często idzie ze stative</p>
            <p className="text-slate-800">I love this movie very much.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ExceptionsSection() {
  const pairs: { verb: string; stative: string; staticTag: string; action: string; actionTag: string }[] = [
    { verb: "THINK", stative: "I think you are right.", staticTag: "opinia", action: "I am thinking about my future.", actionTag: "proces myślenia" },
    { verb: "HAVE", stative: "I have a car.", staticTag: "posiadanie", action: "I am having lunch.", actionTag: "akcja" },
    { verb: "SEE", stative: "I see what you mean.", staticTag: "rozumiem", action: "I am seeing my doctor tomorrow.", actionTag: "spotkanie" },
    { verb: "FEEL", stative: "I feel tired.", staticTag: "stan", action: "I am feeling better today.", actionTag: "zmiana / proces" },
    { verb: "LOOK", stative: "You look tired.", staticTag: "wrażenie", action: "She is looking at me.", actionTag: "akcja" },
  ];

  return (
    <div className="space-y-3">
      <SectionHeader>Kiedy stative MOŻE być continuous</SectionHeader>
      <p className="text-sm text-slate-700">
        To jest krytyczne — w tych przypadkach <strong>zmienia się znaczenie</strong> czasownika.
      </p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {pairs.map((p) => (
          <div key={p.verb} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {p.verb}
            </p>
            <div className="mt-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <div className="text-slate-800">{p.stative}</div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                {p.staticTag}
              </div>
            </div>
            <div className="mt-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <div className="text-slate-800">{p.action}</div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-sky-700">
                {p.actionTag}
              </div>
            </div>
          </div>
        ))}
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
        Nie budujemy ich w Continuous — chyba że zmienia się znaczenie (sekcja „Kiedy MOŻE być
        continuous").
      </p>
    </div>
  );
}

function MistakesSection() {
  const items = [
    { bad: "I am knowing him.", good: "I know him." },
    { bad: "She is liking this movie.", good: "She likes this movie." },
    { bad: "We are having two brothers.", good: "We have two brothers." },
    { bad: "I am understanding.", good: "I understand." },
    { bad: "He is believing you.", good: "He believes you." },
  ];

  return (
    <div className="space-y-3">
      <SectionHeader>Typowe błędy</SectionHeader>
      <div className="space-y-2">
        {items.map((m) => (
          <div
            key={m.bad}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
          >
            <p className="text-sm text-rose-700">❌ {m.bad}</p>
            <p className="text-sm text-emerald-700">✅ {m.good}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExamplesSection() {
  return (
    <div className="space-y-3">
      <SectionHeader>Przykłady (kontrast)</SectionHeader>
      <Card>
        <div className="space-y-1.5">
          <ExampleSentence sentence="I know the answer." />
          <ExampleSentence sentence="I am thinking about the answer." />
          <ExampleSentence sentence="She has a dog." />
          <ExampleSentence sentence="She is having a shower." />
          <ExampleSentence sentence="We see the problem." />
          <ExampleSentence sentence="We are seeing the manager tomorrow." />
          <ExampleSentence sentence="I feel nervous." />
          <ExampleSentence sentence="I am feeling better now." />
        </div>
      </Card>
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

function ComparisonsSection() {
  return (
    <div className="space-y-3">
      <SectionHeader>Porównania: Stative vs Action</SectionHeader>
      <StativeVsAction
        comparisons={[
          {
            stative: "I like coffee.",
            action: "I am liking this more and more.",
            explanation: "LIKE: opinia vs zmiana / proces (rzadkie, ale możliwe).",
          },
          {
            stative: "I have a problem.",
            action: "I am having a problem with my computer.",
            explanation: "HAVE: stan vs sytuacja / proces.",
          },
          {
            stative: "I think it's good.",
            action: "I am thinking about moving abroad.",
            explanation: "THINK: opinia vs proces.",
          },
        ]}
      />
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
        case "list":
          return <ListSection />;
        case "warnings":
          return <WarningsSection />;
        case "exceptions":
          return <ExceptionsSection />;
        case "structure":
          return <StructureSection />;
        case "mistakes":
          return <MistakesSection />;
        case "examples":
          return <ExamplesSection />;
        case "dialog":
          return (
            <DialogSection
              aiDialog={aiDialog}
              aiDialogLoading={aiDialogLoading}
              aiError={aiError}
              onGenerate={handleGenerateAIDialog}
            />
          );
        case "comparisons":
          return <ComparisonsSection />;
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
      items={SECTIONS}
      defaultItemId="definition"
      asideLabel="Sekcje"
      renderContent={renderSection}
    />
  );
}

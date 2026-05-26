"use client";

import { TileWithSidebar, type SidebarItem } from "../../_components/TileWithSidebar";

type SectionId = "definition" | "must" | "mightMayCould" | "cant" | "scale" | "mistakes" | "compare";

const SECTIONS: SidebarItem<SectionId>[] = [
  { id: "definition",    title: "Definicja" },
  { id: "must",          title: "Must" },
  { id: "mightMayCould", title: "Might / May / Could" },
  { id: "cant",          title: "Can't" },
  { id: "scale",         title: "Skala pewności" },
  { id: "mistakes",      title: "Błędy i pułapki" },
  { id: "compare",       title: "Porównaj" },
];

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{children}</h2>;
}

function Card({ children, tone = "soft" }: { children: React.ReactNode; tone?: "soft" | "warn" }) {
  return (
    <div
      className={
        tone === "warn"
          ? "rounded-xl border border-amber-200 bg-amber-50/80 p-4"
          : "rounded-xl border border-slate-200 bg-slate-50/70 p-4"
      }
    >
      {children}
    </div>
  );
}

function DefinitionSection() {
  return (
    <div className="space-y-4">
      <SectionHeader>Definicja</SectionHeader>
      <p className="text-sm text-slate-700">
        Modal verbs związane z <strong>probability</strong> służą do oceniania, jak bardzo coś jest
        prawdopodobne. Używamy ich, gdy próbujemy logicznie ocenić sytuację na podstawie dostępnych
        informacji.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {["must", "may", "might", "could", "can't"].map((w) => (
          <span
            key={w}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm"
          >
            {w}
          </span>
        ))}
      </div>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Przykład
        </p>
        <p className="text-sm italic text-slate-700">She must be tired.</p>
        <p className="mt-1 text-xs text-slate-500">Jestem prawie pewien, że jest zmęczona.</p>
      </Card>
    </div>
  );
}

function MustSection() {
  return (
    <div className="space-y-4">
      <SectionHeader>Must — silna dedukcja</SectionHeader>
      <p className="text-sm text-slate-700">
        W znaczeniu probability <strong>must</strong> oznacza, że jesteśmy niemal pewni czegoś na
        podstawie dowodów lub logiki. To zdecydowane przypuszczenie.
      </p>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Wzór
        </p>
        <p className="font-mono text-sm text-slate-800">Subject + must + base verb / be</p>
        <p className="font-mono text-sm text-slate-800 mt-1">
          Subject + must have + past participle (przeszłość)
        </p>
      </Card>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Przykłady
        </p>
        <div className="space-y-0.5">
          <p className="text-sm italic text-slate-700">She must be tired — she worked all day.</p>
          <p className="text-sm italic text-slate-700">He must be at home.</p>
          <p className="text-sm italic text-slate-700">They must be joking.</p>
          <p className="text-sm italic text-slate-700">He must have forgotten about the meeting.</p>
        </div>
      </Card>
      <p className="text-sm text-slate-600">
        To znaczenie mówi: <strong>jestem prawie pewien.</strong> Nie oznacza obowiązku.
      </p>
    </div>
  );
}

function MightMayCouldSection() {
  return (
    <div className="space-y-4">
      <SectionHeader>Might / May / Could — możliwość</SectionHeader>
      <p className="text-sm text-slate-700">
        Te trzy modal verbs wyrażają możliwość — coś może być prawdą, ale nie wiemy na pewno.
        W codziennym języku są często wymienne.
      </p>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Przykłady
        </p>
        <div className="space-y-0.5">
          <p className="text-sm italic text-slate-700">She might be at home.</p>
          <p className="text-sm italic text-slate-700">He may be working.</p>
          <p className="text-sm italic text-slate-700">They could be late.</p>
        </div>
      </Card>
      <p className="text-sm text-slate-700">
        Wszystkie trzy zdania wyrażają to samo: <strong>to jest możliwe, ale nie wiem na pewno.</strong>
      </p>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Przeszłość
        </p>
        <p className="text-sm text-slate-700 mb-1">
          Gdy mówimy o tym, co mogło się wydarzyć w przeszłości:
        </p>
        <p className="text-sm italic text-slate-700">She might have forgotten.</p>
        <p className="text-sm italic text-slate-700">He may have left already.</p>
      </Card>
    </div>
  );
}

function CantSection() {
  return (
    <div className="space-y-4">
      <SectionHeader>{"Can't — niemożliwość"}</SectionHeader>
      <p className="text-sm text-slate-700">
        W znaczeniu probability <strong>{"can't"}</strong> oznacza, że coś jest praktycznie
        niemożliwe lub logicznie wykluczone.
      </p>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Przykłady
        </p>
        <div className="space-y-0.5">
          <p className="text-sm italic text-slate-700">{"That can't be true!"}</p>
          <p className="text-sm italic text-slate-700">{"He can't be serious."}</p>
          <p className="text-sm italic text-slate-700">{"She can't be at work — it's Sunday."}</p>
          <p className="text-sm italic text-slate-700">{"He can't have done it — he was with me."}</p>
        </div>
      </Card>
      <p className="text-sm text-slate-600">
        Znaczenie: <strong>to jest niemożliwe lub prawie niemożliwe.</strong>
      </p>
    </div>
  );
}

function ScaleSection() {
  const scale = [
    { word: "must", certainty: "~90%", label: "Jestem prawie pewien", tone: "text-emerald-700" },
    { word: "may / might / could", certainty: "~50%", label: "To możliwe, ale nie wiem", tone: "text-slate-700" },
    { word: "can't", certainty: "~5%", label: "To niemożliwe", tone: "text-rose-700" },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader>Skala pewności</SectionHeader>
      <p className="text-sm text-slate-700">
        Modal verbs wyrażające probability tworzą skalę od pewności do niemożliwości:
      </p>
      <div className="space-y-2">
        {scale.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <span className="min-w-[120px] font-mono text-sm font-medium text-slate-800">
              {s.word}
            </span>
            <span className="min-w-[40px] text-xs font-bold text-slate-400">{s.certainty}</span>
            <span className={`text-sm ${s.tone}`}>{s.label}</span>
          </div>
        ))}
      </div>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Przykłady w kontekście
        </p>
        <div className="space-y-0.5">
          <p className="text-sm italic text-slate-700">She must be tired. <span className="not-italic text-xs text-slate-400">(prawie pewny)</span></p>
          <p className="text-sm italic text-slate-700">She might be tired. <span className="not-italic text-xs text-slate-400">(możliwe)</span></p>
          <p className="text-sm italic text-slate-700">{"She can't be tired. "}<span className="not-italic text-xs text-slate-400">(niemożliwe)</span></p>
        </div>
      </Card>
    </div>
  );
}

function MistakesSection() {
  const mistakes = [
    { bad: "She must to be tired.", good: "She must be tired.", note: "Po must nie używamy 'to'." },
    { bad: "They might can come later.", good: "They might come later.", note: "Modal verbs nie łączą się ze sobą." },
    { bad: "He can't to have done it.", good: "He can't have done it.", note: "Po can't nie używamy 'to'." },
    { bad: "She musts be joking.", good: "She must be joking.", note: "Must nie zmienia formy — bez -s." },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader>Błędy i pułapki</SectionHeader>
      <div className="space-y-3">
        {mistakes.map((m, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
          >
            <p className="text-sm text-rose-700">❌ {m.bad}</p>
            <p className="text-sm text-emerald-700">✅ {m.good}</p>
            <p className="mt-1.5 text-xs text-slate-500">{m.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompareSection() {
  const comparisons = [
    {
      title: "Must vs Might (dedukcja)",
      body: "Must — jestem niemal pewien. Might — to możliwe, ale niepewne.",
    },
    {
      title: "Must vs Can't",
      body: "Must — jestem pewien, że TAK. Can't — jestem pewien, że NIE. To dwa bieguny skali pewności.",
    },
    {
      title: "Possibility vs Probability",
      body: "Possibility (may/might/could w kontekście zdarzeń) — coś może się wydarzyć. Probability — dedukcja o stanie faktycznym.",
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader>Porównaj</SectionHeader>
      <div className="space-y-3">
        {comparisons.map((c, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
          >
            <p className="font-semibold text-slate-800">{c.title}</p>
            <p className="mt-1 text-sm text-slate-600">{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProbabilityClient() {
  const renderContent = (item: SidebarItem<SectionId>) => {
    switch (item.id) {
      case "definition":    return <DefinitionSection />;
      case "must":          return <MustSection />;
      case "mightMayCould": return <MightMayCouldSection />;
      case "cant":          return <CantSection />;
      case "scale":         return <ScaleSection />;
      case "mistakes":      return <MistakesSection />;
      case "compare":       return <CompareSection />;
      default:              return null;
    }
  };

  return (
    <TileWithSidebar<SectionId>
      title="Probability"
      description="Modal verbs do wyrażania przypuszczeń i oceniania prawdopodobieństwa: must, might, may, could, can't."
      backHref="/app/grammar/modal-verbs"
      backLabel="← Modal Verbs"
      items={SECTIONS}
      defaultItemId="definition"
      asideLabel="Sekcje"
      renderContent={renderContent}
    />
  );
}

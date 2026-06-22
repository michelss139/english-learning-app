"use client";

import { TileWithSidebar, type SidebarItem } from "../../_components/TileWithSidebar";
import { CorrectIcon, WrongIcon } from "@/app/_components/FeedbackIcons";

type SectionId = "definition" | "should" | "oughtTo" | "hadBetter" | "negatives" | "mistakes" | "compare";

const SECTIONS: SidebarItem<SectionId>[] = [
  { id: "definition", title: "Definicja" },
  { id: "should",     title: "Should" },
  { id: "oughtTo",    title: "Ought to" },
  { id: "hadBetter",  title: "Had better" },
  { id: "negatives",  title: "Formy przeczące" },
  { id: "mistakes",   title: "Błędy i pułapki" },
  { id: "compare",    title: "Porównaj" },
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
        Modal verbs związane z <strong>advice</strong> służą do dawania rad, sugestii i zaleceń.
        Każda z trzech głównych konstrukcji brzmi nieco inaczej.
      </p>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Konstrukcja
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Charakter
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              ["should", "neutralna rada, najczęstsza"],
              ["ought to", "podobne do should, trochę bardziej formalne"],
              ["had better", "rada z ostrzeżeniem o konsekwencjach"],
            ].map(([word, desc], i) => (
              <tr key={i} className={i < 2 ? "border-b border-slate-100" : ""}>
                <td className="px-4 py-2.5 font-medium text-slate-800">{word}</td>
                <td className="px-4 py-2.5 text-slate-600">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Przykład
        </p>
        <p className="text-sm italic text-slate-700">You should talk to your manager.</p>
        <p className="mt-1 text-xs text-slate-500">Powinieneś porozmawiać ze swoim przełożonym.</p>
      </Card>
    </div>
  );
}

function ShouldSection() {
  return (
    <div className="space-y-4">
      <SectionHeader>Should</SectionHeader>
      <p className="text-sm text-slate-700">
        <strong>Should</strong> to najczęstszy i najbardziej naturalny sposób dawania rady po
        angielsku. Brzmi neutralnie — nie za mocno, nie za słabo.
      </p>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Wzór
        </p>
        <p className="font-mono text-sm text-slate-800">Subject + should + base verb</p>
      </Card>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Przykłady
        </p>
        <div className="space-y-0.5">
          <p className="text-sm italic text-slate-700">You should get some rest.</p>
          <p className="text-sm italic text-slate-700">He should apologise.</p>
          <p className="text-sm italic text-slate-700">You should see a doctor.</p>
          <p className="text-sm italic text-slate-700">Should I call her?</p>
        </div>
      </Card>
    </div>
  );
}

function OughtToSection() {
  return (
    <div className="space-y-4">
      <SectionHeader>Ought to</SectionHeader>
      <p className="text-sm text-slate-700">
        <strong>Ought to</strong> ma bardzo podobne znaczenie do should. W praktyce oba słowa często
        można stosować zamiennie. Ought to brzmi trochę bardziej formalnie lub moralnie.
      </p>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Wzór
        </p>
        <p className="font-mono text-sm text-slate-800">Subject + ought to + base verb</p>
      </Card>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Przykłady
        </p>
        <div className="space-y-0.5">
          <p className="text-sm italic text-slate-700">You ought to apologise.</p>
          <p className="text-sm italic text-slate-700">She ought to see a doctor.</p>
          <p className="text-sm italic text-slate-700">We ought to leave now.</p>
        </div>
      </Card>
      <p className="text-sm text-slate-600">
        W codziennym języku <strong>should</strong> jest używane znacznie częściej niż ought to.
      </p>
    </div>
  );
}

function HadBetterSection() {
  return (
    <div className="space-y-4">
      <SectionHeader>Had better</SectionHeader>
      <p className="text-sm text-slate-700">
        <strong>Had better</strong> to rada z wyraźnym ostrzeżeniem — jeśli tego nie zrobisz,
        mogą pojawić się negatywne konsekwencje. Brzmi mocniej niż should.
      </p>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Wzór
        </p>
        <p className="font-mono text-sm text-slate-800">Subject + had better + base verb</p>
        <p className="mt-1 text-xs text-slate-500">
          Skrót: You&apos;d better leave now.
        </p>
      </Card>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Przykłady
        </p>
        <div className="space-y-0.5">
          <p className="text-sm italic text-slate-700">You had better leave now.</p>
          <p className="text-sm italic text-slate-700">We had better take a taxi or we&apos;ll be late.</p>
          <p className="text-sm italic text-slate-700">You had better not be late.</p>
        </div>
      </Card>
      <Card tone="warn">
        <p className="text-sm font-medium text-amber-900">Uwaga</p>
        <p className="mt-1 text-sm text-amber-800">
          Had better <strong>nie</strong> oznacza przeszłości, mimo że zawiera słowo{" "}
          <em>had</em>. To konstrukcja odnosząca się do teraźniejszości lub przyszłości.
        </p>
      </Card>
    </div>
  );
}

function NegativesSection() {
  const forms = [
    { form: "shouldn't (should not)", example: "You shouldn't ignore this problem." },
    { form: "ought not to", example: "You ought not to speak to her like that." },
    { form: "had better not", example: "You had better not be late." },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader>Formy przeczące</SectionHeader>
      <div className="space-y-3">
        {forms.map((f, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
              <span className="font-mono text-sm font-medium text-slate-800">{f.form}</span>
            </div>
            <div className="px-4 py-2.5">
              <p className="text-sm italic text-slate-700">{f.example}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MistakesSection() {
  const mistakes = [
    { bad: "He should to go.", good: "He should go.", note: "Po should nie używamy 'to'." },
    { bad: "You had better to leave now.", good: "You had better leave now.", note: "Had better nie łączy się z 'to'." },
    { bad: "She ought go now.", good: "She ought to go now.", note: "Ought zawsze wymaga 'to'." },
    { bad: "She shoulds rest.", good: "She should rest.", note: "Should nie zmienia formy — bez -s." },
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
            <p className="flex items-center gap-1.5 text-sm text-rose-700"><WrongIcon size={16} /> {m.bad}</p>
            <p className="flex items-center gap-1.5 text-sm text-emerald-700"><CorrectIcon size={16} /> {m.good}</p>
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
      title: "Should vs Ought to",
      body: "Oba wyrażają radę i są często wymienne. Should jest częstsze i bardziej naturalne w codziennym języku.",
    },
    {
      title: "Should vs Had better",
      body: "Should — neutralna rada. Had better — mocniejsza rada z sugestią konsekwencji.",
    },
    {
      title: "Should vs Must",
      body: "Should — rada lub sugestia. Must — silny obowiązek. Must brzmi zdecydowanie mocniej.",
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

export function AdviceClient() {
  const renderContent = (item: SidebarItem<SectionId>) => {
    switch (item.id) {
      case "definition": return <DefinitionSection />;
      case "should":     return <ShouldSection />;
      case "oughtTo":    return <OughtToSection />;
      case "hadBetter":  return <HadBetterSection />;
      case "negatives":  return <NegativesSection />;
      case "mistakes":   return <MistakesSection />;
      case "compare":    return <CompareSection />;
      default:           return null;
    }
  };

  return (
    <TileWithSidebar<SectionId>
      title="Advice"
      description="Modal verbs używane do dawania rad i sugestii: should, ought to, had better."
      backHref="/app/grammar/modal-verbs"
      backLabel="← Modal Verbs"
      items={SECTIONS}
      defaultItemId="definition"
      asideLabel="Sekcje"
      renderContent={renderContent}
    />
  );
}

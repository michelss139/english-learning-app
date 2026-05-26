"use client";

import Link from "next/link";
import { TileWithSidebar, type SidebarItem } from "../../_components/TileWithSidebar";

type SectionId = "definition" | "must" | "haveTo" | "differences" | "mistakes" | "compare";

const SECTIONS: SidebarItem<SectionId>[] = [
  { id: "definition",  title: "Definicja" },
  { id: "must",        title: "Must" },
  { id: "haveTo",      title: "Have to" },
  { id: "differences", title: "Różnice" },
  { id: "mistakes",    title: "Błędy i pułapki" },
  { id: "compare",     title: "Porównaj" },
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
        Modal verbs związane z <strong>obligation</strong> służą do mówienia o tym, że coś jest
        konieczne, wymagane lub zalecane.
      </p>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Konstrukcja
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Znaczenie
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              ["must", "silny nakaz lub wewnętrzny obowiązek"],
              ["have to", "zewnętrzny obowiązek, neutralne w rozmowie"],
              ["should", "rada lub sugestia — słabszy obowiązek"],
            ].map(([word, desc], i) => (
              <tr key={i} className={i < 2 ? "border-b border-slate-100" : ""}>
                <td className="px-4 py-2.5 font-medium text-slate-800">{word}</td>
                <td className="px-4 py-2.5 text-slate-600">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MustSection() {
  return (
    <div className="space-y-4">
      <SectionHeader>Must</SectionHeader>
      <p className="text-sm text-slate-700">
        <strong>Must</strong> wyraża silny obowiązek lub nakaz. Często pojawia się w przepisach,
        regulaminach i oficjalnych instrukcjach. Może też wyrażać wewnętrzne przekonanie o
        konieczności.
      </p>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Wzór
        </p>
        <p className="font-mono text-sm text-slate-800">Subject + must + base verb</p>
      </Card>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Przykłady
        </p>
        <div className="space-y-0.5">
          <p className="text-sm italic text-slate-700">You must wear a helmet.</p>
          <p className="text-sm italic text-slate-700">Passengers must fasten their seatbelts.</p>
          <p className="text-sm italic text-slate-700">I must finish this report today.</p>
          <p className="text-sm italic text-slate-700">Employees must wear a uniform.</p>
        </div>
      </Card>
      <Card tone="warn">
        <p className="text-sm font-medium text-amber-900">Must nie ma formy przeszłej</p>
        <p className="mt-1 text-sm text-amber-800">
          Dla obowiązku w przeszłości lub przyszłości używamy <strong>had to</strong> /
          <strong>will have to</strong>.
        </p>
        <p className="mt-2 text-sm italic text-amber-900">I had to leave early.</p>
        <p className="text-sm italic text-amber-900">I will have to work tomorrow.</p>
      </Card>
    </div>
  );
}

function HaveToSection() {
  return (
    <div className="space-y-4">
      <SectionHeader>Have to</SectionHeader>
      <p className="text-sm text-slate-700">
        <strong>Have to</strong> wyraża obowiązek wynikający z zewnętrznych okoliczności — zasad,
        sytuacji lub wymagań. Brzmi neutralnie i naturalnie w codziennej rozmowie.
      </p>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Wzory
        </p>
        <div className="space-y-1">
          <p className="font-mono text-sm text-slate-800">Subject + have/has to + base verb</p>
          <p className="font-mono text-sm text-slate-800">
            Subject + don&apos;t/doesn&apos;t have to + base verb
          </p>
          <p className="font-mono text-sm text-slate-800">
            Do/Does + subject + have to + base verb?
          </p>
        </div>
      </Card>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Przykłady
        </p>
        <div className="space-y-0.5">
          <p className="text-sm italic text-slate-700">I have to wake up at 6 every day.</p>
          <p className="text-sm italic text-slate-700">She has to wear glasses.</p>
          <p className="text-sm italic text-slate-700">You don&apos;t have to come if you&apos;re tired.</p>
          <p className="text-sm italic text-slate-700">Do you have to work on weekends?</p>
        </div>
      </Card>
    </div>
  );
}

function DifferencesSection() {
  return (
    <div className="space-y-4">
      <SectionHeader>Różnice</SectionHeader>
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="font-semibold text-slate-800">Must vs Have to (obowiązek)</p>
          <p className="mt-1 text-sm text-slate-600">
            Oba mogą wyrażać obowiązek i często można ich używać zamiennie. Must brzmi mocniej lub
            bardziej oficjalnie. Have to — neutralne, zewnętrzne.
          </p>
          <div className="mt-2 space-y-0.5">
            <p className="text-sm italic text-slate-700">
              Employees must wear a uniform. <span className="text-xs text-slate-400">(zasada)</span>
            </p>
            <p className="text-sm italic text-slate-700">
              I have to wear a uniform.{" "}
              <span className="text-xs text-slate-400">(codzienność)</span>
            </p>
          </div>
        </div>
        <Card tone="warn">
          <p className="text-sm font-semibold text-amber-900">mustn&apos;t ≠ don&apos;t have to</p>
          <div className="mt-2 space-y-2">
            <div>
              <p className="text-sm italic text-amber-900">You mustn&apos;t press this button.</p>
              <p className="text-xs text-amber-700">→ Zakaz. Nie wolno tego robić.</p>
            </div>
            <div>
              <p className="text-sm italic text-amber-900">You don&apos;t have to press this button.</p>
              <p className="text-xs text-amber-700">→ Brak konieczności. Możesz, ale nie musisz.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function MistakesSection() {
  const mistakes = [
    { bad: "He musts work tomorrow.", good: "He must work tomorrow.", note: "Must nie zmienia formy." },
    { bad: "You don't must do it.", good: "You don't have to do it.", note: "Przeczenie braku konieczności to don't have to." },
    { bad: "She must to finish.", good: "She must finish.", note: "Po must nie używamy 'to'." },
    { bad: "He don't have to work.", good: "He doesn't have to work.", note: "Z he/she/it używamy doesn't." },
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
      title: "Must vs Have to",
      body: "Must — mocniejszy nakaz, często wewnętrzny lub oficjalny. Have to — zewnętrzny, neutralny w rozmowie. Must nie ma formy przeszłej.",
    },
    {
      title: "Must vs Should",
      body: "Must — silny obowiązek. Should — rada lub sugestia, słabszy obowiązek.",
    },
    {
      title: "Mustn't vs Don't have to",
      body: "Mustn't = zakaz (nie wolno). Don't have to = brak konieczności (nie musisz, ale możesz).",
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

export function ObligationClient() {
  const renderContent = (item: SidebarItem<SectionId>) => {
    switch (item.id) {
      case "definition":  return <DefinitionSection />;
      case "must":        return <MustSection />;
      case "haveTo":      return <HaveToSection />;
      case "differences": return <DifferencesSection />;
      case "mistakes":    return <MistakesSection />;
      case "compare":     return <CompareSection />;
      default:            return null;
    }
  };

  const headerAccessory = (
    <Link
      href="/app/grammar/modals/obligation/practice"
      className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
    >
      Ćwicz Obligation
    </Link>
  );

  return (
    <TileWithSidebar<SectionId>
      title="Obligation"
      description="Modal verbs używane do mówienia o obowiązku i konieczności: must, have to, should."
      backHref="/app/grammar/modal-verbs"
      backLabel="← Modal Verbs"
      items={SECTIONS}
      defaultItemId="definition"
      asideLabel="Sekcje"
      headerAccessory={headerAccessory}
      renderContent={renderContent}
    />
  );
}

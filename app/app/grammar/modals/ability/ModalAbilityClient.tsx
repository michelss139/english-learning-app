"use client";

import Link from "next/link";
import { TileWithSidebar, type SidebarItem } from "../../_components/TileWithSidebar";

type SectionId = "definition" | "can" | "could" | "beAbleTo" | "mistakes" | "compare";

const SECTIONS: SidebarItem<SectionId>[] = [
  { id: "definition", title: "Definicja" },
  { id: "can",        title: "Can" },
  { id: "could",      title: "Could" },
  { id: "beAbleTo",   title: "Be able to" },
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
        Modal verbs związane z <strong>ability</strong> służą do mówienia o umiejętnościach oraz
        możliwościach wykonania danej czynności. Używamy trzech głównych konstrukcji, każda do
        innego celu.
      </p>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Konstrukcja
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Kiedy używamy
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              ["can", "obecna umiejętność"],
              ["could", "ogólna umiejętność w przeszłości"],
              ["be able to", "inne czasy lub konkretny sukces w przeszłości"],
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

function CanSection() {
  return (
    <div className="space-y-4">
      <SectionHeader>Can</SectionHeader>
      <p className="text-sm text-slate-700">
        <strong>Can</strong> to najczęstszy sposób wyrażania umiejętności w teraźniejszości. Nie
        zmienia formy dla żadnej osoby i nie łączy się z &quot;to&quot;.
      </p>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Wzór
        </p>
        <p className="font-mono text-sm text-slate-800">Subject + can + base verb</p>
      </Card>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Przykłady
        </p>
        <div className="space-y-0.5">
          <p className="text-sm italic text-slate-700">I can swim.</p>
          <p className="text-sm italic text-slate-700">She can speak three languages.</p>
          <p className="text-sm italic text-slate-700">He can play the piano.</p>
          <p className="text-sm italic text-slate-700">Can you drive?</p>
        </div>
      </Card>
    </div>
  );
}

function CouldSection() {
  return (
    <div className="space-y-4">
      <SectionHeader>Could</SectionHeader>
      <p className="text-sm text-slate-700">
        <strong>Could</strong> opisuje ogólną umiejętność, którą ktoś posiadał w przeszłości. To
        zdolność przez jakiś czas — nie jednorazowy sukces.
      </p>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Wzór
        </p>
        <p className="font-mono text-sm text-slate-800">Subject + could + base verb</p>
      </Card>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Przykłady
        </p>
        <div className="space-y-0.5">
          <p className="text-sm italic text-slate-700">I could swim when I was five.</p>
          <p className="text-sm italic text-slate-700">
            I could play tennis very well as a teenager.
          </p>
          <p className="text-sm italic text-slate-700">She could run very fast when she was young.</p>
        </div>
      </Card>
      <Card tone="warn">
        <p className="text-sm font-medium text-amber-900">Ważna różnica</p>
        <p className="mt-1 text-sm text-amber-800">
          Gdy mówimy o konkretnym jednorazowym sukcesie w przeszłości (nie ogólnej zdolności),
          używamy <strong>was/were able to</strong>, nie could.
        </p>
        <p className="mt-2 text-sm italic text-amber-900">
          ✅ Yesterday I was able to finish the report.
        </p>
        <p className="text-sm italic text-rose-700">
          ❌ Yesterday I could finish the report.
        </p>
      </Card>
    </div>
  );
}

function BeAbleToSection() {
  return (
    <div className="space-y-4">
      <SectionHeader>Be able to</SectionHeader>
      <p className="text-sm text-slate-700">
        <strong>Be able to</strong> pojawia się, gdy <strong>can</strong> gramatycznie nie pasuje —
        np. po <em>will</em>, po innych czasownikach (want to, need to), lub gdy mówimy o
        konkretnym sukcesie w przeszłości.
      </p>
      <div className="space-y-3">
        <Card>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Przyszłość z will
          </p>
          <p className="text-sm italic text-slate-700">I will be able to help you tomorrow.</p>
          <p className="text-sm italic text-slate-700">She will be able to drive after lessons.</p>
        </Card>
        <Card>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Po innych czasownikach
          </p>
          <p className="text-sm italic text-slate-700">I want to be able to play the guitar.</p>
          <p className="text-sm italic text-slate-700">You need to be able to swim for this job.</p>
        </Card>
        <Card>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Konkretny sukces w przeszłości
          </p>
          <p className="text-sm italic text-slate-700">
            She was able to finish the race despite the injury.
          </p>
          <p className="text-sm italic text-slate-700">
            They were able to open the door with a spare key.
          </p>
        </Card>
      </div>
    </div>
  );
}

function MistakesSection() {
  const mistakes = [
    {
      bad: "I can to swim.",
      good: "I can swim.",
      note: "Po can nie używamy 'to'.",
    },
    {
      bad: "Yesterday I could finish the report.",
      good: "Yesterday I was able to finish the report.",
      note: "Konkretny sukces w przeszłości to was able to, nie could.",
    },
    {
      bad: "She can able to help you.",
      good: "She can help you. / She is able to help you.",
      note: "Nie łączymy can z able to — używamy jednej z tych form.",
    },
    {
      bad: "I will can help you.",
      good: "I will be able to help you.",
      note: "Will nie łączy się bezpośrednio z can.",
    },
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
      title: "Can vs Could",
      body: "Can — obecna umiejętność. Could — ogólna zdolność z przeszłości.",
      examples: ["I can swim now.", "I could swim when I was five."],
    },
    {
      title: "Can vs Be able to",
      body: "Can — standardowa forma w teraźniejszości. Be able to — inne czasy lub po other verbs.",
      examples: ["I can help you.", "I will be able to help you tomorrow."],
    },
    {
      title: "Could vs Was able to",
      body: "Could — ogólna zdolność. Was/were able to — konkretny jednorazowy sukces.",
      examples: ["When I was young, I could run fast.", "Yesterday I was able to finish the report."],
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
            <div className="mt-2 space-y-0.5">
              {c.examples.map((ex, j) => (
                <p key={j} className="text-sm italic text-slate-700">
                  {ex}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ModalAbilityClient() {
  const renderContent = (item: SidebarItem<SectionId>) => {
    switch (item.id) {
      case "definition": return <DefinitionSection />;
      case "can":        return <CanSection />;
      case "could":      return <CouldSection />;
      case "beAbleTo":   return <BeAbleToSection />;
      case "mistakes":   return <MistakesSection />;
      case "compare":    return <CompareSection />;
      default:           return null;
    }
  };

  const headerAccessory = (
    <Link
      href="/app/grammar/modals/ability/practice"
      className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
    >
      Ćwicz Ability
    </Link>
  );

  return (
    <TileWithSidebar<SectionId>
      title="Ability"
      description="Modal verbs używane do mówienia o umiejętnościach i możliwościach: can, could, be able to."
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

"use client";

import Link from "next/link";
import { TileWithSidebar, type SidebarItem } from "../../_components/TileWithSidebar";
import { CorrectIcon, WrongIcon } from "@/app/_components/FeedbackIcons";

type SectionId = "definition" | "mayMight" | "could" | "negatives" | "mistakes" | "compare";

const SECTIONS: SidebarItem<SectionId>[] = [
  { id: "definition", title: "Definicja" },
  { id: "mayMight",   title: "May i Might" },
  { id: "could",      title: "Could" },
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
        Modal verbs związane z <strong>possibility</strong> służą do mówienia o tym, że coś jest
        możliwe, ale nie jesteśmy pewni. Używamy trzech głównych słów:
      </p>
      <div className="flex flex-wrap gap-1.5">
        {["may", "might", "could"].map((w) => (
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
        <p className="text-sm italic text-slate-700">It may rain later.</p>
        <p className="mt-1 text-xs text-slate-500">Może później padać. — nie jesteśmy pewni.</p>
      </Card>
      <p className="text-sm text-slate-700">
        W codziennym języku może, might i could są często wymienne w znaczeniu possibility.
      </p>
    </div>
  );
}

function MayMightSection() {
  return (
    <div className="space-y-4">
      <SectionHeader>May i Might</SectionHeader>
      <p className="text-sm text-slate-700">
        <strong>May</strong> i <strong>might</strong> w znaczeniu możliwości działają prawie zawsze
        identycznie. Oba wyrażają, że coś może się wydarzyć, ale nie jesteśmy pewni.
      </p>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Przykłady
        </p>
        <div className="space-y-0.5">
          <p className="text-sm italic text-slate-700">It may rain later.</p>
          <p className="text-sm italic text-slate-700">It might rain later.</p>
          <p className="text-sm text-slate-500 mt-2">Oba zdania znaczą to samo.</p>
          <p className="text-sm italic text-slate-700 mt-2">She may come to the party.</p>
          <p className="text-sm italic text-slate-700">She might come to the party.</p>
        </div>
      </Card>
      <Card tone="warn">
        <p className="text-sm font-medium text-amber-900">Różnica: may w znaczeniu pozwolenia</p>
        <p className="mt-1 text-sm text-amber-800">
          <strong>May</strong> może też oznaczać formalne pozwolenie — w tym znaczeniu{" "}
          <strong>might</strong> nie działa.
        </p>
        <p className="flex items-center gap-1.5 mt-2 text-sm italic text-amber-900"><CorrectIcon size={16} /> You may leave the room.</p>
        <p className="flex items-center gap-1.5 text-sm italic text-rose-700"><WrongIcon size={16} /> You might leave the room. (jako pozwolenie)</p>
      </Card>
    </div>
  );
}

function CouldSection() {
  return (
    <div className="space-y-4">
      <SectionHeader>Could</SectionHeader>
      <p className="text-sm text-slate-700">
        <strong>Could</strong> może również wyrażać możliwość — jedną z opcji, która może się
        wydarzyć.
      </p>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Przykłady
        </p>
        <div className="space-y-0.5">
          <p className="text-sm italic text-slate-700">It could rain later.</p>
          <p className="text-sm italic text-slate-700">She could be at home.</p>
          <p className="text-sm italic text-slate-700">That could be the answer.</p>
        </div>
      </Card>
      <Card tone="warn">
        <p className="text-sm font-medium text-amber-900">Uwaga</p>
        <p className="mt-1 text-sm text-amber-800">
          <strong>Could</strong> ma też inne znaczenie — umiejętność w przeszłości (ability).
          Znaczenie zawsze zależy od kontekstu.
        </p>
        <p className="mt-2 text-sm italic text-amber-900">
          I could swim when I was five.{" "}
          <span className="not-italic text-xs text-amber-700">(ability)</span>
        </p>
        <p className="text-sm italic text-amber-900">
          It could rain later.{" "}
          <span className="not-italic text-xs text-amber-700">(possibility)</span>
        </p>
      </Card>
    </div>
  );
}

function NegativesSection() {
  return (
    <div className="space-y-4">
      <SectionHeader>Formy przeczące</SectionHeader>
      <p className="text-sm text-slate-700">
        Formy przeczące wyrażają, że coś może się <em>nie</em> wydarzyć — niepewność w stronę
        negatywną.
      </p>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Wzory
        </p>
        <div className="space-y-0.5 font-mono text-sm text-slate-800">
          <p>may not</p>
          <p>might not</p>
          <p>could not (couldn&apos;t)</p>
        </div>
      </Card>
      <Card>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Przykłady
        </p>
        <div className="space-y-0.5">
          <p className="text-sm italic text-slate-700">It might not rain today.</p>
          <p className="text-sm italic text-slate-700">She may not come to the party.</p>
          <p className="text-sm italic text-slate-700">He might not know about the meeting.</p>
        </div>
      </Card>
    </div>
  );
}

function MistakesSection() {
  const mistakes = [
    { bad: "Maybe rain later.", good: "It may rain later.", note: "Maybe to przysłówek. May to modal verb — po nim następuje czasownik." },
    { bad: "He might can come later.", good: "He might come later.", note: "Modal verbs nie łączą się bezpośrednio ze sobą." },
    { bad: "It may rains tomorrow.", good: "It may rain tomorrow.", note: "Po may zawsze bezokolicznik bez -s." },
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
      title: "May vs Might",
      body: "Oba wyrażają możliwość. Might bywa trochę mniej pewne. W codziennym języku są wymienne.",
    },
    {
      title: "Could (possibility) vs Could (ability)",
      body: "Could w znaczeniu możliwości (It could rain) różni się od could jako umiejętność w przeszłości (I could swim). Zależy od kontekstu.",
    },
    {
      title: "Possibility vs Probability",
      body: "Possibility (may/might/could) — to możliwe. Probability (must) — jestem prawie pewien.",
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

export function PossibilityClient() {
  const renderContent = (item: SidebarItem<SectionId>) => {
    switch (item.id) {
      case "definition": return <DefinitionSection />;
      case "mayMight":   return <MayMightSection />;
      case "could":      return <CouldSection />;
      case "negatives":  return <NegativesSection />;
      case "mistakes":   return <MistakesSection />;
      case "compare":    return <CompareSection />;
      default:           return null;
    }
  };

  const headerAccessory = (
    <Link
      href="/app/grammar/modals/possibility/practice"
      className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
    >
      Ćwicz Possibility
    </Link>
  );

  return (
    <TileWithSidebar<SectionId>
      title="Possibility"
      description="Modal verbs używane do mówienia o możliwości: may, might, could."
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

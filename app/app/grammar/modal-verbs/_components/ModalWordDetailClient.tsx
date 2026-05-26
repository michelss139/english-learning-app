"use client";

import Link from "next/link";
import { TileWithSidebar, type SidebarItem } from "../../_components/TileWithSidebar";
import type { ModalWordData, ModalMistake } from "@/lib/grammar/modalVerbContent";

// Modals supported by the Sentence Builder
const SENTENCE_BUILDER_MODALS = new Set(["can", "could", "should", "must", "might", "may", "would"]);

// ─── Sections ─────────────────────────────────────────────────────────────────

type SectionId = "definition" | "forms" | "uses" | "mistakes" | "compare";

const SECTIONS: SidebarItem<SectionId>[] = [
  { id: "definition", title: "Definicja" },
  { id: "forms",      title: "Formy" },
  { id: "uses",       title: "Zastosowanie" },
  { id: "mistakes",   title: "Błędy i pułapki" },
  { id: "compare",    title: "Porównaj" },
];

// ─── UI atoms ─────────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{children}</h2>
  );
}

function Card({
  children,
  tone = "soft",
}: {
  children: React.ReactNode;
  tone?: "soft" | "warn" | "sky";
}) {
  const cls =
    tone === "warn"
      ? "rounded-xl border border-amber-200 bg-amber-50/80 p-4"
      : tone === "sky"
        ? "rounded-xl border border-sky-200 bg-sky-50/60 p-4"
        : "rounded-xl border border-slate-200 bg-slate-50/70 p-4";
  return <div className={cls}>{children}</div>;
}

// ─── Section: Definicja ───────────────────────────────────────────────────────

function DefinitionSection({ word }: { word: ModalWordData }) {
  return (
    <div className="space-y-4">
      <SectionHeader>Definicja</SectionHeader>
      <p className="text-sm text-slate-700">{word.definition}</p>
      {word.definitionExamples.length > 0 && (
        <Card>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Przykłady
          </p>
          <ul className="space-y-1">
            {word.definitionExamples.map((ex, i) => (
              <li key={i} className="text-sm italic text-slate-700">
                {ex}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ─── Section: Formy ────────────────────────────────────────────────────────────

function FormsSection({ word }: { word: ModalWordData }) {
  return (
    <div className="space-y-4">
      <SectionHeader>Formy</SectionHeader>
      <div className="space-y-3">
        {word.structures.map((s, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                {s.label}
              </span>
            </div>
            <div className="px-4 py-3">
              <pre className="whitespace-pre-wrap font-sans text-sm font-medium leading-relaxed text-slate-800">
                {s.pattern}
              </pre>
            </div>
            <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5">
              <p className="text-sm italic text-slate-600">{s.example}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section: Zastosowanie ────────────────────────────────────────────────────

function UsesSection({ word }: { word: ModalWordData }) {
  return (
    <div className="space-y-5">
      <SectionHeader>Zastosowanie</SectionHeader>
      {word.uses.map((u, i) => (
        <div key={i} className="space-y-3">
          <h3 className="font-semibold text-slate-800">{u.title}</h3>
          <p className="text-sm text-slate-700">{u.body}</p>
          {u.examples.length > 0 && (
            <Card>
              <ul className="space-y-1">
                {u.examples.map((ex, j) => (
                  <li key={j} className="text-sm italic text-slate-700">
                    {ex}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {u.warning && (
            <Card tone="warn">
              <p className="text-sm text-amber-900">{u.warning}</p>
            </Card>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Section: Błędy ───────────────────────────────────────────────────────────

function isMistakePair(m: ModalMistake): m is { bad: string; good: string; note?: string } {
  return "bad" in m;
}

function MistakesSection({ word }: { word: ModalWordData }) {
  return (
    <div className="space-y-4">
      <SectionHeader>Błędy i pułapki</SectionHeader>
      <div className="space-y-3">
        {word.mistakes.map((m, i) =>
          isMistakePair(m) ? (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
            >
              <p className="text-sm text-rose-700">❌ {m.bad}</p>
              <p className="text-sm text-emerald-700">✅ {m.good}</p>
              {m.note && (
                <p className="mt-1.5 text-xs text-slate-500">{m.note}</p>
              )}
            </div>
          ) : (
            <Card key={i} tone="warn">
              <p className="text-sm text-amber-900">{m.note}</p>
            </Card>
          ),
        )}
      </div>
    </div>
  );
}

// ─── Section: Porównaj ────────────────────────────────────────────────────────

function CompareSection({ word }: { word: ModalWordData }) {
  return (
    <div className="space-y-4">
      <SectionHeader>Porównaj</SectionHeader>
      <div className="space-y-3">
        {word.compare.map((c, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
          >
            <p className="text-sm font-semibold text-slate-800">{c.title}</p>
            <p className="mt-1 text-sm text-slate-600">{c.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ModalWordDetailClient({ word }: { word: ModalWordData }) {
  const renderContent = (item: SidebarItem<SectionId>) => {
    switch (item.id) {
      case "definition":
        return <DefinitionSection word={word} />;
      case "forms":
        return <FormsSection word={word} />;
      case "uses":
        return <UsesSection word={word} />;
      case "mistakes":
        return <MistakesSection word={word} />;
      case "compare":
        return <CompareSection word={word} />;
      default:
        return null;
    }
  };

  const sbModal = SENTENCE_BUILDER_MODALS.has(word.id) ? word.id : null;
  const sbHref = sbModal
    ? `/app/grammar/sentence-builder?type=modal&modal=${sbModal}`
    : `/app/grammar/sentence-builder?type=modal`;

  const headerAccessory = (
    <Link
      href={sbHref}
      className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
    >
      Wypróbuj w Sentence Builder →
    </Link>
  );

  return (
    <TileWithSidebar<SectionId>
      title={word.title}
      description={word.description}
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

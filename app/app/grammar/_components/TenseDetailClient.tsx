"use client";

import Link from "next/link";
import type { GrammarTense } from "@/lib/grammar/types";
import { TileWithSidebar, type SidebarItem } from "./TileWithSidebar";

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionId = "usage" | "structure" | "keywords" | "mistakes" | "examples" | "compare";

const SECTIONS: SidebarItem<SectionId>[] = [
  { id: "usage",     title: "Użycie" },
  { id: "structure", title: "Konstrukcja" },
  { id: "keywords",  title: "Słowa kluczowe" },
  { id: "mistakes",  title: "Błędy i pułapki" },
  { id: "examples",  title: "Przykłady" },
  { id: "compare",   title: "Porównaj" },
];

// ─── Primitive UI atoms (match stative-verbs style) ───────────────────────────

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

function Chip({ children, description }: { children: React.ReactNode; description?: string }) {
  return (
    <span
      title={description}
      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm"
    >
      {children}
      {description && <span className="ml-1.5 text-slate-400">— {description}</span>}
    </span>
  );
}

// ─── Text parsers ─────────────────────────────────────────────────────────────

/** Split text at "Przykłady:" → { pattern, examples[] } */
function parseStructureField(text: string): { pattern: string; examples: string[] } {
  const idx = text.search(/\n\s*Przykłady\s*:\s*\n/i);
  if (idx < 0) return { pattern: text.trim(), examples: [] };
  const pattern = text.slice(0, idx).trim();
  const rest = text.slice(idx).replace(/^\s*Przykłady\s*:\s*/i, "").trim();
  const examples = rest
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return { pattern, examples };
}

/** Split "X → Y" mistakes into ❌/✅ pairs */
function parseMistakes(text: string): Array<{ bad: string; good: string } | { note: string }> {
  return text
    .split(/\n\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const parts = chunk.split(/\s*→\s*/);
      if (parts.length >= 2) {
        return { bad: parts[0].trim(), good: parts.slice(1).join(" → ").trim() };
      }
      return { note: chunk };
    });
}

/** Split double-newline separated items into an array */
function parseItems(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Split usage text into intro paragraphs + control question */
function parseUsage(text: string): { paragraphs: string[]; question: string | null } {
  const qIdx = text.indexOf("Pytanie kontrolne:");
  if (qIdx < 0) {
    return { paragraphs: parseItems(text), question: null };
  }
  const before = text.slice(0, qIdx).trim();
  const after = text.slice(qIdx).trim();
  return {
    paragraphs: parseItems(before),
    question: after,
  };
}

// ─── Section components ───────────────────────────────────────────────────────

function UsageSection({ usage }: { usage: string }) {
  const { paragraphs, question } = parseUsage(usage);
  return (
    <div className="space-y-4">
      <SectionHeader>Użycie</SectionHeader>
      <div className="space-y-2">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-sm text-slate-700">
            {p}
          </p>
        ))}
      </div>
      {question && (
        <Card tone="sky">
          <p className="text-sm font-medium text-sky-900">{question}</p>
        </Card>
      )}
    </div>
  );
}

function StructureRow({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  if (!text?.trim()) return null;
  const { pattern, examples } = parseStructureField(text);
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Label */}
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </span>
      </div>
      {/* Pattern */}
      <div className="px-4 py-3">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
          {pattern}
        </pre>
      </div>
      {/* Examples */}
      {examples.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 space-y-1">
          {examples.map((ex, i) => (
            <p key={i} className="text-sm italic text-slate-600">
              {ex}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function StructureSection({
  structure,
  auxiliary,
}: {
  structure: GrammarTense["content"]["structure"];
  auxiliary: string;
}) {
  return (
    <div className="space-y-4">
      <SectionHeader>Konstrukcja</SectionHeader>

      <div className="space-y-3">
        <StructureRow label="Twierdzenie (Affirmative)" text={structure.affirmative} />
        <StructureRow label="Przeczenie (Negative)" text={structure.negative} />
        <StructureRow label="Pytanie (Question)" text={structure.question} />
      </div>

      {auxiliary?.trim() && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 px-1">
            Słówko pomocnicze
          </p>
          <Card tone="warn">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-amber-900">
              {auxiliary.trim()}
            </pre>
          </Card>
        </div>
      )}
    </div>
  );
}

function KeywordsSection({
  characteristicWords,
  chips,
}: {
  characteristicWords: string;
  chips?: GrammarTense["content"]["chips"];
}) {
  const items = parseItems(characteristicWords);
  return (
    <div className="space-y-4">
      <SectionHeader>Słowa kluczowe</SectionHeader>

      {chips && chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <Chip key={chip.text} description={chip.description}>
              {chip.text}
            </Chip>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MistakesSection({
  confusionWarnings,
  commonMistakes,
}: {
  confusionWarnings: string;
  commonMistakes: string;
}) {
  const warnings = parseItems(confusionWarnings);
  const mistakes = parseMistakes(commonMistakes);

  return (
    <div className="space-y-5">
      {warnings.length > 0 && (
        <div className="space-y-2">
          <SectionHeader>Uwaga — to myli</SectionHeader>
          <Card tone="warn">
            <ul className="space-y-2">
              {warnings.map((w, i) => (
                <li key={i} className="text-sm text-amber-900">
                  {w}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {mistakes.length > 0 && (
        <div className="space-y-2">
          <SectionHeader>Typowe błędy</SectionHeader>
          <div className="space-y-2">
            {mistakes.map((m, i) =>
              "note" in m ? (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                >
                  {m.note}
                </div>
              ) : (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
                >
                  <p className="text-sm text-rose-700">❌ {m.bad}</p>
                  <p className="text-sm text-emerald-700">✅ {m.good}</p>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ExamplesSection({ examples, dialog }: { examples: string; dialog: string }) {
  const exList = parseItems(examples);
  return (
    <div className="space-y-5">
      {exList.length > 0 && (
        <div className="space-y-2">
          <SectionHeader>Przykłady</SectionHeader>
          <Card>
            <ul className="space-y-1.5">
              {exList.map((ex, i) => (
                <li key={i} className="text-sm text-slate-700">
                  {ex}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {dialog?.trim() && (
        <div className="space-y-2">
          <SectionHeader>Dialog w praktyce</SectionHeader>
          <Card>
            <div className="whitespace-pre-line font-mono text-sm text-slate-700">
              {dialog.trim()}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function CompareSection({
  comparisons,
  relatedLinks,
}: {
  comparisons?: GrammarTense["content"]["comparisons"];
  relatedLinks?: GrammarTense["content"]["relatedLinks"];
}) {
  const hasComparisons = comparisons && comparisons.length > 0;
  const hasLinks = relatedLinks && relatedLinks.length > 0;

  if (!hasComparisons && !hasLinks) {
    return (
      <div className="space-y-2">
        <SectionHeader>Porównaj</SectionHeader>
        <p className="text-sm text-slate-400">Brak dostępnych porównań.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {hasComparisons && (
        <div className="space-y-3">
          <SectionHeader>Porównania</SectionHeader>
          <div className="space-y-2">
            {comparisons.map((c) => (
              <Link
                key={`${c.tense1}-${c.tense2}`}
                href={`/app/grammar/compare?tense1=${c.tense1}&tense2=${c.tense2}`}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="font-medium text-slate-800">{c.title}</span>
                {c.description && (
                  <span className="ml-3 shrink-0 text-xs text-slate-400 group-hover:text-slate-600">
                    {c.description}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {hasLinks && (
        <div className="space-y-3">
          <SectionHeader>Zobacz też</SectionHeader>
          <div className="flex flex-wrap gap-2">
            {relatedLinks.map((link) => (
              <Link
                key={link.slug}
                href={`/app/grammar/${link.slug}`}
                className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm transition hover:-translate-y-px hover:border-slate-400 hover:text-slate-900"
              >
                <span className="font-medium">{link.title}</span>
                {link.description && (
                  <span className="text-xs text-slate-500 group-hover:text-slate-700">
                    {link.description}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function TenseDetailClient({ tense }: { tense: GrammarTense }) {
  const practiceHref = `/app/grammar/${tense.slug}/practice`;
  const c = tense.content;

  const headerAccessory = (
    <div className="flex flex-wrap gap-2 pt-1">
      <Link
        href={practiceHref}
        className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
      >
        Ćwicz {tense.title}
      </Link>
      {tense.courseLink && (
        <Link
          href={tense.courseLink}
          className="inline-flex items-center rounded-xl border border-slate-200 bg-transparent px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-800"
        >
          Pełny kurs →
        </Link>
      )}
    </div>
  );

  const renderSection = (item: SidebarItem<SectionId>) => {
    switch (item.id) {
      case "usage":
        return <UsageSection usage={c.usage} />;
      case "structure":
        return <StructureSection structure={c.structure} auxiliary={c.auxiliary} />;
      case "keywords":
        return (
          <KeywordsSection characteristicWords={c.characteristicWords} chips={c.chips} />
        );
      case "mistakes":
        return (
          <MistakesSection
            confusionWarnings={c.confusionWarnings}
            commonMistakes={c.commonMistakes}
          />
        );
      case "examples":
        return <ExamplesSection examples={c.examples} dialog={c.dialog} />;
      case "compare":
        return (
          <CompareSection comparisons={c.comparisons} relatedLinks={c.relatedLinks} />
        );
      default:
        return null;
    }
  };

  return (
    <TileWithSidebar<SectionId>
      title={tense.title}
      description={tense.description}
      backHref="/app/grammar/tenses"
      backLabel="← Wróć do czasów"
      items={SECTIONS}
      defaultItemId="usage"
      asideLabel="Sekcje"
      headerAccessory={headerAccessory}
      renderContent={renderSection}
    />
  );
}

"use client";

import Link from "next/link";
import type { GrammarTense } from "@/lib/grammar/types";
import { TileWithSidebar, type SidebarItem } from "./TileWithSidebar";
import { StructureCard, getAuxiliaryPattern } from "./StructureCard";
import { CorrectIcon, WrongIcon } from "@/app/_components/FeedbackIcons";

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
  const questionText = question
    ? question.replace(/^\s*Pytanie\s+kontrolne\s*:\s*/i, "").trim()
    : null;
  return (
    <div className="space-y-4">
      <SectionHeader>Użycie</SectionHeader>
      {paragraphs.length > 0 && (
        <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className={
                i === 0
                  ? "text-lg font-medium leading-relaxed text-slate-800"
                  : "text-base leading-relaxed text-slate-600"
              }
            >
              {p}
            </p>
          ))}
        </div>
      )}
      {questionText && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sky-500">
            Pytanie kontrolne
          </p>
          <p className="text-base font-medium text-sky-900">{questionText}</p>
        </div>
      )}
    </div>
  );
}

function StructureSection({
  structure,
  auxiliary,
  slug,
}: {
  structure: GrammarTense["content"]["structure"];
  auxiliary: string;
  slug: string;
}) {
  const aff = parseStructureField(structure.affirmative ?? "");
  const neg = parseStructureField(structure.negative ?? "");
  const qst = parseStructureField(structure.question ?? "");
  return (
    <div className="space-y-4">
      <SectionHeader>Konstrukcja</SectionHeader>

      <div className="flex flex-col gap-2.5">
        {structure.affirmative?.trim() && (
          <StructureCard label="Twierdzenie (Affirmative)" pattern={aff.pattern} examples={aff.examples} slug={slug} />
        )}
        {structure.negative?.trim() && (
          <StructureCard label="Przeczenie (Negative)" pattern={neg.pattern} examples={neg.examples} slug={slug} />
        )}
        {structure.question?.trim() && (
          <StructureCard label="Pytanie (Question)" pattern={qst.pattern} examples={qst.examples} slug={slug} />
        )}
      </div>

      {auxiliary?.trim() && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-600">
            <i className="ti-bulb" style={{ fontSize: 14 }} />
            Słówko pomocnicze
          </p>
          <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-slate-700">
            {auxiliary.trim()}
          </pre>
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
              className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-base text-slate-700"
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
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3"
              >
                <i className="ti-alert-triangle mt-0.5 shrink-0" style={{ fontSize: 16, color: "#f59e0b" }} />
                <p className="text-base text-slate-700">{w}</p>
              </div>
            ))}
          </div>
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
                  className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-base text-slate-700"
                >
                  {m.note}
                </div>
              ) : (
                <div
                  key={i}
                  className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                >
                  <p className="flex items-start gap-2 text-base text-rose-700">
                    <WrongIcon size={16} />
                    <span>{m.bad}</span>
                  </p>
                  <p className="flex items-start gap-2 text-base text-emerald-700">
                    <CorrectIcon size={16} />
                    <span>{m.good}</span>
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Highlight ranges for a dialog line: the tense's characteristic auxiliary AND
 * the lexical (main) verb that follows it. The main verb is the first word after
 * the auxiliary phrase, skipping "not"/n't and an -ly adverb — so "I am cooking"
 * highlights both "am" and "cooking"; "have been cooking" -> "have been" + "cooking".
 */
function dialogHighlightRanges(line: string, slug?: string): [number, number][] {
  if (!slug) return [];
  const aux = getAuxiliaryPattern(slug);
  if (!aux) return [];
  const re = new RegExp(aux.source, aux.flags.includes("g") ? aux.flags : aux.flags + "g");
  const ranges: [number, number][] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m[0].length === 0) {
      re.lastIndex++;
      continue;
    }
    const auxEnd = m.index + m[0].length;
    ranges.push([m.index, auxEnd]);
    const rest = line.slice(auxEnd);
    const mv = rest.match(/^(\s+(?:not\s+|(?:i|you|he|she|it|we|they)\s+)?(?:[a-z]+ly\s+)?)([a-z][a-z'\u2019]*)/i);
    if (mv) {
      const start = auxEnd + mv[1].length;
      ranges.push([start, start + mv[2].length]);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged;
}

/** Dialog line with the tense's characteristic verb forms highlighted. */
function DialogLine({ line, slug }: { line: string; slug?: string }) {
  if (!line.trim()) return <>{line || " "}</>;
  const ranges = dialogHighlightRanges(line, slug);
  if (ranges.length === 0) return <>{line}</>;
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([s, e], i) => {
    if (cursor < s) nodes.push(<span key={`p${i}`}>{line.slice(cursor, s)}</span>);
    nodes.push(
      <strong key={`h${i}`} className="font-bold text-[#178CF2]">
        {line.slice(s, e)}
      </strong>,
    );
    cursor = e;
  });
  if (cursor < line.length) nodes.push(<span key="tail">{line.slice(cursor)}</span>);
  return <>{nodes}</>;
}

function ExamplesSection({ examples, dialog, tenseSlug }: { examples: string; dialog: string; tenseSlug?: string }) {
  const exList = parseItems(examples);
  return (
    <div className="space-y-5">
      {exList.length > 0 && (
        <div className="space-y-2">
          <SectionHeader>Przykłady</SectionHeader>
          <Card>
            <ul className="space-y-1.5">
              {exList.map((ex, i) => (
                <li key={i} className="text-base text-slate-700">
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
            <div className="space-y-1 font-mono text-base text-slate-700">
              {dialog.trim().split("\n").map((line, i) => (
                <div key={i}>
                  <DialogLine line={line} slug={tenseSlug} />
                </div>
              ))}
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
        <p className="text-base text-slate-400">Brak dostępnych porównań.</p>
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
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-base shadow-sm transition hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50"
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
                className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-base text-slate-700 shadow-sm transition hover:-translate-y-px hover:border-slate-400 hover:text-slate-900"
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

  const tileHeader = (
    <Link
      href={practiceHref}
      className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
    >
      Ćwicz {tense.title} →
    </Link>
  );

  const renderSection = (item: SidebarItem<SectionId>) => {
    switch (item.id) {
      case "usage":
        return <UsageSection usage={c.usage} />;
      case "structure":
        return <StructureSection structure={c.structure} auxiliary={c.auxiliary} slug={tense.slug} />;
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
        return <ExamplesSection examples={c.examples} dialog={c.dialog} tenseSlug={tense.slug} />;
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
      backHref="/app/grammar/tenses"
      backLabel="← Wróć do czasów"
      items={SECTIONS}
      defaultItemId="usage"
      asideLabel="Sekcje"
      tileHeader={tileHeader}
      renderContent={renderSection}
    />
  );
}

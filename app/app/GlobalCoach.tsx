"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import SentenceBuilder from "@/components/grammar/SentenceBuilder";
import { useCurrentWord } from "@/lib/coach/CurrentWordContext";
import { getWordTip } from "@/lib/coach/wordTips";
import type { SentenceBuilderVerb } from "@/lib/grammar/sentence-builder/types";

type CoachContent = string | string[];
type GlobalCoachProps = {
  sentenceBuilderVerbs: SentenceBuilderVerb[];
};

function getCoachContent(
  pathname: string | null,
  currentLemma: string | null,
  currentIrregularVerbBase: string | null
): CoachContent {
  // Irregular verbs: mixed verb tip dla sow/sew
  if (pathname?.startsWith("/app/irregular-verbs/train") && currentIrregularVerbBase) {
    const base = currentIrregularVerbBase.toLowerCase().trim();
    if (base === "sow" || base === "sew") return "Uważaj! To tzw Mixed Verb!";
  }
  // Tipy słówkowe: na fiszkach pokazujemy "ciekawostka!" (pełna treść w WAŻNE! po Sprawdź)
  const wordTip = getWordTip(currentLemma ?? undefined);
  if (wordTip) return "ciekawostka!";
  if (!pathname) return "Witaj na LANGBracket";
  if (pathname === "/app/grammar" || pathname === "/app/grammar/") {
    return "Gramatyka. Ja też tego nie lubię, ale... czasem trzeba";
  }
  if (pathname.startsWith("/app/grammar/tenses")) {
    return "Wszystkie czasy, do wyboru, do koloru!";
  }
  if (pathname.startsWith("/app/grammar/conditionals")) {
    return "\"Co by było gdyby?\" - który to conditional?";
  }
  if (pathname.startsWith("/app/grammar/present-simple")) {
    return "Najczęstszy błąd? DO + czasownik z -s. Nigdy razem.";
  }
  if (pathname.startsWith("/app/grammar/present-continuous")) {
    return "Jeśli coś dzieje się teraz — potrzebujesz BE + -ING.";
  }
  if (pathname.startsWith("/app/grammar/past-simple")) {
    return "Jeśli podajesz konkretną datę — prawie zawsze będzie Past Simple.";
  }
  if (pathname.startsWith("/app/grammar/past-continuous")) {
    return [
      "Jeśli opisujesz, co działo się o konkretnej godzinie -> Past Continuous.",
      "Jeśli masz \"when\" i coś trwało -> to część z -ing.",
      "Jeśli coś nagle się wydarzyło -> to zwykle Past Simple.",
    ];
  }
  if (pathname.startsWith("/app/grammar/present-perfect")) {
    return [
      "Jeśli mówisz \"kiedy?\" i podajesz datę -> to nie Present Perfect.",
      "Jeśli efekt jest ważny teraz -> użyj Present Perfect.",
      "since = punkt w czasie, for = okres.",
    ];
  }
  if (pathname.startsWith("/app/grammar/present-perfect-continuous")) {
    return [
      "Jeśli chcesz podkreślić \"jak długo\" -> Continuous.",
      "Jeśli liczy się efekt końcowy -> Perfect Simple.",
      "Konstrukcja zawsze zawiera \"been\".",
    ];
  }
  if (pathname.startsWith("/app/grammar/past-perfect")) {
    return [
      "Jeśli masz dwa wydarzenia w przeszłości -> jedno może być Past Perfect.",
      "Po \"had\" zawsze trzecia forma czasownika.",
      "Ten czas nie opisuje \"dawno\", tylko \"wcześniej\".",
    ];
  }
  if (pathname.startsWith("/app/grammar/past-perfect-continuous")) {
    return [
      "Jeśli podkreślasz długość trwania przed czymś -> Continuous.",
      "Po \"had\" zawsze \"been\" + -ing.",
      "Jeśli liczy się efekt, nie proces -> użyj Past Perfect.",
    ];
  }
  if (pathname.startsWith("/app/grammar/future-simple")) {
    return [
      "Jeśli decyzja zapada teraz -> użyj will.",
      "Po \"will\" zawsze forma podstawowa.",
      "Jeśli to plan sprzed chwili -> to raczej „going to”.",
    ];
  }
  if (pathname.startsWith("/app/grammar/future-continuous")) {
    return [
      "Jeśli mówisz o konkretnej godzinie w przyszłości -> często Continuous.",
      "Po \"will be\" zawsze -ing.",
      "Ten czas opisuje proces, nie decyzję.",
    ];
  }
  if (pathname.startsWith("/app/grammar/future-perfect-simple")) {
    return [
      "Jeśli masz \"by + moment w przyszłości\" -> często Future Perfect.",
      "Po \"will have\" zawsze 3. forma.",
      "Ten czas porządkuje przyszłe wydarzenia.",
    ];
  }
  if (pathname.startsWith("/app/grammar/future-perfect-continuous")) {
    return [
      "Jeśli masz \"for + czas\" i punkt w przyszłości -> Continuous.",
      "Konstrukcja zawsze zawiera \"been\".",
      "Jeśli liczy się efekt, nie proces -> użyj Future Perfect.",
    ];
  }
  return "Witaj na LANGBracket";
}

function CoachCard({ tips, onHide }: { tips: string[]; onHide: () => void }) {
  const [tipIndex, setTipIndex] = useState(0);
  const hasMultipleTips = tips.length > 1;
  const currentMessage = tips[tipIndex] ?? tips[0];

  const goPrev = () => setTipIndex((i) => (i <= 0 ? tips.length - 1 : i - 1));
  const goNext = () => setTipIndex((i) => (i >= tips.length - 1 ? 0 : i + 1));

  return (
    <div className="w-64 shrink-0 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {hasMultipleTips && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Poprzedni tip"
              >
                &#8249;
              </button>
              <button
                type="button"
                onClick={goNext}
                className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Następny tip"
              >
                &#8250;
              </button>
            </>
          )}
          <p className="min-w-0 flex-1 break-words whitespace-pre-line text-center text-sm font-medium text-slate-800">
            {currentMessage}
          </p>
        </div>
        <button
          type="button"
          onClick={onHide}
          className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Zamknij coacha"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function GlobalCoach({ sentenceBuilderVerbs }: GlobalCoachProps) {
  const pathname = usePathname();
  const { currentLemma, currentIrregularVerbBase } = useCurrentWord();
  const [visible, setVisible] = useState(true);
  const [sentenceBuilderVisible, setSentenceBuilderVisible] = useState(true);
  const [sentenceBuilderOpen, setSentenceBuilderOpen] = useState(false);

  const content = useMemo(
    () => getCoachContent(pathname, currentLemma, currentIrregularVerbBase),
    [pathname, currentLemma, currentIrregularVerbBase]
  );
  const tips = Array.isArray(content) ? content : [content];
  const coachKey = `${pathname ?? "root"}:${currentLemma ?? "none"}`;

  return (
    <>
      <div className="fixed top-6 right-6 z-40 flex w-64 flex-col items-stretch gap-3">
        {sentenceBuilderVisible ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white p-2 shadow-md">
            <button
              type="button"
              onClick={() => setSentenceBuilderOpen(true)}
              className="flex-1 rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-50"
              title="Sentence Builder"
              aria-label="Sentence Builder"
            >
              Sentence Builder
            </button>
            <button
              type="button"
              onClick={() => setSentenceBuilderVisible(false)}
              className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Schowaj Sentence Builder"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSentenceBuilderVisible(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-full border border-slate-300 bg-white text-lg text-slate-700 shadow-md transition hover:bg-slate-50"
            title="Pokaż Sentence Builder"
            aria-label="Pokaż Sentence Builder"
          >
            🔧
          </button>
        )}

        {visible ? (
          <CoachCard key={coachKey} tips={tips} onHide={() => setVisible(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setVisible(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-full border border-slate-300 bg-white text-lg font-medium text-slate-700 shadow-md transition hover:bg-slate-50"
            title="Pokaż coacha"
            aria-label="Pokaż coacha"
          >
            ?
          </button>
        )}
      </div>

      {sentenceBuilderOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        aria-hidden={false}
      >
        <button
          type="button"
          onClick={() => setSentenceBuilderOpen(false)}
          className="sb-backdrop absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]"
          aria-label="Close Sentence Builder panel"
        />

        <aside
          className="sb-panel relative z-10 max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label="Sentence Builder"
        >
          <div className="flex max-h-[90vh] flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-slate-900">Sentence Builder</h2>
                <p className="text-sm text-slate-600">
                  Tutaj możesz sprawdzić, jak wyglądają twierdzenia, przeczenia oraz pytania
                  wykorzystując dowolny czas bądź dowolny czasownik modalny. Wypróbuj także
                  &quot;challenge&quot;, żeby samemu takie zdania tworzyć!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSentenceBuilderOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <SentenceBuilder verbs={sentenceBuilderVerbs} />
            </div>
          </div>
        </aside>
      </div>
      )}
    </>
  );
}


"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import SentenceBuilder from "@/components/grammar/SentenceBuilder";
import { useCurrentWord } from "@/lib/coach/CurrentWordContext";
import { getWordTip } from "@/lib/coach/wordTips";
import { supabase } from "@/lib/supabase/client";
import type { SentenceBuilderVerb } from "@/lib/grammar/sentence-builder/types";

type CoachContent = string | string[];

type GlobalCoachProps = {
  sentenceBuilderVerbs: SentenceBuilderVerb[];
  professorHiddenInitial: boolean;
  seenTipsInitial: string[];
  userId: string;
};

function getTipKey(pathname: string | null): string {
  if (!pathname) return "welcome";
  if (pathname === "/app/vocab/packs" || pathname === "/app/vocab/packs/") return "vocab-packs";
  if (pathname.startsWith("/app/vocab/pack/")) return "vocab-pack";
  if (pathname.startsWith("/app/vocab/cluster/") && !pathname.includes("/practice")) return "cluster-theory";
  if (pathname.startsWith("/app/irregular-verbs/train")) return "irregular-verbs";
  if (pathname === "/app/grammar" || pathname === "/app/grammar/") return "grammar";
  if (pathname.startsWith("/app/grammar/tenses")) return "grammar-tenses";
  if (pathname.startsWith("/app/grammar/conditionals")) return "grammar-conditionals";
  if (pathname.startsWith("/app/grammar/present-simple")) return "grammar-present-simple";
  if (pathname.startsWith("/app/grammar/present-continuous")) return "grammar-present-continuous";
  if (pathname.startsWith("/app/grammar/past-simple")) return "grammar-past-simple";
  if (pathname.startsWith("/app/grammar/past-continuous")) return "grammar-past-continuous";
  if (pathname.startsWith("/app/grammar/present-perfect")) return "grammar-present-perfect";
  if (pathname.startsWith("/app/grammar/past-perfect")) return "grammar-past-perfect";
  if (pathname.startsWith("/app/grammar/future")) return "grammar-future";
  return pathname.replace(/^\/app\/?/, "").replace(/\//g, "-") || "welcome";
}

function isVocabClusterTheoryPath(pathname: string | null): boolean {
  if (!pathname?.startsWith("/app/vocab/cluster/")) return false;
  if (pathname.includes("/practice")) return false;
  const rest = pathname.slice("/app/vocab/cluster/".length);
  return rest.length > 0 && !rest.includes("/");
}

function getCoachContent(
  pathname: string | null,
  currentLemma: string | null,
  currentIrregularVerbBase: string | null,
): CoachContent {
  if (pathname?.startsWith("/app/irregular-verbs/train") && currentIrregularVerbBase) {
    const base = currentIrregularVerbBase.toLowerCase().trim();
    if (base === "sow" || base === "sew") return "Uważaj! To tzw Mixed Verb!";
  }
  const wordTip = getWordTip(currentLemma ?? undefined);
  if (wordTip) return "ciekawostka!";
  if (isVocabClusterTheoryPath(pathname)) {
    return "Najpierw przejrzyj teorię i przykłady, a potem przejdź do praktyki.";
  }
  if (!pathname) return "Witaj na LANGBracket";
  if (pathname === "/app/vocab/packs" || pathname === "/app/vocab/packs/") {
    return "U nas słówka dzielą się na codzienne i szczegółowe!";
  }
  if (pathname.startsWith("/app/vocab/pack/")) {
    return "Kliknij na kartę! Zobaczysz przykład zdania ze słówkiem. I definicję!";
  }
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

function TypewriterText({ text, speed = 22 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-slate-600" />
      )}
    </span>
  );
}

function CoachBubble({ tips, onHide }: { tips: string[]; onHide: () => void }) {
  const [tipIndex, setTipIndex] = useState(0);
  const [bubbleH, setBubbleH] = useState(80);
  const measureRef = useRef<HTMLDivElement>(null);
  const hasMultipleTips = tips.length > 1;
  const currentMessage = tips[tipIndex] ?? tips[0];

  const goPrev = () => setTipIndex((i) => (i <= 0 ? tips.length - 1 : i - 1));
  const goNext = () => setTipIndex((i) => (i >= tips.length - 1 ? 0 : i + 1));

  useEffect(() => {
    if (measureRef.current) {
      setBubbleH(Math.max(68, measureRef.current.offsetHeight + 36));
    }
  }, [currentMessage, hasMultipleTips]);

  // Wymiary SVG
  const W = 148;
  const TH = 14;  // wysokość ogonka
  const R = 16;   // zaokrąglenie rogów
  const TX = W - 26; // środek ogonka (x), prawostronny
  const TW = 6;   // połowa bazy ogonka
  const BY = TH;
  const BH = bubbleH;

  // Jeden path: zaokrąglony prostokąt + wbudowany ogonek u góry
  const d = [
    `M ${R} ${BY}`,
    `L ${TX - TW} ${BY}`,
    `C ${TX - TW} ${BY - 5}, ${TX - 2} ${2}, ${TX} ${0}`,
    `C ${TX + 2} ${2}, ${TX + TW} ${BY - 5}, ${TX + TW} ${BY}`,
    `L ${W - R} ${BY}`,
    `Q ${W} ${BY} ${W} ${BY + R}`,
    `L ${W} ${BY + BH - R}`,
    `Q ${W} ${BY + BH} ${W - R} ${BY + BH}`,
    `L ${R} ${BY + BH}`,
    `Q 0 ${BY + BH} 0 ${BY + BH - R}`,
    `L 0 ${BY + R}`,
    `Q 0 ${BY} ${R} ${BY}`,
    "Z",
  ].join(" ");

  return (
    <div style={{ position: "relative", width: W, marginRight: 6, flexShrink: 0 }}>
      {/* Ukryty div do pomiaru wysokości tekstu */}
      <div
        ref={measureRef}
        style={{
          position: "absolute", visibility: "hidden", pointerEvents: "none",
          top: 0, left: 12, width: W - 28,
          fontSize: 13, lineHeight: 1.55, fontWeight: 500,
        }}
      >
        {currentMessage}
        {hasMultipleTips && <div style={{ height: 26 }} />}
      </div>

      {/* SVG: chmurka + ogonek jako jeden nieprzerwany kształt */}
      <svg
        width={W}
        height={TH + BH}
        viewBox={`-1 -1 ${W + 2} ${TH + BH + 2}`}
        style={{ display: "block", filter: "drop-shadow(0 1px 4px rgba(15,23,42,0.08))" }}
      >
        <path d={d} fill="white" stroke="#e2e8f0" strokeWidth="1" strokeLinejoin="round" />
      </svg>

      {/* Treść nakładana na SVG */}
      <div style={{ position: "absolute", top: TH + 10, left: 12, right: 12, bottom: 10 }}>
        <button
          type="button"
          onClick={onHide}
          style={{ position: "absolute", top: -2, right: 0 }}
          className="rounded-full p-0.5 text-slate-400 transition hover:text-slate-700"
          aria-label="Zamknij"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.55, color: "#0f172a", paddingRight: 14 }}>
          <TypewriterText key={`${currentMessage}-${tipIndex}`} text={currentMessage} />
        </p>

        {hasMultipleTips && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }} className="flex items-center justify-center gap-1.5">
            <button type="button" onClick={goPrev} className="p-0.5 text-slate-400 transition hover:text-slate-700" aria-label="Poprzedni">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M7 1L2 5l5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <span style={{ fontSize: 9, fontWeight: 700 }} className="text-slate-400">{tipIndex + 1}/{tips.length}</span>
            <button type="button" onClick={goNext} className="p-0.5 text-slate-400 transition hover:text-slate-700" aria-label="Następny">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 1l5 4-5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GlobalCoach({ sentenceBuilderVerbs, professorHiddenInitial, seenTipsInitial, userId }: GlobalCoachProps) {
  const pathname = usePathname();
  const { currentLemma, currentIrregularVerbBase } = useCurrentWord();
  const [coachExpanded, setCoachExpanded] = useState(false);
  const [professorHidden, setProfessorHidden] = useState(professorHiddenInitial);
  const [seenTips, setSeenTips] = useState<Set<string>>(new Set(seenTipsInitial));
  const [sentenceBuilderExpanded, setSentenceBuilderExpanded] = useState(false);
  const [sentenceBuilderOpen, setSentenceBuilderOpen] = useState(false);

  // Nasłuchuj zmian z ustawień (bez przeładowania strony)
  useEffect(() => {
    const handler = (e: Event) => setProfessorHidden((e as CustomEvent<boolean>).detail);
    window.addEventListener("professor-visibility-change", handler as EventListener);
    return () => window.removeEventListener("professor-visibility-change", handler as EventListener);
  }, []);

  const content = useMemo(
    () => getCoachContent(pathname, currentLemma, currentIrregularVerbBase),
    [pathname, currentLemma, currentIrregularVerbBase],
  );
  const tips = Array.isArray(content) ? content : [content];
  const coachKey = `${pathname ?? "root"}:${currentLemma ?? "none"}`;
  const tipKey = getTipKey(pathname);

  // Otwórz bąbelek tylko gdy tip niewidziany; zamknij gdy zmienia się strona na już widzianą
  useEffect(() => {
    if (seenTips.has(tipKey)) {
      setCoachExpanded(false);
    } else {
      setCoachExpanded(true);
      // Oznacz jako widziany i zapisz do DB
      setSeenTips((prev) => new Set([...prev, tipKey]));
      void supabase
        .from("profiles")
        .update({ professor_seen_tips: [...seenTips, tipKey] })
        .eq("id", userId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipKey]);

  if (professorHidden) return null;

  return (
    <>
      <div className="fixed top-6 right-6 z-40 flex w-64 flex-col items-stretch gap-3">
        {sentenceBuilderExpanded ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white p-2 shadow-md">
            <button
              type="button"
              onClick={() => setSentenceBuilderOpen(true)}
              className="flex-1 rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-50"
              title="Sentence Builder"
              aria-label="Otwórz Sentence Builder"
            >
              Sentence Builder
            </button>
            <button
              type="button"
              onClick={() => setSentenceBuilderExpanded(false)}
              className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Zwiń Sentence Builder"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSentenceBuilderExpanded(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-full border border-slate-300 bg-white text-lg text-slate-700 shadow-md transition hover:bg-slate-50"
            title="Sentence Builder"
            aria-label="Rozwiń Sentence Builder"
          >
            🔧
          </button>
        )}

        {/* Profesor + chmurka — profesor na górze, chmurka pod nim */}
        <div className="flex flex-col items-end gap-0">
          <button
            type="button"
            onClick={() => setCoachExpanded((v) => !v)}
            className="shrink-0 rounded-full border-2 border-white shadow-lg transition hover:scale-105 focus:outline-none"
            title="Profesor LangBracket"
            aria-label="Profesor LangBracket"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/professor.png"
              alt="Profesor LangBracket"
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover"
            />
          </button>
          {coachExpanded && (
            <CoachBubble key={coachKey} tips={tips} onHide={() => setCoachExpanded(false)} />
          )}
        </div>
      </div>

      {sentenceBuilderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-hidden={false}>
          <button
            type="button"
            onClick={() => setSentenceBuilderOpen(false)}
            className="sb-backdrop absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]"
            aria-label="Zamknij Sentence Builder"
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
                    Tutaj możesz sprawdzić, jak wyglądają twierdzenia, przeczenia oraz pytania wykorzystując
                    dowolny czas bądź dowolny czasownik modalny. Wypróbuj także &quot;challenge&quot;, żeby
                    samemu takie zdania tworzyć!
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
